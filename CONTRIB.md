# Contributing to Cascade

Thanks for your interest in contributing! This guide covers everything you need to get set up, understand the codebase, and submit a great pull request.

---

## Table of Contents

- [Prerequisites](#prerequisites)
- [Getting the code](#getting-the-code)
- [Project structure](#project-structure)
- [Development workflow](#development-workflow)
- [Making changes](#making-changes)
- [Submitting a pull request](#submitting-a-pull-request)
- [Code style](#code-style)
- [Reporting bugs](#reporting-bugs)

---

## Prerequisites

| Tool | Version | Purpose |
|---|---|---|
| Node.js | ≥ 18 | Build tooling |
| npm | ≥ 9 | Package management |
| VS Code | ≥ 1.80 | Extension host |
| TypeScript | ≥ 5.3 | Language (installed via npm) |

---

## Getting the code

```bash
git clone https://github.com/NolvusMadeIt/cascade.git
cd cascade
npm install
```

---

## Project structure

```
cascade/
├── src/
│   ├── extension.ts        # Main extension entry point + WebviewViewProvider
│   ├── chatSessions.ts     # Session persistence via VS Code globalState
│   └── webview/
│       └── chat.ts         # All webview-side UI logic (compiled to dist/chat.js)
├── media/
│   ├── chat.css            # Full sidebar stylesheet (VS Code CSS variables)
│   ├── icon.svg            # Activity bar + logo icon
│   └── cascade-banner.png  # README banner
├── dist/                   # Compiled output (git-tracked for VSIX packaging)
│   ├── extension.js        # Bundled extension host code
│   └── chat.js             # Bundled webview code
├── esbuild.mjs             # Build script (esbuild, two entry points)
├── tsconfig.json           # TypeScript config
└── package.json            # Extension manifest + contributes
```

### Key architectural notes

- **Two separate bundles**: `extension.ts` runs in the VS Code extension host (Node.js); `chat.ts` runs in the webview (browser sandbox). They communicate only via `postMessage`.
- **Message protocol**: The extension sends typed messages (`type: 'models'`, `type: 'keyStatus'`, etc.) to the webview; the webview sends user actions back (`type: 'send'`, `type: 'saveSettings'`, etc.).
- **Secret storage**: API keys are stored with `ctx.secrets` — never in `workspace.getConfiguration`. This means they survive across workspaces and restarts.
- **CSS approach**: All colors use `--vscode-*` CSS variables. Only the Cascade orange accent (`#D97757`) is hardcoded. This makes every VS Code theme work automatically.
- **Progress panel**: The AI is prompted to emit a `<steps>…</steps>` block at the start of multi-step responses. The extension detects this in the stream and sends a `progressSteps` message to the webview, which renders the panel.

---

## Development workflow

### 1. Build once

```bash
npm run build
# or equivalently:
node esbuild.mjs
```

### 2. Watch mode (rebuilds on save)

```bash
npm run watch
```

### 3. Run in VS Code

1. Open the `cascade` folder in VS Code.
2. Press `F5` (or **Run → Start Debugging**) — this launches an **Extension Development Host** window with Cascade loaded.
3. Any time you change source files and the watcher rebuilds, reload the Extension Development Host with `Ctrl+R`.

### 4. Package a VSIX

The project uses a small Python packaging script because `vsce` had permission issues on some Windows setups:

```bash
python repack.py
# produces NolvusMadeIt.cascade-1.0.0.vsix
```

Or install `vsce` and use the standard method:

```bash
npm install -g @vscode/vsce
vsce package
```

---

## Making changes

### Adding a new provider

1. Add the provider ID to the `Provider` type union in `extension.ts`.
2. Add free model defaults to `FREE_MODELS` and `DEFAULT_MODEL`.
3. Add the API endpoint in `chatEndpoint()`.
4. Add auth headers in `buildHeaders()`.
5. Add the secret key name in `getKey()`.
6. Add the `<option>` to the provider `<select>` in `getHtml()`.
7. Add the key card HTML in the Settings → API Keys section of `getHtml()`.
8. Add DOM refs and eye-toggle wiring in `chat.ts`.
9. Add the key to `pushSettings()` and `saveSettings()` in `extension.ts`.

### Adding a new setting

1. Add the configuration property to `package.json` under `contributes.configuration.properties`.
2. Add the form control in the appropriate settings page in `getHtml()`.
3. Add DOM ref in `chat.ts`.
4. Populate it from `settingsForm` message in `chat.ts`.
5. Include it in the `saveSettings` `postMessage` call in `chat.ts`.
6. Persist it in `saveSettings()` in `extension.ts`.
7. Read it with `cfg()` wherever it's needed at runtime.

---

## Submitting a pull request

1. **Fork** the repo and create a feature branch: `git checkout -b feat/my-feature`.
2. Make your changes and **test** in the Extension Development Host.
3. Run `npm run build` and confirm **zero errors**.
4. Write a clear commit message: `feat: add X` / `fix: Y` / `refactor: Z`.
5. Open a PR against `main` with a description of what you changed and why.
6. Reference any related issues with `Fixes #N`.

---

## Code style

- **TypeScript strict mode** — no `any` unless genuinely unavoidable.
- **Single quotes** for strings in TypeScript.
- **2-space indentation**.
- **Descriptive variable names** — avoid single letters except loop counters.
- **No unused variables** — the TypeScript compiler is configured to error on these.
- Keep functions focused and short. If a function is growing past ~40 lines, consider splitting it.
- Comments should explain *why*, not *what*.

---

## Reporting bugs

Please open a [GitHub Issue](https://github.com/NolvusMadeIt/cascade/issues) with:

- VS Code version
- Cascade version (check Settings → About)
- Provider and model you were using
- Steps to reproduce
- Expected vs. actual behaviour
- Any error messages from the VS Code **Developer Tools** console (`Help → Toggle Developer Tools`)

---

*Thanks for helping make Cascade better for everyone!*
