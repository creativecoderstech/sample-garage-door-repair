import { createRoot } from 'react-dom/client';

import App from './App';
import './index.css';

// Clear legacy theme-switcher prefs so Forest & Copper CSS tokens always win.
if (typeof window !== 'undefined') {
  localStorage.removeItem('theme-id');
  localStorage.removeItem('theme-mode');
  localStorage.removeItem('theme-migrated-forest');
  document.documentElement.removeAttribute('data-theme');
  document.documentElement.classList.remove('dark');
  document.documentElement.setAttribute('data-theme', 'forest-copper');
}

createRoot(document.getElementById('root')!).render(<App />);
