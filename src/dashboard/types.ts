import { AuthStrategy, Environment, SeverityLevel } from '../types/config';
import { ErrorEvent } from '../types';

export interface ErrorDashboardProps {
  apiEndpoint: string;
  authStrategy?: AuthStrategy;
  authToken?: string;
  refreshInterval?: number; // Auto-refresh in ms (0 = disabled)
  maxItems?: number; // Default: 20
}

export interface Filters {
  searchText: string;
  environment: Environment | 'all';
  level: SeverityLevel | 'all';
  tags: string[];
}

export interface UseErrorDataReturn {
  errors: ErrorEvent[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export interface UseErrorFiltersReturn {
  filters: Filters;
  setFilters: React.Dispatch<React.SetStateAction<Filters>>;
  filteredErrors: ErrorEvent[];
  clearFilters: () => void;
}
