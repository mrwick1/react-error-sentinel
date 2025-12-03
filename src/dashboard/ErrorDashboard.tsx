import React, { useState } from 'react';
import { ErrorDashboardProps } from './types';
import { useErrorData } from './hooks/useErrorData';
import { useErrorFilters } from './hooks/useErrorFilters';
import { ErrorEvent } from '../types';
import { SearchBar } from './components/SearchBar';
import { ErrorTable } from './components/ErrorTable';
import { ErrorDetailModal } from './components/ErrorDetailModal';
import './styles.css';

export function ErrorDashboard({
  apiEndpoint,
  authStrategy = 'none',
  authToken,
  refreshInterval = 0,
  maxItems = 20,
}: ErrorDashboardProps) {
  const { errors, loading, error } = useErrorData(
    apiEndpoint,
    authStrategy,
    authToken,
    refreshInterval
  );

  const { filters, setFilters, filteredErrors, clearFilters } = useErrorFilters(
    errors,
    maxItems
  );

  const [selectedError, setSelectedError] = useState<ErrorEvent | null>(null);

  const handleRowClick = (error: ErrorEvent) => {
    setSelectedError(error);
  };

  const handleModalClose = () => {
    setSelectedError(null);
  };

  if (loading) {
    return (
      <div className="error-dashboard">
        <div className="error-dashboard__loading">Loading errors...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="error-dashboard">
        <div className="error-dashboard__error">
          Failed to load errors: {error}
        </div>
      </div>
    );
  }

  if (errors.length === 0) {
    return (
      <div className="error-dashboard">
        <div className="error-dashboard__empty">No errors to display</div>
      </div>
    );
  }

  return (
    <div className="error-dashboard">
      <div className="error-dashboard__header">
        <h1>Error Dashboard</h1>
        <p>
          Showing {filteredErrors.length} of {errors.length} error
          {errors.length !== 1 ? 's' : ''}
        </p>
      </div>
      <div className="error-dashboard__content">
        <SearchBar
          filters={filters}
          onFilterChange={setFilters}
          onClear={clearFilters}
        />
        <ErrorTable errors={filteredErrors} onRowClick={handleRowClick} />
        <ErrorDetailModal error={selectedError} onClose={handleModalClose} />
      </div>
    </div>
  );
}
