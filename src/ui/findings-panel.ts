import type { Finding } from '../agent/loop.js';

export interface FindingsPanel {
  el: HTMLElement;
  setInvestigating(): void;
  appendFinding(finding: Finding, onHoverHighlight: (lines: number[], sev: Finding['severity']) => void, onHoverClear: () => void): void;
  setComplete(count: number, onRunAgain: () => void): void;
  reset(): void;
}

export function createFindingsPanel(
  onLineChipClick: (line: number) => void,
): FindingsPanel {
  const pane = document.createElement('div');
  pane.className = 'findings-pane';

  // Pane title strip
  const titleStrip = document.createElement('div');
  titleStrip.className = 'pane-title';

  const diamond = document.createElement('span');
  diamond.className = 'pane-title__diamond';
  diamond.textContent = '◆';

  const titleLabel = document.createTextNode(' FINDINGS · ');

  const countEl = document.createElement('span');
  countEl.className = 'pane-title__count';
  countEl.textContent = '0';

  titleStrip.appendChild(diamond);
  titleStrip.appendChild(titleLabel);
  titleStrip.appendChild(countEl);
  pane.appendChild(titleStrip);

  // Body scroll area
  const body = document.createElement('div');
  body.className = 'findings-body';
  pane.appendChild(body);

  let findingsCount = 0;
  let investigatingEl: HTMLElement | null = null;
  let headerEl: HTMLElement | null = null;
  let listEl: HTMLElement | null = null;

  function updateCount(n: number) {
    countEl.textContent = String(n);
    countEl.classList.remove('flash');
    // Force reflow to restart animation
    void countEl.offsetWidth;
    countEl.classList.add('flash');
    setTimeout(() => countEl.classList.remove('flash'), 120);
  }

  function clearBody() {
    body.innerHTML = '';
    investigatingEl = null;
    headerEl = null;
    listEl = null;
  }

  const api: FindingsPanel = {
    el: pane,

    setInvestigating() {
      clearBody();
      findingsCount = 0;
      countEl.textContent = '0';

      const msg = document.createElement('div');
      msg.className = 'findings-pane__investigating';
      msg.textContent = '◆ NO FINDINGS · awaiting investigation';
      body.appendChild(msg);
      investigatingEl = msg;
    },

    appendFinding(
      finding: Finding,
      onHoverHighlight: (lines: number[], sev: Finding['severity']) => void,
      onHoverClear: () => void,
    ) {
      // Remove "awaiting investigation" text on first finding
      if (investigatingEl) {
        investigatingEl.remove();
        investigatingEl = null;
      }

      // Create list container if needed
      if (!listEl) {
        listEl = document.createElement('div');
        listEl.className = 'findings-list';
        body.appendChild(listEl);
      }

      findingsCount++;
      updateCount(findingsCount);

      const card = document.createElement('div');
      card.className = 'finding-card';

      // Top row: severity pill + summary
      const top = document.createElement('div');
      top.className = 'finding-card__top';

      const pill = document.createElement('span');
      pill.className = `severity-pill ${finding.severity}`;
      pill.textContent = finding.severity;

      const summary = document.createElement('div');
      summary.className = 'finding-card__summary';
      summary.textContent = finding.summary;

      top.appendChild(pill);
      top.appendChild(summary);

      // Line chips
      const chips = document.createElement('div');
      chips.className = 'finding-card__chips';

      for (const lineNum of finding.lineNumbers) {
        const chip = document.createElement('span');
        chip.className = 'line-chip';
        chip.textContent = `L${lineNum}`;
        chip.addEventListener('click', (e) => {
          e.stopPropagation();
          onLineChipClick(lineNum);
        });
        chips.appendChild(chip);
      }

      // Expanded detail
      const detail = document.createElement('div');
      detail.className = 'finding-card__detail';

      const title = document.createElement('div');
      title.className = 'finding-card__title';
      title.textContent = finding.title;

      const explanation = document.createElement('div');
      explanation.className = 'finding-card__explanation';
      explanation.textContent = finding.explanation;

      const fixBlock = document.createElement('div');
      fixBlock.className = 'finding-card__fix';

      const fixLabel = document.createElement('div');
      fixLabel.className = 'finding-card__fix-label';
      fixLabel.textContent = '↳ SUGGESTED FIX';

      const fixText = document.createElement('div');
      fixText.className = 'finding-card__fix-text';
      fixText.textContent = finding.fix;

      fixBlock.appendChild(fixLabel);
      fixBlock.appendChild(fixText);

      detail.appendChild(title);
      detail.appendChild(explanation);
      detail.appendChild(fixBlock);

      card.appendChild(top);
      card.appendChild(chips);
      card.appendChild(detail);

      // Toggle expanded on card click (not on chip clicks)
      card.addEventListener('click', () => {
        card.classList.toggle('expanded');
      });

      // Hover: highlight lines in editor
      card.addEventListener('mouseenter', () => {
        onHoverHighlight(finding.lineNumbers, finding.severity);
      });

      card.addEventListener('mouseleave', () => {
        onHoverClear();
      });

      listEl.appendChild(card);

      // Trigger entry animation
      requestAnimationFrame(() => {
        card.classList.add('visible');
      });
    },

    setComplete(count: number, onRunAgain: () => void) {
      if (investigatingEl) {
        investigatingEl.remove();
        investigatingEl = null;
      }

      // Remove any existing footer before appending a fresh one
      if (headerEl) {
        headerEl.remove();
        headerEl = null;
      }

      // Footer strip appended after the last card
      headerEl = document.createElement('div');
      headerEl.className = 'findings-footer';

      const footerCount = document.createElement('div');
      footerCount.className = 'findings-pane__count';
      footerCount.textContent = `${count} finding${count !== 1 ? 's' : ''}`;

      const runBtn = document.createElement('button');
      runBtn.className = 'demo-btn';
      runBtn.textContent = 'Run again';
      runBtn.addEventListener('click', onRunAgain);

      headerEl.appendChild(footerCount);
      headerEl.appendChild(runBtn);

      body.appendChild(headerEl);
    },

    reset() {
      clearBody();
      findingsCount = 0;
      countEl.textContent = '0';
    },
  };

  return api;
}
