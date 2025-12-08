import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Layout from './components/Layout';
import {
  ProfilesPage,
  ApplicationsPage,
  TemplatesPage,
  TasksPage,
  OutboxPage,
  SentPage,
} from './pages';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: 1,
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<Navigate to="/profiles" replace />} />
            <Route path="profiles" element={<ProfilesPage />} />
            <Route path="applications" element={<ApplicationsPage />} />
            <Route path="templates" element={<TemplatesPage />} />
            <Route path="tasks" element={<TasksPage />} />
            <Route path="outbox" element={<OutboxPage />} />
            <Route path="sent" element={<SentPage />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;
