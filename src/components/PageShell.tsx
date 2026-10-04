import React from 'react';

export interface PageShellProps {
  header?: React.ReactNode;
  children: React.ReactNode;
  bottomSlot?: React.ReactNode;
  className?: string;
}

/**
 * PageShell establishes a resilient mobile-first layout structure.
 * - Wraps pages with a dedicated header, scrollable content area, and bottom action slot.
 * - Employs min-height: 100dvh (with 100vh fallback) to prevent layout shifting when phone address bars collapse.
 * - Respects safe area insets (env(safe-area-inset-top) and env(safe-area-inset-bottom)).
 * - Enforces bottom clearance so scrollable items are never obscured by action buttons.
 */
export const PageShell: React.FC<PageShellProps> = ({
  header,
  children,
  bottomSlot,
  className = '',
}) => {
  return (
    <div className={`page-shell ${className}`}>
      {header && <header className="page-shell-header">{header}</header>}
      <main id="main" tabIndex={-1} className="page-shell-content">
        {children}
      </main>
      {bottomSlot && <div className="page-shell-bottom">{bottomSlot}</div>}
    </div>
  );
};
