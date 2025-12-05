import React, { useMemo, useState } from 'react';

/**
 * ConnectionPanel renders fields for OLT IP, username, and password with a Connect button.
 * It performs basic validation and never logs credentials.
 */
const defaultHost = '202.39.123.124';

function isValidIpOrHost(v) {
  if (!v) return false;
  // simple IP or hostname check
  const ipRe = /^(25[0-5]|2[0-4]\d|[01]?\d?\d)(\.(25[0-5]|2[0-4]\d|[01]?\d?\d)){3}$/;
  const hostRe = /^[a-zA-Z0-9.-]+$/;
  return ipRe.test(v) || hostRe.test(v);
}

// PUBLIC_INTERFACE
export default function ConnectionPanel({ defaults, connecting, connected, onConnect }) {
  /** PUBLIC_INTERFACE Form to capture connection details and trigger onConnect. */
  const [host, setHost] = useState(defaults?.host || defaultHost);
  const [username, setUsername] = useState(defaults?.username || '');
  const [password, setPassword] = useState('');

  const errors = useMemo(() => {
    const e = {};
    if (!isValidIpOrHost(host)) e.host = 'Enter a valid IP/hostname.';
    if (!username) e.username = 'Username required.';
    if (!password && !connected) e.password = 'Password required.';
    return e;
  }, [host, username, password, connected]);

  const canSubmit = useMemo(() => Object.keys(errors).length === 0 && !connecting, [errors, connecting]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!canSubmit) return;
    // Avoid console logging sensitive data
    onConnect?.({ host: host.trim(), username: username.trim(), password });
    setPassword(''); // clear password after initiating connection
  };

  return (
    <form onSubmit={handleSubmit} className="grid" autoComplete="off" spellCheck="false">
      <div className="form-row cols-3">
        <div>
          <label className="label" htmlFor="olt-host">OLT IP</label>
          <input id="olt-host" className="input" value={host} onChange={(e) => setHost(e.target.value)} placeholder={defaultHost} />
          {errors.host && <div className="error-text">{errors.host}</div>}
        </div>
        <div>
          <label className="label" htmlFor="olt-user">Username</label>
          <input id="olt-user" className="input" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="admin" />
          {errors.username && <div className="error-text">{errors.username}</div>}
        </div>
        <div>
          <label className="label" htmlFor="olt-pass">Password</label>
          <input id="olt-pass" type="password" className="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
          {errors.password && <div className="error-text">{errors.password}</div>}
        </div>
      </div>
      <div style={{ display: 'flex', gap: 12, marginTop: 12 }}>
        <button type="submit" className="btn" disabled={!canSubmit}>
          {connecting ? 'Connecting…' : (connected ? 'Reconnect' : 'Connect')}
        </button>
        <span className="helper">Default IP {defaultHost}. Credentials are not stored.</span>
      </div>
    </form>
  );
}
