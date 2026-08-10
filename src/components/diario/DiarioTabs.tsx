import React from 'react';

/**
 * DiarioTabs - Simplified / deprecated.
 *
 * The tab system has been removed for a simpler "click-to-open" approach.
 * This file is kept as a breadcrumb-style header for potential future use.
 * It is NOT currently imported by DiarioView.
 */

interface DiarioBreadcrumbProps {
  folderName?: string;
  entryTitle?: string;
}

/** Optional breadcrumb component. Currently unused. */
export const DiarioBreadcrumb: React.FC<DiarioBreadcrumbProps> = ({ folderName, entryTitle }) => {
  if (!folderName && !entryTitle) return null;

  return (
    <div
      className="flex items-center gap-2 px-4 py-1.5 text-[11px] uppercase tracking-wider"
      style={{
        color: 'var(--color-text-secondary)',
        borderBottom: '1px solid rgba(197,160,89,0.08)',
        backgroundColor: 'var(--color-bg-secondary)',
      }}
    >
      {folderName && <span>{folderName}</span>}
      {folderName && entryTitle && <span style={{ color: 'rgba(197,160,89,0.3)' }}>/</span>}
      {entryTitle && <span style={{ color: 'var(--color-gold)' }}>{entryTitle}</span>}
    </div>
  );
};

export default DiarioBreadcrumb;
