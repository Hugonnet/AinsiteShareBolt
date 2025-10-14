import { useState, useEffect } from 'react';
import App from './App';
import { AdminPage } from './pages/AdminPage';
import { Settings, Home } from 'lucide-react';

export function Router() {
  const [currentPage, setCurrentPage] = useState<'form' | 'admin'>('form');
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div>
      <header
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          scrolled
            ? 'bg-black/60 backdrop-blur-lg border-b border-gray-800/30'
            : 'bg-transparent'
        }`}
      >
        <div className="max-w-7xl mx-auto px-6 py-5 flex items-center justify-between">
          <button
            onClick={() => setCurrentPage('form')}
            className="text-3xl font-bold hover:opacity-80 transition-opacity"
          >
            <span className="text-gray-400">@insite</span>
            <span className="text-red-500">.net</span>
          </button>

          <nav className="flex items-center gap-4">
            {currentPage === 'form' ? (
              <button
                onClick={() => setCurrentPage('admin')}
                className="px-4 py-2 bg-zinc-900/80 hover:bg-zinc-800 rounded-lg border border-gray-800 text-white flex items-center gap-2 transition-colors"
              >
                <Settings className="w-4 h-4" />
                Admin
              </button>
            ) : (
              <button
                onClick={() => setCurrentPage('form')}
                className="px-4 py-2 bg-zinc-900/80 hover:bg-zinc-800 rounded-lg border border-gray-800 text-white flex items-center gap-2 transition-colors"
              >
                <Home className="w-4 h-4" />
                Formulaire
              </button>
            )}
          </nav>
        </div>
      </header>

      <div className="pt-20">
        {currentPage === 'form' && <App />}
        {currentPage === 'admin' && <AdminPage />}
      </div>
    </div>
  );
}
