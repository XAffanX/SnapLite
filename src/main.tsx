import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import {OverlayWindow} from './pages/OverlayWindow.tsx';
import './index.css';

const isOverlay =
  typeof window !== 'undefined' &&
  (window.location.hash === '#overlay' || window.location.search.includes('overlay'));

createRoot(document.getElementById('root')!).render(
  isOverlay ? <OverlayWindow /> : <App />
);
