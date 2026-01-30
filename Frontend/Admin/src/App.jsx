import { useState, useEffect, useCallback, createContext, useContext } from 'react';
import { Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Outbox from './pages/Outbox';
import Templates from './pages/Templates';
import Tasks from './pages/Tasks';
import Profiles from './pages/Profiles';
import TemplatePreview from './pages/TemplatePreview';

// Toast context
const ToastContext = createContext();
export const useToast = () => useContext(ToastContext);

// Dark mode context
const DarkModeContext = createContext();
export const useDarkMode = () => useContext(DarkModeContext);

function ToastContainer({ toasts, removeToast }) {
  return (
    <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2 max-w-sm">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`px-4 py-3 rounded-lg shadow-lg text-white text-sm flex items-center gap-2 animate-[slideIn_0.3s_ease-out] ${
            t.type === 'success'
              ? 'bg-green-600'
              : t.type === 'error'
              ? 'bg-red-600'
              : 'bg-indigo-600'
          }`}
        >
          <span className="flex-1">{t.message}</span>
          <button onClick={() => removeToast(t.id)} className="opacity-70 hover:opacity-100">
            ✕
          </button>
        </div>
      ))}
    </div>
  );
}

export default function App() {
  const [toasts, setToasts] = useState([]);
  const [dark, setDark] = useState(() => {
    const saved = localStorage.getItem('fx-notify-dark');
    if (saved !== null) return saved === 'true';
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark);
    localStorage.setItem('fx-notify-dark', dark);
  }, [dark]);

  const addToast = useCallback((message, type = 'info') => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <DarkModeContext.Provider value={{ dark, setDark }}>
      <ToastContext.Provider value={addToast}>
        <ToastContainer toasts={toasts} removeToast={removeToast} />
        <Layout>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/outbox" element={<Outbox />} />
            <Route path="/templates" element={<Templates />} />
            <Route path="/tasks" element={<Tasks />} />
            <Route path="/profiles" element={<Profiles />} />
            <Route path="/preview" element={<TemplatePreview />} />
          </Routes>
        </Layout>
      </ToastContext.Provider>
    </DarkModeContext.Provider>
  );
}
