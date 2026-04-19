import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

// ---------------------------------------------------------------------------
// Manually load .env.local (no dotenv dependency)
// ---------------------------------------------------------------------------
try {
  const envText = readFileSync(resolve(process.cwd(), '.env.local'), 'utf8');
  for (const line of envText.split('\n')) {
    const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
  }
} catch {
  /* ignore — env vars may already be set */
}

// ---------------------------------------------------------------------------
// Sanity-check: tracePacket before running the agent
// ---------------------------------------------------------------------------
import { parseConfig } from '../src/agent/parser.js';
import { tracePacket } from '../src/agent/tools.js';

const shadowedConf = readFileSync(
  resolve(process.cwd(), 'public/configs/shadowed.conf'),
  'utf8',
);
const parsedForCheck = parseConfig(shadowedConf);

console.log('═'.repeat(60));
console.log('SANITY CHECK — tracePacket');
console.log('═'.repeat(60));

// A spoofed TCP packet: src=10.0.0.50 (internal spoof), dst=10.0.0.10, port 22
// Should hit rule 30 (permit ip 10.0.0.0 0.0.0.255 any), NOT rule 40.
const sanityResult = tracePacket(
  { acl: 'WAN-IN', source: '10.0.0.50', destination: '10.0.0.10', protocol: 'tcp', port: 22 },
  parsedForCheck,
);
console.log('Packet: tcp 10.0.0.50 -> 10.0.0.10:22');
console.log('Result:', JSON.stringify(sanityResult, null, 2));

if (sanityResult.matchedRule === 30 && sanityResult.action === 'permit') {
  console.log('✓ PASS — correctly matched rule 30 (shadowing confirmed)');
} else {
  console.error('✗ FAIL — expected matchedRule=30, action=permit');
  console.error('  Got:', sanityResult);
  process.exit(1);
}

// Also verify that an explicit SSH from outside (non-spoofed) falls to rule 40
const denyResult = tracePacket(
  { acl: 'WAN-IN', source: '203.0.113.1', destination: '10.0.0.10', protocol: 'tcp', port: 22 },
  parsedForCheck,
);
console.log('\nPacket: tcp 203.0.113.1 -> 10.0.0.10:22 (public IP, should hit rule 40 deny)');
console.log('Result:', JSON.stringify(denyResult, null, 2));
if (denyResult.matchedRule === 40 && denyResult.action === 'deny') {
  console.log('✓ PASS — correctly matched rule 40 (deny)');
} else {
  console.error('✗ FAIL — expected matchedRule=40, action=deny');
  process.exit(1);
}

console.log('═'.repeat(60));
console.log('Sanity checks passed. Starting agent run...');
console.log('═'.repeat(60));
console.log();

// ---------------------------------------------------------------------------
// API key
// ---------------------------------------------------------------------------
const apiKey =
  process.env['VITE_ANTHROPIC_API_KEY'] || process.env['ANTHROPIC_API_KEY'];

if (!apiKey) {
  console.error(
    'ERROR: No API key found. Set VITE_ANTHROPIC_API_KEY or ANTHROPIC_API_KEY in .env.local or environment.',
  );
  process.exit(1);
}

// ---------------------------------------------------------------------------
// Run the agent
// ---------------------------------------------------------------------------
import Anthropic from '@anthropic-ai/sdk';
import { runAgent, type AgentEvent } from '../src/agent/loop.js';

const client = new Anthropic({ apiKey });

// Parse the config for real
const parsed = parseConfig(shadowedConf);

let turnCount = 0;
let textBuffer = '';

function flushText() {
  if (textBuffer) {
    process.stdout.write('\n');
    textBuffer = '';
  }
}

function logEvent(e: AgentEvent) {
  switch (e.type) {
    case 'text_delta':
      if (!textBuffer) process.stdout.write('[TEXT] ');
      process.stdout.write(e.text);
      textBuffer += e.text;
      if (e.text.includes('\n')) {
        // After a newline, prefix the next chunk
        textBuffer = '';
      }
      break;

    case 'thinking_delta':
      flushText();
      console.log('[THINKING]', e.text.slice(0, 200) + (e.text.length > 200 ? '…' : ''));
      break;

    case 'tool_use_start':
      flushText();
      console.log();
      console.log('═'.repeat(60));
      console.log('═══ TOOL CALL ═══');
      console.log('Name   :', e.name);
      console.log('ID     :', e.id);
      console.log('Input  :', JSON.stringify(e.input, null, 2));
      console.log('═'.repeat(60));
      break;

    case 'tool_result':
      flushText();
      console.log('─'.repeat(60));
      console.log('─── TOOL RESULT ───');
      console.log('Name   :', e.name);
      console.log('Result :', JSON.stringify(e.result, null, 2));
      console.log('─'.repeat(60));
      break;

    case 'turn_end':
      flushText();
      turnCount++;
      console.log();
      console.log('═'.repeat(60));
      console.log(`═══ TURN ${turnCount} END (stop_reason: ${e.stopReason}) ═══`);
      console.log('═'.repeat(60));
      console.log();
      break;

    case 'done':
      flushText();
      console.log();
      console.log('═'.repeat(60));
      console.log('═══════════ FINAL FINDINGS ═══════════');
      console.log('═'.repeat(60));
      console.log(JSON.stringify(e.findings, null, 2));
      console.log('═'.repeat(60));
      break;

    case 'error':
      flushText();
      console.error('\n[ERROR]', e.error);
      break;
  }
}

try {
  const findings = await runAgent(client, parsed, shadowedConf, logEvent);
  console.log('\nAgent run complete.');
  console.log(`Total findings: ${findings.findings.length}`);
  process.exit(0);
} catch (err) {
  console.error('Fatal error during agent run:', err);
  process.exit(1);
}
