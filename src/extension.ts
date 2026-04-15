/**
 * Cascade — Free AI Models for VS Code
 * Providers: OpenRouter (free tier), Hugging Face Inference, Groq
 * All three use OpenAI-compatible chat completions with SSE streaming.
 */
import * as vscode from 'vscode';
import { SessionManager } from './chatSessions';

// ── Types ─────────────────────────────────────────────────────────────
type Provider = 'openrouter' | 'huggingface' | 'groq';

interface AttachmentItem { id: string; label: string; content: string }

// ── Free model catalogues (defaults shown first) ──────────────────────
const FREE_MODELS: Record<Provider, string[]> = {
  openrouter: [
    'meta-llama/llama-3.3-70b-instruct:free',
    'deepseek/deepseek-r1:free',
    'deepseek/deepseek-chat-v3-0324:free',
    'google/gemma-3-27b-it:free',
    'microsoft/phi-4-reasoning:free',
    'qwen/qwen3-30b-a3b:free',
    'qwen/qwen3-14b:free',
    'mistralai/mistral-7b-instruct:free',
    'nousresearch/deephermes-3-llama-3-8b-preview:free',
  ],
  huggingface: [
    'Qwen/Qwen2.5-Coder-32B-Instruct',
    'meta-llama/Llama-3.3-70B-Instruct',
    'deepseek-ai/DeepSeek-R1',
    'Qwen/Qwen2.5-72B-Instruct',
    'google/gemma-3-27b-it',
    'mistralai/Mistral-7B-Instruct-v0.3',
    'HuggingFaceH4/zephyr-7b-beta',
  ],
  groq: [
    'llama-3.3-70b-versatile',
    'deepseek-r1-distill-llama-70b',
    'llama-3.1-8b-instant',
    'gemma2-9b-it',
    'mixtral-8x7b-32768',
    'llama3-70b-8192',
    'llama3-8b-8192',
  ],
};

const DEFAULT_MODEL: Record<Provider, string> = {
  openrouter: 'meta-llama/llama-3.3-70b-instruct:free',
  huggingface: 'Qwen/Qwen2.5-Coder-32B-Instruct',
  groq: 'llama-3.3-70b-versatile',
};

// ── Provider API endpoints ────────────────────────────────────────────
function chatEndpoint(provider: Provider, model: string): string {
  switch (provider) {
    case 'openrouter':
      return endpointOverrides['openrouter'] ?? 'https://openrouter.ai/api/v1/chat/completions';
    case 'groq':
      return endpointOverrides['groq'] ?? 'https://api.groq.com/openai/v1/chat/completions';
    case 'huggingface':
      return endpointOverrides['huggingface'] ?? 'https://router.huggingface.co/v1/chat/completions';
  }
}

function buildHeaders(provider: Provider, key: string): Record<string, string> {
  const base: Record<string, string> = { 'Content-Type': 'application/json' };
  switch (provider) {
    case 'openrouter':
      return { ...base, 'Authorization': `Bearer ${key}`, 'HTTP-Referer': 'https://github.com/NolvusMadeIt/cascade', 'X-Title': 'Cascade AI' };
    case 'huggingface':
      return { ...base, 'Authorization': `Bearer ${key}` };
    case 'groq':
      return { ...base, 'Authorization': `Bearer ${key}` };
  }
}

// ── SSE streaming (all three use OpenAI-compat format) ────────────────
async function* streamChat(
  provider: Provider,
  key: string,
  model: string,
  messages: { role: string; content: string }[],
  temperature: number,
  maxTokens: number,
  topP: number,
  signal: AbortSignal
): AsyncGenerator<string> {
  const url  = chatEndpoint(provider, model);
  const hdrs = buildHeaders(provider, key);

  const body: Record<string, unknown> = {
    model,
    messages,
    stream: true,
    temperature,
    max_tokens: maxTokens,
    top_p: topP,
  };

  const res = await fetch(url, { method: 'POST', headers: hdrs, body: JSON.stringify(body), signal });

  if (!res.ok) {
    const errText = await res.text().catch(() => res.statusText);
    throw new Error(`${provider} ${res.status}: ${errText.slice(0, 200)}`);
  }

  if (!res.body) throw new Error('No response body from provider');

  const reader  = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer    = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() ?? '';
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed.startsWith('data:')) continue;
      const data = trimmed.slice(5).trim();
      if (data === '[DONE]') return;
      try {
        const json = JSON.parse(data) as { choices?: { delta?: { content?: string } }[] };
        const delta = json.choices?.[0]?.delta?.content;
        if (delta) yield delta;
      } catch { /* ignore malformed chunks */ }
    }
  }
}

// ── Fetch OpenRouter free model list ─────────────────────────────────
async function fetchOrFreeModels(key: string, freeOnly: boolean): Promise<string[]> {
  try {
    const res = await fetch('https://openrouter.ai/api/v1/models', {
      headers: { 'Authorization': `Bearer ${key}` }
    });
    if (!res.ok) return FREE_MODELS.openrouter;
    const data = await res.json() as { data?: { id: string; pricing?: { prompt: string } }[] };
    const models = data.data ?? [];
    const filtered = freeOnly
      ? models.filter(m => m.id.endsWith(':free') || m.pricing?.prompt === '0')
      : models;
    const ids = filtered.map(m => m.id).sort();
    return ids.length ? ids : FREE_MODELS.openrouter;
  } catch {
    return FREE_MODELS.openrouter;
  }
}

// ── Helpers ───────────────────────────────────────────────────────────
function getNonce(): string {
  let text = '';
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  for (let i = 0; i < 32; i++) text += chars.charAt(Math.floor(Math.random() * chars.length));
  return text;
}

function escHtml(str: string): string {
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function cfg<T>(key: string, fallback: T): T {
  return vscode.workspace.getConfiguration('cascade').get<T>(key, fallback);
}

async function setCfg(key: string, value: unknown): Promise<void> {
  await vscode.workspace.getConfiguration('cascade').update(key, value, vscode.ConfigurationTarget.Global);
}

// ── Runtime endpoint overrides (loaded from GitHub on startup) ────────
let endpointOverrides: Record<string, string> = {};

const ENDPOINTS_URL =
  'https://raw.githubusercontent.com/NolvusMadeIt/cascade/main/endpoints.json';
const RELEASES_URL =
  'https://api.github.com/repos/NolvusMadeIt/cascade/releases/latest';

async function checkEndpoints(ctx: vscode.ExtensionContext): Promise<void> {
  try {
    const res = await fetch(ENDPOINTS_URL, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) return;
    const remote = await res.json() as Record<string, string>;
    const prev   = ctx.globalState.get<Record<string, string>>('cascade.endpoints', {});
    const isFirstRun = Object.keys(prev).length === 0;
    // Apply overrides immediately so all subsequent requests use updated URLs
    endpointOverrides = { ...remote };
    await ctx.globalState.update('cascade.endpoints', remote);
    if (!isFirstRun) {
      const changed = Object.entries(remote).some(([k, v]) => prev[k] !== v);
      if (changed) {
        const choice = await vscode.window.showInformationMessage(
          'Cascade: Provider endpoints have been updated. Reload VS Code to apply the changes.',
          'Reload Now', 'Later'
        );
        if (choice === 'Reload Now') {
          await vscode.commands.executeCommand('workbench.action.reloadWindow');
        }
      }
    }
  } catch { /* network unavailable — silent fail */ }
}

async function checkForUpdate(ctx: vscode.ExtensionContext): Promise<void> {
  try {
    const res = await fetch(RELEASES_URL, {
      headers: { 'User-Agent': 'cascade-vscode' },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return;
    const release = await res.json() as {
      tag_name: string;
      assets: { name: string; browser_download_url: string }[];
    };
    const latest  = release.tag_name.replace(/^v/, '');
    const current = (ctx.extension.packageJSON as { version: string }).version;
    if (latest === current) return;
    const toNum = (v: string) => v.split('.').map(Number).reduce((a, n, i) => a + n * (1000 ** (2 - i)), 0);
    if (toNum(latest) <= toNum(current)) return;
    const asset = release.assets.find(a => a.name.endsWith('.vsix'));
    if (!asset) return;
    const choice = await vscode.window.showInformationMessage(
      `Cascade v${latest} is available (you have v${current}). Install the update now?`,
      'Download & Install', 'Later'
    );
    if (choice !== 'Download & Install') return;
    await vscode.window.withProgress(
      { location: vscode.ProgressLocation.Notification, title: 'Cascade: Downloading update…', cancellable: false },
      async () => {
        const dl  = await fetch(asset.browser_download_url, { signal: AbortSignal.timeout(120000) });
        if (!dl.ok) throw new Error('Download failed');
        const buf     = await dl.arrayBuffer();
        await ctx.globalStorageUri && vscode.workspace.fs.createDirectory(ctx.globalStorageUri).catch(() => undefined);
        const tmpUri  = vscode.Uri.joinPath(ctx.globalStorageUri, `cascade-${latest}.vsix`);
        await vscode.workspace.fs.writeFile(tmpUri, new Uint8Array(buf));
        await vscode.commands.executeCommand('workbench.extensions.installExtension', tmpUri);
      }
    );
    const restart = await vscode.window.showInformationMessage(
      `Cascade v${latest} installed! Reload VS Code to activate it.`,
      'Reload Now', 'Later'
    );
    if (restart === 'Reload Now') {
      await vscode.commands.executeCommand('workbench.action.reloadWindow');
    }
  } catch { /* silent fail */ }
}

// ── File-block extraction ─────────────────────────────────────────────
// Permissive: checks first 5 lines of each code block for a File: comment
function extractFileBlocks(text: string): { name: string; lang: string; code: string }[] {
  const blocks: { name: string; lang: string; code: string }[] = [];
  const fenceRe = /```([ \t]*[\w+.-]*)[ \t]*\r?\n([\s\S]*?)```/g;
  const commentRe = /(?:\/\/|#|<!-{2,})\s*[Ff]ile:\s*([^\r\n\-]+?)(?:\s*-{2,}>)?\s*$/;
  let m: RegExpExecArray | null;
  while ((m = fenceRe.exec(text)) !== null) {
    const lang  = m[1].trim();
    const body  = m[2];
    const lines = body.split(/\r?\n/);
    let name = '';
    let codeStart = 0;
    // Scan first 5 lines for file path comment
    for (let i = 0; i < Math.min(5, lines.length); i++) {
      const cm = commentRe.exec(lines[i].trim());
      if (cm) { name = cm[1].trim(); codeStart = i + 1; break; }
    }
    if (!name) continue;
    const fileCode = lines.slice(codeStart).join('\n').trimEnd();
    if (fileCode.length > 20) blocks.push({ name, lang, code: fileCode });
  }
  return blocks;
}


// ── Tasks panel registry (receives progress broadcasts from chat) ───────
const tasksProviders: CascadeTasksViewProvider[] = [];

class CascadeTasksViewProvider implements vscode.WebviewViewProvider {
  private view?: vscode.WebviewView;

  resolveWebviewView(wv: vscode.WebviewView): void {
    this.view = wv;
    wv.webview.options = { enableScripts: true };
    this.render([]);
    tasksProviders.push(this);
    wv.onDidDispose(() => {
      const idx = tasksProviders.indexOf(this);
      if (idx !== -1) tasksProviders.splice(idx, 1);
    });
  }

  render(steps: { text: string; done: boolean }[]): void {
    if (!this.view) return;
    const nonce = getNonce();
    const isEmpty = steps.length === 0;
    const rows = steps.map((s, i) =>
      `<div class="tp-item ${s.done ? 'done' : 'active'}">` +
        `<span class="tp-dot">${s.done ? '✓' : i + 1}</span>` +
        `<span class="tp-text">${s.text}</span>` +
      `</div>`
    ).join('');

    this.view.webview.html = `<!DOCTYPE html>
<html><head>
<meta charset="UTF-8"/>
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline';"/>
<style>
  body { margin: 0; padding: 10px 12px; font-family: var(--vscode-font-family,'Segoe UI',sans-serif); font-size: 13px; color: var(--vscode-foreground); background: var(--vscode-sideBar-background); }
  .tp-empty { color: var(--vscode-descriptionForeground); font-size: 11.5px; opacity: .6; padding: 12px 0; }
  .tp-item { display: flex; align-items: flex-start; gap: 9px; padding: 5px 0; border-bottom: 1px solid rgba(127,127,127,.1); }
  .tp-item:last-child { border-bottom: none; }
  .tp-dot { flex-shrink: 0; width: 20px; height: 20px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 10px; font-weight: 700; }
  .tp-item.done .tp-dot { background: #2563eb; color: #fff; }
  .tp-item.active .tp-dot { background: #D97757; color: #fff; animation: pulse 1s ease-in-out infinite; }
  .tp-item.pending .tp-dot { border: 1.5px solid #888; color: #888; }
  .tp-item.done .tp-text { text-decoration: line-through; opacity: .45; }
  .tp-text { flex: 1; line-height: 1.4; font-size: 12px; }
  .tp-hd { font-size: 9px; font-weight: 700; text-transform: uppercase; letter-spacing: .08em; color: #D97757; margin-bottom: 6px; }
  @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.4} }
</style>
</head><body>
<div class="tp-hd">Tasks &amp; Progress</div>
${isEmpty ? '<div class="tp-empty">No active tasks — start a chat to see progress here.</div>' : rows}
</body></html>`;
  }

  update(steps: { text: string; done: boolean }[]): void {
    this.render(steps);
  }
}

function broadcastTasksUpdate(steps: { text: string; done: boolean }[]): void {
  for (const tp of tasksProviders) { tp.update(steps); }
}

// ── Extension activation ──────────────────────────────────────────────
export function activate(ctx: vscode.ExtensionContext): void {
  const provider = new CascadeViewProvider(ctx);
  // Create separate providers per location — all share the same globalState sessions
  const panelProvider    = new CascadeViewProvider(ctx);
  const secondaryProvider = new CascadeViewProvider(ctx);

  ctx.subscriptions.push(
    // ── Sidebar (primary activity bar)
    vscode.window.registerWebviewViewProvider('cascade.chat', provider, {
      webviewOptions: { retainContextWhenHidden: true }
    }),
    // ── Bottom panel
    vscode.window.registerWebviewViewProvider('cascade.panel', panelProvider, {
      webviewOptions: { retainContextWhenHidden: true }
    }),
    // ── Secondary sidebar (right-hand side)
    vscode.window.registerWebviewViewProvider('cascade.secondary', secondaryProvider, {
      webviewOptions: { retainContextWhenHidden: true }
    }),
    // ── Tasks & Progress panel (separate detachable panel)
    vscode.window.registerWebviewViewProvider('cascade.tasks', new CascadeTasksViewProvider(), {
      webviewOptions: { retainContextWhenHidden: true }
    }),
    // ── Chat commands
    vscode.commands.registerCommand('cascade.newChat',      () => provider.newChat()),
    vscode.commands.registerCommand('cascade.openSettings', () => provider.openSettingsCmd()),
    vscode.commands.registerCommand('cascade.clearHistory', () => provider.clearHistory()),
    // ── Panel location commands
    vscode.commands.registerCommand('cascade.focusSidebar',   () =>
      vscode.commands.executeCommand('cascade.chat.focus')),
    vscode.commands.registerCommand('cascade.focusPanel',     () =>
      vscode.commands.executeCommand('cascade.panel.focus')),
    vscode.commands.registerCommand('cascade.focusSecondary', () =>
      vscode.commands.executeCommand('cascade.secondary.focus')),
  );
  // Background startup checks — endpoint health + update availability
  setTimeout(() => {
    void checkEndpoints(ctx);
    void checkForUpdate(ctx);
  }, 3000); // delay 3 s so VS Code finishes loading first
}

export function deactivate(): void { /* nothing */ }

// ── CascadeViewProvider ───────────────────────────────────────────────
class CascadeViewProvider implements vscode.WebviewViewProvider {
  private view?: vscode.WebviewView;
  private sessions: SessionManager;
  private attachments: AttachmentItem[] = [];
  private abortCtrl?: AbortController;
  private pendingFiles: Map<string, { code: string; lang: string }> = new Map();

  constructor(private readonly ctx: vscode.ExtensionContext) {
    this.sessions = new SessionManager(ctx.globalState);
  }

  resolveWebviewView(wv: vscode.WebviewView): void {
    this.view = wv;
    wv.webview.options = {
      enableScripts: true,
      localResourceRoots: [this.ctx.extensionUri],
    };
    wv.webview.html = this.getHtml(wv.webview);
    wv.webview.onDidReceiveMessage(msg => this.onMessage(msg as Record<string,unknown>));
    wv.onDidChangeVisibility(() => { if (wv.visible) this.pushSessionState(); });
  }

  // ── HTML ─────────────────────────────────────────────────────────────
  private getHtml(wv: vscode.Webview): string {
    const nonce     = getNonce();
    const scriptUri = wv.asWebviewUri(vscode.Uri.joinPath(this.ctx.extensionUri, 'dist', 'chat.js'));
    const styleUri  = wv.asWebviewUri(vscode.Uri.joinPath(this.ctx.extensionUri, 'media', 'chat.css'));
    const iconUri   = wv.asWebviewUri(vscode.Uri.joinPath(this.ctx.extensionUri, 'media', 'icon.svg'));
    const logoUri   = wv.asWebviewUri(vscode.Uri.joinPath(this.ctx.extensionUri, 'media', 'cascade-logo.svg'));

    const provider = cfg<Provider>('provider', 'openrouter');
    const model    = cfg<string>('model', DEFAULT_MODEL[provider]);

    const csp = [
      "default-src 'none'",
      `img-src ${wv.cspSource} data: https:`,
      `style-src ${wv.cspSource} 'unsafe-inline'`,
      `script-src 'nonce-${nonce}' ${wv.cspSource}`,
      `font-src ${wv.cspSource}`,
    ].join('; ');

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta http-equiv="Content-Security-Policy" content="${csp}"/>
  <meta name="viewport" content="width=device-width,initial-scale=1.0"/>
  <title>Cascade</title>
  <link rel="stylesheet" href="${styleUri}"/>
</head>
<body>
<div class="cd-app">

  <!-- ── Header ────────────────────────────────────────────────── -->
  <header class="cd-header">
    <div class="cd-logo">
      <img class="cd-logo-mark" src="${iconUri}" alt=""/>
      <span class="cd-logo-name">Cascade</span>
    </div>
    <select id="providerSel" class="cd-select" title="Provider">
      <option value="openrouter"${provider==='openrouter' ? ' selected':''}>OpenRouter</option>
      <option value="huggingface"${provider==='huggingface' ? ' selected':''}>HuggingFace</option>
      <option value="groq"${provider==='groq' ? ' selected':''}>Groq</option>
    </select>
    <select id="modelSel" class="cd-select wide" title="Model">
      <option value="${escHtml(model)}">${escHtml(model)}</option>
    </select>
    <div class="cd-spacer"></div>
    <button type="button" class="cd-icon-btn" id="refreshBtn" title="Refresh model list">↻</button>
    <button type="button" class="cd-icon-btn" id="historyBtn" title="Session history">☰</button>
    <button type="button" class="cd-icon-btn" id="settingsBtn" title="Settings">⚙</button>
    <button type="button" class="cd-icon-btn" id="newChatBtn" title="New chat">+</button>
  </header>

  <!-- ── Session tabs ──────────────────────────────────────────── -->
  <div class="cd-tabs" id="tabsBar"></div>

  <!-- ── Progress panel ────────────────────────────────────────── -->
  <div id="progressPanel" class="cd-progress hidden">
    <div class="cd-progress-head">
      <span class="cd-progress-title">Progress</span>
      <button type="button" class="cd-icon-btn cd-pgr-chevron cd-chevron-lg" id="pgrCollapse" title="Collapse">&#8743;</button>
    </div>
    <div id="progressList" class="cd-progress-list"></div>
  </div>

  <!-- ── Status ────────────────────────────────────────────────── -->
  <div class="cd-status">
    <span class="cd-status-left idle">
      <span class="cd-dot" id="statusDot"></span>
      <span id="statusTxt">Ready</span>
    </span>
    <span>↵ send · ⇧↵ newline</span>
  </div>

  <!-- ── Main view ─────────────────────────────────────────────── -->
  <div id="mainView" class="cd-main">

    <div class="cd-msgs-wrap">
      <!-- Empty state -->
      <div id="empty" class="cd-empty" style="display:flex">
        <div class="cd-empty-inner">
          <img class="cd-empty-icon" src="${logoUri}" alt=""/>
          <div class="cd-empty-title">Cascade</div>
          <p class="cd-empty-sub">Free AI coding assistant. Powered by the best zero-cost models — no subscription needed.</p>
          <table class="cd-caps">
            <tr><td>File Access</td><td><span class="cd-badge" id="capFile">Off</span></td></tr>
            <tr><td>Inline Edits</td><td><span class="cd-badge" id="capEdit">Off</span></td></tr>
            <tr><td>Terminal</td><td><span class="cd-badge" id="capTerm">Off</span></td></tr>
            <tr><td>Git</td><td><span class="cd-badge" id="capGit">Off</span></td></tr>
            <tr><td>Multi-file Context</td><td><span class="cd-badge on" id="capCtx">On</span></td></tr>
          </table>
          <p class="cd-empty-hint">Open ⚙ to add your free API key and unlock models.</p>
        </div>
      </div>
      <!-- Messages -->
      <div id="msgs" class="cd-msgs"></div>
    </div>

    <!-- Composer -->
    <footer class="cd-composer">
      <div class="cd-chips" id="chips"></div>
      <div class="cd-card">
        <textarea id="prompt" rows="3" placeholder="Ask anything — or paste code, reference a @file…"></textarea>
        <div class="cd-toolbar">
          <div class="cd-tb-left">
            <button type="button" class="cd-tbtn" id="attachBtn">+ Context</button>
            <button type="button" class="cd-icon-btn" id="browseBtn" title="Web browser">🌐</button>
            <div class="cd-modes">
              <button type="button" id="modeAgent">Agent</button>
              <button type="button" id="modeAsk">Ask</button>
              <button type="button" id="modePlan">Plan</button>
            </div>

          </div>
          <div class="cd-tb-right">
            <button type="button" class="cd-send" id="sendBtn" title="Send (Enter)">↑</button>
          </div>
        </div>
      </div>
      <!-- Context menu (outside cd-card to avoid overflow:hidden clipping) -->
      <div class="cd-menu" id="attachMenu">
        <div class="cd-menu-search">
          <input id="attachSearch" type="text" placeholder="Filter…"/>
        </div>
        <div class="cd-menu-list">
          <button type="button" class="cd-menu-item" data-action="activeFile"    data-filter="active file editor">Active file</button>
          <button type="button" class="cd-menu-item" data-action="openEditors"   data-filter="open editors tabs">Open editors…</button>
          <button type="button" class="cd-menu-item" data-action="workspaceFile" data-filter="workspace file folder disk">File from workspace…</button>
          <button type="button" class="cd-menu-item" data-action="localFile"     data-filter="upload local file">Upload file…</button>
          <button type="button" class="cd-menu-item" data-action="problems"      data-filter="problems errors warnings diagnostics">Problems</button>
          <button type="button" class="cd-menu-item" data-action="clipboard"     data-filter="clipboard image screenshot">Image from clipboard</button>
        </div>
      </div>
      <div class="cd-hint">
        <span>Keys are free — get one at openrouter.ai · huggingface.co · console.groq.com</span>
      </div>
    </footer>
  </div><!-- /#mainView -->

  <!-- ── Settings overlay ──────────────────────────────────────── -->
  <div id="settingsOverlay" class="cd-overlay hidden">
    <div class="cd-panel">

      <!-- Full-width title bar -->
      <div class="cd-panel-head">
        <span class="cd-panel-title">Settings</span>
        <button type="button" class="cd-icon-btn cd-close-btn" id="settingsClose" title="Close">×</button>
      </div>

      <!-- Two-column layout: nav + content -->
      <div class="cd-panel-layout">

        <!-- Left nav sidebar -->
        <nav class="cd-panel-nav">
          <button type="button" class="cd-nav-item active" data-page="keys">
            <span class="cd-nav-icon">🔑</span>API Keys
          </button>
          <button type="button" class="cd-nav-item" data-page="models">
            <span class="cd-nav-icon">⚡</span>Models
          </button>
          <button type="button" class="cd-nav-item" data-page="sampling">
            <span class="cd-nav-icon">🎛</span>Sampling
          </button>
          <button type="button" class="cd-nav-item" data-page="workspace">
            <span class="cd-nav-icon">🗂</span>Workspace
          </button>
          <button type="button" class="cd-nav-item" data-page="chat">
            <span class="cd-nav-icon">💬</span>Chat
          </button>
          <button type="button" class="cd-nav-item" data-page="profile">
            <span class="cd-nav-icon">👤</span>Profile
          </button>
          <div class="cd-nav-divider"></div>
          <button type="button" class="cd-nav-item" data-page="privacy">
            <span class="cd-nav-icon">🔒</span>Privacy
          </button>
          <button type="button" class="cd-nav-item" data-page="stats">
            <span class="cd-nav-icon">📊</span>Stats
          </button>
          <button type="button" class="cd-nav-item" data-page="about">
            <span class="cd-nav-icon">ℹ</span>About
          </button>
        </nav>

        <!-- Right content area -->
        <div class="cd-panel-content">
          <div class="cd-panel-body">

            <!-- ── Page: API Keys ─────────────────────────────── -->
            <div class="cd-settings-page active" id="pageKeys">
              <div class="cd-section">
                <div class="cd-section-hd">API Keys — all free</div>
                <p class="cd-section-desc">Keys are encrypted in VS Code Secret Storage and never appear in settings.json or git.</p>

                <div class="cd-key-card">
                  <div class="cd-key-card-info">
                    <div class="cd-key-card-name">OpenRouter</div>
                    <div class="cd-key-card-sub">
                      <span class="cd-key-status unset" id="hintOr"><span class="cd-key-dot"></span>Not set</span>
                      <a href="https://openrouter.ai/keys" class="cd-about-link">get free key ↗</a>
                    </div>
                  </div>
                  <div class="cd-pw-wrap">
                    <input type="password" class="cd-input" id="inpOrKey" autocomplete="off" placeholder="sk-or-…" style="width:110px"/>
                    <button type="button" class="cd-pw-eye" id="eyeOr" title="Show/hide">👁</button>
                  </div>
                </div>

                <div class="cd-key-card">
                  <div class="cd-key-card-info">
                    <div class="cd-key-card-name">Hugging Face</div>
                    <div class="cd-key-card-sub">
                      <span class="cd-key-status unset" id="hintHf"><span class="cd-key-dot"></span>Not set</span>
                      <a href="https://huggingface.co/settings/tokens" class="cd-about-link">get free token ↗</a>
                    </div>
                  </div>
                  <div class="cd-pw-wrap">
                    <input type="password" class="cd-input" id="inpHfKey" autocomplete="off" placeholder="hf_…" style="width:110px"/>
                    <button type="button" class="cd-pw-eye" id="eyeHf" title="Show/hide">👁</button>
                  </div>
                </div>

                <div class="cd-key-card">
                  <div class="cd-key-card-info">
                    <div class="cd-key-card-name">Groq</div>
                    <div class="cd-key-card-sub">
                      <span class="cd-key-status unset" id="hintGroq"><span class="cd-key-dot"></span>Not set</span>
                      <a href="https://console.groq.com/keys" class="cd-about-link">get free key ↗</a>
                    </div>
                  </div>
                  <div class="cd-pw-wrap">
                    <input type="password" class="cd-input" id="inpGroqKey" autocomplete="off" placeholder="gsk_…" style="width:110px"/>
                    <button type="button" class="cd-pw-eye" id="eyeGroq" title="Show/hide">👁</button>
                  </div>
                </div>
              </div>
            </div>

            <!-- ── Page: Models ───────────────────────────────── -->
            <div class="cd-settings-page" id="pageModels">
              <div class="cd-section">
                <div class="cd-section-hd">OpenRouter</div>
                <div class="cd-toggle-row">
                  <div class="cd-toggle-info">
                    <div class="cd-toggle-title">Free models only</div>
                    <div class="cd-toggle-desc">Filter the model list to $0 / free-tier models only</div>
                  </div>
                  <label class="cd-toggle-switch">
                    <input type="checkbox" id="chkFreeOnly" checked/>
                    <span class="cd-toggle-slider"></span>
                  </label>
                </div>
              </div>
              <div class="cd-section">
                <div class="cd-section-hd">Fallback Provider</div>
                <p class="cd-section-desc">If the active provider errors or has no key, Cascade will retry with this provider.</p>
                <div class="cd-field">
                  <label class="cd-label" for="selFallback">Fallback to</label>
                  <select class="cd-input" id="selFallback">
                    <option value="none">None</option>
                    <option value="openrouter">OpenRouter</option>
                    <option value="huggingface">Hugging Face</option>
                    <option value="groq">Groq</option>
                  </select>
                </div>
              </div>
            </div>

            <!-- ── Page: Sampling ─────────────────────────────── -->
            <div class="cd-settings-page" id="pageSampling">
              <div class="cd-section">
                <div class="cd-section-hd">Generation Parameters</div>
                <div class="cd-field">
                  <label class="cd-label" for="inpTemp">Temperature &nbsp;<span style="font-weight:400;opacity:.65">(0 = focused · 2 = creative)</span></label>
                  <input type="number" class="cd-input" id="inpTemp" min="0" max="2" step="0.05" value="0.2"/>
                </div>
                <div class="cd-field">
                  <label class="cd-label" for="inpMaxTok">Max output tokens</label>
                  <input type="number" class="cd-input" id="inpMaxTok" min="256" max="128000" step="256" value="4096"/>
                </div>
                <div class="cd-field">
                  <label class="cd-label" for="inpTopP">Top P</label>
                  <input type="number" class="cd-input" id="inpTopP" min="0.01" max="1" step="0.01" value="1"/>
                </div>
                <div class="cd-field">
                  <label class="cd-label" for="inpCtxLen">Chat history depth &nbsp;<span style="font-weight:400;opacity:.65">(messages sent as context)</span></label>
                  <input type="number" class="cd-input" id="inpCtxLen" min="2" max="50" step="1" value="20"/>
                </div>
              </div>
            </div>

            <!-- ── Page: Chat ────────────────────────────────── -->
            <div class="cd-settings-page" id="pageChat">
              <div class="cd-section">
                <div class="cd-section-hd">Code Blocks</div>
                <div class="cd-toggle-row">
                  <div class="cd-toggle-info">
                    <div class="cd-toggle-title">Auto-collapse code</div>
                    <div class="cd-toggle-desc">Hide code blocks by default — click to expand them in chat</div>
                  </div>
                  <label class="cd-toggle-switch">
                    <input type="checkbox" id="chkAutoHideCode"/>
                    <span class="cd-toggle-slider"></span>
                  </label>
                </div>
              </div>
              <div class="cd-section">
                <div class="cd-section-hd">Display</div>
                <div class="cd-field">
                  <label class="cd-label" for="selMsgDensity">Message density</label>
                  <select class="cd-input" id="selMsgDensity">
                    <option value="comfortable">Comfortable (default)</option>
                    <option value="compact">Compact</option>
                    <option value="spacious">Spacious</option>
                  </select>
                </div>
                <div class="cd-toggle-row">
                  <div class="cd-toggle-info">
                    <div class="cd-toggle-title">Show role labels</div>
                    <div class="cd-toggle-desc">Show "You" and "Cascade" above each message</div>
                  </div>
                  <label class="cd-toggle-switch">
                    <input type="checkbox" id="chkShowRoles" checked/>
                    <span class="cd-toggle-slider"></span>
                  </label>
                </div>
              </div>
            </div>


            <!-- ── Page: Workspace ────────────────────────────── -->
            <div class="cd-settings-page" id="pageWorkspace">
              <div class="cd-section">
                <div class="cd-section-hd">Agent Permissions</div>
                <div class="cd-field">
                  <label class="cd-label" for="selApproval">Approval mode</label>
                  <select class="cd-input" id="selApproval">
                    <option value="ask">Normal — approve each action</option>
                    <option value="auto">Auto-accept edits</option>
                    <option value="chat">Chat only (no file edits)</option>
                  </select>
                </div>
                <div class="cd-field">
                  <label class="cd-label" for="selFileAccess">File access</label>
                  <select class="cd-input" id="selFileAccess">
                    <option value="none">Off</option>
                    <option value="read">Read only</option>
                    <option value="readwrite">Read + Write</option>
                  </select>
                </div>
                <div class="cd-field">
                  <label class="cd-label" for="selFileScope">File scope</label>
                  <select class="cd-input" id="selFileScope">
                    <option value="workspace">Workspace only</option>
                    <option value="anywhere">Anywhere on disk</option>
                  </select>
                </div>
              </div>
              <div class="cd-section">
                <div class="cd-section-hd">System Access</div>
                <div class="cd-toggle-row">
                  <div class="cd-toggle-info">
                    <div class="cd-toggle-title">Terminal access</div>
                    <div class="cd-toggle-desc">Allow Cascade to run shell commands</div>
                  </div>
                  <label class="cd-toggle-switch">
                    <input type="checkbox" id="chkTerminal"/>
                    <span class="cd-toggle-slider"></span>
                  </label>
                </div>
                <div class="cd-toggle-row">
                  <div class="cd-toggle-info">
                    <div class="cd-toggle-title">Git operations</div>
                    <div class="cd-toggle-desc">Allow git status, diff, commit, push</div>
                  </div>
                  <label class="cd-toggle-switch">
                    <input type="checkbox" id="chkGit"/>
                    <span class="cd-toggle-slider"></span>
                  </label>
                </div>
              </div>
            </div>

            <!-- ── Page: Profile ──────────────────────────────── -->
            <div class="cd-settings-page" id="pageProfile">
              <div class="cd-section">
                <div class="cd-section-hd">Your Name</div>
                <p class="cd-section-desc">Cascade will use this name when addressing you in conversations.</p>
                <div class="cd-field">
                  <input type="text" class="cd-input" id="inpUserName" placeholder="e.g. Alex" maxlength="50"/>
                </div>
              </div>
              <div class="cd-section">
                <div class="cd-section-hd">Custom System Prompt</div>
                <p class="cd-section-desc">Appended to the default prompt. Set coding style preferences, language, or persona overrides.</p>
                <textarea class="cd-textarea" id="inpSystemPrompt" rows="5" placeholder="e.g. Always use TypeScript. Prefer functional style. Reply concisely."></textarea>
              </div>
            </div>

            <!-- ── Page: Privacy ──────────────────────────────── -->
            <div class="cd-settings-page" id="pagePrivacy">
              <div class="cd-section">
                <div class="cd-section-hd">Data &amp; Storage</div>
                <p class="cd-section-desc">All data stays on your machine in VS Code's global storage. Nothing is sent to any third party except the AI provider you choose.</p>
                <div class="cd-field">
                  <label class="cd-label" for="selHistory">Chat history retention</label>
                  <select class="cd-input" id="selHistory">
                    <option value="unlimited">Unlimited</option>
                    <option value="30">30 days</option>
                    <option value="7">7 days</option>
                    <option value="none">Don't keep history</option>
                  </select>
                </div>
              </div>
              <div class="cd-section">
                <div class="cd-section-hd">Danger Zone</div>
                <button type="button" class="cd-danger-btn" id="logoutBtn">🗑 Clear all API keys</button>
                <button type="button" class="cd-danger-btn" id="clearHistBtn">🗑 Delete all chat history</button>
              </div>
            </div>

            <!-- ── Page: Stats ───────────────────────────────── -->
            <div class="cd-settings-page" id="pageStats">
              <div class="cd-section">
                <div class="cd-section-hd">Usage Overview</div>
                <div class="cd-stats-grid">
                  <div class="cd-stat-card"><div class="cd-stat-val" id="statSessions">—</div><div class="cd-stat-lbl">Sessions</div></div>
                  <div class="cd-stat-card"><div class="cd-stat-val" id="statMessages">—</div><div class="cd-stat-lbl">Messages</div></div>
                  <div class="cd-stat-card"><div class="cd-stat-val" id="statActiveDays">—</div><div class="cd-stat-lbl">Active days</div></div>
                  <div class="cd-stat-card"><div class="cd-stat-val" id="statStreak">—</div><div class="cd-stat-lbl">Current streak</div></div>
                </div>
              </div>
              <div class="cd-section">
                <div class="cd-section-hd">Activity — Last 12 Weeks</div>
                <div id="activityGrid" class="cd-activity-grid"></div>
                <div id="statsCaption" class="cd-stats-caption"></div>
              </div>
              <div class="cd-section">
                <div class="cd-section-hd">Breakdown</div>
                <div class="cd-about-row"><span class="cd-about-label">Longest streak</span><span class="cd-about-val" id="statLongestStreak">—</span></div>
                <div class="cd-about-row"><span class="cd-about-label">Peak day of week</span><span class="cd-about-val" id="statPeakDay">—</span></div>
                <div class="cd-about-row"><span class="cd-about-label">Current provider</span><span class="cd-about-val" id="statProvider">—</span></div>
                <div class="cd-about-row"><span class="cd-about-label">Current model</span><span class="cd-about-val" id="statModel">—</span></div>
              </div>
            </div>

            <!-- ── Page: Stats ───────────────────────────────── -->
            </div>

            <!-- ── Page: About ────────────────────────────────── -->
            <div class="cd-settings-page" id="pageAbout">
              <div class="cd-section">
                <div class="cd-section-hd">Cascade</div>
                <p class="cd-section-desc">Free AI coding assistant for VS Code. Powered by the best zero-cost models — no subscription needed.</p>
                <div class="cd-about-row"><span class="cd-about-label">Version</span><span class="cd-about-val" id="aboutVersion">—</span></div>
                <div class="cd-about-row"><span class="cd-about-label">Publisher</span><span class="cd-about-val">NolvusMadeIt</span></div>
                <div class="cd-about-row"><span class="cd-about-label">Providers</span><span class="cd-about-val">OpenRouter · Hugging Face · Groq</span></div>
              </div>
              <div class="cd-section">
                <div class="cd-section-hd">Links</div>
                <div class="cd-about-row">
                  <span class="cd-about-label">OpenRouter free models</span>
                  <a href="https://openrouter.ai/keys" class="cd-about-link">openrouter.ai ↗</a>
                </div>
                <div class="cd-about-row">
                  <span class="cd-about-label">Hugging Face tokens</span>
                  <a href="https://huggingface.co/settings/tokens" class="cd-about-link">huggingface.co ↗</a>
                </div>
                <div class="cd-about-row">
                  <span class="cd-about-label">Groq console</span>
                  <a href="https://console.groq.com/keys" class="cd-about-link">console.groq.com ↗</a>
                </div>
              </div>
            </div>

          </div><!-- /.cd-panel-body -->
        </div><!-- /.cd-panel-content -->
      </div><!-- /.cd-panel-layout -->

      <!-- Full-width footer -->
      <div class="cd-panel-foot">
        <span class="cd-toast" id="settingsToast">Saved ✓</span>
        <button type="button" class="cd-btn" id="settingsCancel">Cancel</button>
        <button type="button" class="cd-btn primary" id="settingsSave">Save</button>
      </div>

    </div><!-- /.cd-panel -->
  </div>

  <!-- ── History overlay ───────────────────────────────────────── -->
  <div id="historyOverlay" class="cd-overlay hidden">
    <div class="cd-panel">
      <div class="cd-panel-head">
        <span class="cd-panel-title">Session history</span>
        <button type="button" class="cd-icon-btn" id="historyClose" title="Close">×</button>
      </div>
      <div class="cd-panel-body">
        <section class="cd-section">
          <div class="cd-section-hd">Search</div>
          <input type="text" class="cd-input" id="histSearch" placeholder="Keyword, filename…"/>
          <div class="cd-hist-filters">
            <button type="button" class="cd-hist-filter active" data-range="all">All</button>
            <button type="button" class="cd-hist-filter" data-range="today">Today</button>
            <button type="button" class="cd-hist-filter" data-range="week">7 days</button>
            <button type="button" class="cd-hist-filter" data-range="month">30 days</button>
          </div>
        </section>
        <div class="cd-hist-list" id="histList"></div>
      </div>
    </div>
  </div>

</div><!-- /.cd-app -->
<script nonce="${nonce}" src="${scriptUri}"></script>
</body>
</html>`;
  }

  // ── Message handler ───────────────────────────────────────────────
  private async onMessage(msg: Record<string, unknown>): Promise<void> {
    switch (msg.type as string) {

      case 'ready':
        this.pushSessionState();
        void this.pushKeyStatus();
        void this.pushModels();
        break;

      case 'send':
        await this.handleSend(String(msg.text ?? ''), String(msg.mode ?? 'ask'));
        break;

      case 'newSession':
        this.sessions.createSession();
        this.pushSessionState();
        this.pushThread();
        break;

      case 'switchSession':
        this.sessions.switchTo(String(msg.id ?? ''));
        this.pushSessionState();
        this.pushThread();
        break;

      case 'closeSession':
        this.sessions.closeSession(String(msg.id ?? ''));
        this.pushSessionState();
        this.pushThread();
        break;

      case 'getSettings':
        await this.pushSettings();
        this.pushStats();
        break;

      case 'saveSettings':
        await this.saveSettings(msg);
        void this.pushKeyStatus();
        void this.pushModels();
        break;

      case 'logout':
        await this.logout();
        break;

      case 'clearAllHistory':
        this.sessions.clearAllHistory();
        this.pushSessionState();
        this.pushThread();
        void vscode.window.showInformationMessage('Cascade: All chat history deleted.');
        break;

      case 'getModels':
        await this.pushModels();
        break;

      case 'setProvider': {
        const p = String(msg.provider ?? 'openrouter') as Provider;
        await setCfg('provider', p);
        await setCfg('model', DEFAULT_MODEL[p]);
        this.post({ type: 'providerChanged', provider: p });
        await this.pushModels();
        break;
      }

      case 'setModel':
        await setCfg('model', String(msg.model ?? ''));
        break;

      case 'getHistory':
        this.pushHistory();
        break;

      case 'getStats':
        this.pushStats();
        break;

      case 'restoreSession':
        this.sessions.switchTo(String(msg.id ?? ''));
        this.pushSessionState();
        this.pushThread();
        break;

      case 'attachActiveFile':
        await this.attachActive();
        break;

      case 'pickWorkspaceFile':
        await this.pickWorkspaceFile();
        break;

      case 'pickLocalFile':
        await this.pickLocalFile();
        break;

      case 'pickOpenEditor':
        await this.pickOpenEditor();
        break;

      case 'attachProblems':
        await this.attachProblems();
        break;

      case 'removeAttachment': {
        const id = String(msg.id ?? '');
        this.attachments = this.attachments.filter(a => a.id !== id);
        this.pushAttachments();
        break;
      }

      case 'applyFile':
        await this.applyFileEdit(String(msg.code ?? ''), String(msg.language ?? ''), msg.suggestedPath as string | undefined);
        break;

      case 'createSuggestedFile':
        await this.createSuggestedFile(String(msg.name ?? ''));
        break;

      case 'runInTerminal':
        await this.runInTerminal(String(msg.command ?? ''));
        break;

      case 'openBrowser':
        await vscode.commands.executeCommand('simpleBrowser.show', 'https://openrouter.ai/models?order=newest&supported_parameters=free');
        break;
    }
  }

  // ── Send / stream ─────────────────────────────────────────────────
  private async handleSend(text: string, _mode: string): Promise<void> {
    if (!text.trim()) return;

    const provider = cfg<Provider>('provider', 'openrouter');
    const model    = cfg<string>('model', DEFAULT_MODEL[provider]);
    const temp     = cfg<number>('temperature', 0.2);
    const maxTok   = cfg<number>('maxTokens', 4096);
    const topP     = cfg<number>('topP', 1);

    // Build system prompt
    const userName    = cfg<string>('userName', '');
    const customPrmpt = cfg<string>('systemPrompt', '');
    const ctxLength   = cfg<number>('contextLength', 20);
    const wsFolder = vscode.workspace.workspaceFolders?.[0];
    const wsName   = wsFolder ? wsFolder.uri.fsPath : null;
    const systemParts: string[] = [
      `You are Cascade, a friendly and expert AI coding assistant built into VS Code.${userName ? ` The user's name is ${userName}.` : ''}${wsName ? ` The current workspace folder is: ${wsName}.` : ''} Be warm, direct, and encouraging — like a skilled teammate who genuinely wants to help.`,
      "Write in a natural, conversational tone. Be concise but thorough. Use 'I' naturally. Briefly acknowledge the user's context before diving in.",
      'CRITICAL — File creation rule: Whenever you create or modify a file, you MUST write the COMPLETE file content (never truncate or use placeholders like "rest of code here"). ' +
      'Put the file path as a comment on the VERY FIRST LINE inside the fenced code block — before any other content. ' +
      'Match the comment style to the language: HTML → `<!-- File: index.html -->`, JS/TS → `// File: app.ts`, Python → `# File: main.py`, CSS → `/* File: style.css */`. ' +
      'Use a sensible relative path. This allows Cascade to automatically save the file to the workspace.',
      'For multi-step tasks, open your response with a <steps> block (max 5 items, plain text, one per line):\n<steps>\nAnalyse the request\nWrite the solution\nExplain key decisions\n</steps>\nThen continue with your full response.',
    ];
    if (customPrmpt) systemParts.push(customPrmpt);

    // Append any attached context
    let userText = text;
    if (this.attachments.length) {
      const ctx = this.attachments.map(a => `<attachment name="${a.label}">\n${a.content}\n</attachment>`).join('\n');
      userText = `${ctx}\n\n${text}`;
    }

    const session = this.sessions.active;
    if (!session) return;

    const key = await this.getKey(provider);
    if (!key) {
      this.post({ type: 'assistantError', text: `No API key for ${provider}. Open ⚙ Settings to add your free key.` });
      return;
    }

    this.sessions.addMessage('user', text);

    const history = session.messages
      .slice(0, -1) // exclude the just-added one
      .slice(-(ctxLength * 2)) // honour context depth setting
      .map(m => ({ role: m.role, content: m.content }));

    const messages = [
      { role: 'system', content: systemParts.join('\n') },
      ...history,
      { role: 'user', content: userText },
    ];

    this.abortCtrl?.abort();
    this.abortCtrl = new AbortController();

    this.post({ type: 'assistantStart' });

    let full = '';
    let stepsSent = false;
    try {
      for await (const chunk of streamChat(provider, key, model, messages, temp, maxTok, topP, this.abortCtrl.signal)) {
        full += chunk;
        // Extract <steps> block once fully buffered, send to webview
        if (!stepsSent && full.includes('</steps>')) {
          const stepsMatch = /<steps>([\s\S]*?)<\/steps>/.exec(full);
          if (stepsMatch) {
            const steps = stepsMatch[1].trim().split('\n').map((s: string) => s.trim()).filter((s: string) => s.length > 0);
            if (steps.length) {
              this.post({ type: 'progressSteps', steps });
              broadcastTasksUpdate(steps.map((t, i) => ({ text: t, done: false })));
            }
            stepsSent = true;
          }
        }
        this.post({ type: 'assistantDelta', text: full });
      }
      this.sessions.addMessage('assistant', full);
      this.post({ type: 'progressDone' });
      this.post({ type: 'assistantDone', text: full });
      broadcastTasksUpdate([]); // clear tasks panel after done
      this.pushSessionState(); // update tab title
      // Auto-create detected files in workspace; fall back to buttons if no workspace
      const fileBlocks = extractFileBlocks(full);
      if (fileBlocks.length) {
        const ws = vscode.workspace.workspaceFolders?.[0]?.uri;
        if (ws) {
          // Auto-write every detected file directly to the workspace
          const created: string[] = [];
          let firstUri: vscode.Uri | undefined;
          for (const fb of fileBlocks) {
            try {
              const parts   = fb.name.replace(/\\/g, '/').split('/');
              const fileUri = vscode.Uri.joinPath(ws, ...parts);
              if (parts.length > 1) {
                await vscode.workspace.fs.createDirectory(
                  vscode.Uri.joinPath(ws, ...parts.slice(0, -1))
                ).catch(() => undefined);
              }
              await vscode.workspace.fs.writeFile(fileUri, Buffer.from(fb.code, 'utf8'));
              created.push(fb.name);
              if (!firstUri) firstUri = fileUri;
            } catch { /* individual file errors are non-fatal */ }
          }
          if (created.length) {
            if (firstUri) { void vscode.window.showTextDocument(firstUri, { preview: false }); }
            this.post({ type: 'filesAutoCreated', files: created });
          }
        } else {
          // No workspace open — show Save buttons so user can pick location
          this.pendingFiles.clear();
          for (const fb of fileBlocks) { this.pendingFiles.set(fb.name, { code: fb.code, lang: fb.lang }); }
          this.post({ type: 'suggestFileCreate', files: fileBlocks.map(fb => ({ name: fb.name })) });
        }
      }
    } catch (err) {
      if ((err as Error).name === 'AbortError') {
        this.post({ type: 'assistantAbort' });
        return;
      }
      const errMsg = err instanceof Error ? err.message : String(err);
      // ── Rate-limit / overload detection (429 / 503 / 529) ──────────
      const isRateLimit = /\b(429|503|529)\b/.test(errMsg) ||
        /rate.limit|too many req|overload|temporarily unavail/i.test(errMsg);
      if (isRateLimit) {
        const fallback = cfg<string>('fallbackProvider', 'none') as Provider | 'none';
        const fallbackKey = fallback !== 'none' ? await this.getKey(fallback as Provider) : undefined;
        if (fallback !== 'none' && fallbackKey) {
          // Switch to fallback provider silently and retry
          this.post({ type: 'rateLimitMsg', text: `⚡ ${provider} rate limited — retrying with ${fallback}…`, countdown: 0 });
          try {
            let full2 = '';
            let stepsSent2 = false;
            this.abortCtrl = new AbortController();
            for await (const chunk of streamChat(fallback as Provider, fallbackKey, DEFAULT_MODEL[fallback as Provider], messages, temp, maxTok, topP, this.abortCtrl.signal)) {
              full2 += chunk;
              if (!stepsSent2 && full2.includes('</steps>')) {
                const sm2 = /<steps>([\s\S]*?)<\/steps>/.exec(full2);
                if (sm2) {
                  const steps2 = sm2[1].trim().split('\n').map((s: string) => s.trim()).filter((s: string) => s.length > 0);
                  if (steps2.length) { this.post({ type: 'progressSteps', steps: steps2 }); }
                  stepsSent2 = true;
                }
              }
              this.post({ type: 'assistantDelta', text: full2 });
            }
            this.sessions.addMessage('assistant', full2);
            this.post({ type: 'progressDone' });
            this.post({ type: 'assistantDone', text: full2 });
            this.pushSessionState();
          } catch (err2) {
            const e2 = err2 instanceof Error ? err2.message : String(err2);
            this.post({ type: 'assistantError', text: `Fallback (${fallback}) also failed: ${e2}` });
          }
          return;
        }
        // No fallback — show countdown and auto-retry with same provider
        const WAIT = 30;
        this.post({ type: 'rateLimitMsg', text: `⏳ ${provider} rate limited (free tier). Retrying in ${WAIT}s…`, countdown: WAIT });
        for (let t = WAIT - 1; t > 0; t--) {
          await new Promise(res => setTimeout(res, 1000));
          if (this.abortCtrl?.signal.aborted) { this.post({ type: 'assistantAbort' }); return; }
          this.post({ type: 'rateLimitMsg', text: `⏳ Rate limited — retrying in ${t}s…`, countdown: t });
        }
        await new Promise(res => setTimeout(res, 1000));
        if (this.abortCtrl?.signal.aborted) { this.post({ type: 'assistantAbort' }); return; }
        this.post({ type: 'rateLimitMsg', text: `🔄 Retrying…`, countdown: 0 });
        try {
          let full3 = '';
          let stepsSent3 = false;
          this.abortCtrl = new AbortController();
          for await (const chunk of streamChat(provider, key, model, messages, temp, maxTok, topP, this.abortCtrl.signal)) {
            full3 += chunk;
            if (!stepsSent3 && full3.includes('</steps>')) {
              const sm3 = /<steps>([\s\S]*?)<\/steps>/.exec(full3);
              if (sm3) {
                const steps3 = sm3[1].trim().split('\n').map((s: string) => s.trim()).filter((s: string) => s.length > 0);
                if (steps3.length) { this.post({ type: 'progressSteps', steps: steps3 }); }
                stepsSent3 = true;
              }
            }
            this.post({ type: 'assistantDelta', text: full3 });
          }
          this.sessions.addMessage('assistant', full3);
          this.post({ type: 'progressDone' });
          this.post({ type: 'assistantDone', text: full3 });
          this.pushSessionState();
        } catch (retryErr) {
          const re = retryErr instanceof Error ? retryErr.message : String(retryErr);
          this.post({ type: 'assistantError', text: `Still rate limited after retry. Try a different model or provider.\n\n${re.slice(0, 120)}` });
        }
        return;
      }
      this.post({ type: 'assistantError', text: errMsg });
    }
  }

  // ── Settings ──────────────────────────────────────────────────────
  private async pushSettings(): Promise<void> {
    const hasOrKey   = !!(await this.ctx.secrets.get('cascade.orKey'));
    const hasHfKey   = !!(await this.ctx.secrets.get('cascade.hfKey'));
    const hasGroqKey = !!(await this.ctx.secrets.get('cascade.groqKey'));
    this.post({
      type: 'settingsForm',
      hasOrKey, hasHfKey, hasGroqKey,
      temperature:         cfg('temperature', 0.2),
      maxTokens:           cfg('maxTokens', 4096),
      topP:                cfg('topP', 1),
      contextLength:       cfg('contextLength', 20),
      fileAccess:          cfg('fileAccess', 'none'),
      fileScope:           cfg('fileScope', 'workspace'),
      approvalMode:        cfg('approvalMode', 'ask'),
      terminalAccess:      cfg('terminalAccess', false),
      gitAccess:           cfg('gitAccess', false),
      openRouterFreeOnly:  cfg('openRouterFreeOnly', true),
      fallbackProvider:    cfg('fallbackProvider', 'none'),
      userName:            cfg('userName', ''),
      systemPrompt:        cfg('systemPrompt', ''),
      historyRetention:    cfg('historyRetention', 'unlimited'),
      autoHideCode:        cfg('autoHideCode', true),
    });
  }

  private async saveSettings(msg: Record<string, unknown>): Promise<void> {
    if (msg.openRouterKey)  await this.ctx.secrets.store('cascade.orKey',   String(msg.openRouterKey));
    if (msg.huggingfaceKey) await this.ctx.secrets.store('cascade.hfKey',   String(msg.huggingfaceKey));
    if (msg.groqKey)        await this.ctx.secrets.store('cascade.groqKey', String(msg.groqKey));
    if (msg.temperature      !== undefined) await setCfg('temperature',      Number(msg.temperature));
    if (msg.maxTokens        !== undefined) await setCfg('maxTokens',        Number(msg.maxTokens));
    if (msg.topP             !== undefined) await setCfg('topP',             Number(msg.topP));
    if (msg.contextLength    !== undefined) await setCfg('contextLength',    Number(msg.contextLength));
    if (msg.fileAccess       !== undefined) await setCfg('fileAccess',       String(msg.fileAccess));
    if (msg.fileScope        !== undefined) await setCfg('fileScope',        String(msg.fileScope));
    if (msg.approvalMode     !== undefined) await setCfg('approvalMode',     String(msg.approvalMode));
    if (msg.terminalAccess   !== undefined) await setCfg('terminalAccess',   Boolean(msg.terminalAccess));
    if (msg.gitAccess        !== undefined) await setCfg('gitAccess',        Boolean(msg.gitAccess));
    if (msg.openRouterFreeOnly !== undefined) await setCfg('openRouterFreeOnly', Boolean(msg.openRouterFreeOnly));
    if (msg.fallbackProvider !== undefined) await setCfg('fallbackProvider', String(msg.fallbackProvider));
    if (msg.userName         !== undefined) await setCfg('userName',         String(msg.userName));
    if (msg.systemPrompt     !== undefined) await setCfg('systemPrompt',     String(msg.systemPrompt));
    if (msg.historyRetention !== undefined) await setCfg('historyRetention', String(msg.historyRetention));
    if (msg.autoHideCode     !== undefined) await setCfg('autoHideCode',     Boolean(msg.autoHideCode));
    if (msg.autoHideCode     !== undefined) await setCfg('autoHideCode',     Boolean(msg.autoHideCode));
  }

  private async logout(): Promise<void> {
    await this.ctx.secrets.delete('cascade.orKey');
    await this.ctx.secrets.delete('cascade.hfKey');
    await this.ctx.secrets.delete('cascade.groqKey');
    void vscode.window.showInformationMessage('Cascade: All API keys cleared.');
    await this.pushSettings();
  }

  private async getKey(provider: Provider): Promise<string | undefined> {
    const keyMap: Record<Provider, string> = {
      openrouter: 'cascade.orKey',
      huggingface: 'cascade.hfKey',
      groq: 'cascade.groqKey',
    };
    return this.ctx.secrets.get(keyMap[provider]);
  }

  // ── Key status (lightweight — does NOT open settings overlay) ─────
  private async pushKeyStatus(): Promise<void> {
    const hasOrKey   = !!(await this.ctx.secrets.get('cascade.orKey'));
    const hasHfKey   = !!(await this.ctx.secrets.get('cascade.hfKey'));
    const hasGroqKey = !!(await this.ctx.secrets.get('cascade.groqKey'));
    this.post({ type: 'keyStatus', hasOrKey, hasHfKey, hasGroqKey });
  }

  // ── Model list ────────────────────────────────────────────────────
  private async pushModels(): Promise<void> {
    const provider = cfg<Provider>('provider', 'openrouter');
    const freeOnly = cfg<boolean>('openRouterFreeOnly', true);
    const current  = cfg<string>('model', DEFAULT_MODEL[provider]);
    const key = await this.getKey(provider);
    if (!key) {
      this.post({ type: 'models', models: [], selectedModel: '', noKey: true });
      return;
    }
    let models: string[];
    if (provider === 'openrouter') {
      models = await fetchOrFreeModels(key, freeOnly);
    } else {
      models = [...FREE_MODELS[provider]];
    }
    if (!models.includes(current)) models.unshift(current);
    this.post({ type: 'models', models, selectedModel: current, noKey: false });
  }

  // ── Session helpers ───────────────────────────────────────────────
  private pushSessionState(): void {
    const open = this.sessions.openSessions;
    this.post({
      type: 'sessionState',
      activeSessionId: this.sessions.active?.id ?? '',
      sessions: open.map(s => ({ id: s.id, title: s.title })),
    });
  }

  private pushThread(): void {
    const session = this.sessions.active;
    this.post({
      type: 'loadThread',
      messages: session?.messages ?? [],
    });
    this.attachments = [];
    this.pushAttachments();
  }

  // ── Usage stats ──────────────────────────────────────────────────
  private pushStats(): void {
    const all = this.sessions.allSessions;
    const totalMsgs = all.reduce((s, sess) => s + sess.messages.length, 0);
    // Collect distinct calendar days from session activity
    const daySet = new Set<string>();
    const dayCounts: Record<string, number> = {};
    for (const sess of all) {
      for (const msg of sess.messages) {
        // We use session updatedAt as proxy (messages lack individual timestamps)
      }
      const d = new Date(sess.updatedAt).toISOString().slice(0, 10);
      daySet.add(d);
      dayCounts[d] = (dayCounts[d] ?? 0) + sess.messages.length;
    }
    // Include session createdAt too
    for (const sess of all) {
      const d = new Date(sess.createdAt).toISOString().slice(0, 10);
      daySet.add(d);
      if (!dayCounts[d]) dayCounts[d] = 0;
    }
    const sortedDays = [...daySet].sort();
    // Compute streak
    let streak = 0, longestStreak = 0, run = 0;
    const today = new Date().toISOString().slice(0, 10);
    const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
    for (let i = 0; i < sortedDays.length; i++) {
      const prev = i > 0 ? sortedDays[i - 1] : '';
      const curr = sortedDays[i];
      const dayDiff = prev ? (new Date(curr).getTime() - new Date(prev).getTime()) / 86400000 : 1;
      run = dayDiff === 1 ? run + 1 : 1;
      if (run > longestStreak) longestStreak = run;
    }
    if (daySet.has(today) || daySet.has(yesterday)) {
      let d = daySet.has(today) ? today : yesterday;
      while (daySet.has(d)) {
        streak++;
        d = new Date(new Date(d).getTime() - 86400000).toISOString().slice(0, 10);
      }
    }
    // Peak day of week
    const dowCounts = [0,0,0,0,0,0,0];
    for (const d of sortedDays) { dowCounts[new Date(d).getDay()]++; }
    const dowNames = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
    const peakDow = dowNames[dowCounts.indexOf(Math.max(...dowCounts))];
    // Build 12-week grid data (84 cells, Sun=0)
    const gridData: number[] = [];
    const gridStart = new Date(Date.now() - 83 * 86400000);
    gridStart.setHours(0,0,0,0);
    for (let i = 0; i < 84; i++) {
      const d = new Date(gridStart.getTime() + i * 86400000).toISOString().slice(0, 10);
      gridData.push(dayCounts[d] ?? 0);
    }
    const provider = cfg<string>('provider', 'openrouter');
    const model    = cfg<string>('model', '');
    const version  = (this.ctx.extension.packageJSON as {version:string}).version;
    this.post({
      type: 'statsData',
      sessions: all.length,
      messages: totalMsgs,
      activeDays: daySet.size,
      streak,
      longestStreak,
      peakDay: peakDow,
      gridData,
      provider,
      model,
      version,
    });
  }


  private pushHistory(): void {
    const items = this.sessions.historyItems.map(s => ({
      id: s.id,
      title: s.title,
      preview: s.messages.find(m => m.role === 'user')?.content.slice(0, 80) ?? '',
      updatedAt: s.updatedAt,
      archived: s.archived,
      messageCount: s.messages.length,
    }));
    this.post({
      type: 'historyState',
      activeSessionId: this.sessions.active?.id ?? '',
      items,
    });
  }

  private pushAttachments(): void {
    this.post({
      type: 'attachmentsUpdated',
      items: this.attachments.map(a => ({ id: a.id, label: a.label })),
    });
  }

  // ── File attachments ──────────────────────────────────────────────
  private async attachActive(): Promise<void> {
    const doc = vscode.window.activeTextEditor?.document;
    if (!doc) { void vscode.window.showWarningMessage('Cascade: No active file to attach.'); return; }
    const access = cfg('fileAccess', 'none');
    if (access === 'none') {
      const sel = await vscode.window.showWarningMessage('Cascade: File access is disabled.', 'Open Settings');
      if (sel) this.post({ type: 'settingsForm' }); // re-open settings
      return;
    }
    this.addAttachment(doc.fileName.split(/[\\/]/).pop() ?? 'file', doc.getText());
  }

  private async pickWorkspaceFile(): Promise<void> {
    const uris = await vscode.window.showOpenDialog({ canSelectMany: false, openLabel: 'Attach' });
    if (!uris?.length) return;
    const bytes = await vscode.workspace.fs.readFile(uris[0]);
    const text  = Buffer.from(bytes).toString('utf8');
    this.addAttachment(uris[0].fsPath.split(/[\\/]/).pop() ?? 'file', text);
  }

  private async pickLocalFile(): Promise<void> {
    const uris = await vscode.window.showOpenDialog({ canSelectMany: false, openLabel: 'Upload' });
    if (!uris?.length) return;
    const bytes = await vscode.workspace.fs.readFile(uris[0]);
    const text  = Buffer.from(bytes).toString('utf8');
    this.addAttachment(uris[0].fsPath.split(/[\\/]/).pop() ?? 'file', text);
  }

  private async pickOpenEditor(): Promise<void> {
    const docs = vscode.workspace.textDocuments.filter(d => !d.isUntitled && d.uri.scheme === 'file');
    if (!docs.length) { void vscode.window.showWarningMessage('No open editors to attach.'); return; }
    const pick = await vscode.window.showQuickPick(docs.map(d => ({
      label: d.fileName.split(/[\\/]/).pop() ?? d.fileName,
      description: d.fileName,
      doc: d,
    })));
    if (pick) this.addAttachment(pick.label, pick.doc.getText());
  }

  private async attachProblems(): Promise<void> {
    const doc = vscode.window.activeTextEditor?.document;
    const diags = doc
      ? vscode.languages.getDiagnostics(doc.uri)
      : vscode.languages.getDiagnostics().flatMap(([, d]) => d);
    if (!diags.length) { void vscode.window.showInformationMessage('No problems to attach.'); return; }
    const text = diags.map(d => `[${vscode.DiagnosticSeverity[d.severity]}] Line ${(d.range.start.line + 1)}: ${d.message}`).join('\n');
    this.addAttachment('Problems', text);
  }

  private addAttachment(label: string, content: string): void {
    const id = Date.now().toString(36);
    this.attachments.push({ id, label, content });
    this.pushAttachments();
  }

  // ── Apply file / run terminal ─────────────────────────────────────
  private async createSuggestedFile(filePath: string): Promise<void> {
    const entry = this.pendingFiles.get(filePath);
    if (!entry) {
      void vscode.window.showWarningMessage(`Cascade: Could not find code for "${filePath}". Try clicking Apply to File on the code block.`);
      return;
    }
    const wsFolder = vscode.workspace.workspaceFolders?.[0]?.uri;
    if (!wsFolder) {
      // No workspace open — fall back to save dialog
      await this.applyFileEdit(entry.code, entry.lang, filePath);
      return;
    }
    try {
      const targetUri = vscode.Uri.joinPath(wsFolder, filePath);
      // Ensure parent directory exists
      const parts = filePath.split('/');
      if (parts.length > 1) {
        const dirUri = vscode.Uri.joinPath(wsFolder, ...parts.slice(0, -1));
        await vscode.workspace.fs.createDirectory(dirUri).catch(() => undefined);
      }
      await vscode.workspace.fs.writeFile(targetUri, Buffer.from(entry.code, 'utf8'));
      await vscode.window.showTextDocument(targetUri);
      this.post({ type: 'fileCreated', name: filePath });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      void vscode.window.showErrorMessage(`Cascade: Failed to create "${filePath}": ${msg}`);
    }
  }

  private async applyFileEdit(code: string, _lang: string, suggestedPath?: string): Promise<void> {
    const access = cfg('fileAccess', 'none');
    if (access !== 'readwrite') {
      void vscode.window.showWarningMessage('Cascade: File write access is disabled. Enable it in Settings.');
      return;
    }
    const uris = await vscode.window.showSaveDialog({
      defaultUri: suggestedPath
        ? vscode.Uri.joinPath(vscode.workspace.workspaceFolders?.[0]?.uri ?? vscode.Uri.file('/'), suggestedPath)
        : undefined,
      saveLabel: 'Apply Code',
    });
    if (!uris) return;
    await vscode.workspace.fs.writeFile(uris, Buffer.from(code, 'utf8'));
    void vscode.window.showTextDocument(uris);
  }

  private async runInTerminal(command: string): Promise<void> {
    const allowed = cfg('terminalAccess', false);
    if (!allowed) {
      void vscode.window.showWarningMessage('Cascade: Terminal access is disabled. Enable it in Settings.');
      return;
    }
    const approval = cfg('approvalMode', 'ask');
    if (approval === 'ask') {
      const confirm = await vscode.window.showWarningMessage(
        `Run in terminal?\n\`${command.slice(0, 100)}\``,
        { modal: true }, 'Run'
      );
      if (confirm !== 'Run') return;
    }
    let term = vscode.window.terminals.find(t => t.name === 'Cascade');
    if (!term) term = vscode.window.createTerminal('Cascade');
    term.show();
    term.sendText(command);
  }

  // ── Commands ──────────────────────────────────────────────────────
  newChat(): void {
    this.sessions.createSession();
    this.pushSessionState();
    this.pushThread();
  }

  openSettingsCmd(): void {
    void this.pushSettings();
  }

  clearHistory(): void {
    this.sessions.clearAllHistory();
    this.pushSessionState();
    this.pushThread();
  }

  // ── Post helper ───────────────────────────────────────────────────
  private post(msg: Record<string, unknown>): void {
    void this.view?.webview.postMessage(msg);
  }
}



