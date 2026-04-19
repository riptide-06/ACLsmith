// NOTE: This file calls the Anthropic API directly from the client with
// dangerouslyAllowBrowser: true. This is acceptable for a hackathon demo.
// Production would proxy all API calls through a server-side route so the
// key is never exposed in the browser bundle.

import Anthropic from '@anthropic-ai/sdk';
import type { ParsedConfig } from './types.js';
import { TOOL_DEFS, dispatchTool } from './tools.js';

// ---------------------------------------------------------------------------
// System prompt (kept under 800 tokens)
// ---------------------------------------------------------------------------

export const SYSTEM_PROMPT = `You are ACLsmith, a network security reasoner. You review Cisco IOS configurations the way a senior network engineer would: forming hypotheses, testing them with tools, reporting findings with specific evidence. Be direct, technical; assume the reader knows networking.

Tools: list_acls, inspect_acl, trace_packet.

Approach: list_acls → inspect each ACL (shadowed rules, overly-broad permits, missing deny coverage, port mismatches) → verify suspicions with trace_packet before reporting.

Cite file line numbers (from the numbered config) so they can be highlighted.

When finished, output your final report as a fenced JSON block and nothing after it:

\`\`\`json
{
  "findings": [
    {
      "severity": "critical" | "warning" | "info",
      "title": "<short headline, up to 10 words>",
      "summary": "<one plain-English line, 8 to 15 words, what a reviewer sees at a glance>",
      "lineNumbers": [<file line numbers, 1-indexed, as shown in the numbered config>],
      "explanation": "<full technical explanation>",
      "fix": "<specific remediation>"
    }
  ]
}
\`\`\`

If there are no issues, output an empty findings array.`;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type AgentEvent =
  | { type: 'text_delta'; text: string }
  | { type: 'thinking_delta'; text: string }
  | { type: 'tool_use_start'; id: string; name: string; input: unknown }
  | { type: 'tool_result'; id: string; name: string; result: unknown }
  | { type: 'turn_end'; stopReason: string | null }
  | { type: 'done'; findings: Findings }
  | { type: 'error'; error: string };

export interface Finding {
  severity: 'critical' | 'warning' | 'info';
  title: string;
  summary: string;          // one plain-English line, 8-15 words, reviewer glance
  lineNumbers: number[];
  explanation: string;
  fix: string;
}

export interface Findings {
  findings: Finding[];
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function addLineNumbers(text: string): string {
  const lines = text.split('\n');
  const width = String(lines.length).length;
  return lines
    .map((line, i) => `${String(i + 1).padStart(width, ' ')}: ${line}`)
    .join('\n');
}

function extractFindings(text: string): Findings | null {
  // Try fenced JSON block first
  const fenced = text.match(/```json\s*([\s\S]*?)```/);
  if (fenced) {
    try {
      return JSON.parse(fenced[1].trim()) as Findings;
    } catch {
      // fall through
    }
  }

  // Try last { ... } in the text
  const lastBrace = text.lastIndexOf('{');
  if (lastBrace !== -1) {
    try {
      return JSON.parse(text.slice(lastBrace)) as Findings;
    } catch {
      // give up
    }
  }

  return null;
}

// ---------------------------------------------------------------------------
// Main agent loop
// ---------------------------------------------------------------------------

export async function runAgent(
  client: Anthropic,
  parsedConfig: ParsedConfig,
  rawConfigText: string,
  onEvent: (e: AgentEvent) => void,
): Promise<Findings> {
  const numberedText = addLineNumbers(rawConfigText);

  const userMessage = [
    'Investigate the following Cisco IOS running-config for security flaws.',
    'Line numbers are prepended for your reference.',
    '',
    '```',
    numberedText,
    '```',
    '',
    'Use the tools to form hypotheses, test them, and produce a structured findings report when done.',
  ].join('\n');

  type MessageParam = Anthropic.MessageParam;
  const messages: MessageParam[] = [{ role: 'user', content: userMessage }];

  const MAX_TURNS = 12;

  for (let turn = 0; turn < MAX_TURNS; turn++) {
    const stream = client.messages.stream({
      model: 'claude-opus-4-7',
      max_tokens: 4096,
      system: SYSTEM_PROMPT,
      tools: TOOL_DEFS as unknown as Anthropic.Tool[],
      messages,
    });

    stream.on('text', (delta: string) => {
      onEvent({ type: 'text_delta', text: delta });
    });

    stream.on('contentBlock', (block: Anthropic.ContentBlock) => {
      if (block.type === 'tool_use') {
        onEvent({ type: 'tool_use_start', id: block.id, name: block.name, input: block.input });
      }
      if (block.type === 'thinking') {
        onEvent({ type: 'thinking_delta', text: (block as { type: 'thinking'; thinking: string }).thinking });
      }
    });

    const finalMessage = await stream.finalMessage();
    messages.push({ role: 'assistant', content: finalMessage.content });

    const stopReason = finalMessage.stop_reason;
    onEvent({ type: 'turn_end', stopReason });

    if (stopReason === 'end_turn') {
      // Extract text and parse findings
      const textParts = finalMessage.content
        .filter((b): b is Anthropic.TextBlock => b.type === 'text')
        .map((b) => b.text)
        .join('\n');

      const findings = extractFindings(textParts);
      if (!findings) {
        onEvent({ type: 'error', error: 'Could not parse findings JSON from final message.' });
        return { findings: [] };
      }

      onEvent({ type: 'done', findings });
      return findings;
    }

    if (stopReason === 'tool_use') {
      const toolUseBlocks = finalMessage.content.filter(
        (b): b is Anthropic.ToolUseBlock => b.type === 'tool_use',
      );

      const toolResults: Anthropic.ToolResultBlockParam[] = toolUseBlocks.map((block) => {
        const result = dispatchTool(
          block.name,
          block.input as Record<string, unknown>,
          parsedConfig,
        );
        onEvent({ type: 'tool_result', id: block.id, name: block.name, result });
        return {
          type: 'tool_result',
          tool_use_id: block.id,
          content: JSON.stringify(result),
        };
      });

      messages.push({ role: 'user', content: toolResults });
      continue;
    }

    // Unexpected stop reason
    onEvent({ type: 'error', error: `Unexpected stop_reason: ${stopReason}` });
    break;
  }

  onEvent({ type: 'error', error: 'Agent exceeded maximum turns without producing findings.' });
  return { findings: [] };
}
