import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { LanguageProvider } from './i18n/LanguageContext';
import { ThemeProvider, applyTheme, readStoredTheme } from './theme/ThemeContext';
import { BooksProvider } from './books/BooksContext';
import { App } from './App';
import './styles/global.css';

// Apply the saved theme before the first paint so there's no flash of the wrong
// theme on reload. ('system' just leaves the media query in charge.)
applyTheme(readStoredTheme());

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider>
      <LanguageProvider>
        <BooksProvider>
          <BrowserRouter>
            <App />
          </BrowserRouter>
        </BooksProvider>
      </LanguageProvider>
    </ThemeProvider>
  </StrictMode>,
);
