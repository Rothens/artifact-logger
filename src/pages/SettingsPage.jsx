import { useEffect, useState } from 'react';
import {
  getStorageInfo,
  requestPersistentStorage,
  formatBytes,
} from '../utils/storageInfo';
import { useI18n } from '../i18n/I18nProvider';
import { useTheme } from '../theme/ThemeProvider';
import { deleteAllData } from '../db/db';
import ConfirmModal from '../components/ConfirmModal';
import { MSG_MEDIUM } from '../constants';
import { getSyncSettings, saveSyncSettings } from '../utils/syncSettings';

export default function SettingsPage() {
  const [storageInfo, setStorageInfo] = useState(null);
  const [message, setMessage] = useState('');
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const { language, setLanguage, t } = useI18n();
  const { theme, setTheme } = useTheme();

  const [syncBaseUrl, setSyncBaseUrl] = useState('');
  const [syncToken, setSyncToken] = useState('');
  const [syncTestMsg, setSyncTestMsg] = useState('');

  useEffect(() => {
    const s = getSyncSettings();
    setSyncBaseUrl(s.baseUrl);
    setSyncToken(s.token);
  }, []);

  function handleSaveSyncSettings(e) {
    e.preventDefault();
    saveSyncSettings({ baseUrl: syncBaseUrl, token: syncToken });
    setSyncTestMsg(t('museumSave') + ' ✓');
    setTimeout(() => setSyncTestMsg(''), MSG_MEDIUM);
  }

  async function handleTestConnection(e) {
    e.preventDefault();
    saveSyncSettings({ baseUrl: syncBaseUrl, token: syncToken });
    const base = syncBaseUrl.trim().replace(/\/$/, '');
    try {
      const res = await fetch(`${base}/api/sync/status`, {
        headers: { Authorization: `Bearer ${syncToken.trim()}` },
      });
      if (res.ok) {
        setSyncTestMsg(t('museumTestOk'));
      } else {
        const body = await res.json().catch(() => ({}));
        setSyncTestMsg(t('museumTestFail').replace('{{error}}', body.error ?? res.status));
      }
    } catch (err) {
      setSyncTestMsg(t('museumTestFail').replace('{{error}}', err.message));
    }
    setTimeout(() => setSyncTestMsg(''), 4000);
  }

  async function loadStorageInfo() {
    const info = await getStorageInfo();
    setStorageInfo(info);
  }

  useEffect(() => {
    loadStorageInfo();
  }, []);

  async function handleRequestPersistence() {
    const result = await requestPersistentStorage();

    if (!result.supported) {
      setMessage('Persistent storage is not supported on this device/browser.');
    } else if (result.granted) {
      setMessage('Persistent storage granted.');
    } else {
      setMessage('Persistent storage was not granted.');
    }

    await loadStorageInfo();
    setTimeout(() => setMessage(''), MSG_MEDIUM);
  }

  async function handleDeleteAllData() {
    await deleteAllData();
    setMessage(t('allDataDeleted'));
    setConfirmDeleteOpen(false);
  }

  return (
    <div>
      <h2 className="h5 mb-3">{t('settings')}</h2>

      <div className="card shadow-sm mb-3">
        <div className="card-body d-flex flex-column gap-3">
          <div>
            <label className="form-label">{t('language')}</label>
            <select
              className="form-select"
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
            >
              <option value="en">English</option>
              <option value="hu">Magyar</option>
            </select>
          </div>

          <div>
            <label className="form-label">{t('theme')}</label>
            <select
              className="form-select"
              value={theme}
              onChange={(e) => setTheme(e.target.value)}
            >
              <option value="system">{t('system')}</option>
              <option value="light">{t('light')}</option>
              <option value="dark">{t('dark')}</option>
            </select>
          </div>
        </div>
      </div>

      <div className="card shadow-sm">
        <div className="card-body">
          {!storageInfo ? (
            <div>{t('loading')}</div>
          ) : !storageInfo.supported ? (
            <div className="alert alert-warning mb-0">
              Storage estimation is not supported here.
            </div>
          ) : (
            <>
              <div className="mb-2">
                <strong>{t('used')}:</strong> {formatBytes(storageInfo.usage)}
              </div>
              <div className="mb-2">
                <strong>{t('quota')}:</strong> {formatBytes(storageInfo.quota)}
              </div>
              <div className="mb-2">
                <strong>{t('usage')}:</strong>{' '}
                {storageInfo.usagePercent != null
                  ? `${storageInfo.usagePercent}%`
                  : 'Unknown'}
              </div>
              <div className="mb-3">
                <strong>{t('persistentStorage')}:</strong>{' '}
                {storageInfo.persisted == null
                  ? 'Unknown'
                  : storageInfo.persisted
                    ? 'Yes'
                    : 'No'}
              </div>

              <div className="d-flex gap-2">
                <button className="btn btn-outline-primary" onClick={loadStorageInfo}>
                  {t('refresh')}
                </button>

                <button
                  className="btn btn-outline-secondary"
                  onClick={handleRequestPersistence}
                >
                  {t('requestPersistentStorage')}
                </button>
              </div>
            </>
          )}

          {message && <div className="alert alert-info mt-3 mb-0">{message}</div>}
        </div>
      </div>

      {/* Museum Sync settings */}
      <div className="card shadow-sm mt-3">
        <div className="card-body">
          <h3 className="h6 mb-3">{t('museumSync')}</h3>
          <form className="d-flex flex-column gap-3" onSubmit={handleSaveSyncSettings}>
            <div>
              <label className="form-label">{t('museumBaseUrl')}</label>
              <input
                type="url"
                className="form-control"
                placeholder={t('museumBaseUrlPlaceholder')}
                value={syncBaseUrl}
                onChange={(e) => setSyncBaseUrl(e.target.value)}
              />
            </div>
            <div>
              <label className="form-label">{t('museumToken')}</label>
              <input
                type="password"
                className="form-control font-monospace"
                placeholder={t('museumTokenPlaceholder')}
                value={syncToken}
                onChange={(e) => setSyncToken(e.target.value)}
                autoComplete="off"
              />
            </div>
            <div className="d-flex gap-2">
              <button type="submit" className="btn btn-primary">
                {t('museumSave')}
              </button>
              <button type="button" className="btn btn-outline-secondary" onClick={handleTestConnection}>
                {t('museumTest')}
              </button>
            </div>
            {syncTestMsg && <div className="alert alert-info py-2 mb-0">{syncTestMsg}</div>}
          </form>
        </div>
      </div>

      <div className="card mt-3 border-0 shadow-sm overflow-hidden">
        <div className="card-body d-flex align-items-center gap-4 py-4" style={{ background: 'linear-gradient(135deg, #ff5f5f11 0%, #ff914d22 100%)' }}>
          <div className="fs-1 flex-shrink-0" aria-hidden="true">☕</div>
          <div className="flex-grow-1">
            <h5 className="mb-1 fw-bold">{t('supportTitle')}</h5>
            <p className="text-muted small mb-0">{t('supportDesc')}</p>
          </div>
          <a
            href="https://ko-fi.com/Nipponkalandor"
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-sm flex-shrink-0 fw-semibold"
            style={{ background: '#ff5f5f', color: '#fff', whiteSpace: 'nowrap' }}
          >
            {t('supportButton')}
          </a>
        </div>
      </div>

      <div className="card shadow-sm mt-3 border-danger">
        <div className="card-body">
          <h3 className="h6 text-danger mb-3">{t('dangerZone')}</h3>
          <p className="small text-muted mb-3">
            {t('deleteAllDataDescription')}
          </p>
          <button
            className="btn btn-danger"
            onClick={() => setConfirmDeleteOpen(true)}
          >
            {t('deleteAllData')}
          </button>
        </div>
      </div>

      <ConfirmModal
        open={confirmDeleteOpen}
        message={t('confirmDeleteAllData')}
        onConfirm={handleDeleteAllData}
        onCancel={() => setConfirmDeleteOpen(false)}
      />
    </div>
  );
}