import * as vscode from 'vscode';

export type ProgressStepStatus = 'pending' | 'active' | 'done' | 'error';

export type ProgressStep = {
  label: string;
  status: ProgressStepStatus;
  detail?: string;
};

export class ProgressViewProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = 'ollamaCoderChat.progress';

  private view?: vscode.WebviewView;
  private steps: ProgressStep[] = [];
  private idleLabel = 'Ready';

  public resolveWebviewView(
    webviewView: vscode.WebviewView,
    _context: vscode.WebviewViewResolveContext,
    _token: vscode.CancellationToken
  ): void {
    this.view = webviewView;
    webviewView.webview.options = { enableScripts: true };
    webviewView.webview.html = ProgressViewProvider.getHtml();
    // Send current state once the view is ready
    webviewView.webview.onDidReceiveMessage((msg: { type: string }) => {
      if (msg.type === 'ready') {
        this.flush();
      }
    });
  }

  /** Replace all steps at once */
  public setSteps(steps: ProgressStep[]): void {
    this.steps = steps;
    this.flush();
  }

  /** Mark a single step by index as active (sets all previous to done) */
  public activateStep(index: number, detail?: string): void {
    this.steps = this.steps.map((s, i) => ({
      ...s,
      status: i < index ? 'done' : i === index ? 'active' : 'pending',
      detail: i === index ? (detail ?? s.detail) : s.detail,
    }));
    this.flush();
  }

  /** Mark a single step done */
  public completeStep(index: number): void {
    if (this.steps[index]) {
      this.steps[index] = { ...this.steps[index], status: 'done' };
      this.flush();
    }
  }

  /** Mark a step errored */
  public errorStep(index: number, detail?: string): void {
    if (this.steps[index]) {
      this.steps[index] = { ...this.steps[index], status: 'error', detail };
      this.flush();
    }
  }

  /** Mark all steps done */
  public allDone(): void {
    this.steps = this.steps.map((s) => ({ ...s, status: 'done' }));
    this.flush();
  }

  /** Clear back to idle */
  public clear(): void {
    this.steps = [];
    this.flush();
  }

  private flush(): void {
    if (this.view?.visible) {
      void this.view.webview.postMessage({
        type: 'update',
        steps: this.steps,
        idle: this.idleLabel,
      });
    }
  }

  private static getHtml(): string {
    return /* html */ `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline';">
<meta name="viewport" content="width=device-width,initial-scale=1">
<style>
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

body {
  font-family: var(--vscode-font-family, ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif);
  font-size: 12px;
  background: transparent;
  color: var(--vscode-foreground, #cccccc);
  padding: 10px 12px 14px;
  min-height: 100%;
}

#idle {
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--vscode-descriptionForeground, #888);
  font-size: 12px;
  padding: 4px 0;
}

.idle-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--vscode-descriptionForeground, #666);
  opacity: 0.5;
}

#steps {
  display: flex;
  flex-direction: column;
  gap: 0;
}

.step {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 7px 0;
  position: relative;
  transition: opacity 0.2s;
}

/* Connector line between steps */
.step:not(:last-child)::after {
  content: '';
  position: absolute;
  left: 11px;
  top: 26px;
  bottom: -7px;
  width: 1px;
  background: var(--vscode-widget-border, rgba(127,127,127,0.25));
}

.step.status-done:not(:last-child)::after {
  background: color-mix(in srgb, var(--vscode-testing-iconPassed, #4caf50) 50%, transparent);
}

/* Number / status indicator */
.step-indicator {
  flex-shrink: 0;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 10px;
  font-weight: 700;
  margin-top: 1px;
  position: relative;
  z-index: 1;
}

.status-pending .step-indicator {
  border: 1.5px solid var(--vscode-widget-border, rgba(127,127,127,0.4));
  color: var(--vscode-descriptionForeground, #888);
  background: var(--vscode-sideBar-background, #1e1e1e);
}

.status-active .step-indicator {
  background: var(--vscode-button-background, #0e639c);
  color: var(--vscode-button-foreground, #fff);
  border: none;
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--vscode-button-background, #0e639c) 25%, transparent);
  animation: pulse 1.8s ease-in-out infinite;
}

.status-done .step-indicator {
  background: color-mix(in srgb, var(--vscode-testing-iconPassed, #4caf50) 18%, transparent);
  border: 1.5px solid color-mix(in srgb, var(--vscode-testing-iconPassed, #4caf50) 60%, transparent);
  color: var(--vscode-testing-iconPassed, #4caf50);
}

.status-error .step-indicator {
  background: color-mix(in srgb, var(--vscode-errorForeground, #f85149) 15%, transparent);
  border: 1.5px solid color-mix(in srgb, var(--vscode-errorForeground, #f85149) 50%, transparent);
  color: var(--vscode-errorForeground, #f85149);
}

@keyframes pulse {
  0%, 100% { box-shadow: 0 0 0 3px color-mix(in srgb, var(--vscode-button-background, #0e639c) 25%, transparent); }
  50%       { box-shadow: 0 0 0 5px color-mix(in srgb, var(--vscode-button-background, #0e639c) 10%, transparent); }
}

.step-body {
  flex: 1;
  min-width: 0;
  padding-top: 2px;
}

.step-label {
  line-height: 1.4;
  word-break: break-word;
}

.status-pending .step-label {
  color: var(--vscode-descriptionForeground, #888);
}

.status-active .step-label {
  color: var(--vscode-foreground, #ccc);
  font-weight: 600;
}

.status-done .step-label {
  color: var(--vscode-descriptionForeground, #888);
}

.status-error .step-label {
  color: var(--vscode-errorForeground, #f85149);
}

.step-detail {
  font-size: 10.5px;
  color: var(--vscode-descriptionForeground, #777);
  margin-top: 2px;
  font-style: italic;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 100%;
}

/* Animated dots for active step */
.active-dots {
  display: inline-flex;
  gap: 3px;
  margin-left: 4px;
  vertical-align: middle;
}

.active-dots span {
  width: 3px;
  height: 3px;
  border-radius: 50%;
  background: var(--vscode-button-background, #0e639c);
  animation: bounce 1.2s ease-in-out infinite;
  display: inline-block;
}

.active-dots span:nth-child(2) { animation-delay: 0.2s; }
.active-dots span:nth-child(3) { animation-delay: 0.4s; }

@keyframes bounce {
  0%, 80%, 100% { transform: translateY(0); opacity: 0.4; }
  40%            { transform: translateY(-3px); opacity: 1; }
}

.step-enter {
  animation: stepIn 0.2s ease-out both;
}

@keyframes stepIn {
  from { opacity: 0; transform: translateX(-6px); }
  to   { opacity: 1; transform: translateX(0); }
}
</style>
</head>
<body>
<div id="idle"><div class="idle-dot"></div><span>Ready</span></div>
<div id="steps" style="display:none"></div>

<script>
(function () {
  const vscode = acquireVsCodeApi();
  const idleEl = document.getElementById('idle');
  const stepsEl = document.getElementById('steps');

  const ICONS = { done: '✓', error: '✕' };

  function render(steps, idleLabel) {
    if (!steps || !steps.length) {
      idleEl.style.display = 'flex';
      idleEl.querySelector('span').textContent = idleLabel || 'Ready';
      stepsEl.style.display = 'none';
      stepsEl.innerHTML = '';
      return;
    }
    idleEl.style.display = 'none';
    stepsEl.style.display = 'flex';

    const prevCount = stepsEl.children.length;
    stepsEl.innerHTML = '';

    steps.forEach((step, i) => {
      const div = document.createElement('div');
      div.className = 'step status-' + step.status + (i >= prevCount ? ' step-enter' : '');

      const indicator = document.createElement('div');
      indicator.className = 'step-indicator';
      if (step.status === 'done') indicator.textContent = ICONS.done;
      else if (step.status === 'error') indicator.textContent = ICONS.error;
      else indicator.textContent = String(i + 1);

      const body = document.createElement('div');
      body.className = 'step-body';

      const label = document.createElement('div');
      label.className = 'step-label';
      label.textContent = step.label;

      if (step.status === 'active') {
        const dots = document.createElement('span');
        dots.className = 'active-dots';
        dots.innerHTML = '<span></span><span></span><span></span>';
        label.appendChild(dots);
      }

      body.appendChild(label);

      if (step.detail) {
        const detail = document.createElement('div');
        detail.className = 'step-detail';
        detail.textContent = step.detail;
        body.appendChild(detail);
      }

      div.appendChild(indicator);
      div.appendChild(body);
      stepsEl.appendChild(div);
    });
  }

  window.addEventListener('message', (event) => {
    const msg = event.data;
    if (msg.type === 'update') render(msg.steps, msg.idle);
  });

  vscode.postMessage({ type: 'ready' });
})();
</script>
</body>
</html>`;
  }
}
