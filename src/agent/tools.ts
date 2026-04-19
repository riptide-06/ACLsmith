import type { ParsedConfig, ParsedAcl } from './types.js';

// ---------------------------------------------------------------------------
// Tool definitions (Anthropic SDK format)
// ---------------------------------------------------------------------------

export const TOOL_DEFS = [
  {
    name: 'list_acls',
    description:
      'List all ACLs in the config with their rule counts. Call this first to understand the config structure.',
    input_schema: {
      type: 'object',
      properties: {},
      required: [],
      additionalProperties: false,
    },
  },
  {
    name: 'inspect_acl',
    description:
      'Return the full rule list for one ACL by name. The returned rules include seq, action, protocol, source, destination, port, and raw line.',
    input_schema: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'ACL name, case-sensitive.' },
      },
      required: ['name'],
      additionalProperties: false,
    },
  },
  {
    name: 'trace_packet',
    description:
      'Simulate a packet traversing one ACL. Returns the first matching rule (by seq order) or implicit deny. Use this to PROVE a suspected flaw — e.g., to show that a spoofed-source packet matches an overly-permissive rule before a more-specific deny rule can fire.',
    input_schema: {
      type: 'object',
      properties: {
        acl: { type: 'string', description: 'ACL name.' },
        source: {
          type: 'string',
          description:
            'Source IP, e.g. "10.0.0.50" or "192.0.2.1". Single IPv4 address, no mask.',
        },
        destination: {
          type: 'string',
          description: 'Destination IP. Single IPv4 address.',
        },
        protocol: {
          type: 'string',
          enum: ['tcp', 'udp', 'ip', 'icmp'],
          description: 'Protocol of the simulated packet.',
        },
        port: {
          type: 'number',
          description:
            'Destination port (only meaningful for tcp/udp). Omit for ip/icmp.',
        },
      },
      required: ['acl', 'source', 'destination', 'protocol'],
      additionalProperties: false,
    },
  },
] as const;

// ---------------------------------------------------------------------------
// IP utilities
// ---------------------------------------------------------------------------

function ipToInt(ip: string): number {
  const parts = ip.split('.').map(Number);
  if (
    parts.length !== 4 ||
    parts.some((n) => !Number.isInteger(n) || n < 0 || n > 255)
  ) {
    throw new Error(`invalid IP: ${ip}`);
  }
  return (
    (((parts[0] << 24) | (parts[1] << 16) | (parts[2] << 8) | parts[3]) >>>
      0)
  );
}

function matchAddr(spec: string, candidateIp: string): boolean {
  if (spec === 'any') return true;

  if (spec.startsWith('host ')) {
    const hostIp = spec.slice(5).trim();
    return hostIp === candidateIp;
  }

  // "A.B.C.D W.W.W.W" — wildcard mask form
  const parts = spec.split(' ');
  if (parts.length === 2) {
    const network = ipToInt(parts[0]);
    const wildcard = ipToInt(parts[1]);
    const candidate = ipToInt(candidateIp);
    // ((candidate XOR network) AND (NOT wildcard)) must be 0
    return (((candidate ^ network) & (~wildcard >>> 0)) >>> 0) === 0;
  }

  // Fallback: exact match
  return spec === candidateIp;
}

function matchPort(rulePort: string, packetPort: number): boolean {
  const tokens = rulePort.trim().split(/\s+/);
  const op = tokens[0];
  const n = parseInt(tokens[1], 10);

  switch (op) {
    case 'eq':
      return packetPort === n;
    case 'neq':
      return packetPort !== n;
    case 'gt':
      return packetPort > n;
    case 'lt':
      return packetPort < n;
    case 'range': {
      const m = parseInt(tokens[2], 10);
      return packetPort >= n && packetPort <= m;
    }
    default:
      return false;
  }
}

// ---------------------------------------------------------------------------
// tracePacket — exported so the test harness can sanity-check it
// ---------------------------------------------------------------------------

export interface TraceResult {
  matchedRule: number | null;
  action: 'permit' | 'deny';
  reason: string;
}

interface PacketSpec {
  acl: string;
  source: string;
  destination: string;
  protocol: string;
  port?: number;
}

export function tracePacket(packet: PacketSpec, config: ParsedConfig): TraceResult {
  const acl = config.acls.find((a) => a.name === packet.acl);
  if (!acl) {
    return { matchedRule: null, action: 'deny', reason: `ACL '${packet.acl}' not found` };
  }

  // Sort by seq ascending (should already be ordered, but be safe)
  const sorted = [...acl.rules].sort((a, b) => a.seq - b.seq);

  for (const rule of sorted) {
    // a) Protocol
    if (rule.protocol !== 'ip' && rule.protocol !== packet.protocol) continue;

    // b) Source
    if (!matchAddr(rule.source, packet.source)) continue;

    // c) Destination
    if (!matchAddr(rule.destination, packet.destination)) continue;

    // d) Port
    if (rule.port !== undefined) {
      if (packet.port === undefined) continue; // can't satisfy a port filter without a port
      if (!matchPort(rule.port, packet.port)) continue;
    }

    // Matched!
    const portSuffix =
      packet.port !== undefined ? `:${packet.port}` : '';
    return {
      matchedRule: rule.seq,
      action: rule.action,
      reason: `matched rule ${rule.seq} (${rule.raw}): ${packet.protocol} ${packet.source} -> ${packet.destination}${portSuffix}`,
    };
  }

  return {
    matchedRule: null,
    action: 'deny',
    reason: 'implicit deny at end of ACL',
  };
}

// ---------------------------------------------------------------------------
// dispatchTool
// ---------------------------------------------------------------------------

export function dispatchTool(
  name: string,
  input: Record<string, unknown>,
  config: ParsedConfig,
): unknown {
  if (name === 'list_acls') {
    return {
      acls: config.acls.map((a) => ({ name: a.name, ruleCount: a.rules.length })),
    };
  }

  if (name === 'inspect_acl') {
    const aclName = input['name'] as string;
    const found = config.acls.find((a) => a.name === aclName);
    if (!found) return { error: `ACL '${aclName}' not found` };
    return found satisfies ParsedAcl;
  }

  if (name === 'trace_packet') {
    const packet: PacketSpec = {
      acl: input['acl'] as string,
      source: input['source'] as string,
      destination: input['destination'] as string,
      protocol: input['protocol'] as string,
      port: input['port'] as number | undefined,
    };
    return tracePacket(packet, config);
  }

  return { error: `Unknown tool: ${name}` };
}
