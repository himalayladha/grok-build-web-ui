<div align="center">

<h1>
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://media.x.ai/v1/website/spacexai-symbol-white-transparent-0c31957f.png">
    <source media="(prefers-color-scheme: light)" srcset="https://media.x.ai/v1/website/spacexai-symbol-black-transparent-6435cf42.png">
    <img alt="Grok Build Studio" src="https://media.x.ai/v1/website/spacexai-symbol-black-transparent-6435cf42.png" width="96">
  </picture>
  <br>
  Grok Build Studio (<code>grok-build-studio</code>)
</h1>

**Grok Build Studio** is an ultra-modern Web GUI Workbench for SpaceXAI's **Grok Build** AI coding agent. It converts the terminal CLI into a full-featured multi-project IDE with live step-by-step reasoning, workspace file management, and real-time execution streaming.

[![License](https.img.shields.io/badge/license-Apache%202.0-blue.svg)](LICENSE)
[![Grok Engine](https://img.shields.io/badge/grok--engine-v0.2.114-cyan.svg)](https://x.ai/cli)
[![Model](https://img.shields.io/badge/default--model-grok--4.5-emerald.svg)](https://x.ai)

[Features](#features) ·
[Architecture](#architecture) ·
[Quickstart](#quickstart) ·
[Project Layout](#project-layout) ·
[License](#license)

</div>

---

## 🌟 Recommended Repository Name

> 💡 **Project Name**: `grok-build-studio`  
> *Alternative names*: `grok-studio-gui` | `grok-build-web-ui`

---

## ✨ Features

- **📂 Antigravity Multi-Project Workbench**:
  - Browse, switch, and manage multiple local project folders in one unified sidebar.
  - Create new local project folders, files, and subfolders with 1 click.
- **🧠 Live Step-by-Step AI Reasoning & Execution**:
  - Real-time streaming of Grok's thought process (`grok-4.5`).
  - Interactive step cards showing file modifications, shell command executions, and status indicators.
- **⚙️ Dynamic Model & Engine Controls**:
  - Dynamically discovers available models (`grok-4.5`, `grok-3`, etc.).
  - Auto-approve permissions toggle (`--always-approve`).
  - Isolated git worktree execution mode (`--worktree`).
- **🎨 SpaceXAI Dark Aesthetics**:
  - High-contrast obsidian slate theme (`#090c15`), cyan & emerald glow accents, and responsive layout.
- **📄 Code & Diff Inspector**:
  - View project code files directly within the GUI workbench.

---

## 🏗️ Architecture

```
 ┌─────────────────────────────────────────────────────────────┐
 │                Grok Build Studio Web GUI                    │
 │               (React 18 + Vite + Tailwind v4)               │
 └──────────────────────────────┬──────────────────────────────┘
                                │ WebSocket (WS) / HTTP REST
 ┌──────────────────────────────▼──────────────────────────────┐
 │                Node.js Backend Server Bridge                │
 │                 (gui/server.js - Express/WS)                │
 └──────────────────────────────┬──────────────────────────────┘
                                │ Stdio / Streaming JSON
 ┌──────────────────────────────▼──────────────────────────────┐
 │             Grok Build Rust CLI Engine (grok.exe)            │
 │                   (SpaceXAI Agent Engine)                   │
 └─────────────────────────────────────────────────────────────┘
```

---

## 🚀 Quickstart & Installation

### Prerequisites

1. Install **Grok CLI**:
   ```powershell
   irm https://x.ai/cli/install.ps1 | iex    # Windows PowerShell
   # or macOS / Linux:
   curl -fsSL https://x.ai/cli/install.sh | bash
   ```
2. Authenticate Grok:
   ```bash
   grok login --device-auth
   ```
3. Node.js `v18+` installed.

### Setup & Run GUI Studio

```bash
# Clone the repository
git clone https://github.com/YOUR_GITHUB_USERNAME/grok-build-studio.git
cd grok-build-studio/gui

# Install dependencies & build
npm install
npm run build

# Start the Grok Build Studio GUI server
npm start
```

Open your browser at **[http://localhost:3001](http://localhost:3001)**.

---

## 📁 Repository Layout

| Path | Description |
|------|-------------|
| `gui/` | Web GUI application source code |
| `gui/server.js` | Express & WebSocket backend bridge for `grok` CLI |
| `gui/src/App.jsx` | React main studio layout with step-by-step execution stream |
| `gui/src/index.css` | SpaceXAI high-contrast design system |
| `crates/` | Core Rust source for `grok` agent engine |
| `Cargo.toml` | Workspace dependencies and build targets |

---

## 📜 License

This project is licensed under the **Apache License, Version 2.0** — see the [LICENSE](LICENSE) file for details.
