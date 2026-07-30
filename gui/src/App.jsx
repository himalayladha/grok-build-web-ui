import React, { useState, useEffect, useRef } from 'react';
import { 
  Terminal, FolderTree, Cpu, Play, Square, Settings, 
  Sparkles, CheckCircle2, AlertCircle, FileText, ChevronRight, 
  ChevronDown, Code, Zap, RefreshCw, Shield, Layers, Plus, 
  FolderPlus, FilePlus, Trash2, MessageSquare, Activity, Folder, Lightbulb,
  Brain, Check, Loader2, DollarSign, Command, ExternalLink, UserCheck, LogOut, Copy
} from 'lucide-react';

export default function App() {
  // System & Workspace State
  const [status, setStatus] = useState({ installed: false, version: '', workspace: '', authenticated: false, info: '' });
  const [projects, setProjects] = useState([]);
  const [activeWorkspace, setActiveWorkspace] = useState('');
  const [fileTree, setFileTree] = useState([]);
  const [wsConnected, setWsConnected] = useState(false);

  // Models State
  const [availableModels, setAvailableModels] = useState([
    { id: 'grok-4.5', name: 'Grok 4.5 (Default)' }
  ]);
  const [model, setModel] = useState('grok-4.5');

  // Tab State
  const [activeTab, setActiveTab] = useState('chat'); // 'chat' | 'files' | 'logs'
  const [selectedFile, setSelectedFile] = useState(null);
  const [fileContent, setFileContent] = useState('');

  // Modals & Inputs
  const [showNewProjectModal, setShowNewProjectModal] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [showNewFileModal, setShowNewFileModal] = useState(false);
  const [newFileName, setNewFileName] = useState('');
  const [showNewFolderModal, setShowNewFolderModal] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');

  // Auth State & Modal
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authData, setAuthData] = useState(null);
  const [isStartingAuth, setIsStartingAuth] = useState(false);
  const [codeCopied, setCodeCopied] = useState(false);

  // Agent Settings
  const [reasoningEffort, setReasoningEffort] = useState('high');
  const [alwaysApprove, setAlwaysApprove] = useState(true);
  const [useWorktree, setUseWorktree] = useState(false);
  const [sessionResume, setSessionResume] = useState(false);

  // Chat Execution State
  const [prompt, setPrompt] = useState('');
  const [isExecuting, setIsExecuting] = useState(false);
  const [turns, setTurns] = useState([]);
  const [rawLogs, setRawLogs] = useState([]);

  const wsRef = useRef(null);
  const chatBottomRef = useRef(null);
  const authPollRef = useRef(null);

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [turns, isExecuting]);

  useEffect(() => {
    fetchStatus();
    fetchModels();
    fetchProjects();
    connectWebSocket();

    return () => {
      wsRef.current?.close();
      if (authPollRef.current) clearInterval(authPollRef.current);
    };
  }, []);

  const fetchStatus = async () => {
    try {
      const res = await fetch('/api/status');
      const data = await res.json();
      setStatus(data);
      if (data.workspace) {
        setActiveWorkspace(data.workspace);
        initWelcomeTurn(data.workspace);
      }
    } catch (err) {
      console.error('Failed to fetch status:', err);
    }
  };

  const handleStartLogin = async () => {
    setIsStartingAuth(true);
    setShowAuthModal(true);
    try {
      const res = await fetch('/api/auth/start-login', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        setAuthData(data);
        startAuthPolling();
      } else {
        alert('Failed to start login: ' + (data.error || 'Unknown error'));
        setShowAuthModal(false);
      }
    } catch (err) {
      console.error('Login error:', err);
      setShowAuthModal(false);
    } finally {
      setIsStartingAuth(false);
    }
  };

  const startAuthPolling = () => {
    if (authPollRef.current) clearInterval(authPollRef.current);
    authPollRef.current = setInterval(async () => {
      try {
        const res = await fetch('/api/auth/check-status');
        const data = await res.json();
        if (data.authenticated) {
          clearInterval(authPollRef.current);
          setShowAuthModal(false);
          fetchStatus();
        }
      } catch (err) {
        console.error('Auth polling error:', err);
      }
    }, 2000);
  };

  const handleLogout = async () => {
    if (!confirm('Are you sure you want to sign out from your X / xAI account?')) return;
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      fetchStatus();
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  const copyUserCode = () => {
    if (authData?.userCode) {
      navigator.clipboard.writeText(authData.userCode);
      setCodeCopied(true);
      setTimeout(() => setCodeCopied(false), 2000);
    }
  };

  const initWelcomeTurn = (workspacePath) => {
    const projName = workspacePath.split('\\').pop() || workspacePath.split('/').pop() || 'Project';
    setTurns([
      {
        id: 'welcome',
        role: 'assistant',
        isWelcomeCard: true,
        projectName: projName,
        projectPath: workspacePath,
        timestamp: new Date().toLocaleTimeString()
      }
    ]);
  };

  const fetchModels = async () => {
    try {
      const res = await fetch('/api/models');
      const data = await res.json();
      if (data.models && data.models.length > 0) {
        setAvailableModels(data.models);
        const defaultMod = data.models.find(m => m.isDefault) || data.models[0];
        setModel(defaultMod.id);
      }
    } catch (err) {
      console.error('Failed to fetch models:', err);
    }
  };

  const fetchProjects = async () => {
    try {
      const res = await fetch('/api/projects');
      const data = await res.json();
      setProjects(data.projects || []);
      if (data.activeWorkspace) {
        setActiveWorkspace(data.activeWorkspace);
        fetchFiles(data.activeWorkspace);
      }
    } catch (err) {
      console.error('Failed to fetch projects:', err);
    }
  };

  const fetchFiles = async (workspacePath) => {
    try {
      const res = await fetch('/api/files');
      const data = await res.json();
      setFileTree(data.items || []);
    } catch (err) {
      console.error('Failed to fetch file tree:', err);
    }
  };

  const handleSwitchProject = async (projectPath) => {
    try {
      const res = await fetch('/api/projects/switch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectPath })
      });
      const data = await res.json();
      if (data.success) {
        setActiveWorkspace(projectPath);
        fetchFiles(projectPath);
        initWelcomeTurn(projectPath);
      }
    } catch (err) {
      console.error('Failed to switch project:', err);
    }
  };

  const handleCreateProject = async () => {
    if (!newProjectName.trim()) return;
    try {
      const res = await fetch('/api/projects/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ folderName: newProjectName })
      });
      const data = await res.json();
      if (data.success) {
        setNewProjectName('');
        setShowNewProjectModal(false);
        fetchProjects();
        setActiveWorkspace(data.projectPath);
        fetchFiles(data.projectPath);
        initWelcomeTurn(data.projectPath);
      }
    } catch (err) {
      console.error('Failed to create project:', err);
    }
  };

  const handleDeleteProject = async (projectPath, projectName) => {
    if (!confirm(`Are you sure you want to delete project folder "${projectName}" from disk?`)) return;
    try {
      const res = await fetch('/api/projects/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectPath })
      });
      const data = await res.json();
      if (data.success) {
        fetchProjects();
        if (data.activeWorkspace) {
          setActiveWorkspace(data.activeWorkspace);
          fetchFiles(data.activeWorkspace);
          initWelcomeTurn(data.activeWorkspace);
        }
      }
    } catch (err) {
      console.error('Failed to delete project:', err);
    }
  };

  const handleCreateFile = async () => {
    if (!newFileName.trim()) return;
    try {
      const res = await fetch('/api/files/create-file', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileName: newFileName })
      });
      const data = await res.json();
      if (data.success) {
        setNewFileName('');
        setShowNewFileModal(false);
        fetchFiles(activeWorkspace);
      }
    } catch (err) {
      console.error('Failed to create file:', err);
    }
  };

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return;
    try {
      const res = await fetch('/api/files/create-folder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ folderName: newFolderName })
      });
      const data = await res.json();
      if (data.success) {
        setNewFolderName('');
        setShowNewFolderModal(false);
        fetchFiles(activeWorkspace);
      }
    } catch (err) {
      console.error('Failed to create folder:', err);
    }
  };

  const handleDeleteItem = async (relPath) => {
    if (!confirm(`Are you sure you want to delete ${relPath}?`)) return;
    try {
      const res = await fetch('/api/files/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ relPath })
      });
      const data = await res.json();
      if (data.success) {
        fetchFiles(activeWorkspace);
      }
    } catch (err) {
      console.error('Failed to delete item:', err);
    }
  };

  const openFile = async (path) => {
    try {
      const res = await fetch(`/api/file-content?path=${encodeURIComponent(path)}`);
      const data = await res.json();
      setSelectedFile(path);
      setFileContent(data.content || '');
      setActiveTab('files');
    } catch (err) {
      console.error('Failed to read file:', err);
    }
  };

  const handleRunProject = (projectPath) => {
    const targetPath = projectPath || activeWorkspace;
    const projName = targetPath.split('\\').pop() || targetPath.split('/').pop() || 'Project';

    if (isExecuting) return;

    const runTurn = {
      id: Date.now().toString(),
      role: 'assistant',
      content: `▶️ **Running Project Folder**: \`${projName}\``,
      isStreaming: true,
      timestamp: new Date().toLocaleTimeString()
    };

    setTurns(prev => [...prev, runTurn]);
    setIsExecuting(true);
    setActiveTab('chat');

    if (wsRef.current && wsConnected) {
      wsRef.current.send(JSON.stringify({
        action: 'run_project',
        projectPath: targetPath
      }));
    }
  };

  const connectWebSocket = () => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => setWsConnected(true);
    ws.onclose = () => {
      setWsConnected(false);
      setTimeout(connectWebSocket, 3000);
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        handleServerEvent(data);
      } catch (err) {
        console.error('Failed to parse WS message:', err);
      }
    };
  };

  const handleServerEvent = (data) => {
    if (data.type === 'open_url') {
      window.open(data.url, '_blank');
      appendLog(`[BROWSER TAB] Opened ${data.url}`);
    } else if (data.type === 'status') {
      appendLog(`[STATUS] ${data.message}`);
    } else if (data.type === 'raw_output' || data.type === 'raw_error') {
      appendLog(data.text);
      setTurns(prev => {
        const lastTurn = prev[prev.length - 1];
        if (lastTurn && lastTurn.role === 'assistant' && lastTurn.isStreaming) {
          return [
            ...prev.slice(0, -1),
            { ...lastTurn, content: lastTurn.content + '\n' + data.text }
          ];
        }
        return prev;
      });
    } else if (data.type === 'grok_event') {
      const ev = data.event;
      if (ev.type === 'thought') {
        appendThought(ev.data || '');
      } else if (ev.type === 'text') {
        appendText(ev.data || '');
      } else if (ev.type === 'tool_use' || ev.type === 'tool_call') {
        addStep('tool', ev.name || ev.tool || 'Tool Execution', ev.input || ev.args);
      } else if (ev.type === 'end') {
        completeTurn(ev);
      }
    } else if (data.type === 'process_exit') {
      setIsExecuting(false);
      appendLog(`[PROCESS EXITED] Code: ${data.code}`);
      finalizeTurn();
      fetchFiles(activeWorkspace);
    }
  };

  const appendLog = (text) => {
    setRawLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${text}`]);
  };

  const appendThought = (chunk) => {
    setTurns(prev => {
      const last = prev[prev.length - 1];
      if (last && last.role === 'assistant' && last.isStreaming) {
        return [
          ...prev.slice(0, -1),
          { ...last, thought: (last.thought || '') + chunk }
        ];
      }
      return prev;
    });
  };

  const appendText = (chunk) => {
    setTurns(prev => {
      const last = prev[prev.length - 1];
      if (last && last.role === 'assistant' && last.isStreaming) {
        return [
          ...prev.slice(0, -1),
          { ...last, content: (last.content || '') + chunk }
        ];
      }
      return prev;
    });
  };

  const addStep = (stepType, title, details) => {
    setTurns(prev => {
      const last = prev[prev.length - 1];
      if (last && last.role === 'assistant') {
        const steps = last.steps || [];
        return [
          ...prev.slice(0, -1),
          { ...last, steps: [...steps, { id: Date.now(), type: stepType, title, details, status: 'completed' }] }
        ];
      }
      return prev;
    });
  };

  const completeTurn = (endEv) => {
    setTurns(prev => {
      const last = prev[prev.length - 1];
      if (last && last.role === 'assistant') {
        return [
          ...prev.slice(0, -1),
          { ...last, isStreaming: false, usage: endEv.usage, costUSD: endEv.total_cost_usd }
        ];
      }
      return prev;
    });
  };

  const finalizeTurn = () => {
    setTurns(prev => {
      const last = prev[prev.length - 1];
      if (last && last.isStreaming) {
        return [
          ...prev.slice(0, -1),
          { ...last, isStreaming: false }
        ];
      }
      return prev;
    });
  };

  const handleNewConversation = () => {
    initWelcomeTurn(activeWorkspace);
  };

  const handleRunPrompt = (overridePrompt) => {
    const textToRun = overridePrompt || prompt;
    if (!textToRun.trim() || isExecuting) return;

    const userMsg = {
      id: Date.now().toString(),
      role: 'user',
      content: textToRun,
      timestamp: new Date().toLocaleTimeString()
    };

    const assistantMsg = {
      id: (Date.now() + 1).toString(),
      role: 'assistant',
      thought: '',
      content: '',
      steps: [],
      isStreaming: true,
      timestamp: new Date().toLocaleTimeString()
    };

    setTurns(prev => [...prev, userMsg, assistantMsg]);
    setIsExecuting(true);

    if (wsRef.current && wsConnected) {
      wsRef.current.send(JSON.stringify({
        action: 'run_prompt',
        prompt: textToRun,
        model,
        reasoningEffort,
        alwaysApprove,
        worktree: useWorktree,
        sessionResume
      }));
    }

    setPrompt('');
  };

  const activeProjectName = activeWorkspace.split('\\').pop() || activeWorkspace.split('/').pop() || 'Workspace';

  return (
    <div className="flex flex-col h-screen bg-[#090c15] text-slate-100 selection:bg-cyan-500/30">
      
      {/* TOP HEADER */}
      <header className="h-14 border-b border-slate-800 bg-[#0d121f] px-4 flex items-center justify-between shrink-0">
        
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-cyan-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-cyan-500/20">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-bold tracking-wide text-base text-white">Grok Build Studio</h1>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 font-mono border border-cyan-500/40">
                {activeProjectName}
              </span>
            </div>
            <p className="text-xs text-slate-400 hidden sm:block">SpaceXAI Multi-Project Coding Agent</p>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-3">
          {/* X / xAI Authentication Button */}
          {status.authenticated ? (
            <div className="flex items-center gap-2 bg-[#121927] border border-emerald-500/40 rounded-lg px-2.5 py-1 text-xs text-emerald-300 font-medium">
              <UserCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span className="hidden md:inline font-mono">Signed in</span>
              <button 
                onClick={handleLogout}
                className="hover:text-rose-400 p-0.5 ml-1 transition"
                title="Sign out from X account"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <button 
              onClick={handleStartLogin}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-slate-800 to-black hover:from-slate-700 hover:to-slate-900 border border-slate-700 text-white rounded-lg text-xs font-bold shadow-lg transition cursor-pointer"
            >
              <span className="font-extrabold text-sm">𝕏</span> Sign in with X
            </button>
          )}

          <div className="flex items-center gap-2 bg-[#121927] border border-slate-700/80 rounded-lg px-2.5 py-1 text-xs">
            <Cpu className="w-3.5 h-3.5 text-cyan-400" />
            <select 
              value={model} 
              onChange={(e) => setModel(e.target.value)}
              className="bg-transparent text-slate-200 font-medium focus:outline-none cursor-pointer"
            >
              {availableModels.map((m) => (
                <option key={m.id} value={m.id} className="bg-[#121927]">
                  {m.name}
                </option>
              ))}
            </select>
          </div>

          <button 
            onClick={() => setAlwaysApprove(!alwaysApprove)}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border transition ${
              alwaysApprove 
                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 font-semibold' 
                : 'bg-[#121927] text-slate-400 border-slate-700'
            }`}
          >
            <Shield className="w-3.5 h-3.5" />
            <span>Auto-Approve</span>
          </button>

          <div className="flex items-center gap-2 pl-2 border-l border-slate-800">
            <div className={`w-2.5 h-2.5 rounded-full ${wsConnected ? 'bg-emerald-400 shadow-md shadow-emerald-400/50' : 'bg-rose-500'}`} />
            <span className="text-xs text-slate-300 font-mono hidden lg:inline">
              {wsConnected ? 'Live' : 'Offline'}
            </span>
          </div>
        </div>

      </header>

      {/* MAIN LAYOUT */}
      <div className="flex flex-1 overflow-hidden">
        
        {/* SINGLE PROJECT SIDEBAR */}
        <aside className="w-72 border-r border-slate-800 bg-[#0d121f] flex flex-col shrink-0">
          
          <div className="p-3 border-b border-slate-800">
            <button 
              onClick={handleNewConversation}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-[#172033] hover:bg-[#1f2c47] text-white border border-slate-700/80 rounded-lg text-xs font-bold shadow transition cursor-pointer"
            >
              <Plus className="w-4 h-4 text-cyan-400" /> New Conversation
            </button>
          </div>

          <div className="p-3 border-b border-slate-800 flex items-center justify-between">
            <span className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
              <Folder className="w-3.5 h-3.5 text-amber-400" /> Projects
            </span>
            <div className="flex items-center gap-1">
              <button 
                onClick={() => setShowNewFileModal(true)}
                className="p-1 hover:bg-slate-800 rounded text-cyan-400 transition"
                title="Create New File in Active Project"
              >
                <FilePlus className="w-3.5 h-3.5" />
              </button>
              <button 
                onClick={() => setShowNewFolderModal(true)}
                className="p-1 hover:bg-slate-800 rounded text-amber-400 transition"
                title="Create New Subfolder"
              >
                <FolderPlus className="w-3.5 h-3.5" />
              </button>
              <button 
                onClick={() => setShowNewProjectModal(true)}
                className="p-1 hover:bg-slate-800 rounded text-emerald-400 transition"
                title="Create New Local Project Folder"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {projects.map((proj) => {
              const isSelected = proj.path === activeWorkspace;
              return (
                <div key={proj.path} className="flex flex-col">
                  {/* Project Row */}
                  <div 
                    onClick={() => handleSwitchProject(proj.path)}
                    className={`group/proj flex items-center justify-between px-2.5 py-2 rounded-md text-xs cursor-pointer transition ${
                      isSelected 
                        ? 'bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/40 shadow-sm' 
                        : 'text-slate-300 hover:bg-slate-800/80'
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate flex-1">
                      <Folder className={`w-4 h-4 shrink-0 ${isSelected ? 'text-cyan-400' : 'text-slate-400'}`} />
                      <span className="truncate">{proj.name}</span>
                    </div>

                    <div className="flex items-center gap-1">
                      <button 
                        onClick={(e) => { e.stopPropagation(); handleRunProject(proj.path); }}
                        className="p-1 hover:bg-emerald-500/20 text-emerald-400 hover:text-emerald-300 rounded transition"
                        title="▶️ Run Project Folder"
                      >
                        <Play className="w-3.5 h-3.5 fill-current" />
                      </button>

                      <button 
                        onClick={(e) => { e.stopPropagation(); handleDeleteProject(proj.path, proj.name); }}
                        className="opacity-0 group-hover/proj:opacity-100 p-0.5 text-slate-400 hover:text-rose-400 transition"
                        title="Delete Project Folder"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Active Project Files */}
                  {isSelected && (
                    <div className="pl-4 pr-1 py-1 space-y-0.5 border-l-2 border-cyan-500/40 ml-3.5 my-1 font-mono text-[11px]">
                      <div className="flex items-center justify-between text-slate-400 py-1 font-sans text-[10px] uppercase tracking-wider font-bold">
                        <span>Project Files:</span>
                        <button onClick={() => fetchFiles(activeWorkspace)} className="hover:text-cyan-400">
                          <RefreshCw className="w-3 h-3" />
                        </button>
                      </div>

                      {fileTree.length === 0 ? (
                        <div className="text-slate-500 italic py-1">// Empty folder</div>
                      ) : (
                        fileTree.map((file) => (
                          <div 
                            key={file.path}
                            className="group/file flex items-center justify-between px-2 py-1 rounded hover:bg-slate-800 text-slate-200 transition cursor-pointer"
                          >
                            <div 
                              onClick={() => !file.isDirectory && openFile(file.path)}
                              className="flex items-center gap-1.5 truncate flex-1"
                            >
                              {file.isDirectory ? (
                                <Folder className="w-3 h-3 text-amber-400 shrink-0" />
                              ) : (
                                <FileText className="w-3 h-3 text-cyan-400 shrink-0" />
                              )}
                              <span className="truncate">{file.name}</span>
                            </div>

                            <button 
                              onClick={(e) => { e.stopPropagation(); handleDeleteItem(file.path); }}
                              className="opacity-0 group-hover/file:opacity-100 p-0.5 text-slate-400 hover:text-rose-400 transition"
                              title="Delete File"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="p-3 border-t border-slate-800 text-[11px] text-slate-400 flex justify-between">
            <span>Root: {status.projectsRoot ? status.projectsRoot.split('\\').pop() : 'antigravity'}</span>
            <span className="text-emerald-400 font-semibold">Local Disk</span>
          </div>

        </aside>

        {/* RIGHT CONTENT AREA */}
        <main className="flex-1 flex flex-col min-w-0 bg-[#090c15]">
          
          <div className="h-10 border-b border-slate-800 bg-[#0d121f] px-4 flex items-center gap-4 text-xs font-semibold shrink-0">
            <button 
              onClick={() => setActiveTab('chat')}
              className={`flex items-center gap-1.5 h-full border-b-2 px-2 transition ${
                activeTab === 'chat' ? 'border-cyan-400 text-cyan-300 font-bold' : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <Terminal className="w-3.5 h-3.5" /> Agent Studio
            </button>
            <button 
              onClick={() => setActiveTab('files')}
              className={`flex items-center gap-1.5 h-full border-b-2 px-2 transition ${
                activeTab === 'files' ? 'border-cyan-400 text-cyan-300 font-bold' : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <Code className="w-3.5 h-3.5" /> Code Viewer {selectedFile && `(${selectedFile})`}
            </button>
            <button 
              onClick={() => setActiveTab('logs')}
              className={`flex items-center gap-1.5 h-full border-b-2 px-2 transition ${
                activeTab === 'logs' ? 'border-cyan-400 text-cyan-300 font-bold' : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <Activity className="w-3.5 h-3.5" /> Raw Engine Logs
            </button>
          </div>

          {/* TAB 1: CHAT AGENT STUDIO */}
          {activeTab === 'chat' && (
            <div className="flex-1 flex flex-col h-full overflow-hidden">
              
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {turns.map((turn) => {
                  if (turn.isWelcomeCard) {
                    return (
                      <div key={turn.id} className="max-w-3xl mx-auto bg-[#111726] rounded-2xl p-6 border border-cyan-500/30 shadow-2xl space-y-5">
                        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                          <div className="flex items-center gap-3">
                            <div className="p-2.5 rounded-xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
                              <Folder className="w-6 h-6" />
                            </div>
                            <div>
                              <h2 className="text-base font-bold text-white tracking-wide">
                                Active Project: <span className="text-cyan-400 font-extrabold">{turn.projectName}</span>
                              </h2>
                              <p className="text-xs text-slate-300 font-mono mt-0.5">
                                📍 {turn.projectPath}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <button 
                              onClick={() => handleRunProject(turn.projectPath)}
                              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-extrabold rounded-xl text-xs shadow-lg shadow-emerald-500/20 transition cursor-pointer"
                            >
                              <Play className="w-3.5 h-3.5 fill-current" /> Run Project
                            </button>
                            <span className="text-[11px] px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 font-mono border border-emerald-500/40 font-semibold">
                              Ready
                            </span>
                          </div>
                        </div>

                        {!status.authenticated && (
                          <div className="bg-gradient-to-r from-slate-900 to-black border border-slate-700 rounded-xl p-4 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <span className="text-2xl font-extrabold text-white">𝕏</span>
                              <div>
                                <h4 className="font-bold text-white text-xs">Sign in with X / xAI Account</h4>
                                <p className="text-[11px] text-slate-400">Authenticate once to run prompts with Grok 4.5</p>
                              </div>
                            </div>
                            <button 
                              onClick={handleStartLogin}
                              className="px-3.5 py-1.5 bg-white text-black hover:bg-slate-200 font-bold rounded-lg text-xs transition cursor-pointer"
                            >
                              Sign in with X
                            </button>
                          </div>
                        )}

                        <p className="text-xs text-slate-200 leading-relaxed">
                          This conversation is isolated to <strong className="text-cyan-300">{turn.projectName}</strong>. Grok will create files, execute commands, and write code step-by-step directly in this local directory. Click <strong className="text-emerald-400">Run Project</strong> above anytime to launch your app live!
                        </p>

                        <div className="space-y-3 pt-2">
                          <div className="text-xs font-bold text-slate-300 flex items-center gap-1.5 uppercase tracking-wider">
                            <Lightbulb className="w-4 h-4 text-amber-400" /> Quick Starter Actions:
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <button 
                              onClick={() => handleRunPrompt("Create a README.md file summarizing this project architecture")}
                              className="p-3.5 bg-[#172033] hover:bg-[#1e2942] border border-slate-700/80 hover:border-cyan-400/60 rounded-xl text-left text-xs transition group cursor-pointer shadow-md"
                            >
                              <div className="font-bold text-white group-hover:text-cyan-300">📝 Create README.md</div>
                              <div className="text-[11px] text-slate-300 mt-1">Generate a project overview file</div>
                            </button>
                            <button 
                              onClick={() => handleRunPrompt("Create a basic index.html and app structure")}
                              className="p-3.5 bg-[#172033] hover:bg-[#1e2942] border border-slate-700/80 hover:border-cyan-400/60 rounded-xl text-left text-xs transition group cursor-pointer shadow-md"
                            >
                              <div className="font-bold text-white group-hover:text-cyan-300">🌐 Web App Scaffold</div>
                              <div className="text-[11px] text-slate-300 mt-1">Create index.html and app logic</div>
                            </button>
                            <button 
                              onClick={() => handleRunPrompt("Write a sample Node.js server.js file")}
                              className="p-3.5 bg-[#172033] hover:bg-[#1e2942] border border-slate-700/80 hover:border-cyan-400/60 rounded-xl text-left text-xs transition group cursor-pointer shadow-md"
                            >
                              <div className="font-bold text-white group-hover:text-cyan-300">⚡ Node.js Server</div>
                              <div className="text-[11px] text-slate-300 mt-1">Create a starter backend server</div>
                            </button>
                            <button 
                              onClick={() => handleRunPrompt("List all files and analyze codebase structure")}
                              className="p-3.5 bg-[#172033] hover:bg-[#1e2942] border border-slate-700/80 hover:border-cyan-400/60 rounded-xl text-left text-xs transition group cursor-pointer shadow-md"
                            >
                              <div className="font-bold text-white group-hover:text-cyan-300">🔍 Analyze Codebase</div>
                              <div className="text-[11px] text-slate-300 mt-1">Scan files and explain setup</div>
                            </button>
                          </div>
                        </div>

                      </div>
                    );
                  }

                  return (
                    <div key={turn.id} className={`flex flex-col gap-2 ${turn.role === 'user' ? 'items-end' : 'items-start'}`}>
                      <div className="flex items-center gap-2 text-xs text-slate-400">
                        <span className="font-bold text-slate-200">{turn.role === 'user' ? 'You' : 'Grok Agent'}</span>
                        <span>•</span>
                        <span>{turn.timestamp}</span>
                      </div>

                      <div className={`max-w-3xl w-full rounded-2xl p-5 border text-sm leading-relaxed ${
                        turn.role === 'user' 
                          ? 'bg-gradient-to-r from-cyan-600/30 to-indigo-600/30 border-cyan-500/40 text-white shadow-lg ml-auto' 
                          : 'bg-[#111726] border-slate-800 text-slate-100 shadow-xl space-y-4'
                      }`}>
                        
                        {turn.role === 'assistant' && (turn.thought || (turn.isStreaming && !turn.content)) && (
                          <div className="bg-[#0b0e17] border border-indigo-500/40 rounded-xl p-3.5 text-xs font-mono space-y-1.5 shadow-inner">
                            <div className="flex items-center gap-2 text-indigo-300 font-bold tracking-wide uppercase text-[11px]">
                              <Brain className={`w-3.5 h-3.5 ${turn.isStreaming ? 'animate-pulse text-indigo-300' : ''}`} />
                              <span>Reasoning Process</span>
                              {turn.isStreaming && <Loader2 className="w-3 h-3 animate-spin ml-auto text-indigo-400" />}
                            </div>
                            <div className="text-slate-200 whitespace-pre-wrap leading-relaxed max-h-40 overflow-y-auto text-[11px]">
                              {turn.thought || 'Analyzing workspace and planning step-by-step actions...'}
                            </div>
                          </div>
                        )}

                        {turn.role === 'assistant' && turn.steps && turn.steps.length > 0 && (
                          <div className="space-y-2">
                            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                              <Layers className="w-3.5 h-3.5 text-cyan-400" /> Step-by-Step Executions:
                            </div>
                            {turn.steps.map((step) => (
                              <div key={step.id} className="bg-[#0b0e17] border border-slate-800 rounded-xl p-3 text-xs font-mono flex flex-col gap-1 shadow-md">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2 font-bold text-cyan-300">
                                    <Command className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                                    <span>{step.title}</span>
                                  </div>
                                  <span className="flex items-center gap-1 text-[10px] text-emerald-300 bg-emerald-500/20 px-2 py-0.5 rounded-full border border-emerald-500/30 font-bold">
                                    <Check className="w-3 h-3" /> Executed
                                  </span>
                                </div>
                                {step.details && (
                                  <div className="text-slate-300 text-[11px] truncate bg-slate-900/80 p-1.5 rounded border border-slate-800">
                                    {JSON.stringify(step.details)}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        )}

                        {turn.content && (
                          <div className="whitespace-pre-wrap font-sans text-slate-100 leading-relaxed text-sm pt-1">
                            {turn.content}
                          </div>
                        )}

                        {turn.role === 'assistant' && turn.usage && (
                          <div className="pt-3 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-400 font-mono">
                            <div className="flex items-center gap-3">
                              <span>Tokens: <strong className="text-slate-200">{turn.usage.total_tokens?.toLocaleString()}</strong></span>
                              <span>•</span>
                              <span>Reasoning: <strong className="text-indigo-300">{turn.usage.reasoning_tokens?.toLocaleString()}</strong></span>
                            </div>
                          </div>
                        )}

                      </div>
                    </div>
                  );
                })}
                <div ref={chatBottomRef} />
              </div>

              {/* INPUT BAR */}
              <div className="p-4 border-t border-slate-800 bg-[#0d121f] shrink-0">
                <div className="max-w-4xl mx-auto flex flex-col gap-2">
                  <div className="relative flex items-center">
                    <textarea 
                      value={prompt}
                      onChange={(e) => setPrompt(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleRunPrompt();
                        }
                      }}
                      placeholder={`Ask Grok to build features or edit files in ${activeProjectName}... (Enter to send, Shift+Enter for new line)`}
                      rows={2}
                      className="w-full bg-[#090c15] border border-slate-700/80 rounded-xl px-4 py-3 text-sm text-slate-100 placeholder-slate-400 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 transition resize-none pr-28"
                    />

                    <div className="absolute right-3 bottom-3 flex items-center gap-2">
                      {isExecuting ? (
                        <button 
                          onClick={() => wsRef.current?.send(JSON.stringify({ action: 'cancel_prompt' }))}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 rounded-lg text-xs font-bold transition"
                        >
                          <Square className="w-3.5 h-3.5 fill-current" /> Stop
                        </button>
                      ) : (
                        <button 
                          onClick={() => handleRunPrompt()}
                          disabled={!prompt.trim()}
                          className="flex items-center gap-1.5 px-4 py-1.5 bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 disabled:opacity-50 text-white font-bold rounded-lg text-xs shadow-lg shadow-cyan-500/20 transition cursor-pointer"
                        >
                          <Play className="w-3.5 h-3.5 fill-current" /> Run
                        </button>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between text-[11px] text-slate-400 px-1 font-mono">
                    <span>Press <kbd className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-200 border border-slate-700 font-bold">Enter</kbd> to send prompt</span>
                    <span>Press <kbd className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-200 border border-slate-700 font-bold">Shift + Enter</kbd> for new line</span>
                  </div>

                </div>
              </div>

            </div>
          )}

          {/* TAB 2: CODE VIEWER */}
          {activeTab === 'files' && (
            <div className="flex-1 flex flex-col h-full overflow-hidden p-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <span className="font-mono text-sm text-cyan-400 font-bold">
                  {selectedFile ? `📄 ${selectedFile}` : 'Select a file from the projects sidebar'}
                </span>
                <button 
                  onClick={() => handleRunProject(activeWorkspace)}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 rounded-lg text-xs font-bold transition cursor-pointer"
                >
                  <Play className="w-3.5 h-3.5 fill-current" /> Run Active Project
                </button>
              </div>
              <div className="flex-1 overflow-auto mt-3 bg-[#0b0e17] border border-slate-800 rounded-xl p-4 font-mono text-xs text-slate-200 leading-relaxed">
                <pre>{fileContent || '// Select a file from the project sidebar to inspect code...'}</pre>
              </div>
            </div>
          )}

          {/* TAB 3: LOGS */}
          {activeTab === 'logs' && (
            <div className="flex-1 flex flex-col h-full overflow-hidden p-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <span className="font-mono text-sm text-amber-400 font-bold">
                  ⚡ Engine Activity Logs
                </span>
                <button onClick={() => setRawLogs([])} className="px-2 py-1 rounded bg-[#121927] text-slate-300 text-xs border border-slate-700">
                  Clear
                </button>
              </div>
              <div className="flex-1 overflow-auto mt-3 bg-[#0b0e17] border border-slate-800 rounded-xl p-4 font-mono text-xs text-emerald-400 space-y-1">
                {rawLogs.map((log, i) => <div key={i}>{log}</div>)}
              </div>
            </div>
          )}

        </main>

      </div>

      {/* MODAL: X / xAI OAUTH DEVICE LOGIN */}
      {showAuthModal && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 z-50">
          <div className="bg-[#111726] border border-cyan-500/40 rounded-2xl p-6 w-full max-w-lg space-y-6 shadow-2xl">
            
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-black border border-slate-700 flex items-center justify-center text-xl font-extrabold text-white">
                  𝕏
                </div>
                <div>
                  <h3 className="font-bold text-base text-white">Sign in with X / xAI Account</h3>
                  <p className="text-xs text-slate-400">Authenticate your Grok Build engine</p>
                </div>
              </div>
              <button 
                onClick={() => setShowAuthModal(false)}
                className="text-slate-400 hover:text-white transition text-xs font-bold"
              >
                ✕
              </button>
            </div>

            {isStartingAuth || !authData ? (
              <div className="py-8 flex flex-col items-center justify-center space-y-3">
                <Loader2 className="w-8 h-8 text-cyan-400 animate-spin" />
                <p className="text-xs text-slate-300 font-mono">Generating X OAuth device code...</p>
              </div>
            ) : (
              <div className="space-y-5">
                <div className="bg-[#090c15] border border-slate-800 rounded-xl p-4 space-y-3 text-center">
                  <span className="text-xs text-slate-400 font-mono uppercase tracking-wider">Device Verification Code:</span>
                  <div className="flex items-center justify-center gap-3">
                    <span className="text-3xl font-mono font-extrabold text-cyan-400 tracking-widest bg-slate-900 px-4 py-2 rounded-lg border border-cyan-500/30 shadow-inner">
                      {authData.userCode}
                    </span>
                    <button 
                      onClick={copyUserCode}
                      className="p-2.5 bg-[#172033] hover:bg-[#1f2c47] text-slate-200 border border-slate-700 rounded-lg transition"
                      title="Copy User Code"
                    >
                      {codeCopied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4 text-cyan-400" />}
                    </button>
                  </div>
                </div>

                <div className="space-y-3">
                  <a 
                    href={authData.authUrl} 
                    target="_blank" 
                    rel="noreferrer"
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white font-extrabold rounded-xl text-sm shadow-lg shadow-cyan-500/20 transition cursor-pointer"
                  >
                    Open X / xAI Login Page <ExternalLink className="w-4 h-4" />
                  </a>

                  <div className="flex items-center justify-center gap-2 text-xs text-slate-400 font-mono py-1">
                    <Loader2 className="w-3.5 h-3.5 text-cyan-400 animate-spin" />
                    <span>Waiting for authorization from X browser tab...</span>
                  </div>
                </div>
              </div>
            )}

            <div className="pt-2 border-t border-slate-800 flex justify-end">
              <button 
                onClick={() => setShowAuthModal(false)}
                className="px-4 py-1.5 rounded-lg text-xs text-slate-300 hover:bg-slate-800 transition font-semibold"
              >
                Cancel
              </button>
            </div>

          </div>
        </div>
      )}

      {/* MODAL: CREATE NEW PROJECT FOLDER */}
      {showNewProjectModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-[#111726] border border-slate-700 rounded-xl p-6 w-full max-w-md space-y-4 shadow-2xl">
            <h3 className="font-bold text-base text-white flex items-center gap-2">
              <FolderPlus className="w-5 h-5 text-cyan-400" /> Create New Local Project Folder
            </h3>
            <p className="text-xs text-slate-300">
              Enter a name for your new local project folder. It will be stored locally under <code className="text-cyan-300 font-mono">{status.projectsRoot}</code>.
            </p>
            <input 
              type="text" 
              value={newProjectName}
              onChange={(e) => setNewProjectName(e.target.value)}
              placeholder="e.g. my-awesome-app"
              className="w-full bg-[#090c15] border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-400"
              autoFocus
            />
            <div className="flex items-center justify-end gap-2 pt-2">
              <button 
                onClick={() => setShowNewProjectModal(false)}
                className="px-3 py-1.5 rounded-lg text-xs text-slate-300 hover:bg-slate-800"
              >
                Cancel
              </button>
              <button 
                onClick={handleCreateProject}
                disabled={!newProjectName.trim()}
                className="px-4 py-1.5 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold rounded-lg text-xs transition disabled:opacity-50"
              >
                Create Folder
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: CREATE NEW FILE */}
      {showNewFileModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-[#111726] border border-slate-700 rounded-xl p-6 w-full max-w-md space-y-4 shadow-2xl">
            <h3 className="font-bold text-base text-white flex items-center gap-2">
              <FilePlus className="w-5 h-5 text-cyan-400" /> Create New File in {activeProjectName}
            </h3>
            <input 
              type="text" 
              value={newFileName}
              onChange={(e) => setNewFileName(e.target.value)}
              placeholder="e.g. index.js or README.md"
              className="w-full bg-[#090c15] border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-400"
              autoFocus
            />
            <div className="flex items-center justify-end gap-2 pt-2">
              <button 
                onClick={() => setShowNewFileModal(false)}
                className="px-3 py-1.5 rounded-lg text-xs text-slate-300 hover:bg-slate-800"
              >
                Cancel
              </button>
              <button 
                onClick={handleCreateFile}
                disabled={!newFileName.trim()}
                className="px-4 py-1.5 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold rounded-lg text-xs transition disabled:opacity-50"
              >
                Create File
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: CREATE NEW SUBFOLDER */}
      {showNewFolderModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-[#111726] border border-slate-700 rounded-xl p-6 w-full max-w-md space-y-4 shadow-2xl">
            <h3 className="font-bold text-base text-white flex items-center gap-2">
              <FolderPlus className="w-5 h-5 text-amber-400" /> Create New Subfolder in {activeProjectName}
            </h3>
            <input 
              type="text" 
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              placeholder="e.g. src or components"
              className="w-full bg-[#090c15] border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-400"
              autoFocus
            />
            <div className="flex items-center justify-end gap-2 pt-2">
              <button 
                onClick={() => setShowNewFolderModal(false)}
                className="px-3 py-1.5 rounded-lg text-xs text-slate-300 hover:bg-slate-800"
              >
                Cancel
              </button>
              <button 
                onClick={handleCreateFolder}
                disabled={!newFolderName.trim()}
                className="px-4 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg text-xs transition disabled:opacity-50"
              >
                Create Subfolder
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
