import { Breadcrumb } from './breadcrumb';
import { Environment, SeverityLevel } from './config';

export interface ErrorInfo {
  message: string;
  type: string;
  stack_trace?: string;
  handled: boolean;
}

export interface UserInfo {
  id?: string;
  email?: string;
  username?: string;
  [key: string]: unknown;
}

export interface BrowserInfo {
  name: string;
  version: string;
  user_agent: string;
}

export interface OSInfo {
  name: string;
  version: string;
}

export interface DeviceInfo {
  screen_width: number;
  screen_height: number;
}

export interface AppInfo {
  app_name?: string;
  app_version?: string;
}

export interface ContextInfo {
  app?: AppInfo;
  browser?: BrowserInfo;
  os?: OSInfo;
  device?: DeviceInfo;
}

export interface RequestInfo {
  url: string;
  method?: string;
  query_string?: string;
  headers?: Record<string, string>;
}

export interface ErrorEvent {
  event_id: string;
  timestamp: number;
  environment: Environment;
  level: SeverityLevel;
  platform: string;
  error: ErrorInfo;
  context?: ContextInfo;
  user?: UserInfo;
  request?: RequestInfo;
  request_url?: string; // Top-level request URL field
  state?: Record<string, unknown>;
  breadcrumbs?: Breadcrumb[];
  tags?: string[]; // Array of tag strings
  extra?: Record<string, unknown>;
}

export interface ErrorContext {
  tags?: Record<string, string>;
  extra?: Record<string, unknown>;
  user?: UserInfo;
  level?: SeverityLevel;
}

export interface TransportResponse {
  success: boolean;
  eventIds?: string[];
  error?: string;
}

export interface Plugin {
  name: string;
  getState?: () => Record<string, unknown>;
  middleware?: (...args: unknown[]) => unknown;
}
