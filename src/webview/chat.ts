import DOMPurify from 'dompurify';
import { marked } from 'marked';

declare function acquireVsCodeApi(): { postMessage(msg: unknown): void };
const vscode = acquireVsCodeApi();

// ── Marked config ────────────────────────────────────────────────────
marked.setOptions({ gfm: true, breaks: false });

function md(text: string): string {
  const raw = marked.parse(text, { async: false }) as string;
  return DOMPurify.sanitize(raw, { USE_PROFILES: { html: true } });
}

// ── Helpers ──────────────────────────────────────────────────────────
function el<T extends HTMLElement>(id: string): T {
  const e = document.getElementById(id) as T | null;
  if (!e) throw new Error(`Cascade: missing #${id}`);
  return e;
}
function opt<T extends HTMLElement>(id: string): T | null {
  return document.getElementById(id) as T | null;
}

// ── DOM refs ─────────────────────────────────────────────────────────
const promptEl        = el<HTMLTextAreaElement>('prompt');
const msgsEl          = el<HTMLElement>('msgs');
const emptyEl         = el<HTMLElement>('empty');
const statusDot       = el<HTMLElement>('statusDot');
const statusTxt       = el<HTMLElement>('statusTxt');
const sendBtn         = el<HTMLButtonElement>('sendBtn');
const newChatBtn      = el<HTMLButtonElement>('newChatBtn');
const refreshBtn      = el<HTMLButtonElement>('refreshBtn');
const historyBtn      = el<HTMLButtonElement>('historyBtn');
const settingsBtn     = el<HTMLButtonElement>('settingsBtn');
const modelSel        = el<HTMLSelectElement>('modelSel');
const providerSel     = el<HTMLSelectElement>('providerSel');
const tabsBar         = el<HTMLElement>('tabsBar');
const attachBtn       = el<HTMLButtonElement>('attachBtn');
const browseBtn       = opt<HTMLButtonElement>('browseBtn');
const attachMenu      = el<HTMLElement>('attachMenu');
const attachSearch    = el<HTMLInputElement>('attachSearch');
const chipsEl         = el<HTMLElement>('chips');
const modeAgent       = el<HTMLButtonElement>('modeAgent');
const modeAsk         = el<HTMLButtonElement>('modeAsk');
const modePlan        = el<HTMLButtonElement>('modePlan');

// Main / overlay refs
const mainView        = el<HTMLElement>('mainView');
const settingsOverlay = el<HTMLElement>('settingsOverlay');
const historyOverlay  = el<HTMLElement>('historyOverlay');

// Settings form
const settingsClose   = el<HTMLButtonElement>('settingsClose');
const settingsCancel  = el<HTMLButtonElement>('settingsCancel');
const settingsSave    = el<HTMLButtonElement>('settingsSave');
const settingsToast   = el<HTMLElement>('settingsToast');
const logoutBtn       = el<HTMLButtonElement>('logoutBtn');
const clearHistBtn    = opt<HTMLButtonElement>('clearHistBtn');
const inpOrKey        = el<HTMLInputElement>('inpOrKey');
const inpHfKey        = el<HTMLInputElement>('inpHfKey');
const inpGroqKey      = el<HTMLInputElement>('inpGroqKey');
const eyeOr           = el<HTMLButtonElement>('eyeOr');
const eyeHf           = el<HTMLButtonElement>('eyeHf');
const eyeGroq         = el<HTMLButtonElement>('eyeGroq');
const hintOr          = el<HTMLElement>('hintOr');
const hintHf          = el<HTMLElement>('hintHf');
const hintGroq        = el<HTMLElement>('hintGroq');
const inpTemp         = el<HTMLInputElement>('inpTemp');
const inpMaxTok       = el<HTMLInputElement>('inpMaxTok');
const inpTopP         = el<HTMLInputElement>('inpTopP');
const inpCtxLen       = opt<HTMLInputElement>('inpCtxLen');
const inpUserName     = opt<HTMLInputElement>('inpUserName');
const inpSystemPrompt = opt<HTMLTextAreaElement>('inpSystemPrompt');
const selFallback     = opt<HTMLSelectElement>('selFallback');
const selHistory      = opt<HTMLSelectElement>('selHistory');
const selApproval     = el<HTMLSelectElement>('selApproval');
const selFileAccess   = el<HTMLSelectElement>('selFileAccess');
const selFileScope    = el<HTMLSelectElement>('selFileScope');
const chkTerminal     = el<HTMLInputElement>('chkTerminal');
const chkGit          = el<HTMLInputElement>('chkGit');
const chkFreeOnly     = el<HTMLInputElement>('chkFreeOnly');
const chkAutoHideCode = opt<HTMLInputElement>('chkAutoHideCode');

// History
const historyClose    = el<HTMLButtonElement>('historyClose');

// Progress panel
const progressPanel   = el<HTMLElement>('progressPanel');
const progressList    = el<HTMLElement>('progressList');
const pgrCollapse     = el<HTMLButtonElement>('pgrCollapse');

// ── Progress panel helpers ────────────────────────────────────────
function showProgressPanel(steps: string[]): void {
  progressList.innerHTML = '';
  steps.forEach((text, i) => {
    const item = document.createElement('div');
    item.className = 'cd-progress-item pending';
    item.dataset.idx = String(i);
    const dot = document.createElement('span');
    dot.className = 'cd-pgr-dot';
    dot.textContent = String(i + 1);
    const label = document.createElement('span');
    label.className = 'cd-pgr-text';
    label.textContent = text;
    item.appendChild(dot);
    item.appendChild(label);
    progressList.appendChild(item);
  });
  progressPanel.classList.remove('hidden', 'collapsed');
}

function completeProgressPanel(): void {
  progressList.querySelectorAll<HTMLElement>('.cd-progress-item').forEach(item => {
    item.className = 'cd-progress-item done';
    const dot = item.querySelector<HTMLElement>('.cd-pgr-dot');
    if (dot) dot.textContent = '✓';
  });
}

function hideProgressPanel(): void {
  progressPanel.classList.add('hidden');
  progressList.innerHTML = '';
}

pgrCollapse.addEventListener('click', () => progressPanel.classList.toggle('collapsed'));
const histSearch      = el<HTMLInputElement>('histSearch');
const histList        = el<HTMLElement>('histList');

// ── State ────────────────────────────────────────────────────────────
type ChatMode = 'agent' | 'ask' | 'plan';
type Attachment = { id: string; label: string };
type HistItem = { id: string; title: string; preview: string; updatedAt: number; archived: boolean; messageCount: number };
type TabItem  = { id: string; title: string };

let busy         = false;
let mode: ChatMode = 'agent';
let autoHideCode = true; // matches cascade.autoHideCode default
let activeSession = '';
let tabs: TabItem[] = [];
let histItems: HistItem[] = [];
let histRange: 'all'|'today'|'week'|'month' = 'all';
let attachments: Attachment[] = [];
let ignoreModelChange = false;
let pendingBubble: HTMLElement | null = null;
let pendingWrapper: HTMLElement | null = null;

// ── Status ───────────────────────────────────────────────────────────
function setStatus(text: string, state: 'idle'|'busy'|'error' = 'idle'): void {
  statusTxt.textContent = text;
  statusDot.parentElement!.className = `cd-status-left ${state}`;
}

// ── Busy ─────────────────────────────────────────────────────────────
function setBusy(val: boolean): void {
  busy = val;
  sendBtn.disabled    = val;
  newChatBtn.disabled = val;
  settingsBtn.disabled = val;
  historyBtn.disabled = val;
  refreshBtn.disabled = val;
  modelSel.disabled   = val;
  providerSel.disabled = val;
  if (val) { setStatus('Working…', 'busy'); }
  else     { setStatus('Ready', 'idle'); }
}

// ── Mode ─────────────────────────────────────────────────────────────
function syncMode(): void {
  modeAgent.classList.toggle('active', mode === 'agent');
  modeAsk.classList.toggle('active', mode === 'ask');
  modePlan.classList.toggle('active', mode === 'plan');
}

// ── Empty state ───────────────────────────────────────────────────────
function syncEmpty(): void {
  emptyEl.style.display = msgsEl.children.length === 0 ? 'flex' : 'none';
}

// ── Capability badges ─────────────────────────────────────────────────
function setBadge(id: string, on: boolean, label: string): void {
  const e = opt<HTMLElement>(id);
  if (!e) return;
  e.textContent = label;
  e.className   = 'cd-badge' + (on ? ' on' : '');
}

function syncCaps(fileAccess: string, terminal: boolean, git: boolean): void {
  const hasFile = fileAccess !== 'none';
  const rw = fileAccess === 'readwrite';
  setBadge('capFile', hasFile, rw ? 'R+W' : hasFile ? 'Read' : 'Off');
  setBadge('capEdit', rw, rw ? 'On' : 'Off');
  setBadge('capTerm', terminal, terminal ? 'On' : 'Off');
  setBadge('capGit',  git,      git      ? 'On' : 'Off');
  setBadge('capCtx',  true, 'On');
}

// ── Sessions / tabs ───────────────────────────────────────────────────
function renderTabs(): void {
  tabsBar.innerHTML = '';
  for (const t of tabs) {
    const tab = document.createElement('button');
    tab.type = 'button';
    tab.className = `cd-tab${t.id === activeSession ? ' active' : ''}`;
    tab.addEventListener('click', () => vscode.postMessage({ type: 'switchSession', id: t.id }));

    const lbl = document.createElement('span');
    lbl.className = 'cd-tab-label';
    lbl.textContent = t.title;
    tab.appendChild(lbl);

    const cls = document.createElement('span');
    cls.className = 'cd-tab-close';
    cls.textContent = '×';
    cls.title = 'Close';
    cls.addEventListener('click', (e) => {
      e.stopPropagation();
      vscode.postMessage({ type: 'closeSession', id: t.id });
    });
    tab.appendChild(cls);

    tabsBar.appendChild(tab);
  }
}

// ── History ───────────────────────────────────────────────────────────
function histVisible(item: HistItem): boolean {
  const q = histSearch.value.trim().toLowerCase();
  if (q && !`${item.title} ${item.preview}`.toLowerCase().includes(q)) return false;
  const age = Date.now() - item.updatedAt;
  if (histRange === 'today') return age <= 86400000;
  if (histRange === 'week')  return age <= 604800000;
  if (histRange === 'month') return age <= 2592000000;
  return true;
}

function renderHist(): void {
  histList.innerHTML = '';
  const visible = histItems.filter(histVisible);
  if (!visible.length) {
    const e = document.createElement('div');
    e.className = 'cd-hist-empty';
    e.textContent = 'No matching sessions.';
    histList.appendChild(e);
    return;
  }
  for (const item of visible) {
    const row = document.createElement('button');
    row.type = 'button';
    row.className = `cd-hist-item${item.id === activeSession ? ' active' : ''}`;
    row.addEventListener('click', () => {
      vscode.postMessage({ type: item.archived ? 'restoreSession' : 'switchSession', id: item.id });
      closeHistory();
    });

    const titleEl = document.createElement('div');
    titleEl.className = 'cd-hist-title';
    titleEl.textContent = item.title;

    const metaEl = document.createElement('div');
    metaEl.className = 'cd-hist-meta';
    const date = new Intl.DateTimeFormat(undefined, { month:'short', day:'numeric', hour:'numeric', minute:'2-digit' }).format(new Date(item.updatedAt));
    metaEl.textContent = `${date} · ${item.messageCount} msg${item.messageCount === 1 ? '' : 's'}`;
    if (item.archived) {
      const arc = document.createElement('span');
      arc.className = 'cd-hist-archived';
      arc.textContent = 'archived';
      metaEl.appendChild(arc);
    }

    const previewEl = document.createElement('div');
    previewEl.className = 'cd-hist-preview';
    previewEl.textContent = item.preview || 'Empty conversation';

    row.appendChild(titleEl);
    row.appendChild(metaEl);
    row.appendChild(previewEl);
    histList.appendChild(row);
  }
}

// ── Attachments ───────────────────────────────────────────────────────
function renderChips(): void {
  chipsEl.innerHTML = '';
  for (const a of attachments) {
    const chip = document.createElement('div');
    chip.className = 'cd-chip';
    const lbl = document.createElement('span');
    lbl.className = 'cd-chip-label';
    lbl.textContent = a.label;
    const rm = document.createElement('button');
    rm.type = 'button';
    rm.className = 'cd-chip-rm';
    rm.setAttribute('aria-label', 'Remove');
    rm.textContent = '×';
    rm.addEventListener('click', () => vscode.postMessage({ type: 'removeAttachment', id: a.id }));
    chip.appendChild(lbl);
    chip.appendChild(rm);
    chipsEl.appendChild(chip);
  }
}

// ── Overlays ──────────────────────────────────────────────────────────
function showMain(): void {
  mainView.classList.remove('hidden');
  settingsOverlay.classList.add('hidden');
  historyOverlay.classList.add('hidden');
}
function showSettings(): void {
  mainView.classList.add('hidden');
  historyOverlay.classList.add('hidden');
  settingsOverlay.classList.remove('hidden');
}
function showHistory(): void {
  mainView.classList.add('hidden');
  settingsOverlay.classList.add('hidden');
  historyOverlay.classList.remove('hidden');
  histSearch.focus();
}
function openSettings(): void {
  vscode.postMessage({ type: 'getSettings' });
}
function closeSettings(): void {
  showMain();
}
function openHistory(): void {
  vscode.postMessage({ type: 'getHistory' });
  showHistory();
}
function closeHistory(): void {
  showMain();
}

// ── Message creation ──────────────────────────────────────────────────
const SPINNER = `<div class="cd-spinner"><div class="cd-spinner-ring"></div><span>Thinking…</span></div>`;

function stripThink(text: string): { visible: string; thinking: string } {
  // Strip <steps> planning blocks (rendered in progress panel instead)
  text = text.replace(/<steps>[\s\S]*?<\/steps>\s*/g, '');
  let thinking = '';
  let visible = text.replace(/<think>([\s\S]*?)<\/think>/g, (_, inner: string) => {
    thinking += (thinking ? '\n\n' : '') + (inner as string).trim();
    return '';
  }).trim();
  // Heading-based reasoning (some models)
  const m = /^### Reasoning\s+([\s\S]*?)\s+### Answer\s+([\s\S]*)$/m.exec(visible);
  if (m) { thinking += (thinking ? '\n\n' : '') + m[1].trim(); visible = m[2].trim(); }
  // Unclosed <think> while streaming
  const idx = visible.lastIndexOf('<think>');
  if (idx !== -1) {
    const tail = visible.slice(idx + 7).trim();
    if (tail) thinking += (thinking ? '\n\n' : '') + tail;
    visible = visible.slice(0, idx).trim();
  }
  return { visible, thinking };
}

function addCodeActions(root: HTMLElement): void {
  root.querySelectorAll('pre').forEach((pre) => {
    if (pre.querySelector('.cd-code-acts')) return;

    // Auto-collapse code blocks if the setting is enabled
    if (autoHideCode && !pre.closest('.cd-code-collapsed')) {
      const codeEl2 = pre.querySelector('code');
      const lineCount = (codeEl2?.textContent ?? '').split('\n').length;
      const wrapper = document.createElement('div');
      wrapper.className = 'cd-code-collapsed';
      const toggle = document.createElement('button');
      toggle.type = 'button';
      toggle.className = 'cd-code-toggle';
      toggle.innerHTML = `<span class="cd-ct-icon">&#9654;</span> Show code <span class="cd-ct-meta">${lineCount} line${lineCount===1?'':'s'}</span>`;
      toggle.addEventListener('click', () => {
        const expanded = wrapper.classList.toggle('expanded');
        const icon = toggle.querySelector<HTMLElement>('.cd-ct-icon')!;
        icon.innerHTML = expanded ? '&#9660;' : '&#9654;';
        toggle.querySelector<HTMLElement>('.cd-ct-meta')!.textContent = expanded ? 'hide' : `${lineCount} line${lineCount===1?'':'s'}`;
      });
      pre.parentNode?.insertBefore(wrapper, pre);
      wrapper.appendChild(toggle);
      wrapper.appendChild(pre);
    }

    const acts = document.createElement('div');
    acts.className = 'cd-code-acts';

    const copy = document.createElement('button');
    copy.type = 'button';
    copy.className = 'cd-code-btn';
    copy.textContent = 'Copy';
    copy.addEventListener('click', () => {
      void navigator.clipboard.writeText(pre.querySelector('code')?.textContent ?? '');
      copy.textContent = 'Copied!';
      setTimeout(() => { copy.textContent = 'Copy'; }, 1500);
    });
    acts.appendChild(copy);

    const codeEl = pre.querySelector('code');
    const lang = (/language-(\w+)/.exec(codeEl?.className ?? '') ?? [])[1] ?? '';
    const rawCode = codeEl?.textContent ?? '';
    const firstLine = rawCode.split('\n')[0].trim();
    const filePath = (/(?:\/\/|#|<!--)\s*[Ff]ile:\s*(.+?)(?:\s*-->)?$/.exec(firstLine) ?? [])[1]?.trim();

    const isShell = /^(bash|sh|shell|zsh|fish|powershell|ps1|cmd)$/i.test(lang);
    const isOutput = /^(text|output|log|plain)$/i.test(lang);

    if (!isOutput) {
      const apply = document.createElement('button');
      apply.type = 'button';
      apply.className = 'cd-code-btn apply';
      apply.textContent = filePath ? `Apply → ${filePath.split('/').pop() ?? filePath}` : 'Apply to File';
      apply.title = filePath ? `Apply to ${filePath}` : 'Apply this block to a workspace file';
      apply.addEventListener('click', () => vscode.postMessage({ type: 'applyFile', code: rawCode, language: lang, suggestedPath: filePath }));
      acts.appendChild(apply);
    }

    if (isShell) {
      const run = document.createElement('button');
      run.type = 'button';
      run.className = 'cd-code-btn run';
      run.textContent = '▶ Run';
      run.title = 'Run in integrated terminal';
      run.addEventListener('click', () => vscode.postMessage({ type: 'runInTerminal', command: rawCode.trim() }));
      acts.appendChild(run);
    }

    pre.appendChild(acts);
  });
}

function injectThinking(thinking: string, wrapper: HTMLElement, beforeEl: HTMLElement): void {
  const block = document.createElement('div');
  block.className = 'cd-think';
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'cd-think-btn';
  btn.innerHTML = `<span class="cd-think-arrow">▶</span> Reasoning`;
  const body = document.createElement('div');
  body.className = 'cd-think-body';
  body.textContent = thinking;
  btn.addEventListener('click', () => {
    const open = body.classList.toggle('open');
    const arrow = btn.querySelector<HTMLElement>('.cd-think-arrow');
    if (arrow) arrow.textContent = open ? '▼' : '▶';
  });
  block.appendChild(btn);
  block.appendChild(body);
  wrapper.insertBefore(block, beforeEl);
}

function createMsg(role: 'user'|'assistant', text = '', isError = false): { wrapper: HTMLElement; bubble: HTMLElement } {
  const wrapper = document.createElement('div');
  wrapper.className = `cd-msg ${role}${isError ? ' error' : ''}`;

  const roleEl = document.createElement('div');
  roleEl.className = 'cd-role';
  roleEl.textContent = role === 'user' ? 'You' : 'Cascade';

  const bubble = document.createElement('div');
  bubble.className = 'cd-bubble';
  if (text) bubble.textContent = text;

  wrapper.appendChild(roleEl);
  wrapper.appendChild(bubble);
  msgsEl.appendChild(wrapper);
  msgsEl.scrollTop = msgsEl.scrollHeight;
  syncEmpty();
  return { wrapper, bubble };
}

function renderThread(msgs: { role: string; content: string }[]): void {
  msgsEl.innerHTML = '';
  pendingBubble = null;
  pendingWrapper = null;

  for (const m of msgs) {
    if (m.role === 'user') {
      createMsg('user', m.content);
    } else if (m.role === 'assistant') {
      const { visible, thinking } = stripThink(m.content);
      const { wrapper, bubble } = createMsg('assistant');
      if (thinking) injectThinking(thinking, wrapper, bubble);
      bubble.className = 'cd-bubble md';
      bubble.innerHTML = md(visible || m.content);
      addCodeActions(bubble);
    }
  }
  msgsEl.scrollTop = msgsEl.scrollHeight;
  syncEmpty();
}

// ── Attach menu ───────────────────────────────────────────────────────
function closeMenus(): void { attachMenu.classList.remove('open'); }
function toggleAttachMenu(): void {
  const willOpen = !attachMenu.classList.contains('open');
  closeMenus();
  if (willOpen) {
    attachMenu.classList.add('open');
    attachSearch.value = '';
    attachSearch.focus();
    filterMenu();
  }
}
function filterMenu(): void {
  const q = attachSearch.value.trim().toLowerCase();
  attachMenu.querySelectorAll<HTMLButtonElement>('.cd-menu-item[data-filter]').forEach(btn => {
    btn.style.display = !q || (btn.dataset.filter ?? '').toLowerCase().includes(q) ? '' : 'none';
  });
}

// ── Settings validation ───────────────────────────────────────────────
function validateSettings(): boolean {
  let ok = true;
  const t = Number(inpTemp.value);
  inpTemp.classList.toggle('err', !Number.isFinite(t) || t < 0 || t > 2);
  if (!Number.isFinite(t) || t < 0 || t > 2) ok = false;
  const p = Number(inpTopP.value);
  inpTopP.classList.toggle('err', !Number.isFinite(p) || p < 0.01 || p > 1);
  if (!Number.isFinite(p) || p < 0.01 || p > 1) ok = false;
  const mk = Number(inpMaxTok.value);
  inpMaxTok.classList.toggle('err', !Number.isFinite(mk) || mk < 256 || mk > 128000);
  if (!Number.isFinite(mk) || mk < 256 || mk > 128000) ok = false;
  return ok;
}

let toastTimer: number | undefined;
function showToast(): void {
  settingsToast.classList.add('show');
  if (toastTimer !== undefined) clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => { settingsToast.classList.remove('show'); }, 1800);
}

function togglePw(inp: HTMLInputElement, btn: HTMLButtonElement): void {
  const show = inp.type === 'password';
  inp.type = show ? 'text' : 'password';
  btn.textContent = show ? '🙈' : '👁';
}

// ── Model select ──────────────────────────────────────────────────────
function setModels(models: string[], selected: string): void {
  ignoreModelChange = true;
  modelSel.innerHTML = '';
  if (!models.length) models = [selected];
  for (const m of models) {
    const opt = document.createElement('option');
    opt.value = m; opt.textContent = m;
    opt.selected = m === selected;
    modelSel.appendChild(opt);
  }
  if (models.includes(selected)) modelSel.value = selected;
  ignoreModelChange = false;
}

// ── Send ──────────────────────────────────────────────────────────────
function send(): void {
  const text = promptEl.value.trim();
  if (!text || busy) return;
  createMsg('user', text);
  vscode.postMessage({ type: 'send', text, mode });
  promptEl.value = '';
}

// ── Settings nav switching ────────────────────────────────────────────
document.querySelectorAll<HTMLButtonElement>('.cd-nav-item[data-page]').forEach(btn => {
  btn.addEventListener('click', () => {
    const page = btn.dataset.page ?? '';
    // Update nav active state
    document.querySelectorAll('.cd-nav-item').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    // Show correct page
    document.querySelectorAll('.cd-settings-page').forEach(p => p.classList.remove('active'));
    const pageEl = document.getElementById('page' + page.charAt(0).toUpperCase() + page.slice(1));
    if (pageEl) pageEl.classList.add('active');
    if (page === 'stats') vscode.postMessage({ type: 'getStats' });
  });
});

// ── Wire up events ────────────────────────────────────────────────────
sendBtn.addEventListener('click', send);
newChatBtn.addEventListener('click', () => vscode.postMessage({ type: 'newSession' }));
refreshBtn.addEventListener('click', () => vscode.postMessage({ type: 'getModels' }));

settingsBtn.addEventListener('click', () => {
  if (!settingsOverlay.classList.contains('hidden')) { closeSettings(); return; }
  openSettings();
});
historyBtn.addEventListener('click', () => {
  if (!historyOverlay.classList.contains('hidden')) { closeHistory(); return; }
  openHistory();
});

settingsClose.addEventListener('click', closeSettings);
settingsCancel.addEventListener('click', closeSettings);

settingsSave.addEventListener('click', () => {
  if (!validateSettings()) return;
  vscode.postMessage({
    type:            'saveSettings',
    openRouterKey:   inpOrKey.value.trim()   || undefined,
    huggingfaceKey:  inpHfKey.value.trim()   || undefined,
    groqKey:         inpGroqKey.value.trim() || undefined,
    temperature:     Number(inpTemp.value),
    maxTokens:       Math.round(Number(inpMaxTok.value)),
    topP:            Number(inpTopP.value),
    contextLength:   inpCtxLen ? Math.round(Number(inpCtxLen.value)) : 20,
    fileAccess:      selFileAccess.value,
    fileScope:       selFileScope.value,
    approvalMode:    selApproval.value,
    terminalAccess:  chkTerminal.checked,
    gitAccess:       chkGit.checked,
    openRouterFreeOnly: chkFreeOnly.checked,
    fallbackProvider: selFallback ? selFallback.value : 'none',
    userName:        inpUserName    ? inpUserName.value.trim()    : '',
    systemPrompt:    inpSystemPrompt ? inpSystemPrompt.value.trim() : '',
    historyRetention: selHistory ? selHistory.value : 'unlimited',
    autoHideCode:     chkAutoHideCode?.checked ?? true,
  });
  showToast();
  setTimeout(closeSettings, 900);
});

logoutBtn.addEventListener('click', () => vscode.postMessage({ type: 'logout' }));
clearHistBtn?.addEventListener('click', () => {
  vscode.postMessage({ type: 'clearAllHistory' });
  closeSettings();
});

eyeOr.addEventListener('click',   () => togglePw(inpOrKey,  eyeOr));
eyeHf.addEventListener('click',   () => togglePw(inpHfKey,  eyeHf));
eyeGroq.addEventListener('click', () => togglePw(inpGroqKey, eyeGroq));

selFileAccess.addEventListener('change', () => syncCaps(selFileAccess.value, chkTerminal.checked, chkGit.checked));
chkTerminal.addEventListener('change',   () => syncCaps(selFileAccess.value, chkTerminal.checked, chkGit.checked));
chkGit.addEventListener('change',        () => syncCaps(selFileAccess.value, chkTerminal.checked, chkGit.checked));

historyClose.addEventListener('click', closeHistory);
histSearch.addEventListener('input', renderHist);

document.querySelectorAll<HTMLButtonElement>('.cd-hist-filter').forEach(btn => {
  btn.addEventListener('click', () => {
    histRange = (btn.dataset.range as typeof histRange) ?? 'all';
    document.querySelectorAll('.cd-hist-filter').forEach(b => b.classList.toggle('active', b === btn));
    renderHist();
  });
});

modeAgent.addEventListener('click', () => { mode = 'agent'; syncMode(); });
modeAsk.addEventListener('click',   () => { mode = 'ask';   syncMode(); });
modePlan.addEventListener('click',  () => { mode = 'plan';  syncMode(); });

providerSel.addEventListener('change', () => {
  vscode.postMessage({ type: 'setProvider', provider: providerSel.value });
});
modelSel.addEventListener('change', () => {
  if (ignoreModelChange) return;
  vscode.postMessage({ type: 'setModel', model: modelSel.value });
});

promptEl.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
});

document.addEventListener('keydown', (e) => {
  if (e.key !== 'Escape') return;
  if (!settingsOverlay.classList.contains('hidden')) closeSettings();
  if (!historyOverlay.classList.contains('hidden'))  closeHistory();
});

attachBtn.addEventListener('click', (e) => { e.stopPropagation(); toggleAttachMenu(); });
browseBtn?.addEventListener('click', () => vscode.postMessage({ type: 'openBrowser' }));
attachSearch.addEventListener('input', filterMenu);
document.addEventListener('click', closeMenus);
attachMenu.addEventListener('click', (e) => e.stopPropagation());

attachMenu.querySelectorAll<HTMLButtonElement>('.cd-menu-item[data-action]').forEach(btn => {
  btn.addEventListener('click', () => {
    closeMenus();
    const a = btn.dataset.action;
    if (a === 'activeFile')   vscode.postMessage({ type: 'attachActiveFile' });
    if (a === 'openEditors')  vscode.postMessage({ type: 'pickOpenEditor' });
    if (a === 'workspaceFile') vscode.postMessage({ type: 'pickWorkspaceFile' });
    if (a === 'localFile')    vscode.postMessage({ type: 'pickLocalFile' });
    if (a === 'problems')     vscode.postMessage({ type: 'attachProblems' });
    if (a === 'clipboard')    vscode.postMessage({ type: 'attachClipboardImage' });
  });
});

msgsEl.addEventListener('dragover',  (e) => { e.preventDefault(); msgsEl.classList.add('drag-over'); });
msgsEl.addEventListener('dragleave', ()  => msgsEl.classList.remove('drag-over'));
msgsEl.addEventListener('drop',      (e) => { e.preventDefault(); msgsEl.classList.remove('drag-over'); if (e.dataTransfer?.files.length) vscode.postMessage({ type: 'pickLocalFile' }); });

// ── Message handler ───────────────────────────────────────────────────
window.addEventListener('message', ({ data }) => {
  const msg = data as Record<string, unknown>;
  switch (msg.type as string) {

    case 'status':
      setStatus(String(msg.text ?? 'Ready'), (msg.state as 'idle'|'busy'|'error') ?? 'idle');
      break;

    case 'sessionState': {
      activeSession = String(msg.activeSessionId ?? '');
      tabs = (Array.isArray(msg.sessions) ? msg.sessions as { id:string; title:string }[] : [])
        .map(s => ({ id: s.id, title: s.title }));
      renderTabs();
      break;
    }

    case 'historyState': {
      activeSession = String(msg.activeSessionId ?? activeSession);
      histItems = Array.isArray(msg.items)
        ? (msg.items as Record<string,unknown>[]).map(i => ({
            id:           String(i.id ?? ''),
            title:        String(i.title ?? ''),
            preview:      String(i.preview ?? ''),
            updatedAt:    Number(i.updatedAt ?? 0),
            archived:     Boolean(i.archived),
            messageCount: Number(i.messageCount ?? 0),
          }))
        : [];
      renderHist();
      break;
    }

    case 'loadThread': {
      const msgs2 = Array.isArray(msg.messages)
        ? (msg.messages as Record<string,unknown>[]).map(m => ({ role: String(m.role), content: String(m.content) }))
        : [];
      renderThread(msgs2);
      promptEl.focus();
      break;
    }

    case 'models': {
      const noKey = Boolean(msg.noKey);
      if (noKey) {
        ignoreModelChange = true;
        modelSel.innerHTML = '<option value="">— Add API key in ⚙ Settings —</option>';
        modelSel.disabled = true;
        ignoreModelChange = false;
      } else {
        modelSel.disabled = false;
        setModels(Array.isArray(msg.models) ? (msg.models as string[]) : [], String(msg.selectedModel ?? ''));
      }
      break;
    }

    case 'keyStatus': {
      function updateHint(el2: HTMLElement, hasKey: boolean): void {
        el2.className = `cd-key-status ${hasKey ? 'set' : 'unset'}`;
        el2.innerHTML = `<span class="cd-key-dot"></span>${hasKey ? 'Connected' : 'Not set'}`;
      }
      updateHint(hintOr,   Boolean(msg.hasOrKey));
      updateHint(hintHf,   Boolean(msg.hasHfKey));
      updateHint(hintGroq, Boolean(msg.hasGroqKey));
      break;
    }

    case 'progressSteps': {
      const steps = Array.isArray(msg.steps) ? (msg.steps as string[]) : [];
      if (steps.length) showProgressPanel(steps);
      break;
    }

    case 'progressDone':
      completeProgressPanel();
      break;

    case 'modelChanged':
      ignoreModelChange = true;
      modelSel.value = String(msg.model ?? '');
      ignoreModelChange = false;
      break;

    case 'providerChanged':
      if (providerSel.value !== String(msg.provider)) providerSel.value = String(msg.provider ?? '');
      break;

    case 'settingsForm': {
      const m2 = msg as Record<string,unknown>;
      // Key status cards
      function setKeyHint(el2: HTMLElement, hasKey: boolean): void {
        el2.className = `cd-key-status ${hasKey ? 'set' : 'unset'}`;
        el2.innerHTML = `<span class="cd-key-dot"></span>${hasKey ? 'Connected' : 'Not set'}`;
      }
      setKeyHint(hintOr,   Boolean(m2.hasOrKey));
      setKeyHint(hintHf,   Boolean(m2.hasHfKey));
      setKeyHint(hintGroq, Boolean(m2.hasGroqKey));
      // Reset key inputs
      inpOrKey.value   = '';  inpOrKey.type   = 'password';  eyeOr.textContent   = '👁';
      inpHfKey.value   = '';  inpHfKey.type   = 'password';  eyeHf.textContent   = '👁';
      inpGroqKey.value = '';  inpGroqKey.type = 'password';  eyeGroq.textContent = '👁';
      // Sampling
      inpTemp.value    = String(m2.temperature ?? 0.2);
      inpMaxTok.value  = String(m2.maxTokens   ?? 4096);
      inpTopP.value    = String(m2.topP        ?? 1);
      if (inpCtxLen)       inpCtxLen.value       = String(m2.contextLength ?? 20);
      // Models
      chkFreeOnly.checked = Boolean(m2.openRouterFreeOnly ?? true);
      if (selFallback) selFallback.value = String(m2.fallbackProvider ?? 'none');
      // Workspace
      selApproval.value   = String(m2.approvalMode ?? 'ask');
      selFileAccess.value = String(m2.fileAccess   ?? 'none');
      selFileScope.value  = String(m2.fileScope    ?? 'workspace');
      chkTerminal.checked = Boolean(m2.terminalAccess);
      chkGit.checked      = Boolean(m2.gitAccess);
      // Profile
      if (inpUserName)     inpUserName.value     = String(m2.userName ?? '');
      if (inpSystemPrompt) inpSystemPrompt.value = String(m2.systemPrompt ?? '');
      // Privacy
      if (selHistory) selHistory.value = String(m2.historyRetention ?? 'unlimited');
      // Chat display
      if (chkAutoHideCode) { chkAutoHideCode.checked = m2.autoHideCode !== false; autoHideCode = m2.autoHideCode !== false; }
      // Clear validation errors
      inpTemp.classList.remove('err');
      inpTopP.classList.remove('err');
      inpMaxTok.classList.remove('err');
      syncCaps(String(m2.fileAccess ?? 'none'), Boolean(m2.terminalAccess), Boolean(m2.gitAccess));
      showSettings();
      break;
    }

    case 'attachmentsUpdated':
      attachments = Array.isArray(msg.items)
        ? (msg.items as Record<string,unknown>[]).map(i => ({ id: String(i.id), label: String(i.label) }))
        : [];
      renderChips();
      break;

    case 'statsData': {
      const sd = msg as Record<string,unknown>;
      const setTxt = (id: string, v: unknown) => { const e = document.getElementById(id); if (e) e.textContent = String(v ?? '—'); };
      setTxt('statSessions', sd.sessions);
      setTxt('statMessages', (sd.messages as number) >= 1000 ? ((sd.messages as number)/1000).toFixed(1)+'k' : String(sd.messages));
      setTxt('statActiveDays', sd.activeDays);
      setTxt('statStreak', (sd.streak as number) + 'd');
      setTxt('statLongestStreak', (sd.longestStreak as number) + 'd');
      setTxt('statPeakDay', sd.peakDay);
      setTxt('statProvider', sd.provider);
      setTxt('statModel', (sd.model as string)?.split('/').pop() ?? '—');
      setTxt('aboutVersion', 'v' + (sd.version ?? '—'));
      // Build activity grid
      const grid = document.getElementById('activityGrid');
      const caption = document.getElementById('statsCaption');
      if (grid && Array.isArray(sd.gridData)) {
        grid.innerHTML = '';
        const maxVal = Math.max(1, ...(sd.gridData as number[]));
        (sd.gridData as number[]).forEach((v: number) => {
          const cell = document.createElement('div');
          cell.className = 'cd-activity-cell';
          const intensity = v === 0 ? 0 : Math.ceil((v / maxVal) * 4);
          cell.dataset.level = String(intensity);
          cell.title = v + ' msgs';
          grid.appendChild(cell);
        });
        if (caption) caption.textContent = `${sd.activeDays} active day${(sd.activeDays as number) === 1 ? '' : 's'} in the last 12 weeks`;
      }
      break;
    }

    case 'filesAutoCreated': {
      const files2 = Array.isArray(msg.files) ? (msg.files as string[]) : [];
      if (!files2.length) break;
      const lastMsg2 = msgsEl.lastElementChild as HTMLElement | null;
      if (!lastMsg2) break;

      // ── Remove all code blocks from the bubble (they're on disk now) ────────
      const bubble2 = lastMsg2.querySelector('.cd-bubble') as HTMLElement | null;
      if (bubble2) {
        // Remove collapsed wrappers
        bubble2.querySelectorAll('.cd-code-collapsed').forEach(el => el.remove());
        // Remove any bare pre elements
        bubble2.querySelectorAll('pre').forEach(el => el.remove());
        // If the bubble is now empty or whitespace-only, clear it
        if (!bubble2.textContent?.trim()) {
          bubble2.innerHTML = '';
        }
      }

      // ── Replace / update the agent summary card ────────────────────────────
      lastMsg2.querySelector('.cd-file-actions')?.remove();
      const card = document.createElement('div');
      card.className = 'cd-agent-card';
      const fileList = files2.map(n => {
        const parts = n.replace(/\\/g, '/').split('/');
        const fname = parts[parts.length - 1];
        const dir   = parts.length > 1 ? parts.slice(0, -1).join('/') + '/' : '';
        return `<span class="cd-ac-file"><span class="cd-ac-dir">${dir}</span><strong>${fname}</strong></span>`;
      }).join('');
      card.innerHTML =
        `<span class="cd-ac-icon codicon codicon-check"></span>` +
        `<div class="cd-ac-body">` +
          `<span class="cd-ac-label">Wrote ${files2.length} file${files2.length > 1 ? 's' : ''} to workspace</span>` +
          `<div class="cd-ac-files">${fileList}</div>` +
        `</div>`;
      lastMsg2.appendChild(card);
      msgsEl.scrollTop = msgsEl.scrollHeight;
      break;
    }

    case 'suggestFileCreate': {
      const files = Array.isArray(msg.files) ? (msg.files as { name: string }[]) : [];
      if (!files.length) break;
      // Find the last assistant message bubble and append file-create buttons
      const lastMsg = msgsEl.lastElementChild as HTMLElement | null;
      if (!lastMsg) break;
      // Remove any previous file-action bar on this message
      lastMsg.querySelector('.cd-file-actions')?.remove();
      const bar = document.createElement('div');
      bar.className = 'cd-file-actions';
      for (const f of files) {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'cd-file-action-btn';
        btn.innerHTML = `<span class="cd-fa-icon">&#128190;</span> Save <strong>${f.name}</strong>`;
        btn.dataset.filename = f.name;
        btn.addEventListener('click', () => {
          btn.disabled = true;
          btn.innerHTML = `<span class="cd-fa-icon">&#9203;</span> Creating…`;
          vscode.postMessage({ type: 'createSuggestedFile', name: f.name });
        });
        bar.appendChild(btn);
      }
      lastMsg.appendChild(bar);
      break;
    }

    case 'fileCreated': {
      const name = String(msg.name ?? '');
      const btn = msgsEl.querySelector<HTMLButtonElement>(`.cd-file-action-btn[data-filename="${CSS.escape(name)}"]`);
      if (btn) {
        btn.disabled = true;
        btn.innerHTML = `<span class="cd-fa-icon">&#10003;</span> Created <strong>${name}</strong>`;
        btn.classList.add('done');
      }
      break;
    }

    case 'rateLimitMsg': {
      // Show / update the rate-limit countdown bar above the composer
      let bar = document.getElementById('rateLimitBar');
      if (!bar) {
        bar = document.createElement('div');
        bar.id = 'rateLimitBar';
        bar.className = 'cd-rate-bar';
        // Insert before the composer
        const composer = document.querySelector('.cd-composer');
        composer?.parentNode?.insertBefore(bar, composer);
      }
      bar.textContent = String(msg.text ?? '');
      if ((msg.countdown as number) === 0) {
        // Remove bar once retry fires
        setTimeout(() => bar?.remove(), 3000);
      }
      break;
    }

    case 'assistantStart':
      setBusy(true);
      pendingWrapper?.remove();
      const { wrapper: w, bubble: b } = createMsg('assistant');
      b.innerHTML = SPINNER;
      pendingBubble  = b;
      pendingWrapper = w;
      break;

    case 'assistantDelta':
      if (pendingBubble) {
        const raw = String(msg.text ?? '');
        const { visible } = stripThink(raw);
        if (visible) {
          pendingBubble.className = 'cd-bubble md';
          pendingBubble.innerHTML = md(visible);
        } else {
          pendingBubble.className = 'cd-bubble';
          pendingBubble.innerHTML = SPINNER;
        }
        msgsEl.scrollTop = msgsEl.scrollHeight;
      }
      break;

    case 'assistantDone': {
      // Clear rate-limit bar if still showing
      document.getElementById('rateLimitBar')?.remove();
      setBusy(false);
      const text2 = String(msg.text ?? '');
      const { visible: vis, thinking } = stripThink(text2);
      const finalize = (bubble: HTMLElement, wrapper: HTMLElement) => {
        if (thinking) injectThinking(thinking, wrapper, bubble);
        bubble.className = 'cd-bubble md';
        bubble.innerHTML = md(vis || '*(no response)*');
        addCodeActions(bubble);
      };
      if (pendingBubble && pendingWrapper) {
        finalize(pendingBubble, pendingWrapper);
      } else {
        const { bubble: bb, wrapper: ww } = createMsg('assistant');
        finalize(bb, ww);
      }
      pendingBubble = null; pendingWrapper = null;
      msgsEl.scrollTop = msgsEl.scrollHeight;
      promptEl.focus();
      break;
    }

    case 'assistantError': {
      setBusy(false);
      const txt = String(msg.text ?? 'An error occurred.');
      if (pendingBubble && pendingWrapper) {
        pendingBubble.className = 'cd-bubble';
        pendingBubble.textContent = txt;
        pendingWrapper.classList.add('error');
      } else {
        createMsg('assistant', txt, true);
      }
      pendingBubble = null; pendingWrapper = null;
      msgsEl.scrollTop = msgsEl.scrollHeight;
      break;
    }

    case 'assistantAbort':
      setBusy(false);
      completeProgressPanel();
      if (pendingBubble) { pendingBubble.className = 'cd-bubble'; pendingBubble.textContent = 'Stopped.'; }
      pendingBubble = null; pendingWrapper = null;
      break;

    case 'cleared':
      msgsEl.innerHTML = '';
      pendingBubble = null; pendingWrapper = null;
      hideProgressPanel();
      syncEmpty();
      break;

    case 'gitResult': {
      const op  = String(msg.op ?? '');
      const out = String(msg.output ?? '');
      const { bubble: gb } = createMsg('assistant');
      gb.className = 'cd-bubble md';
      gb.innerHTML = md(`**Git ${op}**\n\`\`\`\n${out}\n\`\`\``);
      addCodeActions(gb);
      msgsEl.scrollTop = msgsEl.scrollHeight; syncEmpty();
      break;
    }
  }
});

// ── Init ──────────────────────────────────────────────────────────────
syncMode();
syncEmpty();
promptEl.focus();
vscode.postMessage({ type: 'ready' });
