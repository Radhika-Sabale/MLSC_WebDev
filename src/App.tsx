import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { Home } from './pages/Home';
import { Canteen } from './pages/Canteen';
import { NotFound } from './pages/NotFound';
import { ToastProvider } from './components/Toast';
import { SkipLink } from './components/SkipLink';

/**
 * RouteFocusManager ensures keyboard and screen-reader accessibility across SPA transitions:
 * 1. Resets window scroll position to the top of the viewport.
 * 2. Shifts focus directly to the primary <h1> heading for the newly mounted route.
 */
function RouteFocusManager() {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
    const heading = document.querySelector('h1');
    if (heading) {
      heading.focus();
    }
  }, [pathname]);

  return null;
}

export default function App() {
  return (
    <ToastProvider>
      <BrowserRouter>
        <SkipLink />
        <RouteFocusManager />
        <div className="app-viewport">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/c/:slug" element={<Canteen />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </div>
      </BrowserRouter>
    </ToastProvider>
  );
}

