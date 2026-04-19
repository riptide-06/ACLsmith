export interface ReasoningStream {
  el: HTMLElement;
  appendTextDelta(text: string): void;
  addToolCall(id: string, name: string, input: unknown): void;
  settleToolCall(id: string, result: unknown): void;
  reset(): void;
}

export function createReasoningStream(): ReasoningStream {
  const pane = document.createElement('div');
  pane.className = 'stream-pane';

  // Pane title strip
  const titleStrip = document.createElement('div');
  titleStrip.className = 'pane-title';

  const diamond = document.createElement('span');
  diamond.className = 'pane-title__diamond';
  diamond.textContent = '◆';

  const titleLabel = document.createTextNode(' REASON');

  const titleCursor = document.createElement('span');
  titleCursor.className = 'pane-title__cursor';
  titleCursor.textContent = '█';

  titleStrip.appendChild(diamond);
  titleStrip.appendChild(titleLabel);
  titleStrip.appendChild(titleCursor);
  pane.appendChild(titleStrip);

  // Body scroll area
  const body = document.createElement('div');
  body.className = 'stream-body';
  pane.appendChild(body);

  // Empty state shown until first content arrives
  const emptyState = document.createElement('div');
  emptyState.className = 'stream-empty';

  const emptyLabel = document.createElement('div');
  emptyLabel.className = 'stream-empty__label';
  emptyLabel.textContent = '◆ STANDING BY';

  const emptyDesc = document.createElement('div');
  emptyDesc.className = 'stream-empty__desc';
  emptyDesc.textContent =
    'This agent runs Claude Opus 4.7 in a tool-use loop. It investigates Cisco ACLs by forming hypotheses, tracing hypothetical packets through rule chains, and reporting verified findings.';

  const emptyCta = document.createElement('div');
  emptyCta.className = 'stream-empty__cta';
  emptyCta.textContent = '>_SELECT A DEMO CONFIG ABOVE';

  const ctaBlink = document.createElement('span');
  ctaBlink.className = 'stream-empty__cta-blink';
  ctaBlink.textContent = '█';
  emptyCta.appendChild(ctaBlink);

  emptyState.appendChild(emptyLabel);
  emptyState.appendChild(emptyDesc);
  emptyState.appendChild(emptyCta);
  body.appendChild(emptyState);

  // Current text block: maintain a single <span class="reasoning-text"> with one Text node.
  // appendTextDelta calls appendData on that text node — no innerHTML, no re-render.
  let currentTextSpan: HTMLSpanElement | null = null;
  let currentTextNode: Text | null = null;

  // Map from tool id → card element
  const toolCards = new Map<string, HTMLElement>();

  function hideEmptyState() {
    emptyState.style.display = 'none';
    // Show cursor in title while active
    titleCursor.classList.add('visible');
  }

  function ensureTextBlock() {
    if (!currentTextSpan) {
      const span = document.createElement('span');
      span.className = 'reasoning-text';
      const tn = document.createTextNode('');
      span.appendChild(tn);
      body.appendChild(span);
      currentTextSpan = span;
      currentTextNode = tn;
    }
  }

  function breakTextBlock() {
    currentTextSpan = null;
    currentTextNode = null;
  }

  function scrollToBottom() {
    body.scrollTop = body.scrollHeight;
  }

  const api: ReasoningStream = {
    el: pane,

    appendTextDelta(text: string) {
      hideEmptyState();
      ensureTextBlock();
      // Critical: use appendData on the persistent Text node — never innerHTML
      currentTextNode!.appendData(text);
      scrollToBottom();
    },

    addToolCall(id: string, name: string, input: unknown) {
      hideEmptyState();
      // Break the current text block so tool card inserts cleanly
      breakTextBlock();

      // Glitch flip on ◆ in title for 80ms
      diamond.classList.add('glitch-flip');
      setTimeout(() => diamond.classList.remove('glitch-flip'), 80);

      const card = document.createElement('div');
      card.className = 'tool-card';
      card.dataset.toolId = id;

      const header = document.createElement('div');
      header.className = 'tool-card__header';

      const label = document.createElement('span');
      label.className = 'tool-card__label';
      label.textContent = 'TOOL ·';

      const nameEl = document.createElement('span');
      nameEl.className = 'tool-card__name';
      nameEl.textContent = name;

      const args = document.createElement('span');
      args.className = 'tool-card__args';
      try {
        args.textContent = JSON.stringify(input);
      } catch {
        args.textContent = String(input);
      }

      const spinner = document.createElement('span');
      spinner.className = 'tool-card__spinner';
      for (let i = 0; i < 3; i++) {
        const dot = document.createElement('span');
        spinner.appendChild(dot);
      }

      const check = document.createElement('span');
      check.className = 'tool-card__check';
      check.textContent = '✓';

      header.appendChild(label);
      header.appendChild(nameEl);
      header.appendChild(args);
      header.appendChild(spinner);
      header.appendChild(check);

      const resultEl = document.createElement('pre');
      resultEl.className = 'tool-card__result';

      card.appendChild(header);
      card.appendChild(resultEl);
      body.appendChild(card);

      toolCards.set(id, card);
      breakTextBlock();
      scrollToBottom();
    },

    settleToolCall(id: string, result: unknown) {
      const card = toolCards.get(id);
      if (!card) return;

      const resultEl = card.querySelector<HTMLElement>('.tool-card__result');
      if (resultEl) {
        try {
          resultEl.textContent = JSON.stringify(result, null, 2);
        } catch {
          resultEl.textContent = String(result);
        }
      }

      card.classList.add('settled');
      scrollToBottom();

      // After 1.8s, collapse to compact state and mark as settled for border transition
      setTimeout(() => {
        card.classList.remove('settled');
        card.classList.add('compact', 'tool-settled');
        scrollToBottom();
      }, 1800);

      breakTextBlock();
    },

    reset() {
      body.innerHTML = '';
      // Re-add empty state
      emptyState.style.display = '';
      body.appendChild(emptyState);
      // Hide running cursor
      titleCursor.classList.remove('visible');
      currentTextSpan = null;
      currentTextNode = null;
      toolCards.clear();
    },
  };

  return api;
}
