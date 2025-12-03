import React from 'react';
import { SeverityLevel } from '../../types/config';

interface ErrorBadgeProps {
  level: SeverityLevel;
}

export function ErrorBadge({ level }: ErrorBadgeProps) {
  return (
    <span className={`error-badge error-badge--${level}`}>
      {level.toUpperCase()}
    </span>
  );
}
