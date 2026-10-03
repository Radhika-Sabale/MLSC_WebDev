import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Canteen } from './pages/Canteen';

export default function App() {
  return (
    <BrowserRouter>
      <div className="app-viewport">
        <Routes>
          <Route path="/c/:slug" element={<Canteen />} />
          {/* Temporary placeholder route: redirects to /c/main-canteen until Stage 4 introduces the Home directory */}
          <Route path="*" element={<Navigate to="/c/main-canteen" replace />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}
