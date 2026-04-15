"use strict";var ne=Object.create;var L=Object.defineProperty;var ce=Object.getOwnPropertyDescriptor;var de=Object.getOwnPropertyNames;var re=Object.getPrototypeOf,le=Object.prototype.hasOwnProperty;var pe=(o,e)=>{for(var t in e)L(o,t,{get:e[t],enumerable:!0})},Q=(o,e,t,s)=>{if(e&&typeof e=="object"||typeof e=="function")for(let a of de(e))!le.call(o,a)&&a!==t&&L(o,a,{get:()=>e[a],enumerable:!(s=ce(e,a))||s.enumerable});return o};var ve=(o,e,t)=>(t=o!=null?ne(re(o)):{},Q(e||!o||!o.__esModule?L(t,"default",{value:o,enumerable:!0}):t,o)),ue=o=>Q(L({},"__esModule",{value:!0}),o);var Te={};pe(Te,{activate:()=>Pe,deactivate:()=>Ae});module.exports=ue(Te);var i=ve(require("vscode"));var he=80,X=200,Z="cascade.sessions",ee="cascade.activeSession";function ge(){return Date.now().toString(36)+Math.random().toString(36).slice(2,7)}function fe(o){let e=o.replace(/```[\s\S]*?```/g,"").trim().split(`
`)[0].trim();return e.length>50?e.slice(0,47)+"\u2026":e||"New chat"}var q=class{constructor(e){this.storage=e;this.sessions=[];this.activeId="";this.load()}load(){let e=this.storage.get(Z,[]);this.sessions=Array.isArray(e)?e:[],this.activeId=this.storage.get(ee,""),this.sessions.find(t=>t.id===this.activeId)||(this.activeId=this.sessions[0]?.id??""),this.sessions.length||this.createSession()}async persist(){await this.storage.update(Z,this.sessions),await this.storage.update(ee,this.activeId)}get active(){return this.sessions.find(e=>e.id===this.activeId)}get allSessions(){return[...this.sessions]}get openSessions(){return this.sessions.filter(e=>!e.archived).slice(0,he)}get historyItems(){return[...this.sessions].sort((e,t)=>t.updatedAt-e.updatedAt)}createSession(){let e={id:ge(),title:"New chat",messages:[],createdAt:Date.now(),updatedAt:Date.now(),archived:!1};this.sessions.unshift(e),this.activeId=e.id;let t=this.sessions.filter(s=>s.archived);if(t.length>X){let s=new Set(t.slice(0,X).map(a=>a.id));this.sessions=this.sessions.filter(a=>!a.archived||s.has(a.id))}return this.persist(),e}switchTo(e){let t=this.sessions.find(s=>s.id===e);return t?(t.archived&&(t.archived=!1),this.activeId=e,this.persist(),!0):!1}closeSession(e){let t=this.sessions.find(s=>s.id===e);if(t){if(t.archived=!0,this.activeId===e){let s=this.openSessions.filter(a=>a.id!==e);if(this.activeId=s[0]?.id??"",!this.activeId){this.createSession();return}}this.persist()}}renameSession(e,t){let s=this.sessions.find(a=>a.id===e);s&&(s.title=t.trim()||"Chat",this.persist())}addMessage(e,t){let s=this.active;s&&(s.messages.push({role:e,content:t}),s.updatedAt=Date.now(),s.title==="New chat"&&e==="user"&&(s.title=fe(t)),this.persist())}updateLastAssistant(e){let t=this.active;if(!t)return;let s=t.messages.at(-1);s?.role==="assistant"&&(s.content=e,t.updatedAt=Date.now(),this.persist())}clearMessages(){let e=this.active;e&&(e.messages=[],e.title="New chat",e.updatedAt=Date.now(),this.persist())}clearAllHistory(){this.sessions=[],this.activeId="",this.createSession()}};var j={openrouter:["meta-llama/llama-3.3-70b-instruct:free","deepseek/deepseek-r1:free","deepseek/deepseek-chat-v3-0324:free","google/gemma-3-27b-it:free","microsoft/phi-4-reasoning:free","qwen/qwen3-30b-a3b:free","qwen/qwen3-14b:free","mistralai/mistral-7b-instruct:free","nousresearch/deephermes-3-llama-3-8b-preview:free"],huggingface:["Qwen/Qwen2.5-Coder-32B-Instruct","meta-llama/Llama-3.3-70B-Instruct","deepseek-ai/DeepSeek-R1","Qwen/Qwen2.5-72B-Instruct","google/gemma-3-27b-it","mistralai/Mistral-7B-Instruct-v0.3","HuggingFaceH4/zephyr-7b-beta"],groq:["llama-3.3-70b-versatile","deepseek-r1-distill-llama-70b","llama-3.1-8b-instant","gemma2-9b-it","mixtral-8x7b-32768","llama3-70b-8192","llama3-8b-8192"]},U={openrouter:"meta-llama/llama-3.3-70b-instruct:free",huggingface:"Qwen/Qwen2.5-Coder-32B-Instruct",groq:"llama-3.3-70b-versatile"};function me(o,e){switch(o){case"openrouter":return V.openrouter??"https://openrouter.ai/api/v1/chat/completions";case"groq":return V.groq??"https://api.groq.com/openai/v1/chat/completions";case"huggingface":return V.huggingface??"https://router.huggingface.co/v1/chat/completions"}}function we(o,e){let t={"Content-Type":"application/json"};switch(o){case"openrouter":return{...t,Authorization:`Bearer ${e}`,"HTTP-Referer":"https://github.com/NolvusMadeIt/cascade","X-Title":"Cascade AI"};case"huggingface":return{...t,Authorization:`Bearer ${e}`};case"groq":return{...t,Authorization:`Bearer ${e}`}}}async function*te(o,e,t,s,a,n,r,l){let m=me(o,t),g=we(o,e),p=await fetch(m,{method:"POST",headers:g,body:JSON.stringify({model:t,messages:s,stream:!0,temperature:a,max_tokens:n,top_p:r}),signal:l});if(!p.ok){let F=await p.text().catch(()=>p.statusText);throw new Error(`${o} ${p.status}: ${F.slice(0,200)}`)}if(!p.body)throw new Error("No response body from provider");let A=p.body.getReader(),E=new TextDecoder,C="";for(;;){let{done:F,value:K}=await A.read();if(F)break;C+=E.decode(K,{stream:!0});let O=C.split(`
`);C=O.pop()??"";for(let N of O){let d=N.trim();if(!d.startsWith("data:"))continue;let v=d.slice(5).trim();if(v==="[DONE]")return;try{let h=JSON.parse(v).choices?.[0]?.delta?.content;h&&(yield h)}catch{}}}}function be(o){try{let e=/\{[\s\S]+\}/.exec(o);if(e){let t=JSON.parse(e[0]),s=t?.error,a=s?.message??s?.raw??t?.message??t?.detail;if(a&&typeof a=="string"&&a.length>0){let n=a.replace(/\s+/g," ").trim(),r=n.indexOf(". ",80);return r>0?n.slice(0,r+1):n.slice(0,220)}}}catch{}return o.slice(0,200)}async function ye(o,e){try{let t=await fetch("https://openrouter.ai/api/v1/models",{headers:{Authorization:`Bearer ${o}`}});if(!t.ok)return j.openrouter;let a=(await t.json()).data??[],r=(e?a.filter(l=>l.id.endsWith(":free")||l.pricing?.prompt==="0"):a).map(l=>l.id).sort();return r.length?r:j.openrouter}catch{return j.openrouter}}function ae(){let o="",e="ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";for(let t=0;t<32;t++)o+=e.charAt(Math.floor(Math.random()*e.length));return o}function se(o){return o.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;")}function c(o,e){return i.workspace.getConfiguration("cascade").get(o,e)}async function f(o,e){await i.workspace.getConfiguration("cascade").update(o,e,i.ConfigurationTarget.Global)}var V={},ke="https://raw.githubusercontent.com/NolvusMadeIt/cascade/main/endpoints.json",Se="https://api.github.com/repos/NolvusMadeIt/cascade/releases/latest";async function xe(o){try{let e=await fetch(ke,{signal:AbortSignal.timeout(8e3)});if(!e.ok)return;let t=await e.json(),s=o.globalState.get("cascade.endpoints",{}),a=Object.keys(s).length===0;V={...t},await o.globalState.update("cascade.endpoints",t),a||Object.entries(t).some(([r,l])=>s[r]!==l)&&await i.window.showInformationMessage("Cascade: Provider endpoints have been updated. Reload VS Code to apply the changes.","Reload Now","Later")==="Reload Now"&&await i.commands.executeCommand("workbench.action.reloadWindow")}catch{}}async function Ce(o){try{let e=await fetch(Se,{headers:{"User-Agent":"cascade-vscode"},signal:AbortSignal.timeout(8e3)});if(!e.ok)return;let t=await e.json(),s=t.tag_name.replace(/^v/,""),a=o.extension.packageJSON.version;if(s===a)return;let n=g=>g.split(".").map(Number).reduce((x,p,A)=>x+p*1e3**(2-A),0);if(n(s)<=n(a))return;let r=t.assets.find(g=>g.name.endsWith(".vsix"));if(!r||await i.window.showInformationMessage(`Cascade v${s} is available (you have v${a}). Install the update now?`,"Download & Install","Later")!=="Download & Install")return;await i.window.withProgress({location:i.ProgressLocation.Notification,title:"Cascade: Downloading update\u2026",cancellable:!1},async()=>{let g=await fetch(r.browser_download_url,{signal:AbortSignal.timeout(12e4)});if(!g.ok)throw new Error("Download failed");let x=await g.arrayBuffer();await o.globalStorageUri&&i.workspace.fs.createDirectory(o.globalStorageUri).catch(()=>{});let p=i.Uri.joinPath(o.globalStorageUri,`cascade-${s}.vsix`);await i.workspace.fs.writeFile(p,new Uint8Array(x)),await i.commands.executeCommand("workbench.extensions.installExtension",p)}),await i.window.showInformationMessage(`Cascade v${s} installed! Reload VS Code to activate it.`,"Reload Now","Later")==="Reload Now"&&await i.commands.executeCommand("workbench.action.reloadWindow")}catch{}}function ie(o){let e=[],t=/```([ \t]*[\w+.-]*)[ \t]*\r?\n([\s\S]*?)```/g,s=/(?:\/\/|#|<!-{2,})\s*[Ff]ile:\s*([^\r\n\-]+?)(?:\s*-{2,}>)?\s*$/,a;for(;(a=t.exec(o))!==null;){let n=a[1].trim(),l=a[2].split(/\r?\n/),m="",g=0;for(let p=0;p<Math.min(5,l.length);p++){let A=s.exec(l[p].trim());if(A){m=A[1].trim(),g=p+1;break}}if(!m)continue;let x=l.slice(g).join(`
`).trimEnd();x.length>20&&e.push({name:m,lang:n,code:x})}return e}var _=[],G=class{resolveWebviewView(e){this.view=e,e.webview.options={enableScripts:!0},this.render([]),_.push(this),e.onDidDispose(()=>{let t=_.indexOf(this);t!==-1&&_.splice(t,1)})}render(e){if(!this.view)return;let t=ae(),s=e.length===0,a=e.map((n,r)=>`<div class="tp-item ${n.done?"done":"active"}"><span class="tp-dot">${n.done?"\u2713":r+1}</span><span class="tp-text">${n.text}</span></div>`).join("");this.view.webview.html=`<!DOCTYPE html>
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
${s?'<div class="tp-empty">No active tasks \u2014 start a chat to see progress here.</div>':a}
</body></html>`}update(e){this.render(e)}};function B(o){for(let e of _)e.update(o)}function Pe(o){let e=new H(o),t=new H(o),s=new H(o);o.subscriptions.push(i.window.registerWebviewViewProvider("cascade.chat",e,{webviewOptions:{retainContextWhenHidden:!0}}),i.window.registerWebviewViewProvider("cascade.panel",t,{webviewOptions:{retainContextWhenHidden:!0}}),i.window.registerWebviewViewProvider("cascade.secondary",s,{webviewOptions:{retainContextWhenHidden:!0}}),i.window.registerWebviewViewProvider("cascade.tasks",new G,{webviewOptions:{retainContextWhenHidden:!0}}),i.commands.registerCommand("cascade.newChat",()=>e.newChat()),i.commands.registerCommand("cascade.openSettings",()=>e.openSettingsCmd()),i.commands.registerCommand("cascade.clearHistory",()=>e.clearHistory()),i.commands.registerCommand("cascade.focusSidebar",()=>i.commands.executeCommand("cascade.chat.focus")),i.commands.registerCommand("cascade.focusPanel",()=>i.commands.executeCommand("cascade.panel.focus")),i.commands.registerCommand("cascade.focusSecondary",()=>i.commands.executeCommand("cascade.secondary.focus")),i.commands.registerCommand("cascade.showTasks",()=>i.commands.executeCommand("cascade.tasks.focus"))),setTimeout(()=>{xe(o),Ce(o)},3e3)}function Ae(){}var H=class{constructor(e){this.ctx=e;this.attachments=[];this.pendingFiles=new Map;this.sessions=new q(e.globalState)}resolveWebviewView(e){this.view=e,e.webview.options={enableScripts:!0,localResourceRoots:[this.ctx.extensionUri]},e.webview.html=this.getHtml(e.webview),e.webview.onDidReceiveMessage(t=>this.onMessage(t)),e.onDidChangeVisibility(()=>{e.visible&&this.pushSessionState()})}getHtml(e){let t=ae(),s=e.asWebviewUri(i.Uri.joinPath(this.ctx.extensionUri,"dist","chat.js")),a=e.asWebviewUri(i.Uri.joinPath(this.ctx.extensionUri,"media","chat.css")),n=e.asWebviewUri(i.Uri.joinPath(this.ctx.extensionUri,"media","cascade-icon.svg")),r=e.asWebviewUri(i.Uri.joinPath(this.ctx.extensionUri,"media","cascade-logo.svg")),l=c("provider","openrouter"),m=c("model",U[l]);return`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta http-equiv="Content-Security-Policy" content="${["default-src 'none'",`img-src ${e.cspSource} data: https:`,`style-src ${e.cspSource} 'unsafe-inline'`,`script-src 'nonce-${t}' ${e.cspSource}`,`font-src ${e.cspSource}`].join("; ")}"/>
  <meta name="viewport" content="width=device-width,initial-scale=1.0"/>
  <title>Cascade</title>
  <link rel="stylesheet" href="${a}"/>
</head>
<body>
<div class="cd-app">

  <!-- \u2500\u2500 Header \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 -->
  <header class="cd-header">
    <div class="cd-logo">
      <img class="cd-logo-mark" src="${n}" alt=""/>
      <span class="cd-logo-name">Cascade</span>
    </div>
    <select id="providerSel" class="cd-select" title="Provider">
      <option value="openrouter"${l==="openrouter"?" selected":""}>OpenRouter</option>
      <option value="huggingface"${l==="huggingface"?" selected":""}>HuggingFace</option>
      <option value="groq"${l==="groq"?" selected":""}>Groq</option>
    </select>
    <select id="modelSel" class="cd-select wide" title="Model">
      <option value="${se(m)}">${se(m)}</option>
    </select>
    <div class="cd-spacer"></div>
    <button type="button" class="cd-icon-btn" id="refreshBtn" title="Refresh model list">\u21BB</button>
    <button type="button" class="cd-icon-btn" id="historyBtn" title="Session history">\u2630</button>
    <button type="button" class="cd-icon-btn" id="settingsBtn" title="Settings">\u2699</button>
    <button type="button" class="cd-icon-btn" id="newChatBtn" title="New chat">+</button>
  </header>

  <!-- \u2500\u2500 Session tabs \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 -->
  <div class="cd-tabs" id="tabsBar"></div>

  <!-- \u2500\u2500 Progress panel \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 -->
  <div id="progressPanel" class="cd-progress hidden">
    <div class="cd-progress-head">
      <span class="cd-progress-title">Progress</span>
      <button type="button" class="cd-icon-btn cd-pgr-chevron cd-chevron-lg" id="pgrCollapse" title="Collapse">&#8743;</button>
    </div>
    <div id="progressList" class="cd-progress-list"></div>
  </div>

  <!-- \u2500\u2500 Status \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 -->
  <div class="cd-status">
    <span class="cd-status-left idle">
      <span class="cd-dot" id="statusDot"></span>
      <span id="statusTxt">Ready</span>
    </span>
    <span>\u21B5 send \xB7 \u21E7\u21B5 newline</span>
  </div>

  <!-- \u2500\u2500 Main view \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 -->
  <div id="mainView" class="cd-main">

    <div class="cd-msgs-wrap">
      <!-- Empty state -->
      <div id="empty" class="cd-empty" style="display:flex">
        <div class="cd-empty-inner">
          <img class="cd-empty-icon" src="${r}" alt=""/>
          <div class="cd-empty-title">Cascade</div>
          <p class="cd-empty-sub">Free AI coding assistant. Powered by the best zero-cost models \u2014 no subscription needed.</p>
          <table class="cd-caps">
            <tr><td>File Access</td><td><span class="cd-badge" id="capFile">Off</span></td></tr>
            <tr><td>Inline Edits</td><td><span class="cd-badge" id="capEdit">Off</span></td></tr>
            <tr><td>Terminal</td><td><span class="cd-badge" id="capTerm">Off</span></td></tr>
            <tr><td>Git</td><td><span class="cd-badge" id="capGit">Off</span></td></tr>
            <tr><td>Multi-file Context</td><td><span class="cd-badge on" id="capCtx">On</span></td></tr>
          </table>
          <p class="cd-empty-hint">Open \u2699 to add your free API key and unlock models.</p>
        </div>
      </div>
      <!-- Messages -->
      <div id="msgs" class="cd-msgs"></div>
    </div>

    <!-- Composer -->
    <footer class="cd-composer">
      <div class="cd-chips" id="chips"></div>
      <div class="cd-card">
        <textarea id="prompt" rows="3" placeholder="Ask anything \u2014 or paste code, reference a @file\u2026"></textarea>
        <div class="cd-toolbar">
          <div class="cd-tb-left">
            <button type="button" class="cd-tbtn" id="attachBtn">+ Context</button>
            <button type="button" class="cd-icon-btn" id="browseBtn" title="Web browser">\u{1F310}</button>
            <div class="cd-modes">
              <button type="button" id="modeAgent">Agent</button>
              <button type="button" id="modeAsk">Ask</button>
              <button type="button" id="modePlan">Plan</button>
            </div>

          </div>
          <div class="cd-tb-right">
            <button type="button" class="cd-send" id="sendBtn" title="Send (Enter)">\u2191</button>
          </div>
        </div>
      </div>
      <!-- Context menu (outside cd-card to avoid overflow:hidden clipping) -->
      <div class="cd-menu" id="attachMenu">
        <div class="cd-menu-search">
          <input id="attachSearch" type="text" placeholder="Filter\u2026"/>
        </div>
        <div class="cd-menu-list">
          <button type="button" class="cd-menu-item" data-action="activeFile"    data-filter="active file editor">Active file</button>
          <button type="button" class="cd-menu-item" data-action="openEditors"   data-filter="open editors tabs">Open editors\u2026</button>
          <button type="button" class="cd-menu-item" data-action="workspaceFile" data-filter="workspace file folder disk">File from workspace\u2026</button>
          <button type="button" class="cd-menu-item" data-action="localFile"     data-filter="upload local file">Upload file\u2026</button>
          <button type="button" class="cd-menu-item" data-action="problems"      data-filter="problems errors warnings diagnostics">Problems</button>
          <button type="button" class="cd-menu-item" data-action="clipboard"     data-filter="clipboard image screenshot">Image from clipboard</button>
        </div>
      </div>
      <div class="cd-hint">
        <span>Keys are free \u2014 get one at openrouter.ai \xB7 huggingface.co \xB7 console.groq.com</span>
      </div>
    </footer>
  </div><!-- /#mainView -->

  <!-- \u2500\u2500 Settings overlay \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 -->
  <div id="settingsOverlay" class="cd-overlay hidden">
    <div class="cd-panel">

      <!-- Full-width title bar -->
      <div class="cd-panel-head">
        <span class="cd-panel-title">Settings</span>
        <button type="button" class="cd-icon-btn cd-close-btn" id="settingsClose" title="Close">\xD7</button>
      </div>

      <!-- Two-column layout: nav + content -->
      <div class="cd-panel-layout">

        <!-- Left nav sidebar -->
        <nav class="cd-panel-nav">
          <button type="button" class="cd-nav-item active" data-page="keys">
            <span class="cd-nav-icon">\u{1F511}</span>API Keys
          </button>
          <button type="button" class="cd-nav-item" data-page="models">
            <span class="cd-nav-icon">\u26A1</span>Models
          </button>
          <button type="button" class="cd-nav-item" data-page="sampling">
            <span class="cd-nav-icon">\u{1F39B}</span>Sampling
          </button>
          <button type="button" class="cd-nav-item" data-page="workspace">
            <span class="cd-nav-icon">\u{1F5C2}</span>Workspace
          </button>
          <button type="button" class="cd-nav-item" data-page="chat">
            <span class="cd-nav-icon">\u{1F4AC}</span>Chat
          </button>
          <button type="button" class="cd-nav-item" data-page="profile">
            <span class="cd-nav-icon">\u{1F464}</span>Profile
          </button>
          <div class="cd-nav-divider"></div>
          <button type="button" class="cd-nav-item" data-page="privacy">
            <span class="cd-nav-icon">\u{1F512}</span>Privacy
          </button>
          <button type="button" class="cd-nav-item" data-page="stats">
            <span class="cd-nav-icon">\u{1F4CA}</span>Stats
          </button>
          <button type="button" class="cd-nav-item" data-page="about">
            <span class="cd-nav-icon">\u2139</span>About
          </button>
        </nav>

        <!-- Right content area -->
        <div class="cd-panel-content">
          <div class="cd-panel-body">

            <!-- \u2500\u2500 Page: API Keys \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 -->
            <div class="cd-settings-page active" id="pageKeys">
              <div class="cd-section">
                <div class="cd-section-hd">API Keys \u2014 all free</div>
                <p class="cd-section-desc">Keys are encrypted in VS Code Secret Storage and never appear in settings.json or git.</p>

                <div class="cd-key-card">
                  <div class="cd-key-card-info">
                    <div class="cd-key-card-name">OpenRouter</div>
                    <div class="cd-key-card-sub">
                      <span class="cd-key-status unset" id="hintOr"><span class="cd-key-dot"></span>Not set</span>
                      <a href="https://openrouter.ai/keys" class="cd-about-link">get free key \u2197</a>
                    </div>
                  </div>
                  <div class="cd-pw-wrap">
                    <input type="password" class="cd-input" id="inpOrKey" autocomplete="off" placeholder="sk-or-\u2026" style="width:110px"/>
                    <button type="button" class="cd-pw-eye" id="eyeOr" title="Show/hide">\u{1F441}</button>
                  </div>
                </div>

                <div class="cd-key-card">
                  <div class="cd-key-card-info">
                    <div class="cd-key-card-name">Hugging Face</div>
                    <div class="cd-key-card-sub">
                      <span class="cd-key-status unset" id="hintHf"><span class="cd-key-dot"></span>Not set</span>
                      <a href="https://huggingface.co/settings/tokens" class="cd-about-link">get free token \u2197</a>
                    </div>
                  </div>
                  <div class="cd-pw-wrap">
                    <input type="password" class="cd-input" id="inpHfKey" autocomplete="off" placeholder="hf_\u2026" style="width:110px"/>
                    <button type="button" class="cd-pw-eye" id="eyeHf" title="Show/hide">\u{1F441}</button>
                  </div>
                </div>

                <div class="cd-key-card">
                  <div class="cd-key-card-info">
                    <div class="cd-key-card-name">Groq</div>
                    <div class="cd-key-card-sub">
                      <span class="cd-key-status unset" id="hintGroq"><span class="cd-key-dot"></span>Not set</span>
                      <a href="https://console.groq.com/keys" class="cd-about-link">get free key \u2197</a>
                    </div>
                  </div>
                  <div class="cd-pw-wrap">
                    <input type="password" class="cd-input" id="inpGroqKey" autocomplete="off" placeholder="gsk_\u2026" style="width:110px"/>
                    <button type="button" class="cd-pw-eye" id="eyeGroq" title="Show/hide">\u{1F441}</button>
                  </div>
                </div>
              </div>
            </div>

            <!-- \u2500\u2500 Page: Models \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 -->
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

            <!-- \u2500\u2500 Page: Sampling \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 -->
            <div class="cd-settings-page" id="pageSampling">
              <div class="cd-section">
                <div class="cd-section-hd">Generation Parameters</div>
                <div class="cd-field">
                  <label class="cd-label" for="inpTemp">Temperature &nbsp;<span style="font-weight:400;opacity:.65">(0 = focused \xB7 2 = creative)</span></label>
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

            <!-- \u2500\u2500 Page: Chat \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 -->
            <div class="cd-settings-page" id="pageChat">
              <div class="cd-section">
                <div class="cd-section-hd">Code Blocks</div>
                <div class="cd-toggle-row">
                  <div class="cd-toggle-info">
                    <div class="cd-toggle-title">Auto-collapse code</div>
                    <div class="cd-toggle-desc">Hide code blocks by default \u2014 click to expand them in chat</div>
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


            <!-- \u2500\u2500 Page: Workspace \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 -->
            <div class="cd-settings-page" id="pageWorkspace">
              <div class="cd-section">
                <div class="cd-section-hd">Agent Permissions</div>
                <div class="cd-field">
                  <label class="cd-label" for="selApproval">Approval mode</label>
                  <select class="cd-input" id="selApproval">
                    <option value="ask">Normal \u2014 approve each action</option>
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

            <!-- \u2500\u2500 Page: Profile \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 -->
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

            <!-- \u2500\u2500 Page: Privacy \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 -->
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
                <button type="button" class="cd-danger-btn" id="logoutBtn">\u{1F5D1} Clear all API keys</button>
                <button type="button" class="cd-danger-btn" id="clearHistBtn">\u{1F5D1} Delete all chat history</button>
              </div>
            </div>

            <!-- \u2500\u2500 Page: Stats \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 -->
            <div class="cd-settings-page" id="pageStats">
              <div class="cd-section">
                <div class="cd-section-hd">Usage Overview</div>
                <div class="cd-stats-grid">
                  <div class="cd-stat-card"><div class="cd-stat-val" id="statSessions">\u2014</div><div class="cd-stat-lbl">Sessions</div></div>
                  <div class="cd-stat-card"><div class="cd-stat-val" id="statMessages">\u2014</div><div class="cd-stat-lbl">Messages</div></div>
                  <div class="cd-stat-card"><div class="cd-stat-val" id="statActiveDays">\u2014</div><div class="cd-stat-lbl">Active days</div></div>
                  <div class="cd-stat-card"><div class="cd-stat-val" id="statStreak">\u2014</div><div class="cd-stat-lbl">Current streak</div></div>
                </div>
              </div>
              <div class="cd-section">
                <div class="cd-section-hd">Activity \u2014 Last 12 Weeks</div>
                <div id="activityGrid" class="cd-activity-grid"></div>
                <div id="statsCaption" class="cd-stats-caption"></div>
              </div>
              <div class="cd-section">
                <div class="cd-section-hd">Breakdown</div>
                <div class="cd-about-row"><span class="cd-about-label">Longest streak</span><span class="cd-about-val" id="statLongestStreak">\u2014</span></div>
                <div class="cd-about-row"><span class="cd-about-label">Peak day of week</span><span class="cd-about-val" id="statPeakDay">\u2014</span></div>
                <div class="cd-about-row"><span class="cd-about-label">Current provider</span><span class="cd-about-val" id="statProvider">\u2014</span></div>
                <div class="cd-about-row"><span class="cd-about-label">Current model</span><span class="cd-about-val" id="statModel">\u2014</span></div>
              </div>
            </div>

            <!-- \u2500\u2500 Page: Stats \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 -->
            </div>

            <!-- \u2500\u2500 Page: About \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 -->
            <div class="cd-settings-page" id="pageAbout">
              <div class="cd-section">
                <div class="cd-section-hd">Cascade</div>
                <p class="cd-section-desc">Free AI coding assistant for VS Code. Powered by the best zero-cost models \u2014 no subscription needed.</p>
                <div class="cd-about-row"><span class="cd-about-label">Version</span><span class="cd-about-val" id="aboutVersion">\u2014</span></div>
                <div class="cd-about-row"><span class="cd-about-label">Publisher</span><span class="cd-about-val">NolvusMadeIt</span></div>
                <div class="cd-about-row"><span class="cd-about-label">Providers</span><span class="cd-about-val">OpenRouter \xB7 Hugging Face \xB7 Groq</span></div>
              </div>
              <div class="cd-section">
                <div class="cd-section-hd">Links</div>
                <div class="cd-about-row">
                  <span class="cd-about-label">OpenRouter free models</span>
                  <a href="https://openrouter.ai/keys" class="cd-about-link">openrouter.ai \u2197</a>
                </div>
                <div class="cd-about-row">
                  <span class="cd-about-label">Hugging Face tokens</span>
                  <a href="https://huggingface.co/settings/tokens" class="cd-about-link">huggingface.co \u2197</a>
                </div>
                <div class="cd-about-row">
                  <span class="cd-about-label">Groq console</span>
                  <a href="https://console.groq.com/keys" class="cd-about-link">console.groq.com \u2197</a>
                </div>
              </div>
            </div>

          </div><!-- /.cd-panel-body -->
        </div><!-- /.cd-panel-content -->
      </div><!-- /.cd-panel-layout -->

      <!-- Full-width footer -->
      <div class="cd-panel-foot">
        <span class="cd-toast" id="settingsToast">Saved \u2713</span>
        <button type="button" class="cd-btn" id="settingsCancel">Cancel</button>
        <button type="button" class="cd-btn primary" id="settingsSave">Save</button>
      </div>

    </div><!-- /.cd-panel -->
  </div>

  <!-- \u2500\u2500 History overlay \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 -->
  <div id="historyOverlay" class="cd-overlay hidden">
    <div class="cd-panel">
      <div class="cd-panel-head">
        <span class="cd-panel-title">Session history</span>
        <button type="button" class="cd-icon-btn" id="historyClose" title="Close">\xD7</button>
      </div>
      <div class="cd-panel-body">
        <section class="cd-section">
          <div class="cd-section-hd">Search</div>
          <input type="text" class="cd-input" id="histSearch" placeholder="Keyword, filename\u2026"/>
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
<script nonce="${t}" src="${s}"></script>
</body>
</html>`}async onMessage(e){switch(e.type){case"ready":this.pushSessionState(),this.pushKeyStatus(),this.pushModels();break;case"send":await this.handleSend(String(e.text??""),String(e.mode??"ask"));break;case"newSession":this.sessions.createSession(),this.pushSessionState(),this.pushThread();break;case"switchSession":this.sessions.switchTo(String(e.id??"")),this.pushSessionState(),this.pushThread();break;case"closeSession":this.sessions.closeSession(String(e.id??"")),this.pushSessionState(),this.pushThread();break;case"getSettings":await this.pushSettings(),this.pushStats();break;case"saveSettings":await this.saveSettings(e),this.pushKeyStatus(),this.pushModels();break;case"logout":await this.logout();break;case"clearAllHistory":this.sessions.clearAllHistory(),this.pushSessionState(),this.pushThread(),i.window.showInformationMessage("Cascade: All chat history deleted.");break;case"getModels":await this.pushModels();break;case"setProvider":{let t=String(e.provider??"openrouter");await f("provider",t),await f("model",U[t]),this.post({type:"providerChanged",provider:t}),await this.pushModels();break}case"setModel":await f("model",String(e.model??""));break;case"getHistory":this.pushHistory();break;case"getStats":this.pushStats();break;case"restoreSession":this.sessions.switchTo(String(e.id??"")),this.pushSessionState(),this.pushThread();break;case"attachActiveFile":await this.attachActive();break;case"pickWorkspaceFile":await this.pickWorkspaceFile();break;case"pickLocalFile":await this.pickLocalFile();break;case"pickOpenEditor":await this.pickOpenEditor();break;case"attachProblems":await this.attachProblems();break;case"removeAttachment":{let t=String(e.id??"");this.attachments=this.attachments.filter(s=>s.id!==t),this.pushAttachments();break}case"applyFile":await this.applyFileEdit(String(e.code??""),String(e.language??""),e.suggestedPath);break;case"createSuggestedFile":await this.createSuggestedFile(String(e.name??""));break;case"runInTerminal":await this.runInTerminal(String(e.command??""));break;case"openBrowser":await i.commands.executeCommand("simpleBrowser.show","https://openrouter.ai/models?order=newest&supported_parameters=free");break}}async handleSend(e,t){if(!e.trim())return;let s=c("provider","openrouter"),a=c("model",U[s]),n=c("temperature",.2),r=c("maxTokens",4096),l=c("topP",1),m=c("userName",""),g=c("systemPrompt",""),x=c("contextLength",20),p=i.workspace.workspaceFolders?.[0],A=p?p.uri.fsPath:null,E=[`You are Cascade \u2014 an agentic AI coding assistant built into VS Code, powered by ${a}.${m?` The user's name is ${m}.`:""}${A?` Workspace: ${A}.`:""} You work like Claude Code: you execute tasks silently and report results cleanly.`,`AGENT RULES \u2014 follow these exactly:
1. NEVER show, paste, or explain code in your response text. Code goes ONLY in fenced blocks.
2. Fenced code blocks are captured and written to the workspace automatically. The user NEVER sees them. They are invisible. Write ALL file content there.
3. After writing files, respond with 1-3 SHORT sentences: what you created, and what it does. Nothing more.
4. Do NOT explain how the code works. Do NOT list features line by line. Just confirm what was done.
5. Think like an agent executing tasks, not a tutor explaining code.`,`FILE FORMAT \u2014 every file needs a path comment as the VERY FIRST LINE inside the fenced block:
  HTML  \u2192 <!-- File: src/index.html -->
  JS/TS \u2192 // File: src/app.ts
  Python \u2192 # File: src/main.py
  CSS   \u2192 /* File: src/styles.css */
Write the COMPLETE file. Never truncate. Never use placeholder comments like "// rest of code here".`,`RESPONSE FORMAT:
For multi-step tasks, start with a <steps> block (max 5 items, plain text, one per line):
<steps>
Plan the structure
Write the files
Confirm what was created
</steps>
Then write your fenced file blocks (invisible to user).
Then end with a brief confirmation sentence. That is your entire response.`];g&&E.push(g);let C=e;this.attachments.length&&(C=`${this.attachments.map(y=>`<attachment name="${y.label}">
${y.content}
</attachment>`).join(`
`)}

${e}`);let F=this.sessions.active;if(!F)return;if(c("fileAccess","readwrite")!=="none"&&p){let h=p.uri.fsPath,y=i.workspace.textDocuments.filter(u=>!u.isUntitled&&u.uri.scheme==="file"&&u.uri.fsPath.startsWith(h)&&u.getText().length>0&&u.getText().length<8e4);y.length&&(C=`<workspace_context>
${y.map(k=>`<file path="${k.uri.fsPath.slice(h.length).replace(/\\/g,"/").replace(/^\//,"")}">
${k.getText()}
</file>`).join(`
`)}
</workspace_context>

${C}`)}let O=await this.getKey(s);if(!O){this.post({type:"assistantError",text:`No API key for ${s}. Open \u2699 Settings to add your free key.`});return}this.sessions.addMessage("user",e);let N=F.messages.slice(0,-1).slice(-(x*2)).map(h=>({role:h.role,content:h.content})),d=[{role:"system",content:E.join(`
`)},...N,{role:"user",content:C}];this.abortCtrl?.abort(),this.abortCtrl=new AbortController,this.post({type:"assistantStart"});let v="",I=!1;try{for await(let y of te(s,O,a,d,n,r,l,this.abortCtrl.signal)){if(v+=y,!I&&v.includes("</steps>")){let u=/<steps>([\s\S]*?)<\/steps>/.exec(v);if(u){let k=u[1].trim().split(`
`).map(b=>b.trim()).filter(b=>b.length>0);k.length&&(this.post({type:"progressSteps",steps:k}),B(k.map((b,P)=>({text:b,done:!1})))),I=!0}}this.post({type:"assistantDelta",text:v})}this.sessions.addMessage("assistant",v),this.post({type:"progressDone"}),this.post({type:"assistantDone",text:v}),B([]),this.pushSessionState();let h=ie(v);if(h.length){let y=i.workspace.workspaceFolders?.[0]?.uri;if(y){let u=[],k;for(let b of h)try{let P=b.name.replace(/\\/g,"/").split("/"),S=i.Uri.joinPath(y,...P);P.length>1&&await i.workspace.fs.createDirectory(i.Uri.joinPath(y,...P.slice(0,-1))).catch(()=>{}),await i.workspace.fs.writeFile(S,Buffer.from(b.code,"utf8")),u.push(b.name),k||(k=S)}catch(P){let S=P instanceof Error?P.message:String(P);i.window.showErrorMessage(`Cascade: Failed to write "${b.name}": ${S}`)}u.length&&(k&&i.window.showTextDocument(k,{preview:!1}),i.window.showInformationMessage(`Cascade wrote ${u.length} file${u.length>1?"s":""}: ${u.join(", ")}`),this.post({type:"filesAutoCreated",files:u}))}else{this.pendingFiles.clear();for(let u of h)this.pendingFiles.set(u.name,{code:u.code,lang:u.lang});this.post({type:"suggestFileCreate",files:h.map(u=>({name:u.name}))})}}}catch(h){if(h.name==="AbortError"){this.post({type:"assistantAbort"});return}let y=h instanceof Error?h.message:String(h),u=be(y),k=["groq","openrouter","huggingface"],b=new Set([s]),P=!1;for(let S of k){if(b.has(S))continue;let W=await this.getKey(S);if(W){b.add(S),this.post({type:"rateLimitMsg",text:`\u26A1 ${s} unavailable \u2014 trying ${S}\u2026`,countdown:0});try{let w="",z=!1;this.abortCtrl=new AbortController;let oe=U[S];for await(let $ of te(S,W,oe,d,n,r,l,this.abortCtrl.signal)){if(w+=$,!z&&w.includes("</steps>")){let M=/<steps>([\s\S]*?)<\/steps>/.exec(w);if(M){let D=M[1].trim().split(`
`).map(T=>T.trim()).filter(T=>T.length>0);D.length&&(this.post({type:"progressSteps",steps:D}),B(D.map(T=>({text:T,done:!1})))),z=!0}}this.post({type:"assistantDelta",text:w})}this.sessions.addMessage("assistant",w),this.post({type:"progressDone"}),this.post({type:"assistantDone",text:w}),B([]),this.pushSessionState(),document.getElementById?.("rateLimitBar")?.remove();let Y=ie(w);if(Y.length){let $=i.workspace.workspaceFolders?.[0]?.uri;if($){let M=[],D;for(let T of Y)try{let R=T.name.replace(/\\/g,"/").split("/"),J=i.Uri.joinPath($,...R);R.length>1&&await i.workspace.fs.createDirectory(i.Uri.joinPath($,...R.slice(0,-1))).catch(()=>{}),await i.workspace.fs.writeFile(J,Buffer.from(T.code,"utf8")),M.push(T.name),D||(D=J)}catch(R){i.window.showErrorMessage(`Cascade: Failed to write "${T.name}": ${R instanceof Error?R.message:R}`)}M.length&&(D&&i.window.showTextDocument(D,{preview:!1}),i.window.showInformationMessage(`Cascade wrote ${M.length} file${M.length>1?"s":""}: ${M.join(", ")}`),this.post({type:"filesAutoCreated",files:M}))}}P=!0;break}catch(w){if(w.name==="AbortError"){this.post({type:"assistantAbort"});return}}}}if(!P){let S=!!await this.getKey("groq"),W=!!await this.getKey("openrouter"),w="";S||(w+=`
\u2022 **Add a Groq key** \u2192 console.groq.com (100% free, no credit card)`),W||(w+="\n\u2022 **Add an OpenRouter key** \u2192 openrouter.ai (free `:free` models)"),w||(w=`
\u2022 All your providers are currently rate-limited. Wait a minute, then try again.`),this.post({type:"assistantError",text:`**All providers unavailable.**
${u}${w}`})}}}async pushSettings(){let e=!!await this.ctx.secrets.get("cascade.orKey"),t=!!await this.ctx.secrets.get("cascade.hfKey"),s=!!await this.ctx.secrets.get("cascade.groqKey");this.post({type:"settingsForm",hasOrKey:e,hasHfKey:t,hasGroqKey:s,temperature:c("temperature",.2),maxTokens:c("maxTokens",4096),topP:c("topP",1),contextLength:c("contextLength",20),fileAccess:c("fileAccess","none"),fileScope:c("fileScope","workspace"),approvalMode:c("approvalMode","ask"),terminalAccess:c("terminalAccess",!1),gitAccess:c("gitAccess",!1),openRouterFreeOnly:c("openRouterFreeOnly",!0),fallbackProvider:c("fallbackProvider","none"),userName:c("userName",""),systemPrompt:c("systemPrompt",""),historyRetention:c("historyRetention","unlimited"),autoHideCode:c("autoHideCode",!0)})}async saveSettings(e){e.openRouterKey&&await this.ctx.secrets.store("cascade.orKey",String(e.openRouterKey)),e.huggingfaceKey&&await this.ctx.secrets.store("cascade.hfKey",String(e.huggingfaceKey)),e.groqKey&&await this.ctx.secrets.store("cascade.groqKey",String(e.groqKey)),e.temperature!==void 0&&await f("temperature",Number(e.temperature)),e.maxTokens!==void 0&&await f("maxTokens",Number(e.maxTokens)),e.topP!==void 0&&await f("topP",Number(e.topP)),e.contextLength!==void 0&&await f("contextLength",Number(e.contextLength)),e.fileAccess!==void 0&&await f("fileAccess",String(e.fileAccess)),e.fileScope!==void 0&&await f("fileScope",String(e.fileScope)),e.approvalMode!==void 0&&await f("approvalMode",String(e.approvalMode)),e.terminalAccess!==void 0&&await f("terminalAccess",!!e.terminalAccess),e.gitAccess!==void 0&&await f("gitAccess",!!e.gitAccess),e.openRouterFreeOnly!==void 0&&await f("openRouterFreeOnly",!!e.openRouterFreeOnly),e.fallbackProvider!==void 0&&await f("fallbackProvider",String(e.fallbackProvider)),e.userName!==void 0&&await f("userName",String(e.userName)),e.systemPrompt!==void 0&&await f("systemPrompt",String(e.systemPrompt)),e.historyRetention!==void 0&&await f("historyRetention",String(e.historyRetention)),e.autoHideCode!==void 0&&await f("autoHideCode",!!e.autoHideCode),e.autoHideCode!==void 0&&await f("autoHideCode",!!e.autoHideCode)}async logout(){await this.ctx.secrets.delete("cascade.orKey"),await this.ctx.secrets.delete("cascade.hfKey"),await this.ctx.secrets.delete("cascade.groqKey"),i.window.showInformationMessage("Cascade: All API keys cleared."),await this.pushSettings()}async getKey(e){let t={openrouter:"cascade.orKey",huggingface:"cascade.hfKey",groq:"cascade.groqKey"};return this.ctx.secrets.get(t[e])}async pushKeyStatus(){let e=!!await this.ctx.secrets.get("cascade.orKey"),t=!!await this.ctx.secrets.get("cascade.hfKey"),s=!!await this.ctx.secrets.get("cascade.groqKey");this.post({type:"keyStatus",hasOrKey:e,hasHfKey:t,hasGroqKey:s})}async pushModels(){let e=c("provider","openrouter"),t=c("openRouterFreeOnly",!0),s=c("model",U[e]),a=await this.getKey(e);if(!a){this.post({type:"models",models:[],selectedModel:"",noKey:!0});return}let n;e==="openrouter"?n=await ye(a,t):n=[...j[e]],n.includes(s)||n.unshift(s),this.post({type:"models",models:n,selectedModel:s,noKey:!1})}pushSessionState(){let e=this.sessions.openSessions;this.post({type:"sessionState",activeSessionId:this.sessions.active?.id??"",sessions:e.map(t=>({id:t.id,title:t.title}))})}pushThread(){let e=this.sessions.active;this.post({type:"loadThread",messages:e?.messages??[]}),this.attachments=[],this.pushAttachments()}pushStats(){let e=this.sessions.allSessions,t=e.reduce((d,v)=>d+v.messages.length,0),s=new Set,a={};for(let d of e){for(let I of d.messages);let v=new Date(d.updatedAt).toISOString().slice(0,10);s.add(v),a[v]=(a[v]??0)+d.messages.length}for(let d of e){let v=new Date(d.createdAt).toISOString().slice(0,10);s.add(v),a[v]||(a[v]=0)}let n=[...s].sort(),r=0,l=0,m=0,g=new Date().toISOString().slice(0,10),x=new Date(Date.now()-864e5).toISOString().slice(0,10);for(let d=0;d<n.length;d++){let v=d>0?n[d-1]:"",I=n[d];m=(v?(new Date(I).getTime()-new Date(v).getTime())/864e5:1)===1?m+1:1,m>l&&(l=m)}if(s.has(g)||s.has(x)){let d=s.has(g)?g:x;for(;s.has(d);)r++,d=new Date(new Date(d).getTime()-864e5).toISOString().slice(0,10)}let p=[0,0,0,0,0,0,0];for(let d of n)p[new Date(d).getDay()]++;let E=["Sun","Mon","Tue","Wed","Thu","Fri","Sat"][p.indexOf(Math.max(...p))],C=[],F=new Date(Date.now()-83*864e5);F.setHours(0,0,0,0);for(let d=0;d<84;d++){let v=new Date(F.getTime()+d*864e5).toISOString().slice(0,10);C.push(a[v]??0)}let K=c("provider","openrouter"),O=c("model",""),N=this.ctx.extension.packageJSON.version;this.post({type:"statsData",sessions:e.length,messages:t,activeDays:s.size,streak:r,longestStreak:l,peakDay:E,gridData:C,provider:K,model:O,version:N})}pushHistory(){let e=this.sessions.historyItems.map(t=>({id:t.id,title:t.title,preview:t.messages.find(s=>s.role==="user")?.content.slice(0,80)??"",updatedAt:t.updatedAt,archived:t.archived,messageCount:t.messages.length}));this.post({type:"historyState",activeSessionId:this.sessions.active?.id??"",items:e})}pushAttachments(){this.post({type:"attachmentsUpdated",items:this.attachments.map(e=>({id:e.id,label:e.label}))})}async attachActive(){let e=i.window.activeTextEditor?.document;if(!e){i.window.showWarningMessage("Cascade: No active file to attach.");return}if(c("fileAccess","none")==="none"){await i.window.showWarningMessage("Cascade: File access is disabled.","Open Settings")&&this.post({type:"settingsForm"});return}this.addAttachment(e.fileName.split(/[\\/]/).pop()??"file",e.getText())}async pickWorkspaceFile(){let e=await i.window.showOpenDialog({canSelectMany:!1,openLabel:"Attach"});if(!e?.length)return;let t=await i.workspace.fs.readFile(e[0]),s=Buffer.from(t).toString("utf8");this.addAttachment(e[0].fsPath.split(/[\\/]/).pop()??"file",s)}async pickLocalFile(){let e=await i.window.showOpenDialog({canSelectMany:!1,openLabel:"Upload"});if(!e?.length)return;let t=await i.workspace.fs.readFile(e[0]),s=Buffer.from(t).toString("utf8");this.addAttachment(e[0].fsPath.split(/[\\/]/).pop()??"file",s)}async pickOpenEditor(){let e=i.workspace.textDocuments.filter(s=>!s.isUntitled&&s.uri.scheme==="file");if(!e.length){i.window.showWarningMessage("No open editors to attach.");return}let t=await i.window.showQuickPick(e.map(s=>({label:s.fileName.split(/[\\/]/).pop()??s.fileName,description:s.fileName,doc:s})));t&&this.addAttachment(t.label,t.doc.getText())}async attachProblems(){let e=i.window.activeTextEditor?.document,t=e?i.languages.getDiagnostics(e.uri):i.languages.getDiagnostics().flatMap(([,a])=>a);if(!t.length){i.window.showInformationMessage("No problems to attach.");return}let s=t.map(a=>`[${i.DiagnosticSeverity[a.severity]}] Line ${a.range.start.line+1}: ${a.message}`).join(`
`);this.addAttachment("Problems",s)}addAttachment(e,t){let s=Date.now().toString(36);this.attachments.push({id:s,label:e,content:t}),this.pushAttachments()}async createSuggestedFile(e){let t=this.pendingFiles.get(e);if(!t){i.window.showWarningMessage(`Cascade: Could not find code for "${e}". Try clicking Apply to File on the code block.`);return}let s=i.workspace.workspaceFolders?.[0]?.uri;if(!s){await this.applyFileEdit(t.code,t.lang,e);return}try{let a=i.Uri.joinPath(s,e),n=e.split("/");if(n.length>1){let r=i.Uri.joinPath(s,...n.slice(0,-1));await i.workspace.fs.createDirectory(r).catch(()=>{})}await i.workspace.fs.writeFile(a,Buffer.from(t.code,"utf8")),await i.window.showTextDocument(a),this.post({type:"fileCreated",name:e})}catch(a){let n=a instanceof Error?a.message:String(a);i.window.showErrorMessage(`Cascade: Failed to create "${e}": ${n}`)}}async applyFileEdit(e,t,s){if(c("fileAccess","none")!=="readwrite"){i.window.showWarningMessage("Cascade: File write access is disabled. Enable it in Settings.");return}let n=await i.window.showSaveDialog({defaultUri:s?i.Uri.joinPath(i.workspace.workspaceFolders?.[0]?.uri??i.Uri.file("/"),s):void 0,saveLabel:"Apply Code"});n&&(await i.workspace.fs.writeFile(n,Buffer.from(e,"utf8")),i.window.showTextDocument(n))}async runInTerminal(e){if(!c("terminalAccess",!1)){i.window.showWarningMessage("Cascade: Terminal access is disabled. Enable it in Settings.");return}if(c("approvalMode","ask")==="ask"&&await i.window.showWarningMessage(`Run in terminal?
\`${e.slice(0,100)}\``,{modal:!0},"Run")!=="Run")return;let a=i.window.terminals.find(n=>n.name==="Cascade");a||(a=i.window.createTerminal("Cascade")),a.show(),a.sendText(e)}newChat(){this.sessions.createSession(),this.pushSessionState(),this.pushThread()}openSettingsCmd(){this.pushSettings()}clearHistory(){this.sessions.clearAllHistory(),this.pushSessionState(),this.pushThread()}post(e){this.view?.webview.postMessage(e)}};0&&(module.exports={activate,deactivate});
//# sourceMappingURL=extension.js.map
