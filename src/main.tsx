import React from 'react';
import ReactDOM from 'react-dom/client';
import { ConfigProvider, theme } from 'antd';
import App from './App';
import './App.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ConfigProvider
      theme={{
        algorithm: theme.darkAlgorithm,
        token: {
          colorPrimary: '#1890ff',
          borderRadius: 8,
          colorBgContainer: 'rgba(255, 255, 255, 0.05)',
        },
        components: {
          Card: {
            colorBgContainer: 'rgba(255, 255, 255, 0.03)',
          },
        },
      }}
    >
      <App />
    </ConfigProvider>
  </React.StrictMode>
);
