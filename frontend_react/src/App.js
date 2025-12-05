import React, { useEffect, useMemo, useState } from 'react';
import './App.css';
import { ApiClientProvider, useApi } from './services/apiClient';
import ConnectionPanel from './components/ConnectionPanel';
import CommandPanel from './components/CommandPanel';
import ResultCard from './components/ResultCard';
import ToastHost, { useToasts } from './components/Toast';
import StatusBar from './components/StatusBar';

/**
 * Root App renders the Nokia 7360 OLT RX-signal monitor single-page UI.
 * Integrates connection, command execution, and results with Ocean Professional styling.
 */
function AppShell() {
  const api = useApi();
  const { pushToast } = useToasts();

  const [connected, setConnected] = useState(false);
  const [connecting, setConnecting] = useState(false);

  const [connInfo, setConnInfo] = useState(() => {
    // Preload from localStorage for convenience, but do not log sensitive values.
    try {
      const raw = localStorage.getItem('olt_conn');
      if (!raw) return { host: '202.39.123.124', username: '', password: '' };
      const parsed = JSON.parse(raw);
      return {
        host: parsed.host || '202.39.123.124',
        username: parsed.username || '',
        password: '' // never restore password from storage
      };
    } catch {
      return { host: '202.39.123.124', username: '', password: '' };
    }
  });

  const [ontPath, setOntPath] = useState(() => {
    try {
      const raw = localStorage.getItem('olt_ont_path');
      return raw || '1/1/3/2/1';
    } catch {
      return '1/1/3/2/1';
    }
  });

  const [running, setRunning] = useState(false);
  const [lastResult, setLastResult] = useState(() => {
    try {
      const raw = localStorage.getItem('olt_last_result');
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  });

  useEffect(() => {
    // Persist non-sensitive fields
    try {
      localStorage.setItem('olt_conn', JSON.stringify({ host: connInfo.host, username: connInfo.username }));
    } catch {}
  }, [connInfo.host, connInfo.username]);

  useEffect(() => {
    try {
      localStorage.setItem('olt_ont_path', ontPath);
    } catch {}
  }, [ontPath]);

  const canExecute = useMemo(() => connected && ontPath.trim().length > 0 && !running, [connected, ontPath, running]);

  // PUBLIC_INTERFACE
  async function handleConnect({ host, username, password }) {
    /** Attempt to connect to OLT using provided credentials. Does not log secrets. */
    if (!host || !username || !password) {
      pushToast({ type: 'error', title: 'Missing fields', message: 'Please fill OLT IP, username, and password.' });
      return;
    }
    setConnecting(true);
    try {
      const ok = await api.connect({ host, username, password });
      if (ok) {
        setConnected(true);
        setConnInfo({ host, username, password: '' }); // clear password after use
        pushToast({ type: 'success', title: 'Connected', message: `Connected to ${host}` });
      } else {
        setConnected(false);
        pushToast({ type: 'error', title: 'Connection failed', message: `Unable to connect to ${host}` });
      }
    } catch (e) {
      setConnected(false);
      pushToast({ type: 'error', title: 'Error', message: 'An error occurred while connecting.' });
    } finally {
      setConnecting(false);
    }
  }

  // PUBLIC_INTERFACE
  async function handleExecute() {
    /** Execute optics command to fetch RX signal for the ONT path and save result. */
    if (!connected) {
      pushToast({ type: 'error', title: 'Not connected', message: 'Please connect to the OLT first.' });
      return;
    }
    if (!ontPath || !/^\d+\/\d+\/\d+\/\d+\/\d+$/.test(ontPath.trim())) {
      pushToast({ type: 'error', title: 'Invalid ONT Path', message: 'Use format like 1/1/3/2/1.' });
      return;
    }
    setRunning(true);
    try {
      const res = await api.runShowOntOptics({ ontPath: ontPath.trim() });
      setLastResult(res);
      try { localStorage.setItem('olt_last_result', JSON.stringify(res)); } catch {}
      pushToast({ type: 'success', title: 'Command executed', message: 'RX-signal level updated.' });
    } catch (e) {
      pushToast({ type: 'error', title: 'Execution failed', message: 'Failed to fetch RX-signal level.' });
    } finally {
      setRunning(false);
    }
  }

  // PUBLIC_INTERFACE
  function handleRefresh() {
    /** Re-run the last command if possible. */
    if (canExecute) {
      void handleExecute();
    } else {
      pushToast({ type: 'error', title: 'Cannot refresh', message: 'Connect and provide a valid ONT path first.' });
    }
  }

  return (
    <div className="app-shell">
      <div className="navbar">
        <div className="navbar-inner">
          <div className="brand">
            <span className="brand-badge">Nokia 7360</span>
            <div className="brand-title">OLT RX-signal Monitor</div>
          </div>
          <div className="status">
            <span className={`dot ${connected ? 'ok' : ''}`}></span>
            <span>{connected ? 'Connected' : 'Disconnected'}</span>
          </div>
        </div>
      </div>

      <main className="main">
        <div className="grid grid-2">
          <div className="card">
            <div className="card-header">
              <div>
                <div className="card-title">Connection</div>
                <div className="card-subtitle">Connect to OLT to execute commands.</div>
              </div>
            </div>
            <div className="card-body">
              <ConnectionPanel
                defaults={{ host: connInfo.host, username: connInfo.username }}
                connecting={connecting}
                connected={connected}
                onConnect={handleConnect}
              />
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <div className="card-title">Command</div>
              <button className="btn ghost" onClick={handleRefresh} disabled={!canExecute}>
                Refresh
              </button>
            </div>
            <div className="card-body">
              <CommandPanel
                ontPath={ontPath}
                setOntPath={setOntPath}
                onExecute={handleExecute}
                canExecute={canExecute}
                running={running}
              />
            </div>
          </div>
        </div>

        <div className="card" style={{ marginTop: 16 }}>
          <div className="card-header">
            <div>
              <div className="card-title">Results</div>
              <div className="card-subtitle">RX-signal level and raw output</div>
            </div>
          </div>
          <div className="card-body">
            <ResultCard result={lastResult} />
          </div>
        </div>
      </main>

      <StatusBar left={`API: ${api.baseUrlDisplay}`} right={connected ? 'Ready' : 'Awaiting connection'} />
    </div>
  );
}

// PUBLIC_INTERFACE
function App() {
  /** PUBLIC INTERFACE Root wrapped with providers for API client and toasts. */
  return (
    <ToastHost>
      <ApiClientProvider>
        <AppShell />
      </ApiClientProvider>
    </ToastHost>
  );
}

export default App;
