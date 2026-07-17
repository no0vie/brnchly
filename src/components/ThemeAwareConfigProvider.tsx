import React from 'react';
import { ConfigProvider, theme as antdTheme } from 'antd';
import { useTheme } from '../contexts/theme';

const ThemeAwareConfigProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { theme } = useTheme();

  return (
    <ConfigProvider
      theme={{
        algorithm: theme === 'dark' ? antdTheme.darkAlgorithm : antdTheme.defaultAlgorithm,
        token: {
          colorPrimary: '#1890ff',
          borderRadius: 8,
        },
      }}
    >
      {children}
    </ConfigProvider>
  );
};

export default ThemeAwareConfigProvider;
