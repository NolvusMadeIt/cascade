"use strict";var E=Object.create;var A=Object.defineProperty;var $=Object.getOwnPropertyDescriptor;var H=Object.getOwnPropertyNames;var D=Object.getPrototypeOf,B=Object.prototype.hasOwnProperty;var W=(a,e)=>{for(var t in e)A(a,t,{get:e[t],enumerable:!0})},K=(a,e,t,s)=>{if(e&&typeof e=="object"||typeof e=="function")for(let o of H(e))!B.call(a,o)&&o!==t&&A(a,o,{get:()=>e[o],enumerable:!(s=$(e,o))||s.enumerable});return a};var U=(a,e,t)=>(t=a!=null?E(D(a)):{},K(e||!a||!a.__esModule?A(t,"default",{value:a,enumerable:!0}):t,a)),L=a=>K(A({},"__esModule",{value:!0}),a);var ee={};W(ee,{activate:()=>J,deactivate:()=>Z});module.exports=L(ee);var i=U(require("vscode"));var G=80,O=200,R="cascade.sessions",N="cascade.activeSession";function j(){return Date.now().toString(36)+Math.random().toString(36).slice(2,7)}function V(a){let e=a.replace(/```[\s\S]*?```/g,"").trim().split(`
`)[0].trim();return e.length>50?e.slice(0,47)+"\u2026":e||"New chat"}var x=class{constructor(e){this.storage=e;this.sessions=[];this.activeId="";this.load()}load(){let e=this.storage.get(R,[]);this.sessions=Array.isArray(e)?e:[],this.activeId=this.storage.get(N,""),this.sessions.find(t=>t.id===this.activeId)||(this.activeId=this.sessions[0]?.id??""),this.sessions.length||this.createSession()}async persist(){await this.storage.update(R,this.sessions),await this.storage.update(N,this.activeId)}get active(){return this.sessions.find(e=>e.id===this.activeId)}get allSessions(){return[...this.sessions]}get openSessions(){return this.sessions.filter(e=>!e.archived).slice(0,G)}get historyItems(){return[...this.sessions].sort((e,t)=>t.updatedAt-e.updatedAt)}createSession(){let e={id:j(),title:"New chat",messages:[],createdAt:Date.now(),updatedAt:Date.now(),archived:!1};this.sessions.unshift(e),this.activeId=e.id;let t=this.sessions.filter(s=>s.archived);if(t.length>O){let s=new Set(t.slice(0,O).map(o=>o.id));this.sessions=this.sessions.filter(o=>!o.archived||s.has(o.id))}return this.persist(),e}switchTo(e){let t=this.sessions.find(s=>s.id===e);return t?(t.archived&&(t.archived=!1),this.activeId=e,this.persist(),!0):!1}closeSession(e){let t=this.sessions.find(s=>s.id===e);if(t){if(t.archived=!0,this.activeId===e){let s=this.openSessions.filter(o=>o.id!==e);if(this.activeId=s[0]?.id??"",!this.activeId){this.createSession();return}}this.persist()}}renameSession(e,t){let s=this.sessions.find(o=>o.id===e);s&&(s.title=t.trim()||"Chat",this.persist())}addMessage(e,t){let s=this.active;s&&(s.messages.push({role:e,content:t}),s.updatedAt=Date.now(),s.title==="New chat"&&e==="user"&&(s.title=V(t)),this.persist())}updateLastAssistant(e){let t=this.active;if(!t)return;let s=t.messages.at(-1);s?.role==="assistant"&&(s.content=e,t.updatedAt=Date.now(),this.persist())}clearMessages(){let e=this.active;e&&(e.messages=[],e.title="New chat",e.updatedAt=Date.now(),this.persist())}clearAllHistory(){this.sessions=[],this.activeId="",this.createSession()}};var C={openrouter:["meta-llama/llama-3.3-70b-instruct:free","deepseek/deepseek-r1:free","deepseek/deepseek-chat-v3-0324:free","google/gemma-3-27b-it:free","microsoft/phi-4-reasoning:free","qwen/qwen3-30b-a3b:free","qwen/qwen3-14b:free","mistralai/mistral-7b-instruct:free","nousresearch/deephermes-3-llama-3-8b-preview:free"],huggingface:["Qwen/Qwen2.5-Coder-32B-Instruct","meta-llama/Llama-3.3-70B-Instruct","deepseek-ai/DeepSeek-R1","Qwen/Qwen2.5-72B-Instruct","google/gemma-3-27b-it","mistralai/Mistral-7B-Instruct-v0.3","HuggingFaceH4/zephyr-7b-beta"],groq:["llama-3.3-70b-versatile","deepseek-r1-distill-llama-70b","llama-3.1-8b-instant","gemma2-9b-it","mixtral-8x7b-32768","llama3-70b-8192","llama3-8b-8192"]},P={openrouter:"meta-llama/llama-3.3-70b-instruct:free",huggingface:"Qwen/Qwen2.5-Coder-32B-Instruct",groq:"llama-3.3-70b-versatile"};function _(a,e){switch(a){case"openrouter":return"https://openrouter.ai/api/v1/chat/completions";case"groq":return"https://api.groq.com/openai/v1/chat/completions";case"huggingface":return`https://api-inference.huggingface.co/models/${e}/v1/chat/completions`}}function z(a,e){let t={"Content-Type":"application/json"};switch(a){case"openrouter":return{...t,Authorization:`Bearer ${e}`,"HTTP-Referer":"https://github.com/NolvusMadeIt/cascade","X-Title":"Cascade AI"};case"huggingface":return{...t,Authorization:`Bearer ${e}`};case"groq":return{...t,Authorization:`Bearer ${e}`}}}async function*Q(a,e,t,s,o,c,l,p){let m=_(a,t),y=z(a,e),h=await fetch(m,{method:"POST",headers:y,body:JSON.stringify({model:t,messages:s,stream:!0,temperature:o,max_tokens:c,top_p:l}),signal:p});if(!h.ok){let f=await h.text().catch(()=>h.statusText);throw new Error(`${a} ${h.status}: ${f.slice(0,200)}`)}if(!h.body)throw new Error("No response body from provider");let w=h.body.getReader(),k=new TextDecoder,g="";for(;;){let{done:f,value:T}=await w.read();if(f)break;g+=k.decode(T,{stream:!0});let v=g.split(`
`);g=v.pop()??"";for(let S of v){let r=S.trim();if(!r.startsWith("data:"))continue;let u=r.slice(5).trim();if(u==="[DONE]")return;try{let b=JSON.parse(u).choices?.[0]?.delta?.content;b&&(yield b)}catch{}}}}async function Y(a,e){try{let t=await fetch("https://openrouter.ai/api/v1/models",{headers:{Authorization:`Bearer ${a}`}});if(!t.ok)return C.openrouter;let o=(await t.json()).data??[],l=(e?o.filter(p=>p.id.endsWith(":free")||p.pricing?.prompt==="0"):o).map(p=>p.id).sort();return l.length?l:C.openrouter}catch{return C.openrouter}}function X(){let a="",e="ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";for(let t=0;t<32;t++)a+=e.charAt(Math.floor(Math.random()*e.length));return a}function q(a){return a.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;")}function n(a,e){return i.workspace.getConfiguration("cascade").get(a,e)}async function d(a,e){await i.workspace.getConfiguration("cascade").update(a,e,i.ConfigurationTarget.Global)}function J(a){let e=new F(a);a.subscriptions.push(i.window.registerWebviewViewProvider("cascade.chat",e,{webviewOptions:{retainContextWhenHidden:!0}}),i.commands.registerCommand("cascade.newChat",()=>e.newChat()),i.commands.registerCommand("cascade.openSettings",()=>e.openSettingsCmd()),i.commands.registerCommand("cascade.clearHistory",()=>e.clearHistory()))}function Z(){}var F=class{constructor(e){this.ctx=e;this.attachments=[];this.sessions=new x(e.globalState)}resolveWebviewView(e){this.view=e,e.webview.options={enableScripts:!0,localResourceRoots:[this.ctx.extensionUri]},e.webview.html=this.getHtml(e.webview),e.webview.onDidReceiveMessage(t=>this.onMessage(t)),e.onDidChangeVisibility(()=>{e.visible&&this.pushSessionState()})}getHtml(e){let t=X(),s=e.asWebviewUri(i.Uri.joinPath(this.ctx.extensionUri,"dist","chat.js")),o=e.asWebviewUri(i.Uri.joinPath(this.ctx.extensionUri,"media","chat.css")),c=e.asWebviewUri(i.Uri.joinPath(this.ctx.extensionUri,"media","icon.svg")),l=n("provider","openrouter"),p=n("model",P[l]);return`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta http-equiv="Content-Security-Policy" content="${["default-src 'none'",`img-src ${e.cspSource} data: https:`,`style-src ${e.cspSource} 'unsafe-inline'`,`script-src 'nonce-${t}' ${e.cspSource}`,`font-src ${e.cspSource}`].join("; ")}"/>
  <meta name="viewport" content="width=device-width,initial-scale=1.0"/>
  <title>Cascade</title>
  <link rel="stylesheet" href="${o}"/>
</head>
<body>
<div class="cd-app">

  <!-- \u2500\u2500 Header \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 -->
  <header class="cd-header">
    <div class="cd-logo">
      <img class="cd-logo-mark" src="${c}" alt=""/>
      <span class="cd-logo-name">Cascade</span>
    </div>
    <select id="providerSel" class="cd-select" title="Provider">
      <option value="openrouter"${l==="openrouter"?" selected":""}>OpenRouter</option>
      <option value="huggingface"${l==="huggingface"?" selected":""}>HuggingFace</option>
      <option value="groq"${l==="groq"?" selected":""}>Groq</option>
    </select>
    <select id="modelSel" class="cd-select wide" title="Model">
      <option value="${q(p)}">${q(p)}</option>
    </select>
    <div class="cd-spacer"></div>
    <button type="button" class="cd-icon-btn" id="refreshBtn" title="Refresh model list">\u21BB</button>
    <button type="button" class="cd-icon-btn" id="historyBtn" title="Session history">\u2630</button>
    <button type="button" class="cd-icon-btn" id="settingsBtn" title="Settings">\u2699</button>
    <button type="button" class="cd-icon-btn" id="newChatBtn" title="New chat">+</button>
  </header>

  <!-- \u2500\u2500 Session tabs \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 -->
  <div class="cd-tabs" id="tabsBar"></div>

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
          <img class="cd-empty-icon" src="${c}" alt=""/>
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
            <!-- Context menu -->
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
          </div>
          <div class="cd-tb-right">
            <button type="button" class="cd-send" id="sendBtn" title="Send (Enter)">\u2191</button>
          </div>
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
        <button type="button" class="cd-icon-btn" id="settingsClose" title="Close">\xD7</button>
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
          <button type="button" class="cd-nav-item" data-page="profile">
            <span class="cd-nav-icon">\u{1F464}</span>Profile
          </button>
          <div class="cd-nav-divider"></div>
          <button type="button" class="cd-nav-item" data-page="privacy">
            <span class="cd-nav-icon">\u{1F512}</span>Privacy
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

            <!-- \u2500\u2500 Page: About \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 -->
            <div class="cd-settings-page" id="pageAbout">
              <div class="cd-section">
                <div class="cd-section-hd">Cascade</div>
                <p class="cd-section-desc">Free AI coding assistant for VS Code. Powered by the best zero-cost models \u2014 no subscription needed.</p>
                <div class="cd-about-row"><span class="cd-about-label">Version</span><span class="cd-about-val">1.0.0</span></div>
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
</html>`}async onMessage(e){switch(e.type){case"ready":this.pushSessionState(),this.pushKeyStatus(),this.pushModels();break;case"send":await this.handleSend(String(e.text??""),String(e.mode??"ask"));break;case"newSession":this.sessions.createSession(),this.pushSessionState(),this.pushThread();break;case"switchSession":this.sessions.switchTo(String(e.id??"")),this.pushSessionState(),this.pushThread();break;case"closeSession":this.sessions.closeSession(String(e.id??"")),this.pushSessionState(),this.pushThread();break;case"getSettings":await this.pushSettings();break;case"saveSettings":await this.saveSettings(e),this.pushKeyStatus(),this.pushModels();break;case"logout":await this.logout();break;case"clearAllHistory":this.sessions.clearAllHistory(),this.pushSessionState(),this.pushThread(),i.window.showInformationMessage("Cascade: All chat history deleted.");break;case"getModels":await this.pushModels();break;case"setProvider":{let t=String(e.provider??"openrouter");await d("provider",t),await d("model",P[t]),this.post({type:"providerChanged",provider:t}),await this.pushModels();break}case"setModel":await d("model",String(e.model??""));break;case"getHistory":this.pushHistory();break;case"restoreSession":this.sessions.switchTo(String(e.id??"")),this.pushSessionState(),this.pushThread();break;case"attachActiveFile":await this.attachActive();break;case"pickWorkspaceFile":await this.pickWorkspaceFile();break;case"pickLocalFile":await this.pickLocalFile();break;case"pickOpenEditor":await this.pickOpenEditor();break;case"attachProblems":await this.attachProblems();break;case"removeAttachment":{let t=String(e.id??"");this.attachments=this.attachments.filter(s=>s.id!==t),this.pushAttachments();break}case"applyFile":await this.applyFileEdit(String(e.code??""),String(e.language??""),e.suggestedPath);break;case"runInTerminal":await this.runInTerminal(String(e.command??""));break;case"openBrowser":await i.commands.executeCommand("simpleBrowser.show","https://openrouter.ai/models?order=newest&supported_parameters=free");break}}async handleSend(e,t){if(!e.trim())return;let s=n("provider","openrouter"),o=n("model",P[s]),c=n("temperature",.2),l=n("maxTokens",4096),p=n("topP",1),m=n("userName",""),y=n("systemPrompt",""),I=n("contextLength",20),h=[`You are Cascade, a friendly and expert AI coding assistant in VS Code.${m?` The user's name is ${m}.`:""} Be warm, direct, and encouraging \u2014 like a skilled teammate who genuinely wants to help.`,"Write in a natural, conversational tone. Be concise but thorough. Use 'I' naturally. Briefly acknowledge the user's context before diving in. Celebrate wins and be empathetic about frustrations.","Use markdown \u2014 fenced code blocks with language tags. For file edits put the file path as a comment on line 1, e.g. `// File: src/index.ts`.",`For multi-step tasks, open your response with a <steps> block (max 5 items, plain text, one per line):
<steps>
Analyse the request
Write the solution
Explain key decisions
</steps>
Then continue with your full response.`];y&&h.push(y);let w=e;this.attachments.length&&(w=`${this.attachments.map(u=>`<attachment name="${u.label}">
${u.content}
</attachment>`).join(`
`)}

${e}`);let k=this.sessions.active;if(!k)return;let g=await this.getKey(s);if(!g){this.post({type:"assistantError",text:`No API key for ${s}. Open \u2699 Settings to add your free key.`});return}this.sessions.addMessage("user",e);let f=k.messages.slice(0,-1).slice(-(I*2)).map(r=>({role:r.role,content:r.content})),T=[{role:"system",content:h.join(`
`)},...f,{role:"user",content:w}];this.abortCtrl?.abort(),this.abortCtrl=new AbortController,this.post({type:"assistantStart"});let v="",S=!1;try{for await(let r of Q(s,g,o,T,c,l,p,this.abortCtrl.signal)){if(v+=r,!S&&v.includes("</steps>")){let u=/<steps>([\s\S]*?)<\/steps>/.exec(v);if(u){let M=u[1].trim().split(`
`).map(b=>b.trim()).filter(b=>b.length>0);M.length&&this.post({type:"progressSteps",steps:M}),S=!0}}this.post({type:"assistantDelta",text:v})}this.sessions.addMessage("assistant",v),this.post({type:"progressDone"}),this.post({type:"assistantDone",text:v}),this.pushSessionState()}catch(r){if(r.name==="AbortError"){this.post({type:"assistantAbort"});return}let u=r instanceof Error?r.message:String(r);this.post({type:"assistantError",text:u})}}async pushSettings(){let e=!!await this.ctx.secrets.get("cascade.orKey"),t=!!await this.ctx.secrets.get("cascade.hfKey"),s=!!await this.ctx.secrets.get("cascade.groqKey");this.post({type:"settingsForm",hasOrKey:e,hasHfKey:t,hasGroqKey:s,temperature:n("temperature",.2),maxTokens:n("maxTokens",4096),topP:n("topP",1),contextLength:n("contextLength",20),fileAccess:n("fileAccess","none"),fileScope:n("fileScope","workspace"),approvalMode:n("approvalMode","ask"),terminalAccess:n("terminalAccess",!1),gitAccess:n("gitAccess",!1),openRouterFreeOnly:n("openRouterFreeOnly",!0),fallbackProvider:n("fallbackProvider","none"),userName:n("userName",""),systemPrompt:n("systemPrompt",""),historyRetention:n("historyRetention","unlimited")})}async saveSettings(e){e.openRouterKey&&await this.ctx.secrets.store("cascade.orKey",String(e.openRouterKey)),e.huggingfaceKey&&await this.ctx.secrets.store("cascade.hfKey",String(e.huggingfaceKey)),e.groqKey&&await this.ctx.secrets.store("cascade.groqKey",String(e.groqKey)),e.temperature!==void 0&&await d("temperature",Number(e.temperature)),e.maxTokens!==void 0&&await d("maxTokens",Number(e.maxTokens)),e.topP!==void 0&&await d("topP",Number(e.topP)),e.contextLength!==void 0&&await d("contextLength",Number(e.contextLength)),e.fileAccess!==void 0&&await d("fileAccess",String(e.fileAccess)),e.fileScope!==void 0&&await d("fileScope",String(e.fileScope)),e.approvalMode!==void 0&&await d("approvalMode",String(e.approvalMode)),e.terminalAccess!==void 0&&await d("terminalAccess",!!e.terminalAccess),e.gitAccess!==void 0&&await d("gitAccess",!!e.gitAccess),e.openRouterFreeOnly!==void 0&&await d("openRouterFreeOnly",!!e.openRouterFreeOnly),e.fallbackProvider!==void 0&&await d("fallbackProvider",String(e.fallbackProvider)),e.userName!==void 0&&await d("userName",String(e.userName)),e.systemPrompt!==void 0&&await d("systemPrompt",String(e.systemPrompt)),e.historyRetention!==void 0&&await d("historyRetention",String(e.historyRetention))}async logout(){await this.ctx.secrets.delete("cascade.orKey"),await this.ctx.secrets.delete("cascade.hfKey"),await this.ctx.secrets.delete("cascade.groqKey"),i.window.showInformationMessage("Cascade: All API keys cleared."),await this.pushSettings()}async getKey(e){let t={openrouter:"cascade.orKey",huggingface:"cascade.hfKey",groq:"cascade.groqKey"};return this.ctx.secrets.get(t[e])}async pushKeyStatus(){let e=!!await this.ctx.secrets.get("cascade.orKey"),t=!!await this.ctx.secrets.get("cascade.hfKey"),s=!!await this.ctx.secrets.get("cascade.groqKey");this.post({type:"keyStatus",hasOrKey:e,hasHfKey:t,hasGroqKey:s})}async pushModels(){let e=n("provider","openrouter"),t=n("openRouterFreeOnly",!0),s=n("model",P[e]),o=await this.getKey(e);if(!o){this.post({type:"models",models:[],selectedModel:"",noKey:!0});return}let c;e==="openrouter"?c=await Y(o,t):c=[...C[e]],c.includes(s)||c.unshift(s),this.post({type:"models",models:c,selectedModel:s,noKey:!1})}pushSessionState(){let e=this.sessions.openSessions;this.post({type:"sessionState",activeSessionId:this.sessions.active?.id??"",sessions:e.map(t=>({id:t.id,title:t.title}))})}pushThread(){let e=this.sessions.active;this.post({type:"loadThread",messages:e?.messages??[]}),this.attachments=[],this.pushAttachments()}pushHistory(){let e=this.sessions.historyItems.map(t=>({id:t.id,title:t.title,preview:t.messages.find(s=>s.role==="user")?.content.slice(0,80)??"",updatedAt:t.updatedAt,archived:t.archived,messageCount:t.messages.length}));this.post({type:"historyState",activeSessionId:this.sessions.active?.id??"",items:e})}pushAttachments(){this.post({type:"attachmentsUpdated",items:this.attachments.map(e=>({id:e.id,label:e.label}))})}async attachActive(){let e=i.window.activeTextEditor?.document;if(!e){i.window.showWarningMessage("Cascade: No active file to attach.");return}if(n("fileAccess","none")==="none"){await i.window.showWarningMessage("Cascade: File access is disabled.","Open Settings")&&this.post({type:"settingsForm"});return}this.addAttachment(e.fileName.split(/[\\/]/).pop()??"file",e.getText())}async pickWorkspaceFile(){let e=await i.window.showOpenDialog({canSelectMany:!1,openLabel:"Attach"});if(!e?.length)return;let t=await i.workspace.fs.readFile(e[0]),s=Buffer.from(t).toString("utf8");this.addAttachment(e[0].fsPath.split(/[\\/]/).pop()??"file",s)}async pickLocalFile(){let e=await i.window.showOpenDialog({canSelectMany:!1,openLabel:"Upload"});if(!e?.length)return;let t=await i.workspace.fs.readFile(e[0]),s=Buffer.from(t).toString("utf8");this.addAttachment(e[0].fsPath.split(/[\\/]/).pop()??"file",s)}async pickOpenEditor(){let e=i.workspace.textDocuments.filter(s=>!s.isUntitled&&s.uri.scheme==="file");if(!e.length){i.window.showWarningMessage("No open editors to attach.");return}let t=await i.window.showQuickPick(e.map(s=>({label:s.fileName.split(/[\\/]/).pop()??s.fileName,description:s.fileName,doc:s})));t&&this.addAttachment(t.label,t.doc.getText())}async attachProblems(){let e=i.window.activeTextEditor?.document,t=e?i.languages.getDiagnostics(e.uri):i.languages.getDiagnostics().flatMap(([,o])=>o);if(!t.length){i.window.showInformationMessage("No problems to attach.");return}let s=t.map(o=>`[${i.DiagnosticSeverity[o.severity]}] Line ${o.range.start.line+1}: ${o.message}`).join(`
`);this.addAttachment("Problems",s)}addAttachment(e,t){let s=Date.now().toString(36);this.attachments.push({id:s,label:e,content:t}),this.pushAttachments()}async applyFileEdit(e,t,s){if(n("fileAccess","none")!=="readwrite"){i.window.showWarningMessage("Cascade: File write access is disabled. Enable it in Settings.");return}let c=await i.window.showSaveDialog({defaultUri:s?i.Uri.joinPath(i.workspace.workspaceFolders?.[0]?.uri??i.Uri.file("/"),s):void 0,saveLabel:"Apply Code"});c&&(await i.workspace.fs.writeFile(c,Buffer.from(e,"utf8")),i.window.showTextDocument(c))}async runInTerminal(e){if(!n("terminalAccess",!1)){i.window.showWarningMessage("Cascade: Terminal access is disabled. Enable it in Settings.");return}if(n("approvalMode","ask")==="ask"&&await i.window.showWarningMessage(`Run in terminal?
\`${e.slice(0,100)}\``,{modal:!0},"Run")!=="Run")return;let o=i.window.terminals.find(c=>c.name==="Cascade");o||(o=i.window.createTerminal("Cascade")),o.show(),o.sendText(e)}newChat(){this.sessions.createSession(),this.pushSessionState(),this.pushThread()}openSettingsCmd(){this.pushSettings()}clearHistory(){this.sessions.clearAllHistory(),this.pushSessionState(),this.pushThread()}post(e){this.view?.webview.postMessage(e)}};0&&(module.exports={activate,deactivate});
//# sourceMappingURL=extension.js.map
