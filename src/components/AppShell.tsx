'use client';

import React from 'react';
import { useAppStore } from '@/lib/store';
import { appSpec } from '@/lib/spec';

interface AppShellProps {
  children: React.ReactNode;
  screenId?: string;
  showTopBar?: boolean;
  showNavTabs?: boolean;
  showPageHeader?: boolean;
  showFilterRow?: boolean;
  pageTitle?: string;
  pageActions?: React.ReactNode;
  filterContent?: React.ReactNode;
}

export default function AppShell({
  children,
  screenId,
  showTopBar = true,
  showNavTabs = true,
  showPageHeader = false,
  showFilterRow = false,
  pageTitle,
  pageActions,
  filterContent,
}: AppShellProps) {
  const store = useAppStore();
  const isAuthed = store.state.authed;
  const role = store.state.role;

  // Hide shell on login/register screens
  const hideShell = !isAuthed || screenId === 'login' || screenId === 'register';

  if (hideShell) {
    return <>{children}</>;
  }

  return (
    <div className="app-shell">
      {/* Top Bar */}
      {showTopBar && (
        <header className="app-topbar">
          <div className="app-topbar-content">
            <div className="app-logo">SOSG</div>
            <div className="app-topbar-actions">
              <button className="icon-button">⚡</button>
              <button className="icon-button">⋮</button>
            </div>
          </div>
        </header>
      )}

      {/* Navigation Tabs */}
      {showNavTabs && (
        <nav className="app-nav-tabs">
          <div className="app-nav-tabs-content">
            {appSpec.routes.tabs.map((tab: any) => (
              <button
                key={tab.id}
                className={`app-nav-tab ${screenId === tab.route ? 'active' : ''}`}
                onClick={() => {
                  window.location.href = `/${tab.route}`;
                }}
              >
                <span className="app-nav-icon">{tab.icon}</span>
                <span className="app-nav-label">{tab.label}</span>
              </button>
            ))}
          </div>
        </nav>
      )}

      {/* Main Content Area */}
      <main className="app-content-wrapper">
        {/* Page Header (optional) */}
        {showPageHeader && pageTitle && (
          <header className="app-page-header">
            <div className="app-page-header-content">
              <h1 className="app-page-title">{pageTitle}</h1>
              {pageActions && <div className="app-page-actions">{pageActions}</div>}
            </div>
          </header>
        )}

        {/* Filter Row (optional) */}
        {showFilterRow && filterContent && (
          <div className="app-filter-row">
            <div className="app-filter-content">{filterContent}</div>
          </div>
        )}

        {/* Route Content */}
        <section className="app-content">{children}</section>
      </main>

      {/* Bottom Nav Spacer (for sticky nav) */}
      <div className="app-nav-spacer" />
    </div>
  );
}
