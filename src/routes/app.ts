import Anthropic from '@anthropic-ai/sdk';
import { parseConfig } from '../agent/parser.js';
import { runAgent, type AgentEvent, type Finding } from '../agent/loop.js';
import { createConfigEditor } from '../ui/config-editor.js';
import { createReasoningStream } from '../ui/reasoning-stream.js';
import { createFindingsPanel } from '../ui/findings-panel.js';

export function mountApp(root: HTMLElement): () => void {
  let torn = false;
  let currentText = '';
  let lastToolName = '';

  // Bug 1: generation counter to ignore events from stale runs
  let runGeneration = 0;

  // -----------------------------------------------------------------------
  // Shell
  // -----------------------------------------------------------------------
  const app = document.createElement('div');
  app.className = 'app';

  // -----------------------------------------------------------------------
  // Top bar
  // -----------------------------------------------------------------------
  const bar = document.createElement('header');
  bar.className = 'app-bar';

  // Wordmark block
  const wordmark = document.createElement('span');
  wordmark.className = 'app-bar__wordmark';
  wordmark.textContent = 'ACLsmith';

  const wordmarkCursor = document.createElement('span');
  wordmarkCursor.className = 'app-bar__cursor';
  wordmarkCursor.textContent = '█';
  wordmark.appendChild(wordmarkCursor);

  // Demo buttons
  const demoRow = document.createElement('div');
  demoRow.className = 'app-bar__demos';

  const demoConfigs: Array<{ label: string; file: string }> = [
    { label: 'Shadowed ACL', file: 'shadowed.conf' },
    { label: 'Leaky VLAN',   file: 'leaky-vlan.conf' },
    { label: 'Clean Config', file: 'clean.conf' },
  ];

  const demoBtns: Array<{ btn: HTMLButtonElement; file: string }> = [];

  for (const { label, file } of demoConfigs) {
    const btn = document.createElement('button');
    btn.className = 'demo-btn';
    btn.textContent = label;
    btn.dataset.file = file;
    btn.addEventListener('click', () => handleDemoLoad(file));
    demoRow.appendChild(btn);
    demoBtns.push({ btn, file });
  }

  // Spacer
  const spacer = document.createElement('span');
  spacer.className = 'app-bar__spacer';

  // Status pill
  const statusWrap = document.createElement('div');
  statusWrap.className = 'app-bar__status';

  const dot = document.createElement('span');
  dot.className = 'status-dot';

  const statusText = document.createElement('span');
  statusText.className = 'status-text';
  statusText.textContent = 'READY';

  statusWrap.appendChild(dot);
  statusWrap.appendChild(statusText);

  // ESC back link
  const escLink = document.createElement('a');
  escLink.className = 'app-bar__esc';
  escLink.href = '#/';
  escLink.textContent = '[ ESC ]';

  bar.appendChild(wordmark);
  bar.appendChild(demoRow);
  bar.appendChild(spacer);
  bar.appendChild(statusWrap);
  bar.appendChild(escLink);

  // -----------------------------------------------------------------------
  // Hazard stripe
  // -----------------------------------------------------------------------
  const stripe = document.createElement('div');
  stripe.className = 'app-stripe';

  // -----------------------------------------------------------------------
  // UI components
  // -----------------------------------------------------------------------
  const editor = createConfigEditor();
  const stream = createReasoningStream();
  const findings = createFindingsPanel((lineNum) => {
    editor.scrollToLine(lineNum);
  });

  // Right column wrapper
  const rightCol = document.createElement('div');
  rightCol.className = 'right-col';
  rightCol.appendChild(stream.el);
  rightCol.appendChild(findings.el);

  // -----------------------------------------------------------------------
  // Layout
  // -----------------------------------------------------------------------
  app.appendChild(bar);
  app.appendChild(stripe);
  app.appendChild(editor.el);
  app.appendChild(rightCol);
  root.appendChild(app);

  // -----------------------------------------------------------------------
  // Anthropic client
  // -----------------------------------------------------------------------
  const apiKey = import.meta.env.VITE_ANTHROPIC_API_KEY;
  if (!apiKey) {
    showError('VITE_ANTHROPIC_API_KEY is not set. Add it to .env.local and restart the dev server.');
    return () => { torn = true; root.innerHTML = ''; };
  }

  // Demo-only: the API key is exposed to the browser. Production would proxy requests through a server-side route.
  const client = new Anthropic({ apiKey, dangerouslyAllowBrowser: true });

  // -----------------------------------------------------------------------
  // Status helpers — simplified to three states
  // -----------------------------------------------------------------------
  function setStatus(label: 'READY' | 'REASONING' | string) {
    statusText.textContent = `[ ${label} ]`;
    dot.classList.remove('reasoning', 'complete');

    if (label === 'REASONING') {
      dot.classList.add('reasoning');
    } else if (label.startsWith('COMPLETE')) {
      dot.classList.add('complete');
    }
    // READY: no extra class; dot stays default --ink-faint
  }

  function setActiveDemoBtn(file: string | null) {
    for (const { btn, file: f } of demoBtns) {
      btn.classList.toggle('active', f === file);
    }
  }

  function showError(msg: string) {
    const err = document.createElement('div');
    err.className = 'findings-error';
    err.textContent = msg;
    findings.el.innerHTML = '';
    findings.el.appendChild(err);
    setStatus('READY');
  }

  // -----------------------------------------------------------------------
  // Demo load handler
  // -----------------------------------------------------------------------
  async function handleDemoLoad(filename: string) {
    if (torn) return;

    // Bump generation — any in-flight events from previous gen will be ignored
    runGeneration++;

    setActiveDemoBtn(filename);

    try {
      const res = await fetch(`/configs/${filename}`);
      if (!res.ok) throw new Error(`HTTP ${res.status} fetching /configs/${filename}`);
      const text = await res.text();
      currentText = text;

      const lineCount = text.split('\n').length;
      editor.setFileInfo(filename, lineCount);
      editor.setText(text);
      stream.reset();
      findings.reset();
      findings.setInvestigating();
      setStatus('READY');

      await startAgentRun(text);
    } catch (err) {
      showError(`Failed to load config: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  // -----------------------------------------------------------------------
  // Agent run
  // -----------------------------------------------------------------------
  async function startAgentRun(rawText: string) {
    if (torn) return;
    lastToolName = '';

    // Capture generation at start of this run
    const myGeneration = runGeneration;

    // Fence-suppression state, reset per run
    let currentBuffer = '';
    let suppressed = false;

    let parsed;
    try {
      parsed = parseConfig(rawText);
    } catch (err) {
      showError(`Parse error: ${err instanceof Error ? err.message : String(err)}`);
      return;
    }

    setStatus('REASONING');

    function onEvent(e: AgentEvent) {
      // Ignore events from a stale run
      if (torn || myGeneration !== runGeneration) return;

      switch (e.type) {
        case 'text_delta': {
          // Suppress text once we hit a code fence
          if (suppressed) break;
          const prevLen = currentBuffer.length;
          currentBuffer += e.text;
          const fenceIdx = currentBuffer.indexOf('```');
          if (fenceIdx !== -1) {
            const beforeFence = fenceIdx - prevLen;
            if (beforeFence > 0) stream.appendTextDelta(e.text.slice(0, beforeFence));
            suppressed = true;
          } else {
            stream.appendTextDelta(e.text);
          }
          if (!lastToolName) {
            setStatus('REASONING');
          }
          break;
        }

        case 'tool_use_start':
          currentBuffer = '';
          suppressed = false;
          lastToolName = e.name;
          stream.addToolCall(e.id, e.name, e.input);
          setStatus('REASONING');
          break;

        case 'tool_result':
          stream.settleToolCall(e.id, e.result);
          lastToolName = '';
          setStatus('REASONING');
          break;

        case 'turn_end':
          break;

        case 'done': {
          currentBuffer = '';
          suppressed = false;

          const count = e.findings.findings.length;
          setStatus(`COMPLETE · ${count} FINDINGS`);

          // Stagger findings at 120ms intervals
          e.findings.findings.forEach((f: Finding, i: number) => {
            setTimeout(() => {
              if (torn || myGeneration !== runGeneration) return;
              findings.appendFinding(
                f,
                (lines, sev) => editor.highlightLines(lines, sev),
                () => editor.clearHighlight(),
              );
            }, i * 120);
          });

          // Show "complete" footer after stagger finishes
          const totalDelay = e.findings.findings.length * 120 + 60;
          setTimeout(() => {
            if (!torn && myGeneration === runGeneration) {
              findings.setComplete(count, () => {
                if (!torn && currentText && myGeneration === runGeneration) {
                  runGeneration++;
                  const newGen = runGeneration;
                  stream.reset();
                  findings.reset();
                  findings.setInvestigating();
                  setStatus('REASONING');
                  void startAgentRunWithGen(currentText, newGen);
                }
              });
            }
          }, totalDelay);
          break;
        }

        case 'error':
          showError(e.error);
          break;
      }
    }

    try {
      await runAgent(client, parsed, rawText, onEvent);
    } catch (err) {
      if (!torn && myGeneration === runGeneration) {
        showError(`Agent error: ${err instanceof Error ? err.message : String(err)}`);
      }
    }
  }

  // Helper used by "Run again" to keep gen in sync
  async function startAgentRunWithGen(rawText: string, gen: number) {
    if (torn || gen !== runGeneration) return;
    lastToolName = '';

    let currentBuffer = '';
    let suppressed = false;

    let parsed;
    try {
      parsed = parseConfig(rawText);
    } catch (err) {
      showError(`Parse error: ${err instanceof Error ? err.message : String(err)}`);
      return;
    }

    setStatus('REASONING');

    function onEvent(e: AgentEvent) {
      if (torn || gen !== runGeneration) return;

      switch (e.type) {
        case 'text_delta': {
          if (suppressed) break;
          const prevLen = currentBuffer.length;
          currentBuffer += e.text;
          const fenceIdx = currentBuffer.indexOf('```');
          if (fenceIdx !== -1) {
            const beforeFence = fenceIdx - prevLen;
            if (beforeFence > 0) stream.appendTextDelta(e.text.slice(0, beforeFence));
            suppressed = true;
          } else {
            stream.appendTextDelta(e.text);
          }
          if (!lastToolName) setStatus('REASONING');
          break;
        }
        case 'tool_use_start':
          currentBuffer = '';
          suppressed = false;
          lastToolName = e.name;
          stream.addToolCall(e.id, e.name, e.input);
          setStatus('REASONING');
          break;
        case 'tool_result':
          stream.settleToolCall(e.id, e.result);
          lastToolName = '';
          setStatus('REASONING');
          break;
        case 'turn_end':
          break;
        case 'done': {
          currentBuffer = '';
          suppressed = false;
          const count = e.findings.findings.length;
          setStatus(`COMPLETE · ${count} FINDINGS`);
          e.findings.findings.forEach((f: Finding, i: number) => {
            setTimeout(() => {
              if (torn || gen !== runGeneration) return;
              findings.appendFinding(
                f,
                (lines, sev) => editor.highlightLines(lines, sev),
                () => editor.clearHighlight(),
              );
            }, i * 120);
          });
          const totalDelay = e.findings.findings.length * 120 + 60;
          setTimeout(() => {
            if (!torn && gen === runGeneration) {
              findings.setComplete(count, () => {
                if (!torn && currentText && gen === runGeneration) {
                  runGeneration++;
                  const ng = runGeneration;
                  stream.reset();
                  findings.reset();
                  findings.setInvestigating();
                  setStatus('REASONING');
                  void startAgentRunWithGen(currentText, ng);
                }
              });
            }
          }, totalDelay);
          break;
        }
        case 'error':
          showError(e.error);
          break;
      }
    }

    try {
      await runAgent(client, parsed, rawText, onEvent);
    } catch (err) {
      if (!torn && gen === runGeneration) {
        showError(`Agent error: ${err instanceof Error ? err.message : String(err)}`);
      }
    }
  }

  // -----------------------------------------------------------------------
  // Teardown
  // -----------------------------------------------------------------------
  return () => {
    torn = true;
    root.innerHTML = '';
  };
}
