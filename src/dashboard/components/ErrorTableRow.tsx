import React from 'react';
import { ErrorEvent } from '../../types';
import { ErrorBadge } from './ErrorBadge';

interface ErrorTableRowProps {
  error: ErrorEvent;
  onClick: (error: ErrorEvent) => void;
}

function formatTimestamp(timestamp: number): string {
  const date = new Date(timestamp);
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).format(date);
}

function truncateMessage(message: string, maxLength: number = 80): string {
  if (message.length <= maxLength) {
    return message;
  }
  return message.substring(0, maxLength) + '...';
}

export function ErrorTableRow({ error, onClick }: ErrorTableRowProps) {
  const handleClick = () => {
    onClick(error);
  };

  const userId = error.user?.id || error.user?.email || '-';
  const browserInfo = error.context?.browser
    ? `${error.context.browser.name} ${error.context.browser.version}`
    : '-';

  return (
    <tr className="error-table__row" onClick={handleClick}>
      <td className="error-table__cell error-table__cell--timestamp">
        {formatTimestamp(error.timestamp)}
      </td>
      <td className="error-table__cell error-table__cell--level">
        <ErrorBadge level={error.level} />
      </td>
      <td className="error-table__cell error-table__cell--message">
        {truncateMessage(error.error.message)}
      </td>
      <td className="error-table__cell error-table__cell--type">
        {error.error.type}
      </td>
      <td className="error-table__cell error-table__cell--environment">
        {error.environment}
      </td>
      <td className="error-table__cell error-table__cell--user">
        {userId}
      </td>
      <td className="error-table__cell error-table__cell--browser">
        {browserInfo}
      </td>
    </tr>
  );
}
