import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  cls?: string,
  html?: string,
): HTMLElementTagNameMap[K] {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (html !== undefined) e.innerHTML = html;
  return e;
}

// ---------------------------------------------------------------------------
// SECTION 1 — MASTHEAD (MYTHOS-forward, Utopia Tokyo treatment)
// ---------------------------------------------------------------------------
function buildSection1(): { section: HTMLElement; animate: () => void } {
  const section = el('div', 'home__section');
  const inner = el('div', 's1__inner');

  // --- Row 1 — masthead: outlined MYTHOS + meta column
  const mast = el('div', 's1__masthead');
  const mastTitle = el('h1', 's1__mast-title');
  mastTitle.textContent = 'MYTHOS';
  const mastMeta = el('div', 's1__mast-meta');
  mastMeta.innerHTML =
    '<div><span class="dim">PLATE /</span> <span class="val">ACLS · 04·19</span></div>' +
    '<div><span class="dim">CYCLE /</span> <span class="val">MMXXVI</span></div>' +
    '<div><span class="dim">REF /</span> <span class="val">GLASSWING</span></div>' +
    '<div><span class="dim">BUILD /</span> <span class="val">0.1.0·RC1</span></div>';
  mast.appendChild(mastTitle);
  mast.appendChild(mastMeta);

  // --- Row 2 — body block
  const body = el('div', 's1__body');

  // Left: call letters (HYPOTHESIZE. QUERY. VERIFY.)
  const calls = el('div', 's1__calls');
  const callsLabel = el('p', 's1__calls-label');
  callsLabel.textContent = '◆ THE LOOP';
  const callsTitle = el('h2', 's1__calls-title');
  callsTitle.innerHTML =
    '<span>HYPOTHESIZE.</span>' +
    '<span>QUERY.</span>' +
    '<span>VERIFY.</span>';
  const callsSub = el('p', 's1__calls-sub');
  callsSub.textContent =
    'An autonomous reasoner for network access control. A senior engineer’s investigative habit, in software.';

  const ctaRow = el('div', 's1__cta-row');
  const ctaPrimary = el('a', 'home__btn-primary');
  ctaPrimary.href = '#/app';
  ctaPrimary.innerHTML = 'LAUNCH ACLSMITH <span aria-hidden="true">→</span>';
  const ctaSecondary = el('button', 'home__btn-secondary');
  ctaSecondary.innerHTML = 'SEE THE METHOD <span aria-hidden="true">↓</span>';
  ctaSecondary.addEventListener('click', () => {
    const target = document.getElementById('section-how');
    if (target) target.scrollIntoView({ behavior: 'smooth' });
  });
  ctaRow.appendChild(ctaPrimary);
  ctaRow.appendChild(ctaSecondary);

  calls.appendChild(callsLabel);
  calls.appendChild(callsTitle);
  calls.appendChild(callsSub);
  calls.appendChild(ctaRow);

  // Right: description column
  const desc = el('div', 's1__desc');
  const descLabel = el('p', 's1__desc-label');
  descLabel.textContent = '◆ CONTEXT · APRIL 2026';
  const descWrap = el('div');

  const p1 = el('p', 's1__desc-text');
  p1.innerHTML =
    '<strong>Anthropic announced Claude Mythos</strong> — a model trained to find software vulnerabilities the way senior engineers do. Too capable at the task to release publicly.';

  const p2 = el('p', 's1__desc-text');
  p2.innerHTML =
    '<strong>ACLsmith is a narrow demonstration.</strong> Roughly 5% of the idea, pointed at one problem: the subtle semantic flaws hiding in Cisco access control lists.';

  descWrap.appendChild(p1);
  descWrap.appendChild(p2);
  desc.appendChild(descLabel);
  desc.appendChild(descWrap);

  body.appendChild(calls);
  body.appendChild(desc);

  // --- Row 3 — stat footline
  const footline = el('div', 's1__footline');
  const statWrap = el('div', 's1__stat-wrap');
  const statValue = el('span', 's1__stat-value');
  statValue.textContent = '0';
  const statSuffix = el('span', 's1__stat-suffix');
  statSuffix.textContent = '%';
  statWrap.appendChild(statValue);
  statWrap.appendChild(statSuffix);

  const caption = el('p', 's1__caption');
  caption.textContent =
    'Success rate on expert-level hacking tasks. UK AISI evaluation of Claude Mythos, April 2026.';

  const mark = el('div', 's1__mark');

  footline.appendChild(statWrap);
  footline.appendChild(caption);
  footline.appendChild(mark);

  inner.appendChild(mast);
  inner.appendChild(body);
  inner.appendChild(footline);
  section.appendChild(inner);

  function animate() {
    const proxy = { val: 0 };
    const tl = gsap.timeline();

    // Masthead sweep in
    tl.fromTo(
      mastTitle,
      { opacity: 0, y: 24 },
      { opacity: 1, y: 0, duration: 0.9, ease: 'expo.out' },
      0,
    );

    tl.fromTo(
      mastMeta.children,
      { opacity: 0, y: 10 },
      { opacity: 1, y: 0, duration: 0.5, ease: 'expo.out', stagger: 0.06 },
      0.2,
    );

    // Call-letter lines stagger
    tl.fromTo(
      callsTitle.querySelectorAll('span'),
      { opacity: 0, x: -16 },
      { opacity: 1, x: 0, duration: 0.6, ease: 'expo.out', stagger: 0.09 },
      0.4,
    );

    tl.fromTo(
      [callsLabel, callsSub],
      { opacity: 0, y: 10 },
      { opacity: 1, y: 0, duration: 0.5, ease: 'expo.out', stagger: 0.08 },
      0.5,
    );

    // Description column
    tl.fromTo(
      [descLabel, p1, p2],
      { opacity: 0, y: 10 },
      { opacity: 1, y: 0, duration: 0.5, ease: 'expo.out', stagger: 0.08 },
      0.7,
    );

    // CTAs
    tl.to([ctaPrimary, ctaSecondary], { opacity: 1, duration: 0.5, ease: 'expo.out', stagger: 0.08 }, 1.0);

    // Stat count-up
    tl.to(
      proxy,
      {
        val: 73,
        duration: 1.1,
        ease: 'expo.out',
        onUpdate: () => { statValue.textContent = String(Math.round(proxy.val)); },
        onStart: () => { gsap.set([statValue, statSuffix], { opacity: 1 }); },
      },
      1.1,
    );

    tl.fromTo(
      caption,
      { opacity: 0, y: 10 },
      { opacity: 0.78, y: 0, duration: 0.6, ease: 'expo.out' },
      1.3,
    );
  }

  return { section, animate };
}

// ---------------------------------------------------------------------------
// SECTION 2 — THE GAP
// ---------------------------------------------------------------------------
function buildSection2(): HTMLElement {
  const section = el('div', 'home__section reveal');
  const inner = el('div', 's2__inner');

  // Left: wall headline
  const leftCol = el('div');
  const wall = el('h2', 's2__wall');
  wall.innerHTML =
    'MIS-<br>' +
    'CONFIG-<br>' +
    'URED.<br>' +
    'SHADOWED.<br>' +
    'SILENT.';
  leftCol.appendChild(wall);

  // Right: narrative column
  const rightCol = el('div');
  const label = el('p', 's2__sub-label');
  label.textContent = '◆ THE PROBLEM';
  const sub = el('p', 's2__sub');
  sub.textContent =
    'Network engineers write access control lists by hand. One misplaced permit. One wildcard mask in the wrong direction. One shadowed rule beneath the wrong allow. Static linters catch syntax. They miss semantics. That gap is where the door stays open.';
  rightCol.appendChild(label);
  rightCol.appendChild(sub);

  inner.appendChild(leftCol);
  inner.appendChild(rightCol);
  section.appendChild(inner);
  return section;
}

// ---------------------------------------------------------------------------
// SECTION 3 — THE INSTRUMENT
// ---------------------------------------------------------------------------
function buildSection3(): HTMLElement {
  const section = el('div', 'home__section reveal');
  const grid = el('div', 's3__grid');

  // Left
  const left = el('div', 's3__left');
  const label = el('p', 's3__label');
  label.textContent = '◆ THE INSTRUMENT';
  const headline = el('h2', 's3__headline');
  headline.innerHTML = 'ACL<br>SMITH.';
  const body = el('p', 's3__body');
  body.textContent =
    'An agentic reasoner pointed at Cisco running-configs. It forms hypotheses, calls tools to verify them, and reports only what it can prove — with line-cited evidence.';
  left.appendChild(label);
  left.appendChild(headline);
  left.appendChild(body);

  // Right — terminal
  const right = el('div', 's3__right');
  const term = el('div', 's3__terminal');
  const chrome = el('div', 's3__term-chrome');
  chrome.textContent = '$ aclsmith shadowed.conf';
  term.appendChild(chrome);

  const lines: string[] = [
    `<span class="term-prompt">&gt; </span><span class="term-tool">list_acls</span>`,
    `<span class="term-ret">&larr; </span><span class="term-val">WAN-IN (6 rules)</span>`,
    `<span class="term-prompt">&gt; </span><span class="term-tool">inspect_acl</span> <span class="term-args">{ "name": "WAN-IN" }</span>`,
    `<span class="term-ret">&larr; </span><span class="term-val">[6 rules returned]</span>`,
    `<span class="term-prompt">&gt; </span><span class="term-tool">trace_packet</span> <span class="term-args">{ src: "10.0.0.99", dst: "10.0.0.10", proto: "tcp", port: 22 }</span>`,
    `<span class="term-ret">&larr; </span><span class="term-val">matched rule 30 PERMIT</span> <span class="term-warn">&#9888;</span>`,
    `<span class="term-prompt">&gt; </span><span class="term-tool">trace_packet</span> <span class="term-args">{ src: "198.51.100.7", dst: "10.0.0.10", proto: "tcp", port: 22 }</span>`,
    `<span class="term-ret">&larr; </span><span class="term-val">matched rule 40 DENY</span>`,
    `<span class="term-finding">[FINDING] rule 40 shadowed by rule 30 — spoofed source permitted.</span>`,
  ];
  for (const line of lines) {
    const div = el('div', 'term-line', line);
    term.appendChild(div);
  }

  right.appendChild(term);
  grid.appendChild(left);
  grid.appendChild(right);
  section.appendChild(grid);
  return section;
}

// ---------------------------------------------------------------------------
// SECTION 4 — METHOD (How it reasons)
// ---------------------------------------------------------------------------
function buildSection4(): HTMLElement {
  const section = el('div', 'home__section reveal');
  section.id = 'section-how';

  const inner = el('div', 's4__inner');
  const headline = el('h2', 's4__headline');
  headline.textContent = 'HOW IT REASONS.';

  const steps = el('div', 's4__steps');
  const stepData = [
    { num: '01', title: 'HYPOTHESIZE',
      body: 'Reads the config. Identifies suspect rules based on common ACL anti-patterns — RFC1918 permits on WAN, broad permits above specific denies, direction mismatches.' },
    { num: '02', title: 'QUERY',
      body: 'Calls tools to inspect the config in detail. list_acls. inspect_acl. trace_packet.' },
    { num: '03', title: 'VERIFY',
      body: 'Traces hypothetical packets through the ruleset. A suspicion becomes a finding only when traced.' },
    { num: '04', title: 'REPORT',
      body: 'Produces line-numbered findings with severity, summary, explanation, and suggested fix.' },
  ];
  for (const s of stepData) {
    const step = el('div', 'step');
    const num = el('div', 'step__num');
    num.textContent = s.num;
    const title = el('div', 'step__title');
    title.textContent = s.title;
    const body = el('p', 'step__body');
    body.textContent = s.body;
    step.appendChild(num);
    step.appendChild(title);
    step.appendChild(body);
    steps.appendChild(step);
  }

  const tagline = el('div', 's4__tagline');
  tagline.textContent = '◆ AUTONOMOUS · VERIFIED · LINE-CITED';

  inner.appendChild(headline);
  inner.appendChild(steps);
  inner.appendChild(tagline);
  section.appendChild(inner);
  return section;
}

// ---------------------------------------------------------------------------
// SECTION 5 — STACK
// ---------------------------------------------------------------------------
function buildSection5(): HTMLElement {
  const section = el('div', 'home__section reveal');
  const inner = el('div', 's5__inner');

  const headline = el('h2', 's5__headline');
  headline.textContent = 'BUILT WITH.';

  const pills = el('div', 's5__pills');
  const pillNames = ['CLAUDE OPUS 4.7', 'TYPESCRIPT', 'THREE.JS', 'GSAP', 'VITE'];
  for (const name of pillNames) {
    const pill = el('div', 'pill');
    pill.textContent = name;
    pills.appendChild(pill);
  }

  const stats = el('div', 's5__stats');
  const statData = [
    { big: '~4.5 HRS', label: 'HACKATHON BUILD TIME' },
    { big: '1 DEV', label: 'SOLO' },
    { big: '$0 / PAID APIs', label: 'CLAUDE CREDITS ONLY' },
  ];
  for (const s of statData) {
    const col = el('div', 's5__stat-col');
    const big = el('div', 's5__stat-big');
    big.textContent = s.big;
    const label = el('div', 's5__stat-label');
    label.textContent = s.label;
    col.appendChild(big);
    col.appendChild(label);
    stats.appendChild(col);
  }

  inner.appendChild(headline);
  inner.appendChild(pills);
  inner.appendChild(stats);
  section.appendChild(inner);
  return section;
}

// ---------------------------------------------------------------------------
// SECTION 6 — LAUNCH
// ---------------------------------------------------------------------------
function buildSection6(): HTMLElement {
  const section = el('div', 'home__section home__section--s6 reveal');
  const inner = el('div', 's6__inner');

  const headline = el('h2', 's6__headline');
  headline.innerHTML = 'SEE IT<br>REASON.';

  const body = el('p', 's6__body');
  body.textContent =
    'Drop in a Cisco config. Watch Opus 4.7 investigate it live. Findings arrive in under 30 seconds on the demo configs.';

  const cta = el('a', 's6__cta');
  cta.href = '#/app';
  cta.innerHTML = 'LAUNCH ACLSMITH <span aria-hidden="true">→</span>';

  const credit = el('p', 's6__credit');
  credit.innerHTML =
    'SYNTHESIS HACKS · UCSC · ' +
    '<a href="https://github.com/riptide-06/ALCsmith">GITHUB</a>';

  inner.appendChild(headline);
  inner.appendChild(body);
  inner.appendChild(cta);
  inner.appendChild(credit);
  section.appendChild(inner);
  return section;
}

// ---------------------------------------------------------------------------
// Mount
// ---------------------------------------------------------------------------
export function mountHome(root: HTMLElement): () => void {
  const home = el('div', 'home');

  // ---- Fixed top chrome grid ----
  const header = el('header', 'home__header');
  const headerCells: Array<[string, string]> = [
    ['PROJECT /',  'ACLSMITH'],
    ['PLATE /',    '04-19 · MMXXVI'],
    ['REFERENCE /','CLAUDE MYTHOS · GLASSWING'],
    ['STATUS /',   'PUBLIC · DEMO'],
  ];
  for (const [k, v] of headerCells) {
    const cell = el('div', 'home__header-cell');
    const label = el('span', 'label');
    label.textContent = k;
    const val = el('span', 'val');
    val.textContent = v;
    cell.appendChild(label);
    cell.appendChild(val);
    header.appendChild(cell);
  }

  // ---- Fixed bottom chrome ----
  const footer = el('footer', 'home__footer');
  const footerLeft = el('div', 'home__footer-left');
  const slider = el('div', 'home__footer-slider');
  const sliderLabel = el('span');
  sliderLabel.textContent = 'CYCLE · 73%';
  footerLeft.appendChild(slider);
  footerLeft.appendChild(sliderLabel);

  const mark = el('div', 'home__footer-mark');

  const footerRight = el('div', 'home__footer-right');
  const version = el('span');
  version.textContent = 'VERSION 0.1.0 / RC.1';
  const coords = el('span');
  coords.textContent = '37.0009°N · 122.0595°W';
  footerRight.appendChild(coords);
  footerRight.appendChild(version);

  footer.appendChild(footerLeft);
  footer.appendChild(mark);
  footer.appendChild(footerRight);

  // ---- Sections ----
  const { section: s1, animate: animateS1 } = buildSection1();
  const s2 = buildSection2();
  const s3 = buildSection3();
  const s4 = buildSection4();
  const s5 = buildSection5();
  const s6 = buildSection6();

  home.appendChild(header);
  home.appendChild(s1);
  home.appendChild(s2);
  home.appendChild(s3);
  home.appendChild(s4);
  home.appendChild(s5);
  home.appendChild(s6);
  home.appendChild(footer);

  root.appendChild(home);

  animateS1();

  // Scroll reveal
  const revealEls = home.querySelectorAll<HTMLElement>('.reveal');
  const scrollTriggers: ScrollTrigger[] = [];
  revealEls.forEach((el) => {
    const st = ScrollTrigger.create({
      trigger: el,
      start: 'top 78%',
      onEnter: () => {
        gsap.to(el, {
          opacity: 1, y: 0,
          duration: 0.8, ease: 'expo.out',
        });
      },
    });
    scrollTriggers.push(st);
  });

  return () => {
    scrollTriggers.forEach((st) => st.kill());
    gsap.killTweensOf('*');
    home.remove();
  };
}
