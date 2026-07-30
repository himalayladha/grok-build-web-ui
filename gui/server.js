import express from 'express';
import { WebSocketServer } from 'ws';
import cors from 'cors';
import { spawn, exec } from 'child_process';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Root Projects Directory
const PROJECTS_ROOT = path.resolve(__dirname, '..', '..');
let currentWorkspace = path.resolve(__dirname, '..');

const GROK_BIN = 'C:\\Users\\USER\\.grok\\bin\\grok.exe';

const app = express();
app.use(cors());
app.use(express.json());

// Serve static frontend build
const distPath = path.join(__dirname, 'dist');
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
}

// REST API: Get System & Grok Status
app.get('/api/status', (req, res) => {
  exec(`"${GROK_BIN}" --version`, (err, stdout, stderr) => {
    if (err) {
      return res.json({ installed: false, error: stderr || err.message });
    }
    const version = stdout.trim();
    exec(`"${GROK_BIN}" inspect`, { cwd: currentWorkspace }, (authErr, authStdout) => {
      res.json({
        installed: true,
        version,
        workspace: currentWorkspace,
        projectsRoot: PROJECTS_ROOT,
        authenticated: !authErr && !authStdout.includes('Not signed in'),
        info: authStdout || ''
      });
    });
  });
});

// REST API: Get Available Models dynamically from `grok models`
app.get('/api/models', (req, res) => {
  exec(`"${GROK_BIN}" models`, (err, stdout) => {
    if (err || !stdout) {
      return res.json({
        models: [
          { id: 'grok-4.5', name: 'Grok 4.5 (Default)' }
        ]
      });
    }

    try {
      const lines = stdout.split('\n');
      const models = [];
      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed.startsWith('*') || trimmed.startsWith('-') || (trimmed.includes('grok-') && !trimmed.startsWith('You') && !trimmed.startsWith('Default') && !trimmed.startsWith('Available'))) {
          const cleanId = trimmed.replace(/^[*-\s]+/, '').split(' ')[0].trim();
          if (cleanId) {
            const isDefault = trimmed.includes('(default)');
            models.push({
              id: cleanId,
              name: isDefault ? `${cleanId} (Default)` : cleanId,
              isDefault
            });
          }
        }
      }

      if (models.length === 0) {
        models.push({ id: 'grok-4.5', name: 'Grok 4.5 (Default)', isDefault: true });
      }

      res.json({ models });
    } catch {
      res.json({
        models: [{ id: 'grok-4.5', name: 'Grok 4.5 (Default)', isDefault: true }]
      });
    }
  });
});

// REST API: List Projects / Local Folders
app.get('/api/projects', (req, res) => {
  try {
    const entries = fs.readdirSync(PROJECTS_ROOT, { withFileTypes: true });
    const projects = entries
      .filter(item => item.isDirectory() && !item.name.startsWith('.'))
      .map(item => ({
        name: item.name,
        path: path.join(PROJECTS_ROOT, item.name),
        isActive: path.join(PROJECTS_ROOT, item.name) === currentWorkspace
      }));

    res.json({ projectsRoot: PROJECTS_ROOT, activeWorkspace: currentWorkspace, projects });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// REST API: Create New Local Project Folder
app.post('/api/projects/create', (req, res) => {
  const { folderName } = req.body;
  if (!folderName || !folderName.trim()) {
    return res.status(400).json({ error: 'Folder name is required' });
  }

  const sanitized = folderName.trim().replace(/[^a-zA-Z0-9_-]/g, '-');
  const newFolderPath = path.join(PROJECTS_ROOT, sanitized);

  try {
    if (!fs.existsSync(newFolderPath)) {
      fs.mkdirSync(newFolderPath, { recursive: true });
      fs.writeFileSync(
        path.join(newFolderPath, 'README.md'),
        `# ${folderName}\n\nCreated via Grok Build Studio.\n`
      );
    }
    currentWorkspace = newFolderPath;
    res.json({ success: true, projectPath: newFolderPath, folderName: sanitized });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// REST API: Switch Active Workspace
app.post('/api/projects/switch', (req, res) => {
  const { projectPath } = req.body;
  if (!projectPath || !fs.existsSync(projectPath)) {
    return res.status(400).json({ error: 'Project path does not exist' });
  }

  currentWorkspace = path.resolve(projectPath);
  res.json({ success: true, activeWorkspace: currentWorkspace });
});

// REST API: File Explorer
app.get('/api/files', (req, res) => {
  const targetDir = req.query.path ? path.resolve(currentWorkspace, req.query.path) : currentWorkspace;

  try {
    const entries = fs.readdirSync(targetDir, { withFileTypes: true });
    const items = entries
      .filter(item => !item.name.startsWith('.git') && item.name !== 'node_modules')
      .map(item => ({
        name: item.name,
        isDirectory: item.isDirectory(),
        path: path.relative(currentWorkspace, path.join(targetDir, item.name)).replace(/\\/g, '/')
      }))
      .sort((a, b) => (b.isDirectory - a.isDirectory) || a.name.localeCompare(b.name));

    res.json({ currentPath: path.relative(currentWorkspace, targetDir).replace(/\\/g, '/'), items });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// REST API: Read File Content
app.get('/api/file-content', (req, res) => {
  const relPath = req.query.path;
  if (!relPath) return res.status(400).json({ error: 'Missing path' });

  const filePath = path.resolve(currentWorkspace, relPath);

  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    res.json({ path: relPath, content });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// REST API: Create File
app.post('/api/files/create-file', (req, res) => {
  const { fileName, subDir = '' } = req.body;
  if (!fileName) return res.status(400).json({ error: 'File name required' });

  const targetDir = path.resolve(currentWorkspace, subDir);
  const targetPath = path.join(targetDir, fileName);

  try {
    if (fs.existsSync(targetPath)) {
      return res.status(400).json({ error: 'File already exists' });
    }
    fs.writeFileSync(targetPath, '');
    res.json({ success: true, filePath: path.relative(currentWorkspace, targetPath) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// REST API: Create Folder
app.post('/api/files/create-folder', (req, res) => {
  const { folderName, subDir = '' } = req.body;
  if (!folderName) return res.status(400).json({ error: 'Folder name required' });

  const targetDir = path.resolve(currentWorkspace, subDir);
  const targetPath = path.join(targetDir, folderName);

  try {
    if (!fs.existsSync(targetPath)) {
      fs.mkdirSync(targetPath, { recursive: true });
    }
    res.json({ success: true, folderPath: path.relative(currentWorkspace, targetPath) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// REST API: Delete File/Folder
app.post('/api/files/delete', (req, res) => {
  const { relPath } = req.body;
  if (!relPath) return res.status(400).json({ error: 'Path required' });

  const targetPath = path.resolve(currentWorkspace, relPath);
  try {
    const stat = fs.statSync(targetPath);
    if (stat.isDirectory()) {
      fs.rmSync(targetPath, { recursive: true, force: true });
    } else {
      fs.unlinkSync(targetPath);
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Start Server
const PORT = process.env.PORT || 3001;
const server = app.listen(PORT, () => {
  console.log(`Grok Build GUI Backend running on http://localhost:${PORT}`);
});

// WebSocket Server for Agent Streaming
const wss = new WebSocketServer({ server, path: '/ws' });

wss.on('connection', (ws) => {
  console.log('GUI client connected to WebSocket');
  let activeProcess = null;

  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message.toString());
      
      if (data.action === 'run_prompt') {
        const { prompt, model, reasoningEffort, alwaysApprove, worktree, sessionResume } = data;
        
        const args = ['-p', prompt, '--output-format', 'streaming-json'];
        // Only pass model if explicitly set and not default
        if (model && model !== 'grok-4.5') args.push('--model', model);
        if (reasoningEffort) args.push('--reasoning-effort', reasoningEffort);
        if (alwaysApprove) args.push('--always-approve');
        if (worktree) args.push('--worktree');
        if (sessionResume) args.push('--resume');

        ws.send(JSON.stringify({ type: 'status', message: `Executing prompt in workspace: ${path.basename(currentWorkspace)}` }));

        activeProcess = spawn(GROK_BIN, args, { cwd: currentWorkspace, env: process.env });

        activeProcess.stdout.on('data', (chunk) => {
          const lines = chunk.toString().split('\n');
          for (const line of lines) {
            if (!line.trim()) continue;
            try {
              const jsonMsg = JSON.parse(line);
              ws.send(JSON.stringify({ type: 'grok_event', event: jsonMsg }));
            } catch {
              ws.send(JSON.stringify({ type: 'raw_output', text: line }));
            }
          }
        });

        activeProcess.stderr.on('data', (chunk) => {
          ws.send(JSON.stringify({ type: 'raw_error', text: chunk.toString() }));
        });

        activeProcess.on('close', (code) => {
          ws.send(JSON.stringify({ type: 'process_exit', code }));
          activeProcess = null;
        });

        activeProcess.on('error', (err) => {
          ws.send(JSON.stringify({ type: 'error', message: err.message }));
          activeProcess = null;
        });
      }

      if (data.action === 'cancel_prompt' && activeProcess) {
        activeProcess.kill('SIGTERM');
        ws.send(JSON.stringify({ type: 'status', message: 'Agent execution cancelled.' }));
      }
    } catch (err) {
      ws.send(JSON.stringify({ type: 'error', message: 'Invalid WebSocket payload: ' + err.message }));
    }
  });

  ws.on('close', () => {
    if (activeProcess) {
      activeProcess.kill('SIGTERM');
    }
  });
});
