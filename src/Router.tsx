import { useState } from 'react';
import App from './App';
import { AdminPage } from './pages/AdminPage';
import { Settings } from 'lucide-react';

export function Router() {
  const [currentPage, setCurrentPage] = useState<'form' | 'admin'>('form');

  return (
    <div>
      {currentPage === 'form' && (
        <>
          <div className="fixed top-6 right-6 z-50">
            <button
              onClick={() => setCurrentPage('admin')}
              className="px-4 py-2 bg-zinc-900 hover:bg-zinc-800 rounded-lg border border-gray-800 text-white flex items-center gap-2 transition-colors"
            >
              <Settings className="w-4 h-4" />
              Admin
            </button>
          </div>
          <App />
        </>
      )}

      {currentPage === 'admin' && (
        <>
          <div className="fixed top-6 right-6 z-50">
            <button
              onClick={() => setCurrentPage('form')}
              className="px-4 py-2 bg-zinc-900 hover:bg-zinc-800 rounded-lg border border-gray-800 text-white transition-colors"
            >
              Retour au formulaire
            </button>
          </div>
          <AdminPage />
        </>
      )}
    </div>
  );
}
