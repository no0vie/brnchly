import React from 'react';
import ReactDOM from 'react-dom/client';
import { ThemeProvider } from './contexts/theme';
import ThemeAwareConfigProvider from './components/ThemeAwareConfigProvider';
import App from './App';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ThemeProvider>
      <ThemeAwareConfigProvider>
        <App />
      </ThemeAwareConfigProvider>
    </ThemeProvider>
  </React.StrictMode>,
);
