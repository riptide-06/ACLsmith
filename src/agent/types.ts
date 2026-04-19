export interface ParsedRule {
  seq: number;
  action: 'permit' | 'deny';
  protocol: string;       // 'tcp' | 'udp' | 'ip' | 'icmp' | etc.
  source: string;         // 'any' | '10.0.0.0 0.0.0.255' | 'host 192.168.1.1'
  destination: string;
  port?: string;          // 'eq 22' | 'range 1024 65535'
  raw: string;            // original line, for display
}

export interface ParsedAcl {
  name: string;
  rules: ParsedRule[];
  rawLines: string[];     // unrecognized lines within this ACL block
}

export interface ParsedInterface {
  name: string;
  ip?: string;
  vlan?: number;
  aclIn?: string;
  aclOut?: string;
  rawLines: string[];     // unrecognized lines within this interface block (description, etc.)
}

export interface ParsedVlan {
  id: number;
  name?: string;
}

export interface ParsedConfig {
  interfaces: ParsedInterface[];
  acls: ParsedAcl[];
  vlans: ParsedVlan[];
  rawLines: string[];     // top-level unrecognized lines (hostname, end, comments, etc.)
}

// Type signature expectation — actual implementation lives in parser.ts
export type ParseConfigFn = (text: string) => ParsedConfig;
