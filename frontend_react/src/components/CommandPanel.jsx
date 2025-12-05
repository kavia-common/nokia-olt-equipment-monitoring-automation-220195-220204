import React, { useMemo } from 'react';

/**
 * CommandPanel manages the ONT path input and triggers command execution.
 */

// PUBLIC_INTERFACE
export default function CommandPanel({ ontPath, setOntPath, onExecute, canExecute, running }) {
  /** PUBLIC_INTERFACE ONT path field and Execute button. */
  const error = useMemo(() => {
    if (!ontPath) return 'ONT path required';
    if (!/^\d+\/\d+\/\d+\/\d+\/\d+$/.test(ontPath.trim())) return 'Use format like 1/1/3/2/1';
    return null;
  }, [ontPath]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (canExecute && !error) onExecute?.();
  };

  return (
    <form onSubmit={handleSubmit}>
      <div className="form-row cols-2">
        <div>
          <label className="label" htmlFor="ont-path">ONT Path</label>
          <input id="ont-path" className="input" value={ontPath} onChange={(e) => setOntPath(e.target.value)} placeholder="1/1/3/2/1" />
          {error ? <div className="error-text">{error}</div> : <div className="helper">Format: shelf/slot/pon/ont/x</div>}
        </div>
        <div style={{ display: 'flex', alignItems: 'flex-end' }}>
          <button type="submit" className="btn secondary" disabled={!canExecute || !!error}>
            {running ? 'Running…' : 'Execute'}
          </button>
        </div>
      </div>
    </form>
  );
}
