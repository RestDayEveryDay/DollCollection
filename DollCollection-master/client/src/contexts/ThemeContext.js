import React, { createContext, useContext, useState, useEffect } from 'react';

// 创建主题Context
const ThemeContext = createContext();

// 主题Provider组件
export const ThemeProvider = ({ children }) => {
  // 从localStorage读取主题偏好，默认为light
  const [theme, setTheme] = useState(() => {
    const savedTheme = localStorage.getItem('theme');
    // 如果没有保存的主题，检查系统偏好
    if (!savedTheme) {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      return prefersDark ? 'dark' : 'light';
    }
    return savedTheme;
  });

  // 切换主题
  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
  };

  // 监听主题变化，更新document属性
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    
    // 更新meta标签颜色
    const metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (metaThemeColor) {
      metaThemeColor.content = theme === 'dark' ? '#0d1117' : '#f5f7fa';
    }
  }, [theme]);

  // 监听系统主题变化
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e) => {
      // 只有在用户没有手动设置主题时才跟随系统
      if (!localStorage.getItem('theme')) {
        setTheme(e.matches ? 'dark' : 'light');
      }
    };
    
    mediaQuery.addListener(handleChange);
    return () => mediaQuery.removeListener(handleChange);
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

// 自定义Hook使用主题
export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};