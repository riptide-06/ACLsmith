export interface ConfigEditor {
  el: HTMLElement;
  setText(text: string): void;
  setFileInfo(name: string, lineCount: number): void;
  highlightLines(lineNumbers: number[], severity: 'critical' | 'warning' | 'info'): void;
  clearHighlight(): void;
  scrollToLine(n: number): void;
}

export function createConfigEditor(): ConfigEditor {
  const pane = document.createElement('div');
  pane.className = 'editor-pane';

  // Pane title strip
  const titleStrip = document.createElement('div');
  titleStrip.className = 'pane-title';

  const diamond = document.createElement('span');
  diamond.className = 'pane-title__diamond';
  diamond.textContent = '◆';

  const titleText = document.createElement('span');
  titleText.textContent = ' INPUT';

  titleStrip.appendChild(diamond);
  titleStrip.appendChild(titleText);
  pane.appendChild(titleStrip);

  // Initial empty state — single centered message
  const empty = document.createElement('div');
  empty.className = 'editor-empty';

  const prompt = document.createElement('div');
  prompt.className = 'editor-empty__prompt';
  prompt.textContent = '>_ AWAITING CONFIG';

  const blinkCursor = document.createElement('span');
  blinkCursor.className = 'editor-empty__blink';
  blinkCursor.textContent = '█';
  prompt.appendChild(blinkCursor);

  empty.appendChild(prompt);
  pane.appendChild(empty);

  // Editor (hidden until text is set)
  const editor = document.createElement('div');
  editor.className = 'editor';
  editor.style.display = 'none';

  const scroll = document.createElement('div');
  scroll.className = 'editor-scroll';
  editor.appendChild(scroll);
  pane.appendChild(editor);

  // Track highlighted lines and their severity class
  let highlightedLines: Set<number> = new Set();
  let currentHlClass = '';
  let stickyLines: Set<number> = new Set();
  let stickySeverity = '';

  function getLineEl(n: number): HTMLElement | null {
    return scroll.querySelector<HTMLElement>(`.editor-line[data-line="${n}"]`);
  }

  function severityClass(severity: 'critical' | 'warning' | 'info'): string {
    if (severity === 'critical') return 'hl-critical';
    if (severity === 'warning')  return 'hl-warn';
    return 'hl-warn'; // info → use warn tint
  }

  function focusClass(severity: 'critical' | 'warning' | 'info'): string {
    if (severity === 'critical') return 'hl-focus-critical';
    if (severity === 'warning')  return 'hl-focus-warn';
    return 'hl-focus-warn';
  }

  function applyHighlight(lines: Set<number>, cls: string) {
    scroll.querySelectorAll<HTMLElement>('.editor-line').forEach(el => {
      el.classList.remove('hl-warn', 'hl-critical', 'hl-focus-warn', 'hl-focus-critical');
    });
    for (const n of lines) {
      const el = getLineEl(n);
      if (el) el.classList.add(cls);
    }
  }

  const api: ConfigEditor = {
    el: pane,

    setFileInfo(name: string, lineCount: number) {
      titleText.textContent = ` INPUT · ${name} · ${lineCount} line${lineCount !== 1 ? 's' : ''}`;
    },

    setText(text: string) {
      scroll.innerHTML = '';
      const lines = text.split('\n');
      const width = String(lines.length).length;

      for (let i = 0; i < lines.length; i++) {
        const lineNum = i + 1;
        const row = document.createElement('div');
        row.className = 'editor-line';
        row.dataset.line = String(lineNum);

        const gutter = document.createElement('span');
        gutter.className = 'gutter';
        gutter.textContent = String(lineNum).padStart(width, ' ');

        const content = document.createElement('span');
        content.className = 'content';
        content.textContent = lines[i];

        row.appendChild(gutter);
        row.appendChild(content);
        scroll.appendChild(row);
      }

      empty.style.display = 'none';
      editor.style.display = 'flex';
      highlightedLines = new Set();
      stickyLines = new Set();
      stickySeverity = '';
      currentHlClass = '';
    },

    highlightLines(lineNumbers: number[], severity: 'critical' | 'warning' | 'info') {
      // Check if these are the sticky lines — if so, use focus class
      const sameAsSticky =
        stickyLines.size > 0 &&
        lineNumbers.length === stickyLines.size &&
        lineNumbers.every(n => stickyLines.has(n));

      const cls = sameAsSticky ? focusClass(severity) : severityClass(severity);
      highlightedLines = new Set(lineNumbers);
      currentHlClass = cls;
      applyHighlight(highlightedLines, cls);
    },

    clearHighlight() {
      // Restore sticky highlight if any
      if (stickyLines.size > 0) {
        applyHighlight(stickyLines, focusClass(stickySeverity as 'critical' | 'warning' | 'info'));
      } else {
        scroll.querySelectorAll<HTMLElement>('.editor-line').forEach(el => {
          el.classList.remove('hl-warn', 'hl-critical', 'hl-focus-warn', 'hl-focus-critical');
        });
        highlightedLines = new Set();
        currentHlClass = '';
      }
    },

    scrollToLine(n: number) {
      const lineEl = getLineEl(n);
      if (!lineEl) return;

      // Sticky + scroll
      stickyLines = new Set([n]);
      stickySeverity = currentHlClass.includes('critical') ? 'critical' : 'warning';

      // Smooth scroll: put target line near top-third of pane
      const lineHeight = lineEl.getBoundingClientRect().height || 20;
      const targetTop = (n - 1) * lineHeight - scroll.clientHeight * 0.2;
      scroll.scrollTo({ top: Math.max(0, targetTop), behavior: 'smooth' });

      // Emphasize the specific line
      const cls = focusClass(stickySeverity as 'critical' | 'warning' | 'info');
      applyHighlight(highlightedLines.size > 0 ? highlightedLines : stickyLines, currentHlClass || cls);
      lineEl.classList.remove('hl-warn', 'hl-critical', 'hl-focus-warn', 'hl-focus-critical');
      lineEl.classList.add(cls);
    },
  };

  return api;
}
