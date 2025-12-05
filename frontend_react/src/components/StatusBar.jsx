import React from 'react';

/**
 * StatusBar shows a sticky footer with left/right messages.
 */

// PUBLIC_INTERFACE
export default function StatusBar({ left, right }) {
  /** PUBLIC_INTERFACE Sticky footer status bar. */
  return (
    <div className="statusbar" role="status">
      <div className="statusbar-inner">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 12, opacity: 0.9 }}>{left}</span>
        </div>
        <div style={{ fontSize: 12, opacity: 0.9 }}>{right}</div>
      </div>
    </div>
  );
}
