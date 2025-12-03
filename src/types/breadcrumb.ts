export type BreadcrumbType = 'navigation' | 'click' | 'api' | 'state' | 'console' | 'manual';
export type BreadcrumbLevel = 'debug' | 'info' | 'warning' | 'error';

export interface Breadcrumb {
  timestamp: number;
  type: BreadcrumbType;
  category: string;
  message: string;
  level: BreadcrumbLevel;
  data?: Record<string, unknown>;
}
