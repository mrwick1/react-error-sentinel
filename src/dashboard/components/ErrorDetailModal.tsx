import React, { useState, useEffect } from 'react';
import { ErrorEvent } from '../../types';
import { ErrorBadge } from './ErrorBadge';

interface ErrorDetailModalProps {
  error: ErrorEvent | null;
  onClose: () => void;
}

type TabType = 'overview' | 'stack' | 'breadcrumbs' | 'context' | 'state' | 'extra';

function formatTimestamp(timestamp: number): string {
  const date = new Date(timestamp);
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  }).format(date);
}

export function ErrorDetailModal({ error, onClose }: ErrorDetailModalProps) {
  const [activeTab, setActiveTab] = useState<TabType>('overview');

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    if (error) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
    return undefined;
  }, [error, onClose]);

  if (!error) {
    return null;
  }

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div className="error-modal">
      <div className="error-modal__backdrop" onClick={handleBackdropClick} />
      <div className="error-modal__content">
        <div className="error-modal__header">
          <h2>Error Details</h2>
          <button className="error-modal__close" onClick={onClose}>
            ×
          </button>
        </div>

        <div className="error-modal__tabs">
          <button
            className={`error-modal__tab ${activeTab === 'overview' ? 'error-modal__tab--active' : ''}`}
            onClick={() => setActiveTab('overview')}
          >
            Overview
          </button>
          <button
            className={`error-modal__tab ${activeTab === 'stack' ? 'error-modal__tab--active' : ''}`}
            onClick={() => setActiveTab('stack')}
          >
            Stack Trace
          </button>
          <button
            className={`error-modal__tab ${activeTab === 'breadcrumbs' ? 'error-modal__tab--active' : ''}`}
            onClick={() => setActiveTab('breadcrumbs')}
          >
            Breadcrumbs
          </button>
          <button
            className={`error-modal__tab ${activeTab === 'context' ? 'error-modal__tab--active' : ''}`}
            onClick={() => setActiveTab('context')}
          >
            Context
          </button>
          <button
            className={`error-modal__tab ${activeTab === 'state' ? 'error-modal__tab--active' : ''}`}
            onClick={() => setActiveTab('state')}
          >
            State
          </button>
          <button
            className={`error-modal__tab ${activeTab === 'extra' ? 'error-modal__tab--active' : ''}`}
            onClick={() => setActiveTab('extra')}
          >
            Extra
          </button>
        </div>

        <div className="error-modal__body">
          {activeTab === 'overview' && <OverviewTab error={error} />}
          {activeTab === 'stack' && <StackTraceTab error={error} />}
          {activeTab === 'breadcrumbs' && <BreadcrumbsTab error={error} />}
          {activeTab === 'context' && <ContextTab error={error} />}
          {activeTab === 'state' && <StateTab error={error} />}
          {activeTab === 'extra' && <ExtraTab error={error} />}
        </div>
      </div>
    </div>
  );
}

function OverviewTab({ error }: { error: ErrorEvent }) {
  return (
    <div>
      <div className="error-modal__field">
        <span className="error-modal__label">Event ID</span>
        <div className="error-modal__value">{error.event_id}</div>
      </div>

      <div className="error-modal__field">
        <span className="error-modal__label">Timestamp</span>
        <div className="error-modal__value">{formatTimestamp(error.timestamp)}</div>
      </div>

      <div className="error-modal__field">
        <span className="error-modal__label">Level</span>
        <div className="error-modal__value">
          <ErrorBadge level={error.level} />
        </div>
      </div>

      <div className="error-modal__field">
        <span className="error-modal__label">Environment</span>
        <div className="error-modal__value">{error.environment}</div>
      </div>

      <div className="error-modal__field">
        <span className="error-modal__label">Error Type</span>
        <div className="error-modal__value">{error.error.type}</div>
      </div>

      <div className="error-modal__field">
        <span className="error-modal__label">Error Message</span>
        <div className="error-modal__value">{error.error.message}</div>
      </div>

      {error.request_url && (
        <div className="error-modal__field">
          <span className="error-modal__label">Request URL</span>
          <div className="error-modal__value">{error.request_url}</div>
        </div>
      )}

      {error.user && (
        <>
          <div className="error-modal__field">
            <span className="error-modal__label">User ID</span>
            <div className="error-modal__value">{error.user.id || '-'}</div>
          </div>
          {error.user.email && (
            <div className="error-modal__field">
              <span className="error-modal__label">User Email</span>
              <div className="error-modal__value">{error.user.email}</div>
            </div>
          )}
          {error.user.username && (
            <div className="error-modal__field">
              <span className="error-modal__label">Username</span>
              <div className="error-modal__value">{error.user.username}</div>
            </div>
          )}
        </>
      )}

      {error.tags && error.tags.length > 0 && (
        <div className="error-modal__field">
          <span className="error-modal__label">Tags</span>
          <div className="error-modal__tags">
            {error.tags.map((tag, index) => (
              <span key={index} className="error-modal__tag">
                {tag}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function StackTraceTab({ error }: { error: ErrorEvent }) {
  if (!error.error.stack_trace) {
    return <div>No stack trace available</div>;
  }

  return (
    <div>
      <pre className="error-modal__pre">{error.error.stack_trace}</pre>
    </div>
  );
}

function BreadcrumbsTab({ error }: { error: ErrorEvent }) {
  if (!error.breadcrumbs || error.breadcrumbs.length === 0) {
    return <div>No breadcrumbs captured</div>;
  }

  return (
    <div>
      {error.breadcrumbs.map((breadcrumb, index) => (
        <div key={index} className="error-modal__breadcrumb">
          <div className="error-modal__breadcrumb-header">
            <span className="error-modal__breadcrumb-message">
              [{breadcrumb.type}] {breadcrumb.message}
            </span>
            <span className="error-modal__breadcrumb-time">
              {formatTimestamp(breadcrumb.timestamp)}
            </span>
          </div>
          {breadcrumb.data && (
            <div className="error-modal__breadcrumb-data">
              {JSON.stringify(breadcrumb.data, null, 2)}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function ContextTab({ error }: { error: ErrorEvent }) {
  const { context } = error;

  if (!context) {
    return <div>No context information available</div>;
  }

  return (
    <div>
      {context.browser && (
        <>
          <div className="error-modal__field">
            <span className="error-modal__label">Browser</span>
            <div className="error-modal__value">
              {context.browser.name} {context.browser.version}
            </div>
          </div>
          <div className="error-modal__field">
            <span className="error-modal__label">User Agent</span>
            <div className="error-modal__value">{context.browser.user_agent}</div>
          </div>
        </>
      )}

      {context.os && (
        <div className="error-modal__field">
          <span className="error-modal__label">Operating System</span>
          <div className="error-modal__value">
            {context.os.name} {context.os.version}
          </div>
        </div>
      )}

      {context.device && (
        <div className="error-modal__field">
          <span className="error-modal__label">Screen Resolution</span>
          <div className="error-modal__value">
            {context.device.screen_width} × {context.device.screen_height}
          </div>
        </div>
      )}

      {context.app && (
        <>
          {context.app.app_name && (
            <div className="error-modal__field">
              <span className="error-modal__label">App Name</span>
              <div className="error-modal__value">{context.app.app_name}</div>
            </div>
          )}
          {context.app.app_version && (
            <div className="error-modal__field">
              <span className="error-modal__label">App Version</span>
              <div className="error-modal__value">{context.app.app_version}</div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function StateTab({ error }: { error: ErrorEvent }) {
  if (!error.state || Object.keys(error.state).length === 0) {
    return <div>No state captured</div>;
  }

  return (
    <div>
      <pre className="error-modal__pre">
        {JSON.stringify(error.state, null, 2)}
      </pre>
    </div>
  );
}

function ExtraTab({ error }: { error: ErrorEvent }) {
  if (!error.extra || Object.keys(error.extra).length === 0) {
    return <div>No extra data</div>;
  }

  return (
    <div>
      <pre className="error-modal__pre">
        {JSON.stringify(error.extra, null, 2)}
      </pre>
    </div>
  );
}
