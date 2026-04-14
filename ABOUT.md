# About Cascade

## Why Cascade exists

Most AI coding tools cost money — either through a monthly subscription or a per-token API bill that silently grows in the background. For developers who are learning, experimenting, building side projects, or working in resource-constrained environments, that barrier is real.

Cascade was built on a simple premise: **the best open-weight AI models in the world are available for free, and everyone should be able to use them inside their editor without paying anything.**

OpenRouter, Hugging Face, and Groq all offer generous free tiers. Cascade is the bridge that connects those free tiers directly into VS Code — no middleman, no markup, no subscription.

---

## What makes Cascade different

**It's genuinely free.**
Every model Cascade ships with by default costs $0 per token. There are no "free trial" periods, no message limits imposed by Cascade itself, and no upsell to a paid plan.

**Your keys stay yours.**
API keys are stored in VS Code's encrypted Secret Storage. They are never sent to any server other than the AI provider you choose. Cascade has no backend.

**It feels like a real AI assistant.**
Cascade uses the same conversational approach as the best commercial tools — warm tone, step-by-step progress tracking for complex tasks, reasoning display, inline code actions, file context attachments, and persistent chat history.

**It's open source.**
The full source code is on GitHub. You can read every line, build it yourself, suggest changes, or fork it.

---

## Roadmap

The following features are planned or being considered. Community feedback shapes what gets built next.

### Near term
- [ ] VS Code Marketplace publication
- [ ] Image attachment support (paste screenshots directly into chat)
- [ ] Inline diff view for code edits (show proposed changes before applying)
- [ ] `@file` mention syntax in the composer to attach files by name

### Medium term
- [ ] Agent mode with autonomous multi-step file editing
- [ ] More providers (Cohere, Mistral API, Together AI)
- [ ] Custom model entry (type any model ID not in the list)
- [ ] Export conversation as Markdown

### Longer term
- [ ] MCP (Model Context Protocol) tool support
- [ ] Workspace indexing for codebase-aware answers
- [ ] Voice input

Have an idea? [Open an issue](https://github.com/NolvusMadeIt/cascade/issues) — feature requests are very welcome.

---

## Credits

Cascade is built with:

- [VS Code Extension API](https://code.visualstudio.com/api) — the foundation
- [esbuild](https://esbuild.github.io/) — blazing fast bundler
- [marked](https://marked.js.org/) — Markdown rendering
- [DOMPurify](https://github.com/cure53/DOMPurify) — safe HTML sanitization
- [OpenRouter](https://openrouter.ai/) — unified free model access
- [Hugging Face Inference API](https://huggingface.co/inference-api) — open-weight models
- [Groq](https://groq.com/) — ultra-fast LPU inference

---

## License

MIT License — see [LICENSE](LICENSE).

You are free to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of Cascade. The only requirement is that you keep the copyright notice in any distributed copy.

---

*Made by [NolvusMadeIt](https://github.com/NolvusMadeIt)*
