<div align="center">

<h1>
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://media.x.ai/v1/website/spacexai-symbol-white-transparent-0c31957f.png">
    <source media="(prefers-color-scheme: light)" srcset="https://media.x.ai/v1/website/spacexai-symbol-black-transparent-6435cf42.png">
    <img alt="Grok Build Web UI" src="https://media.x.ai/v1/website/spacexai-symbol-black-transparent-6435cf42.png" width="96">
  </picture>
  <br>
  Grok Build Web UI
</h1>

**Grok Build Web UI** is an ultra-modern Web GUI Workbench for SpaceXAI's **Grok Build** AI coding agent. It converts the terminal CLI into a full-featured multi-project IDE with live step-by-step reasoning, workspace file management, and real-time execution streaming.

[![License](https://img.shields.io/badge/license-Apache%202.0-blue.svg)](LICENSE)
[![Grok Engine](https://img.shields.io/badge/grok--engine-v0.2.114-cyan.svg)](https://x.ai/cli)
[![Model](https://img.shields.io/badge/default--model-grok--4.5-emerald.svg)](https://x.ai)
[![Node Version](https://img.shields.io/badge/node--js-%3E%3D18.0-brightgreen.svg)](https://nodejs.org)

[Features](#-key-features) ·
[1-Click Quickstart](#-1-click-instant-installation) ·
[Architecture](#-architecture) ·
[Usage Guide](#-usage-guide) ·
[Repository Layout](#-repository-layout) ·
[License](#-license)

</div>

---

## ⚡ 1-Click Instant Installation

You can install and run **Grok Build Web UI** directly in **1 command** without manual configuration:

### 🚀 Standard Installation (`npm start`)

```bash
git clone https://github.com/himalayladha/grok-build-web-ui.git
cd grok-build-web-ui
npm start
```
> `npm start` automatically installs dependencies, builds the Web UI, and launches the server at **[http://localhost:3001](http://localhost:3001)**.

---

### 🖥️ 1-Click Launchers

- **Windows**: Double-click **`start.bat`**
- **macOS / Linux**: Run **`./start.sh`**

---

## 🔥 Key Features

| Feature | Description |
| :--- | :--- |
| **📁 Multi-Project Workbench** | Browse, switch, and manage multiple local project folders in one unified sidebar. |
| **▶️ 1-Click Project Runner** | Auto-detects and runs web apps (`index.html`), Node servers, Python scripts, or Rust apps. |
| **🧠 Live Step-by-Step Reasoning** | Real-time token streaming of Grok's internal thought process (`grok-4.5`). |
| **⚡ Real-time Step Execution Cards** | Live progress cards for file creations, refactors, and terminal command executions. |
| **⚙️ Dynamic Model Selector** | Automatically discovers available Grok models (`grok-4.5`, `grok-3`, etc.). |
| **🛡️ Auto-Approve Permissions** | One-click toggle to auto-approve tool executions (`--always-approve`). |
| **🎨 SpaceXAI Dark Aesthetics** | High-contrast obsidian slate theme (`#090c15`) with cyan & emerald glow accents. |
| **🗑️ Project & File Management** | Create local projects, files, subfolders, or delete project folders directly from disk. |

---

## 🏗️ Architecture

```mermaid
graph TD
    A["Grok Build Web UI (React 18 + Vite + Tailwind v4)"] -->|WebSocket / REST API| B["Node.js Backend Server Bridge (gui/server.js)"]
    B -->|Stdio / Streaming JSON-RPC| C["Grok Rust Agent Core (grok.exe)"]
    C -->|Reads / Edits / Executes| D["Local Projects Directory (Projects/)"]
```

---

## 💡 Usage Guide

### 1. **Switching / Creating Projects**
- Use the **Projects** sidebar on the left to switch between local project folders.
- Click **`+`** (Create Folder) to create a brand new local project directory under `Projects/`.
- Click **`🗑️`** to delete any project folder from disk.

### 2. **Running Projects**
- Click **`▶️`** on any project in the Projects sidebar to launch it live.
- Web applications (`index.html`) will automatically open in a **new browser tab**.

### 3. **Executing Agent Prompts**
- Type your prompt in the prompt bar at the bottom and press <kbd>Enter</kbd> (or <kbd>Shift</kbd> + <kbd>Enter</kbd> for a new line).
- Watch Grok reason, modify files, and execute shell commands step-by-step in real-time.

---

## 📁 Repository Layout

```
grok-build-web-ui/
├── package.json              # Top-level 1-command installer & launcher
├── start.bat                 # 1-click Windows launcher
├── start.sh                  # 1-click macOS / Linux launcher
├── Projects/                 # Auto-created local projects directory
├── gui/
│   ├── src/
│   │   ├── App.jsx           # Main Web UI Studio application & step stream
│   │   └── index.css         # SpaceXAI high-contrast design system
│   ├── server.js             # Express & WebSocket backend bridge for grok CLI
│   └── package.json          # Node dependencies & scripts
├── crates/                   # Core Rust source for grok agent engine
└── README.md                 # Project documentation
```

---

## 📜 License

This project is licensed under the **Apache License, Version 2.0** — see the [LICENSE](LICENSE) file for details.
