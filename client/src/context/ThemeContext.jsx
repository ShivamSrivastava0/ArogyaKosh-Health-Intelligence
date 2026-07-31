import React, { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext(null);

export const ThemeProvider = ({ children }) => {
  const [theme, setTheme] = useState('light'); // Only 'light' for now

  useEffect(() => {
    // In Phase 2 or later, we can check system preference or localStorage
    document.documentElement.classList.remove('dark');
  }, [theme]);

  const toggleTheme = () => {
    // Scaffold for future
    console.log('Dark mode not enabled yet');
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
