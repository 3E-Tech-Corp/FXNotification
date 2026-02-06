import { NavLink, Outlet, useNavigate } from 'react-router-dom';
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
  X,
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
  const { selectedApp, setSelectedApp } = useApp();
  const navigate = useNavigate();

  const handleClearApp = () => {
    setSelectedApp(null);
    navigate('/applications');
  };

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
            {selectedApp ? (
              <div className="flex items-center gap-2 bg-blue-50 text-blue-700 px-4 py-2 rounded-lg">
                <AppWindow className="h-4 w-4" />
                <span className="text-sm font-medium">
                  Working with: <span className="font-bold">{selectedApp.App_Code}</span>
                </span>
                <button
                  onClick={handleClearApp}
                  className="ml-2 p-1 hover:bg-blue-100 rounded transition-colors"
                  title="Switch to All Applications"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2 bg-gray-100 text-gray-600 px-4 py-2 rounded-lg">
                <AppWindow className="h-4 w-4" />
                <span className="text-sm font-medium">All Applications</span>
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
            <div className="flex items-center text-gray-300">
              <ChevronRight className="h-4 w-4" />
            </div>

            {/* App-specific tabs (always enabled) */}
            {appRequiredTabs.map((tab) => {
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
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Outlet />
      </main>
    </div>
  );
}
