import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from './contexts/AuthContext.jsx';
import { SocketProvider } from './contexts/SocketContext.jsx';
import './index.css';
import App from './App.jsx';
import { AlertProvider } from './contexts/AlertContext';
import { ThemeProvider } from './contexts/ThemeProvider.jsx';

const queryClient = new QueryClient({
  defaultOptions: { mutations: { networkMode: 'always' } },
});

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <ThemeProvider defaultTheme='system' storageKey='hermyx-theme'>
          <AlertProvider>
            <AuthProvider>
              <SocketProvider>
                <App />
              </SocketProvider>
            </AuthProvider>
          </AlertProvider>
        </ThemeProvider>
      </BrowserRouter>
    </QueryClientProvider>
  </StrictMode>,
);
