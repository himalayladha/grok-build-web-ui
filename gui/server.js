import express from 'express';
import { WebSocketServer } from 'ws';
import cors from 'cors';
import { spawn, exec } from 'child_process';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Codebase root directory
const CODEBASE_ROOT = path.resolve(__dirname, '..');

// Default Projects folder inside codebase
const PROJECTS_ROOT = path.join(CODEBASE_ROOT, 'Projects');

if (!fs.existsSync(PROJECTS_ROOT)) {
  fs.mkdirSync(PROJECTS_ROOT, { recursive: true });
}

const defaultProjectFolder = path.join(PROJECTS_ROOT, 'My-First-Project');
if (!fs.existsSync(defaultProjectFolder)) {
  fs.mkdirSync(defaultProjectFolder, { recursive: true });
  fs.writeFileSync(
    path.join(defaultProjectFolder, 'index.html'),
    `<!DOCTYPE html>\n<html>\n<head><title>My First Project</title></head>\n<body style="background:#090c15;color:#fff;font-family:sans-serif;padding:40px;">\n  <h1>Hello from Grok Build Studio! 🚀</h1>\n  <p>Your project is running live.</p>\n</body>\n</html>\n`
  );
  fs.writeFileSync(
    path.join(defaultProjectFolder, 'index.js'),
    `console.log("Hello from Grok Build Studio!");\n`
  );
}

let currentWorkspace = defaultProjectFolder;
const GROK_BIN = 'C:\\Users\\USER\\.grok\\bin\\grok.exe';

const app = express();
app.use(cors());
app.use(express.json());

// Serve static frontend build
const distPath = path.join(__dirname, 'dist');
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
}

// Serve Projects static files for web preview
app.use('/workspace-files', express.static(PROJECTS_ROOT));

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

// REST API: Get Available Models
app.get('/api/models', (req, res) => {
  exec(`"${GROK_BIN}" models`, (err, stdout) => {
    if (err || !stdout) {
      return res.json({
        models: [{ id: 'grok-4.5', name: 'Grok 4.5 (Default)' }]
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

// REST API: List Projects inside Projects/
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

// REST API: Create New Project Folder
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
        path.join(newFolderPath, 'index.html'),
        `<!DOCTYPE html>\n<html>\n<head><title>${folderName}</title></head>\n<body style="background:#090c15;color:#fff;font-family:sans-serif;padding:40px;">\n  <h1>Welcome to ${folderName}! 🚀</h1>\n</body>\n</html>\n`
      );
      fs.writeFileSync(
        path.join(newFolderPath, 'index.js'),
        `console.log("Welcome to ${folderName}!");\n`
      );
    }
    currentWorkspace = newFolderPath;
    res.json({ success: true, projectPath: newFolderPath, folderName: sanitized });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// REST API: Delete Project Folder
app.post('/api/projects/delete', (req, res) => {
  const { projectPath } = req.body;
  if (!projectPath || !fs.existsSync(projectPath)) {
    return res.status(400).json({ error: 'Project path does not exist' });
  }

  try {
    fs.rmSync(projectPath, { recursive: true, force: true });
    
    if (path.resolve(projectPath) === currentWorkspace) {
      const remaining = fs.readdirSync(PROJECTS_ROOT, { withFileTypes: true })
        .filter(item => item.isDirectory() && !item.name.startsWith('.'));
      
      if (remaining.length > 0) {
        currentWorkspace = path.join(PROJECTS_ROOT, remaining[0].name);
      } else {
        fs.mkdirSync(defaultProjectFolder, { recursive: true });
        currentWorkspace = defaultProjectFolder;
      }
    }

    res.json({ success: true, activeWorkspace: currentWorkspace });
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

// WebSocket Server
const wss = new WebSocketServer({ server, path: '/ws' });

wss.on('connection', (ws) => {
  console.log('GUI client connected to WebSocket');
  let activeProcess = null;

  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message.toString());
      
      // Action: Run Project Folder
      if (data.action === 'run_project') {
        const targetWorkspace = data.projectPath ? path.resolve(data.projectPath) : currentWorkspace;
        const projName = path.basename(targetWorkspace);
        
        const files = fs.existsSync(targetWorkspace) ? fs.readdirSync(targetWorkspace) : [];

        // 1. Web App with index.html -> Open in Browser Tab
        if (files.includes('index.html')) {
          const url = `http://localhost:${PORT}/workspace-files/${projName}/index.html`;
          ws.send(JSON.stringify({ type: 'open_url', url, projName }));
          ws.send(JSON.stringify({ type: 'raw_output', text: `🌐 Opened project [${projName}] in web browser tab: ${url}` }));
          ws.send(JSON.stringify({ type: 'process_exit', code: 0 }));
          return;
        }

        // 2. Node Project with package.json
        let cmd = '';
        let args = [];

        if (files.includes('package.json')) {
          cmd = 'npm';
          args = ['start'];
        } else if (files.includes('index.js')) {
          cmd = 'node';
          args = ['index.js'];
        } else if (files.includes('server.js')) {
          cmd = 'node';
          args = ['server.js'];
        } else if (files.includes('main.py')) {
          cmd = 'python';
          args = ['main.py'];
        } else if (files.includes('app.py')) {
          cmd = 'python';
          args = ['app.py'];
        } else if (files.includes('Cargo.toml')) {
          cmd = 'cargo';
          args = ['run'];
        } else {
          ws.send(JSON.stringify({ type: 'raw_output', text: `⚠️ No executable entrypoint (index.html, package.json, index.js, app.py) found in project [${projName}].` }));
          ws.send(JSON.stringify({ type: 'process_exit', code: 0 }));
          return;
        }

        ws.send(JSON.stringify({ type: 'status', message: `▶️ Running Project Folder [${cmd} ${args.join(' ')}] in ${projName}` }));

        activeProcess = spawn(cmd, args, { cwd: targetWorkspace, shell: true });

        activeProcess.stdout.on('data', (chunk) => {
          ws.send(JSON.stringify({ type: 'raw_output', text: chunk.toString() }));
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

      // Action: Run Grok Agent Prompt
      if (data.action === 'run_prompt') {
        const { prompt, model, reasoningEffort, alwaysApprove, worktree, sessionResume } = data;
        
        const args = ['-p', prompt, '--output-format', 'streaming-json'];
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
        ws.send(JSON.stringify({ type: 'status', message: 'Execution cancelled.' }));
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
