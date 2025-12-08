import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useApp } from '@/context/AppContext';
import {
  Users,
  AppWindow,
  FileText,
  ListTodo,
  Inbox,
  Send,
  ChevronRight,
} from 'lucide-react';

// Tabs that require an application to be selected
const appRequiredTabs = [
  { name: 'Templates', path: '/templates', icon: FileText },
  { name: 'Tasks', path: '/tasks', icon: ListTodo },
  { name: 'OutBox', path: '/outbox', icon: Inbox },
  { name: 'Sent', path: '/sent', icon: Send },
];

// Global tabs (no app required)
const globalTabs = [
  { name: 'Applications', path: '/applications', icon: AppWindow },
  { name: 'Profiles', path: '/profiles', icon: Users },
];

export default function Layout() {
  const { selectedApp } = useApp();
  const location = useLocation();
  const isOnAppPage = location.pathname === '/applications';

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-4 flex items-center justify-between">
            <div>
              <h1 className="text-xl font-semibold text-gray-900">
                FX Notification Admin
              </h1>
              <p className="text-sm text-gray-500">
                Manage email templates and notification tasks
              </p>
            </div>

            {/* Selected Application Indicator */}
            {selectedApp && (
              <div className="flex items-center gap-2 bg-blue-50 text-blue-700 px-4 py-2 rounded-lg">
                <AppWindow className="h-4 w-4" />
                <span className="text-sm font-medium">
                  Working with: <span className="font-bold">{selectedApp.App_Code}</span>
                </span>
              </div>
            )}
          </div>

          {/* Tab Navigation */}
          <nav className="-mb-px flex space-x-8" aria-label="Tabs">
            {/* Global tabs */}
            {globalTabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <NavLink
                  key={tab.name}
                  to={tab.path}
                  className={({ isActive }) =>
                    cn(
                      'flex items-center gap-2 py-3 px-1 border-b-2 font-medium text-sm transition-colors',
                      isActive
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    )
                  }
                >
                  <Icon className="h-4 w-4" />
                  {tab.name}
                </NavLink>
              );
            })}

            {/* Separator */}
            {selectedApp && (
              <div className="flex items-center text-gray-300">
                <ChevronRight className="h-4 w-4" />
              </div>
            )}

            {/* App-specific tabs (only shown when app is selected) */}
            {appRequiredTabs.map((tab) => {
              const Icon = tab.icon;
              const isDisabled = !selectedApp;

              if (isDisabled) {
                return (
                  <span
                    key={tab.name}
                    className="flex items-center gap-2 py-3 px-1 border-b-2 border-transparent font-medium text-sm text-gray-300 cursor-not-allowed"
                    title="Select an application first"
                  >
                    <Icon className="h-4 w-4" />
                    {tab.name}
                  </span>
                );
              }

              return (
                <NavLink
                  key={tab.name}
                  to={tab.path}
                  className={({ isActive }) =>
                    cn(
                      'flex items-center gap-2 py-3 px-1 border-b-2 font-medium text-sm transition-colors',
                      isActive
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    )
                  }
                >
                  <Icon className="h-4 w-4" />
                  {tab.name}
                </NavLink>
              );
            })}
          </nav>
        </div>
      </header>

      {/* Prompt to select application */}
      {!selectedApp && !isOnAppPage && location.pathname !== '/profiles' && (
        <div className="bg-yellow-50 border-b border-yellow-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
            <p className="text-sm text-yellow-800">
              Please select an application from the{' '}
              <NavLink to="/applications" className="font-medium underline">
                Applications
              </NavLink>{' '}
              page to manage templates, tasks, and messages.
            </p>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Outlet />
      </main>
    </div>
  );
}
