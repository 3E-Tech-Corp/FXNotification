import { NavLink, Outlet } from 'react-router-dom';
import { cn } from '@/lib/utils';
import {
  Users,
  AppWindow,
  FileText,
  ListTodo,
  Inbox,
  Send,
} from 'lucide-react';

const tabs = [
  { name: 'Profiles', path: '/profiles', icon: Users },
  { name: 'Applications', path: '/applications', icon: AppWindow },
  { name: 'Templates', path: '/templates', icon: FileText },
  { name: 'Tasks', path: '/tasks', icon: ListTodo },
  { name: 'OutBox', path: '/outbox', icon: Inbox },
  { name: 'Sent', path: '/sent', icon: Send },
];

export default function Layout() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-4">
            <h1 className="text-xl font-semibold text-gray-900">
              FX Notification Admin
            </h1>
            <p className="text-sm text-gray-500">
              Manage email templates and notification tasks
            </p>
          </div>

          {/* Tab Navigation */}
          <nav className="-mb-px flex space-x-8" aria-label="Tabs">
            {tabs.map((tab) => {
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
