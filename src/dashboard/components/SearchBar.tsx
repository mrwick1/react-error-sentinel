import React from 'react';
import { Filters } from '../types';
import { Environment, SeverityLevel } from '../../types/config';

interface SearchBarProps {
  filters: Filters;
  onFilterChange: (filters: Filters) => void;
  onClear: () => void;
}

export function SearchBar({ filters, onFilterChange, onClear }: SearchBarProps) {
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onFilterChange({
      ...filters,
      searchText: e.target.value,
    });
  };

  const handleEnvironmentChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onFilterChange({
      ...filters,
      environment: e.target.value as Environment | 'all',
    });
  };

  const handleLevelChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onFilterChange({
      ...filters,
      level: e.target.value as SeverityLevel | 'all',
    });
  };

  const handleTagsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const tagsText = e.target.value;
    const tagsArray = tagsText
      .split(',')
      .map((tag) => tag.trim())
      .filter((tag) => tag.length > 0);
    onFilterChange({
      ...filters,
      tags: tagsArray,
    });
  };

  const activeFiltersCount =
    (filters.searchText ? 1 : 0) +
    (filters.environment !== 'all' ? 1 : 0) +
    (filters.level !== 'all' ? 1 : 0) +
    (filters.tags.length > 0 ? 1 : 0);

  return (
    <div className="error-search-bar">
      <input
        type="text"
        className="error-search-bar__input"
        placeholder="Search by error message..."
        value={filters.searchText}
        onChange={handleSearchChange}
      />

      <select
        className="error-search-bar__select"
        value={filters.environment}
        onChange={handleEnvironmentChange}
      >
        <option value="all">All Environments</option>
        <option value="development">Development</option>
        <option value="staging">Staging</option>
        <option value="production">Production</option>
      </select>

      <select
        className="error-search-bar__select"
        value={filters.level}
        onChange={handleLevelChange}
      >
        <option value="all">All Levels</option>
        <option value="debug">Debug</option>
        <option value="info">Info</option>
        <option value="warning">Warning</option>
        <option value="error">Error</option>
        <option value="fatal">Fatal</option>
      </select>

      <input
        type="text"
        className="error-search-bar__input"
        placeholder="Filter by tags (comma-separated)"
        value={filters.tags.join(', ')}
        onChange={handleTagsChange}
        style={{ minWidth: '200px', maxWidth: '250px' }}
      />

      <button
        className="error-search-bar__button"
        onClick={onClear}
        disabled={activeFiltersCount === 0}
      >
        Clear Filters {activeFiltersCount > 0 && `(${activeFiltersCount})`}
      </button>
    </div>
  );
}
