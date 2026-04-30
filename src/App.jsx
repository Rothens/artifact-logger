import { useState, useSyncExternalStore } from 'react';
import { Routes, Route, Link } from 'react-router-dom';
import HomePage from './pages/HomePage';
import ScanPage from './pages/ScanPage';
import NewCodePage from './pages/NewCodePage';
import ItemPage from './pages/ItemPage';
import CodePage from './pages/CodePage';
import SettingsPage from './pages/SettingsPage';
import HelpModal from './components/HelpModal';
import { useI18n } from './i18n/I18nProvider';

function useOnlineStatus() {
  return useSyncExternalStore(
    (cb) => {
      window.addEventListener('online', cb);
      window.addEventListener('offline', cb);
      return () => {
        window.removeEventListener('online', cb);
        window.removeEventListener('offline', cb);
      };
    },
    () => navigator.onLine,
    () => true
  );
}

export default function App() {
  const { t } = useI18n();
  const [helpOpen, setHelpOpen] = useState(false);
  const isOnline = useOnlineStatus();

  return (
    <div className="container py-4">
      <header className="mb-4">
        <div className="d-flex align-items-center justify-content-between mb-2">
          <h1 className="h3 mb-0">{t('appTitle')}</h1>
          <div className="d-flex align-items-center gap-2">
            {!isOnline && (
              <span className="badge bg-warning text-dark">
                <i className="bi bi-wifi-off me-1"></i>{t('offlineIndicator')}
              </span>
            )}
            <button
              className="btn btn-sm btn-outline-secondary"
              onClick={() => setHelpOpen(true)}
              aria-label={t('help')}
            >
              ?
            </button>
          </div>
        </div>
        <nav className="d-flex gap-3">
          <Link to="/">{t('home')}</Link>
          <Link to="/scan">{t('scanEnterCode')}</Link>
          <Link to="/settings">{t('settings')}</Link>
        </nav>
      </header>

      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/scan" element={<ScanPage />} />
        <Route path="/new-code" element={<NewCodePage />} />
        <Route path="/item/:id" element={<ItemPage />} />
        <Route path="/code/:id" element={<CodePage />} />
        <Route path="/settings" element={<SettingsPage />} />
      </Routes>

      <HelpModal show={helpOpen} onClose={() => setHelpOpen(false)} />
    </div>
  );
}
