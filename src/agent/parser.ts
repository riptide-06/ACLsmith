import type { ParsedConfig, ParsedInterface, ParsedAcl, ParsedVlan, ParsedRule } from './types.js';

const IPV4_RE = /^\d+\.\d+\.\d+\.\d+$/;

function isIPv4(token: string): boolean {
  return IPV4_RE.test(token);
}

// Consume a source/destination spec from tokens starting at index i.
// Returns [specString, nextIndex].
function consumeSpec(tokens: string[], i: number): [string, number] {
  const t = tokens[i];
  if (t === 'any') {
    return ['any', i + 1];
  }
  if (t === 'host') {
    return [`host ${tokens[i + 1] ?? ''}`, i + 2];
  }
  if (isIPv4(t)) {
    return [`${t} ${tokens[i + 1] ?? ''}`, i + 2];
  }
  // fallback: treat as single token
  return [t, i + 1];
}

// Consume optional port spec from tokens starting at index i.
// Returns [portString | undefined, nextIndex].
function consumePort(tokens: string[], i: number): [string | undefined, number] {
  const op = tokens[i];
  if (!op) return [undefined, i];
  if (op === 'eq' || op === 'lt' || op === 'gt' || op === 'neq') {
    return [`${op} ${tokens[i + 1] ?? ''}`, i + 2];
  }
  if (op === 'range') {
    return [`range ${tokens[i + 1] ?? ''} ${tokens[i + 2] ?? ''}`, i + 3];
  }
  return [undefined, i];
}

function parseRule(line: string, seq?: number): ParsedRule | null {
  const tokens = line.trim().split(/\s+/);
  let i = 0;

  // Sequence number
  const seqNum = seq !== undefined ? seq : parseInt(tokens[i], 10);
  if (isNaN(seqNum)) return null;
  if (seq === undefined) i++;

  const action = tokens[i] as 'permit' | 'deny';
  if (action !== 'permit' && action !== 'deny') return null;
  i++;

  const protocol = (tokens[i] ?? '').toLowerCase();
  i++;

  const [source, afterSrc] = consumeSpec(tokens, i);
  i = afterSrc;

  const [destination, afterDst] = consumeSpec(tokens, i);
  i = afterDst;

  const [port] = consumePort(tokens, i);

  return { seq: seqNum, action, protocol, source, destination, port, raw: line.trim() };
}

type BlockType = 'interface' | 'acl' | 'vlan' | null;

export function parseConfig(text: string): ParsedConfig {
  const lines = text.split('\n');

  const interfaces: ParsedInterface[] = [];
  const acls: ParsedAcl[] = [];
  const vlans: ParsedVlan[] = [];
  const rawLines: string[] = [];

  let blockType: BlockType = null;
  let currentIface: ParsedInterface | null = null;
  let currentAcl: ParsedAcl | null = null;
  let currentVlan: ParsedVlan | null = null;

  function closeBlock() {
    if (blockType === 'interface' && currentIface) {
      interfaces.push(currentIface);
      currentIface = null;
    } else if (blockType === 'acl' && currentAcl) {
      acls.push(currentAcl);
      currentAcl = null;
    } else if (blockType === 'vlan' && currentVlan) {
      vlans.push(currentVlan);
      currentVlan = null;
    }
    blockType = null;
  }

  for (const rawLine of lines) {
    const line = rawLine.trimEnd();
    const isIndented = line.length > 0 && (line[0] === ' ' || line[0] === '\t');
    const trimmed = line.trim();

    if (trimmed === '') continue;

    // Bang-only line closes current block (comments with text go to rawLines)
    if (trimmed === '!') {
      closeBlock();
      continue;
    }

    // Top-level `end`
    if (trimmed === 'end') {
      closeBlock();
      rawLines.push('end');
      continue;
    }

    // If not indented, check for new block types
    if (!isIndented) {
      // Check for new block start — may close previous block
      if (trimmed.startsWith('interface ')) {
        closeBlock();
        const name = trimmed.slice('interface '.length).trim();
        currentIface = { name, rawLines: [] };
        blockType = 'interface';
        continue;
      }

      if (trimmed.startsWith('ip access-list extended ')) {
        closeBlock();
        const name = trimmed.slice('ip access-list extended '.length).trim();
        currentAcl = { name, rules: [], rawLines: [] };
        blockType = 'acl';
        continue;
      }

      // vlan <n> (standalone, not `vlan database`)
      const vlanMatch = trimmed.match(/^vlan (\d+)$/);
      if (vlanMatch) {
        closeBlock();
        currentVlan = { id: parseInt(vlanMatch[1], 10) };
        blockType = 'vlan';
        continue;
      }

      // Unrecognized top-level line (hostname, comments with text, etc.)
      closeBlock();
      rawLines.push(trimmed);
      continue;
    }

    // Indented line — inside a block
    if (blockType === 'interface' && currentIface) {
      const m = trimmed.match(/^ip address (\S+) (\S+)/);
      if (m) { currentIface.ip = `${m[1]} ${m[2]}`; continue; }

      const ag = trimmed.match(/^ip access-group (\S+) (in|out)/);
      if (ag) {
        if (ag[2] === 'in') currentIface.aclIn = ag[1];
        else currentIface.aclOut = ag[1];
        continue;
      }

      const sv = trimmed.match(/^switchport access vlan (\d+)/);
      if (sv) { currentIface.vlan = parseInt(sv[1], 10); continue; }

      currentIface.rawLines.push(trimmed);
      continue;
    }

    if (blockType === 'acl' && currentAcl) {
      const rule = parseRule(trimmed);
      if (rule) {
        currentAcl.rules.push(rule);
      } else {
        currentAcl.rawLines.push(trimmed);
      }
      continue;
    }

    if (blockType === 'vlan' && currentVlan) {
      const nm = trimmed.match(/^name (.+)/);
      if (nm) { currentVlan.name = nm[1].trim(); }
      // other vlan sub-commands silently ignored
      continue;
    }

    // Indented but no open block — push to top-level
    rawLines.push(trimmed);
  }

  closeBlock();

  return { interfaces, acls, vlans, rawLines };
}
