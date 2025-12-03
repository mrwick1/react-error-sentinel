import { useState, useMemo } from 'react';
import { ErrorEvent } from '../../types';
import { Filters, UseErrorFiltersReturn } from '../types';

export function useErrorFilters(
  errors: ErrorEvent[],
  maxItems: number = 20
): UseErrorFiltersReturn {
  const [filters, setFilters] = useState<Filters>({
    searchText: '',
    environment: 'all',
    level: 'all',
    tags: [],
  });

  const filteredErrors = useMemo(() => {
    let filtered = [...errors];

    // Filter by search text (error message)
    if (filters.searchText) {
      const searchLower = filters.searchText.toLowerCase();
      filtered = filtered.filter((error) =>
        error.error.message.toLowerCase().includes(searchLower)
      );
    }

    // Filter by environment
    if (filters.environment !== 'all') {
      filtered = filtered.filter(
        (error) => error.environment === filters.environment
      );
    }

    // Filter by level
    if (filters.level !== 'all') {
      filtered = filtered.filter((error) => error.level === filters.level);
    }

    // Filter by tags (OR logic - error must have at least one of the specified tags)
    if (filters.tags.length > 0) {
      filtered = filtered.filter((error) => {
        if (!error.tags || error.tags.length === 0) {
          return false;
        }
        return filters.tags.some((filterTag) =>
          error.tags?.includes(filterTag)
        );
      });
    }

    // Limit to maxItems
    return filtered.slice(0, maxItems);
  }, [errors, filters, maxItems]);

  const clearFilters = () => {
    setFilters({
      searchText: '',
      environment: 'all',
      level: 'all',
      tags: [],
    });
  };

  return {
    filters,
    setFilters,
    filteredErrors,
    clearFilters,
  };
}
