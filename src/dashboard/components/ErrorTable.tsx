import React from 'react';
import { ErrorEvent } from '../../types';
import { ErrorTableRow } from './ErrorTableRow';

interface ErrorTableProps {
  errors: ErrorEvent[];
  onRowClick: (error: ErrorEvent) => void;
}

export function ErrorTable({ errors, onRowClick }: ErrorTableProps) {
  if (errors.length === 0) {
    return (
      <div className="error-table--empty">
        <p>No errors found matching your filters.</p>
      </div>
    );
  }

  return (
    <div className="error-table-container">
      <table className="error-table">
        <thead className="error-table__header">
          <tr>
            <th className="error-table__cell error-table__cell--timestamp">
              Timestamp
            </th>
            <th className="error-table__cell error-table__cell--level">
              Level
            </th>
            <th className="error-table__cell error-table__cell--message">
              Message
            </th>
            <th className="error-table__cell error-table__cell--type">
              Type
            </th>
            <th className="error-table__cell error-table__cell--environment">
              Environment
            </th>
            <th className="error-table__cell error-table__cell--user">
              User
            </th>
            <th className="error-table__cell error-table__cell--browser">
              Browser
            </th>
          </tr>
        </thead>
        <tbody>
          {errors.map((error) => (
            <ErrorTableRow
              key={error.event_id}
              error={error}
              onClick={onRowClick}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}
