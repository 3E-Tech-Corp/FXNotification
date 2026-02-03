import { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { useDarkMode } from '../App';
import {
  LayoutDashboard,
  Mail,
  FileText,
  ListChecks,
  Server,
  Eye,
  Key,
  Sun,
  Moon,
  Settings,
  X,
  Menu,
} from 'lucide-react';
import { getHealth } from '../services/api';

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/outbox', icon: Mail, label: 'Outbox' },
  { to: '/templates', icon: FileText, label: 'Templates' },
  { to: '/tasks', icon: ListChecks, label: 'Tasks' },
  { to: '/profiles', icon: Server, label: 'Profiles' },
  { to: '/apikeys', icon: Key, label: 'Apps & Keys' },
  { to: '/preview', icon: Eye, label: 'Preview' },
];

function ApiKeyModal({ open, onClose }) {
  const [key, setKey] = useState(localStorage.getItem('fx-notify-api-key') || '');

  if (!open) return null;

  const save = () => {
    localStorage.setItem('fx-notify-api-key', key);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl p-6 w-full max-w-md">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">API Settings</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
            <X size={20} />
          </button>
        </div>
        <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
          API Key
        </label>
        <input
          type="password"
          value={key}
          onChange={(e) => setKey(e.target.value)}
          placeholder="Enter your API key"
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-sm mb-4 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
        <div className="flex gap-2 justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
          >
            Cancel
          </button>
          <button
            onClick={save}
            className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Layout({ children }) {
  const { dark, setDark } = useDarkMode();
  const [connected, setConnected] = useState(null);
  const [showSettings, setShowSettings] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Prompt for API key on first visit
  useEffect(() => {
    if (!localStorage.getItem('fx-notify-api-key')) {
      setShowSettings(true);
    }
  }, []);

  // Health check for connection indicator
  useEffect(() => {
    const check = async () => {
      try {
        await getHealth();
        setConnected(true);
      } catch {
        setConnected(false);
      }
    };
    check();
    const interval = setInterval(check, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex h-screen overflow-hidden">
      <ApiKeyModal open={showSettings} onClose={() => setShowSettings(false)} />

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed lg:static inset-y-0 left-0 z-40 w-60 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 flex flex-col transform transition-transform lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="h-16 flex items-center gap-2 px-5 border-b border-gray-200 dark:border-gray-800 shrink-0">
          <span className="text-xl">📬</span>
          <span className="font-bold text-sm tracking-tight">FX Notification</span>
        </div>
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {navItems.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              onClick={() => setSidebarOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-200'
                }`
              }
              end={to === '/'}
            >
              <Icon size={18} />
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="p-3 border-t border-gray-200 dark:border-gray-800 text-xs text-gray-400 dark:text-gray-600">
          FXNotification Admin v1.0
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="h-16 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between px-4 lg:px-6 shrink-0">
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
          >
            <Menu size={22} />
          </button>
          <h1 className="text-lg font-semibold hidden sm:block">FX Notification Admin</h1>
          <div className="sm:hidden" />
          <div className="flex items-center gap-3">
            {/* Connection status */}
            <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
              <span
                className={`w-2.5 h-2.5 rounded-full ${
                  connected === true
                    ? 'bg-green-500'
                    : connected === false
                    ? 'bg-red-500'
                    : 'bg-gray-400'
                }`}
              />
              {connected === true ? 'Connected' : connected === false ? 'Disconnected' : 'Checking...'}
            </div>
            {/* Dark mode toggle */}
            <button
              onClick={() => setDark(!dark)}
              className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
            >
              {dark ? <Sun size={18} /> : <Moon size={18} />}
            </button>
            {/* Settings */}
            <button
              onClick={() => setShowSettings(true)}
              className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
            >
              <Settings size={18} />
            </button>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto bg-gray-50 dark:bg-gray-950 p-4 lg:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
