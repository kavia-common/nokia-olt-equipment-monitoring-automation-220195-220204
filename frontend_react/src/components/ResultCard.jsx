import React from 'react';

/**
 * ResultCard displays the RX-signal value and the raw command output.
 */

// PUBLIC_INTERFACE
export default function ResultCard({ result }) {
  /** PUBLIC_INTERFACE Present last execution result (or an empty state). */
  if (!result) {
    return <div className="helper">No results yet. Execute the command to fetch RX-signal level.</div>;
  }

  const rx = result.rxDbm;
  const ont = result.ontPath;
  const when = result.at ? new Date(result.at).toLocaleString() : '';

  return (
    <div className="grid" style={{ gap: 14 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
        <div className="rx-level">{typeof rx === 'number' ? rx.toFixed(1) : '--'}</div>
        <div className="rx-unit">dBm</div>
      </div>
      <div className="helper">
        {ont && <span>ONT {ont} • </span>}
        <span>{when}</span>
        {result.stub ? <span> • simulated</span> : null}
      </div>
      <pre className="raw-output" aria-label="Raw command output">
{result.raw || ''}
      </pre>
    </div>
  );
}
