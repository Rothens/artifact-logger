import { Routes, Route, Link } from 'react-router-dom';
import HomePage from './pages/HomePage';
import ScanPage from './pages/ScanPage';
import NewCodePage from './pages/NewCodePage';
import ItemPage from './pages/ItemPage';
import CodePage from './pages/CodePage';
import SettingsPage from './pages/SettingsPage';
import { useI18n } from './i18n/I18nProvider';

export default function App() {
  const { t } = useI18n();
  
  return (
    <div className="container py-4">
      <header className="mb-4">
        <h1 className="h3 mb-2">{t('appTitle')}</h1>
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
    </div>
  );
}