# ACLsmith — Project Brief for Claude Code

You're building a hackathon project in 4.5 hours. Read this entire file before writing any code. Re-read the "What 'generic' looks like" section every time you're about to style something.

## What this project is

ACLsmith is an agentic AI reviewer for Cisco ACL (Access Control List) configurations. A user pastes in a running-config; the AI investigates it the way a senior network engineer would — forming hypotheses, querying specific parts of the config, verifying, and reporting subtle security flaws that static linters can't catch.

**The narrative frame:** Anthropic recently announced Claude Mythos Preview, a model so capable at finding code vulnerabilities that Anthropic chose not to release it publicly. ACLsmith is a tiny, narrow, honest demonstration of what Mythos-class autonomous reasoning looks like when applied to network security. Not Mythos itself — ~5% of it, in one narrow domain. That humility is a feature, not a bug.

## The site has two parts

**Part 1 — `/` (the scroll narrative).** Cinematic, WebGL-heavy, scroll-driven. Four scenes that tell the story of invisible infrastructure → silent flaws → the Mythos moment → ACLsmith as the answer. Ends with an About section and a "Launch ACLsmith" button.

**Part 2 — `/app` (the working tool).** Functional. User pastes a config, watches an agent investigate it live, sees findings. Clean typography, great motion on the reasoning stream, syntax-highlighted configs. No WebGL on this page.

Both parts are one Vite deploy. Use simple hash-based routing (`#/app`) — don't bring in a router library.

## Aesthetic direction: "Precision Instrument"

The visual language is that of a high-end engineering tool. Think **Linear × early Vercel dashboards × scientific instrumentation**, not "AI startup" and definitely not "hackathon project."

### Color tokens (use CSS variables throughout)

```css
:root {
  --bg:         #0b0c0e;     /* near-black, not pure black */
  --bg-raised:  #131418;     /* cards, raised surfaces */
  --bg-sunken:  #08090b;     /* inset, wells */
  --border:     #1e2028;     /* hairlines */
  --border-hi:  #2a2d38;     /* hover borders */

  --ink:        #e8e9ec;     /* primary text */
  --ink-dim:    #8a8d96;     /* secondary text */
  --ink-faint:  #4a4d56;     /* tertiary / metadata */

  --accent:     #7cffb2;     /* signal green — used SPARINGLY, only for "live/active" */
  --accent-dim: #3a7a5a;
  --warn:       #ffb871;     /* warm amber — findings, attention */
  --crit:       #ff6b7a;     /* cool red — critical findings, sparingly */
  --link:       #9cc4ff;     /* cool blue — links and agent tool calls */
}
```

**Rules:** dark background. Most of the screen is `--ink-dim` or `--ink-faint`. `--ink` is for what matters most. Accent green is reserved for the agent's live pulse — it should feel rare and alive when it appears. `--crit` appears at most twice on any screen.

### Typography

Load from Google Fonts:
```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600&family=Inter+Tight:wght@400;500;600;700&display=swap" rel="stylesheet">
```

Use:
- **JetBrains Mono** for all display type (headlines, scene titles, config code). Weight 500 for headlines, 400 for body code.
- **Inter Tight** for UI text (buttons, labels, body prose). Weight 400 default, 600 for emphasis.

**Tracking:** tight. Headlines at `letter-spacing: -0.02em`. Small caps labels at `letter-spacing: 0.12em; text-transform: uppercase`.

### Motion philosophy

- **Easing:** use `cubic-bezier(0.16, 1, 0.3, 1)` (CSS custom property `--ease`). GSAP equivalent: `"expo.out"`.
- **Durations:** 400-900ms for meaningful transitions. 150-200ms for hover. Nothing ever instant except scroll position.
- **No bounces.** No spring physics. No `back.out`. This is a precision instrument; it doesn't wobble.
- **Stagger everything.** When multiple elements appear, stagger by 60-100ms. Never all at once.
- **Agent reasoning is the exception.** When the agent is "thinking," things pulse, shift, breathe. Reserved energy — only for the agent.

## What "generic" looks like — AVOID

You (Claude Code) will default to these if not watched. Don't.

- Purple/blue gradients on a card. Forbidden.
- Emoji in UI chrome. Use SVG icons only.
- Large hero with a centered headline and a "Get Started" button. We're better than this.
- `text-align: center` for body copy. Always left-aligned.
- Drop shadows with `box-shadow: 0 4px 12px rgba(0,0,0,0.1)`. Use `border: 1px solid var(--border)` instead.
- Rounded corners at 12-16px. Use 4px or 6px. Precision instruments have sharp corners.
- "AI shimmer" loading animations with sweeping gradients. Use a single blinking cursor instead.
- Smiley, humanized copy. This tool is *serious*. It speaks like a senior engineer: direct, technical, understated.
- Terms like "awesome," "amazing," "magic," "powered by AI." Deleted on sight.

## References

`/references/` contains screenshots of aesthetic targets. Consult these when styling. If none are there yet, your reference is: Linear's dashboard, Vercel's early dashboard (2020), Raycast's UI, Arc browser's settings panel.

The scroll narrative's motion reference is the Pioneer Corn Revolution site (https://cornrevolution.resn.global/). We can't match their WebGL fidelity in 4.5 hours, but we can match their *pacing* and *commitment to one visual idea per scene*.

## Technical stack

- Vite + vanilla TypeScript (already scaffolded)
- Three.js for 3D (already installed)
- GSAP + ScrollTrigger for scroll-driven animation (install ScrollTrigger: `npm i gsap` gives it, just import from `gsap/ScrollTrigger`)
- troika-three-text for crisp WebGL text (already installed)
- Anthropic SDK for the agent: `npm i @anthropic-ai/sdk`
- No React, no Tailwind, no UI libs. Vanilla CSS with custom properties.

## File structure convention

```
src/
  main.ts                   # entry, route handler
  routes/
    home.ts                 # scroll narrative bootstrap
    app.ts                  # ACLsmith tool bootstrap
  scenes/
    sceneManager.ts         # scene lifecycle, GSAP ScrollTrigger setup
    scene1-infrastructure.ts
    scene2-silent-flaw.ts
    scene3-mythos-moment.ts
    scene4-reveal.ts
  agent/
    parser.ts               # Cisco config parser → structured JSON
    tools.ts                # tool definitions for the agent
    loop.ts                 # the agentic loop w/ Opus 4.7
    types.ts                # shared types
  ui/
    reasoning-stream.ts     # streaming reasoning component
    config-editor.ts        # syntax-highlighted config textarea
    findings-panel.ts       # the findings display
  styles/
    tokens.css              # the CSS variables from this brief
    global.css              # resets, body, typography defaults
    home.css                # scroll narrative styles
    app.css                 # tool page styles
public/
  hdri/studio_small_08_1k.hdr    # already there
  configs/
    clean.conf              # a clean config (agent should find nothing)
    shadowed.conf           # has a shadowed ACL rule
    leaky-vlan.conf         # has cross-VLAN leakage
```

## Environment

`.env.local` at root:
```
VITE_ANTHROPIC_API_KEY=sk-ant-...
```

**⚠ SECURITY NOTE:** for a hackathon demo, calling Anthropic from the browser with the API key exposed is the expedient choice. Ship it that way. Add a comment in `agent/loop.ts` acknowledging this is not production-safe and that production would proxy through a server. Mention this in the README. Don't waste time building a backend.

Use `dangerouslyAllowBrowser: true` in the Anthropic SDK client.

## Model choice

- `claude-opus-4-7` for the agent loop in ACLsmith. This is the performance.
- Enable `extended_thinking` if exposed in the SDK version installed. Adaptive thinking is the default on 4.7.
- Set `max_tokens: 4096`. Keep system prompt under 800 tokens.

## What to build FIRST

Follow this order strictly. Don't skip ahead even if something else looks more fun.

1. **Design tokens + global CSS** (10 min) — `tokens.css`, `global.css`, hooked up in `index.html`. Load fonts. Set body background.
2. **Routing** (10 min) — `main.ts` checks `location.hash` and mounts either `home.ts` or `app.ts`. Listens for hash changes.
3. **ACLsmith working tool** (60 min) — yes, build this BEFORE the scroll narrative. Reasoning:
   - This is the actual deliverable; the scroll narrative is presentation theater.
   - If time runs out, having a working tool is the only way to submit a credible project.
   - Build in this order: parser → tool definitions → agent loop → UI → test against demo configs.
4. **Demo configs** (15 min) — the three files in `/public/configs/`. See "Demo Configs" section below.
5. **Scroll narrative scenes** (90 min) — scenes 1-4, in order. See "Scene Architecture" below.
6. **Polish pass** (30 min) — whatever's rough, smooth it. Test the demo flow end-to-end.
7. **Deploy to Vercel** (15 min) — `npx vercel`. Connect Anthropic API key as env var. Test on production URL.

## Scene Architecture — the scroll narrative

Each scene is a full viewport. The user scrolls through them. GSAP ScrollTrigger pins each scene while its animation plays, then releases to the next.

### Scene 1: "Invisible infrastructure"
- Dark viewport. Camera at origin.
- Procedurally generated: 80-120 small glowing points in 3D space, positioned in a rough grid that extends into the distance. Each point is a network node.
- Faint lines connect nearby nodes (distance threshold ~3 units). Lines are `--border-hi` at 0.3 opacity.
- Particles (instanced, ~200) drift slowly along the lines, representing packets. Additive blending, `--accent` color at low opacity.
- As user scrolls: camera pulls back slowly, revealing the scale of the network. Particles speed up slightly.
- Text overlay (troika text in 3D, or DOM layer — DOM is fine for speed): headline fades in at 20% scroll progress. Left-aligned, not centered.
  - Headline: `"Every modern organization runs on a net- / work nobody sees."`  (JetBrains Mono, 48-72px, weight 500, `--ink`, tight tracking)
  - Subhead: `"Routers, switches, firewalls — thousands / of lines of configuration humans wrote, / humans maintain, humans misread."` (Inter Tight, 18px, `--ink-dim`)
- Scroll to next scene when progress hits 100%.

### Scene 2: "The silent flaw"
- Camera quickly tracks toward one specific node in the network, which dims to a red tint.
- Transition: 3D dissolves, revealing a large monospaced block of Cisco ACL config, rendered as WebGL text on a plane in 3D space. Slightly tilted, like a document on a desk.
- The config has ~15 lines. Halfway down, there's an intentional flaw (a shadowed deny rule).
- Scroll progress drives: camera dolly-in closer to the config. At 60% scroll, lines *above* the flaw dim; the flawed line highlights with `--warn`.
- Text overlay (DOM, fixed position): 
  - Label (small caps, `--ink-faint`): `"Real running-config · excerpt"`
  - Headline: `"Somewhere in these lines / is a mistake that opens a door."` (JetBrains Mono, 40-60px)
  - Subhead (appears later in scroll): `"The rule on line 7 will never fire. / The rule on line 5 already matched."` (Inter Tight, 18px, `--ink-dim`)

### Scene 3: "The Mythos moment"
- Transition: config disappears, replaced with a stark empty space with a single pulsing point of light at center.
- Around the pulsing light, procedurally generated: thin arcs and chords sweep around it, forming a loose sphere. Think "a mind assembling itself."
- As user scrolls, the arcs multiply, rotate, converge.
- Three short headlines fade in, one at a time, tied to scroll position:
  - 20% scroll: `"April 7, 2026."` (small, `--ink-dim`)
  - 40% scroll: `"Anthropic announced a model / too capable to release publicly."` (JetBrains Mono, 40-60px, weight 500)
  - 70% scroll: `"It finds flaws in code the way / senior engineers do — / by reasoning about them."` (Inter Tight, 24px, `--ink-dim`)
- Below, a tiny quote/citation row at `--ink-faint`: `"Claude Mythos Preview · Project Glasswing · anthropic.com/glasswing"`

### Scene 4: "ACLsmith"
- The sphere of arcs collapses inward into a single bright point. That point morphs into the letter-form of the ACLsmith wordmark (use troika-three-text for the wordmark, stroke only — hollow letters).
- Below the wordmark, DOM layer: short product description and the CTA.
  - Wordmark: `ACLsmith` (JetBrains Mono, 72-96px, weight 600, `--ink`)
  - Tag (small caps, `--ink-faint`): `"A narrow demonstration · ~5% of the idea"`
  - Description (Inter Tight, 18px, `--ink-dim`, max-width 520px): `"A Mythos-class reasoning loop, pointed at one narrow problem: the subtle security flaws hiding in network configurations. Built in four and a half hours for SYNthesis Hacks 2026."`
  - CTA button: `Launch ACLsmith →` (anchor tag to `#/app`, styled sharp: 1px border, no radius beyond 4px, `--accent` text on `--bg-raised` background, Inter Tight 600, letter-spacing 0.04em)
- Below the CTA, an "About" strip with three short columns:
  - **The problem**: "ACL misconfigurations cause ~25% of breaches attributable to network security. Static linters catch syntax; they miss semantics."
  - **The approach**: "Opus 4.7 in an agentic loop. It forms hypotheses, queries specific parts of the config, verifies, reports."
  - **The scope**: "Demo-grade. Three hand-crafted configs, three classes of flaw. Production would extend the tool library and proxy keys through a server."
- Footer line: `"SYNthesis Hacks · UCSC · April 19, 2026 · [GitHub link]"`

## ACLsmith Technical Spec

### The parser (`agent/parser.ts`)

Parse Cisco IOS running-configs into structured JSON. Handle these elements minimally:
- `interface <name>` blocks with: `ip address`, `ip access-group <name> in/out`, `switchport access vlan <n>`
- `ip access-list extended <name>` blocks with numbered rules, each: sequence, action (permit/deny), protocol, source, destination, ports
- `vlan <n>` declarations

Output shape:
```typescript
interface ParsedConfig {
  interfaces: Array<{
    name: string;
    ip?: string;
    vlan?: number;
    aclIn?: string;
    aclOut?: string;
  }>;
  acls: Array<{
    name: string;
    rules: Array<{
      seq: number;
      action: 'permit' | 'deny';
      protocol: string;       // 'tcp' | 'udp' | 'ip' | 'icmp' | etc.
      source: string;         // 'any' | '10.0.0.0 0.0.0.255' | 'host 192.168.1.1'
      destination: string;
      port?: string;          // 'eq 22' | 'range 1024 65535'
      raw: string;            // original line, for display
    }>;
  }>;
  vlans: Array<{ id: number; name?: string }>;
}
```

Keep the parser forgiving. Unknown lines go into a `rawLines[]` field. Don't try to handle every IOS keyword.

### The tools (`agent/tools.ts`)

Define these three tools for the agent:

1. **`list_acls`** — no args, returns all ACL names in the config with rule counts.
2. **`inspect_acl`** — args: `{ name: string }` — returns the full rule list for one ACL.
3. **`trace_packet`** — args: `{ acl: string, source: string, destination: string, protocol: string, port?: number }` — walks the ACL rules top-to-bottom and returns which rule matches (or "implicit deny" if none). Returns: `{ matchedRule: number | null, action: 'permit' | 'deny', reason: string }`.

These tools are the leverage. The agent will call them to *test hypotheses* rather than just eyeball the config.

### The loop (`agent/loop.ts`)

```typescript
// Pseudocode
const systemPrompt = `You are ACLsmith, a network security reasoner.
You review Cisco IOS configurations the way a senior network engineer would:
by forming hypotheses, testing them with the tools available, and reporting
findings with specific evidence.

You have these tools: list_acls, inspect_acl, trace_packet.

Approach:
1. First, list_acls to understand the config's structure.
2. Inspect each ACL. Look for: shadowed rules (a later rule that a prior rule already captured), overly-broad permits, missing implicit-deny coverage, protocol/port mismatches.
3. When you suspect a flaw, use trace_packet to VERIFY it. Don't report a suspicion; report a confirmed finding.
4. For each finding, output: { severity, title, evidence (line numbers from the config), explanation, suggested fix }.

Be direct. Be technical. Don't explain basic concepts. Assume the reader knows networking.
Your findings appear in a pane next to the config; cite line numbers so they can be highlighted.

Output your final report as structured JSON matching this shape:
{ findings: [{ severity: 'critical'|'warning'|'info', title, lineNumbers: number[], explanation, fix }] }`;

async function runAgent(config: ParsedConfig, onStream: (chunk: StreamChunk) => void) {
  const messages = [{ role: 'user', content: `Here is the parsed config. Investigate it.\n\n${JSON.stringify(config)}` }];
  
  while (true) {
    const response = await client.messages.create({
      model: 'claude-opus-4-7',
      max_tokens: 4096,
      system: systemPrompt,
      tools: toolDefs,
      messages,
      stream: true,
    });
    
    // stream thinking + tool uses to the UI
    // on tool_use: execute locally, append tool_result to messages, loop
    // on stop_reason === 'end_turn': parse final JSON report, display findings, break
  }
}
```

Stream the thinking to the UI so the user SEES the agent reason. This is the whole point.

### The UI (`ui/reasoning-stream.ts` + `findings-panel.ts`)

Left pane (60% width): the config, line-numbered, monospace. Lines referenced in findings highlight with a 2px left border in `--warn` or `--crit`.

Right pane (40% width):
- Top half: **reasoning stream**. As the agent thinks, its thoughts appear as a typewriter-style log. Tool calls render as collapsed cards showing the tool name in `--link`, the arguments in `--ink-dim`, a small spinner. When the tool returns, the card expands briefly then collapses. Thoughts continue.
- Bottom half: **findings panel**. Starts empty with "Investigating…" in `--ink-faint`. As findings are produced, they stream in as cards. Each card: severity label (small caps), title, line numbers (as clickable chips that scroll the left pane + highlight), explanation, suggested fix (in a subtle `--bg-sunken` inset).

Header: file name, line count, a live pulse dot (`--accent`, pulsing every 1.5s) with text "Investigating · [current step]".

## Demo Configs

Create these three files in `public/configs/`. These are the whole game — the video lives or dies on whether ACLsmith catches these.

### `shadowed.conf` — the primary demo

```
!
! Edge router — Internet-facing
! Last modified: 2024-03-14 by gkane
!
hostname edge-01
!
interface GigabitEthernet0/0
 description WAN uplink
 ip address 203.0.113.5 255.255.255.0
 ip access-group WAN-IN in
!
interface GigabitEthernet0/1
 description LAN
 ip address 10.0.0.1 255.255.255.0
!
ip access-list extended WAN-IN
 10 permit tcp any host 10.0.0.10 eq 443
 20 permit tcp any host 10.0.0.10 eq 80
 30 permit ip 10.0.0.0 0.0.0.255 any
 40 deny tcp any host 10.0.0.10 eq 22
 50 permit udp any host 10.0.0.20 eq 53
 60 deny ip any any log
!
end
```

**The flaw:** rule 30 is `permit ip 10.0.0.0/24 any` on an inbound WAN ACL. Any traffic from the internet that spoofs a `10.0.0.x` source IP is permitted — including the SSH traffic that rule 40 tries to deny. Rule 40 is shadowed. This is a real, classic mistake.

ACLsmith's expected finding: `critical` severity, "Rule 30 permits spoofed internal-source traffic from the WAN", line 14, with a trace_packet proof showing that a simulated spoofed packet matches rule 30 before ever reaching rule 40.

### `leaky-vlan.conf` — secondary demo

```
!
hostname dist-sw-01
!
vlan 10
 name engineering
vlan 20
 name finance
vlan 30
 name guest
!
interface Vlan10
 ip address 10.10.10.1 255.255.255.0
!
interface Vlan20
 ip address 10.10.20.1 255.255.255.0
 ip access-group FINANCE-IN in
!
interface Vlan30
 ip address 10.10.30.1 255.255.255.0
 ip access-group GUEST-IN in
!
ip access-list extended FINANCE-IN
 10 deny ip 10.10.30.0 0.0.0.255 any
 20 permit ip any any
!
ip access-list extended GUEST-IN
 10 permit ip any 10.10.20.0 0.0.0.255
 20 deny ip any any
!
end
```

**The flaw:** `GUEST-IN` (applied inbound on VLAN 30) explicitly permits guest → finance. The `FINANCE-IN` ACL tries to block it, but since `FINANCE-IN` is applied inbound on VLAN 20 (traffic *from* finance), it never sees the guest → finance direction. The denial is in the wrong direction.

### `clean.conf` — the control

```
!
hostname core-01
!
interface GigabitEthernet0/0
 ip address 10.0.0.1 255.255.255.0
 ip access-group MGMT-IN in
!
ip access-list extended MGMT-IN
 10 permit tcp 10.0.1.0 0.0.0.255 host 10.0.0.1 eq 22
 20 permit tcp 10.0.1.0 0.0.0.255 host 10.0.0.1 eq 443
 30 permit icmp 10.0.1.0 0.0.0.255 any
 40 deny ip any any log
!
end
```

A clean config. ACLsmith should report zero findings of critical or warning severity, maybe one `info` observation ("Management access is properly restricted to 10.0.1.0/24").

Having a "nothing to find" case in the demo proves ACLsmith isn't hallucinating.

## Video storyboard (90 seconds)

The video is the whole deliverable. Record at 1920×1080, 60fps if you can. Use OBS or QuickTime. Voiceover your own voice, script below. Target 90 seconds, max 120.

**0:00–0:15 — Scene 1 + 2 scroll** (fast scrub, not real-time)
VO: "Every organization runs on a network nobody sees. Routers, switches, firewalls — thousands of lines of configuration. Humans wrote them. Humans misread them."

**0:15–0:30 — Scene 3 + 4 scroll**
VO: "Two weeks ago, Anthropic announced Mythos — a model too capable at finding software flaws to release publicly. Same idea, applied here, to network configs."

**0:30–0:40 — Launch ACLsmith, paste shadowed.conf**
VO: "This is an inbound ACL on an internet-facing router. Sixty lines. Somewhere in it is a door that shouldn't be open."

**0:40–1:10 — Agent reasons, catches the flaw**
(No VO for 15 seconds. Let the reasoning stream speak for itself. Cursor typing, tool calls executing, the verdict arrives.)
VO returns at 0:55: "It found it. Rule 30 permits any source claiming to be from the internal network — including the traffic rule 40 is trying to deny. A spoofed packet walks right in."

**1:10–1:25 — Cut to clean.conf (optional, strengthens the demo)**
VO: "Point it at a clean config, and it says so. This matters: a tool that finds flaws everywhere isn't finding flaws. It's hallucinating."

**1:25–1:30 — Closing frame**
VO: "ACLsmith. A narrow demonstration. Five percent of what Mythos-class reasoning will mean for network defense."
Frame: the ACLsmith wordmark + GitHub URL.

## What to skip if time runs short

In order of what to cut first:
1. Scene 3's sphere-of-arcs (replace with a simpler single pulsing point and text)
2. The clean.conf demo segment
3. troika-three-text (use DOM text overlays instead)
4. The leaky-vlan demo
5. Scene 1's particle flow (keep just the nodes and lines)

**Do not cut:** the ACLsmith working tool, the shadowed.conf demo, any of the findings panel UI. That's the deliverable.

## Done when

- Tool catches the shadowed rule in shadowed.conf in under 20 seconds on Opus 4.7
- The scroll narrative renders all four scenes without visual glitches
- Deployed to Vercel with API key set
- Demo video recorded and on your drive
- Devpost submission drafted

Now go.
