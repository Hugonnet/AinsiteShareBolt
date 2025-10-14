import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import App from './App';
import { AdminPage } from './pages/AdminPage';
import { LoginForm } from './components/LoginForm';
import { Settings, Home, LogOut } from 'lucide-react';

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

export function Router() {
  const [currentPage, setCurrentPage] = useState<'form' | 'admin'>('form');
  const [scrolled, setScrolled] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };

    const handleNavigateToAdmin = () => {
      setCurrentPage('admin');
    };

    window.addEventListener('scroll', handleScroll);
    window.addEventListener('navigate-to-admin', handleNavigateToAdmin);
    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('navigate-to-admin', handleNavigateToAdmin);
    };
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setIsAuthenticated(!!session);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsAuthenticated(!!session);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleLogin = async (email: string, password: string) => {
    setLoginError(null);
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setLoginError('Identifiants incorrects');
      throw error;
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setCurrentPage('form');
  };

  return (
    <div>
      <header
        className="fixed top-0 left-0 right-0 z-50 bg-black/90 backdrop-blur-md border-b border-gray-800"
      >
        <div className="max-w-7xl mx-auto px-6 py-5 flex items-center justify-center">
          <button
            onClick={() => setCurrentPage('form')}
            className="text-5xl font-bold hover:opacity-80 transition-opacity"
          >
            <span className="text-red-500">@</span>
            <span className="text-gray-400">insite</span>
            <span className="text-red-500">.Share</span>
          </button>

          <nav className="hidden">
            {currentPage === 'form' ? (
              <button
                onClick={() => setCurrentPage('admin')}
                className="px-4 py-2 bg-zinc-900/80 hover:bg-zinc-800 rounded-lg border border-gray-800 text-white flex items-center gap-2 transition-colors"
              >
                <Settings className="w-4 h-4" />
                Admin
              </button>
            ) : (
              <>
                <button
                  onClick={() => setCurrentPage('form')}
                  className="px-4 py-2 bg-zinc-900/80 hover:bg-zinc-800 rounded-lg border border-gray-800 text-white flex items-center gap-2 transition-colors"
                >
                  <Home className="w-4 h-4" />
                  Formulaire
                </button>
                {isAuthenticated && (
                  <button
                    onClick={handleLogout}
                    className="px-4 py-2 bg-red-600/80 hover:bg-red-700 rounded-lg border border-red-800 text-white flex items-center gap-2 transition-colors"
                  >
                    <LogOut className="w-4 h-4" />
                    Déconnexion
                  </button>
                )}
              </>
            )}
          </nav>
        </div>
      </header>

      <div className={currentPage === 'admin' && !isAuthenticated ? '' : 'pt-20'}>
        {currentPage === 'form' && <App />}
        {currentPage === 'admin' && (
          isAuthenticated ? <AdminPage /> : <LoginForm onLogin={handleLogin} error={loginError} />
        )}
      </div>
    </div>
  );
}
