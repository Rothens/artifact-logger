import { useEffect, useState } from 'react';
import {
  getStorageInfo,
  requestPersistentStorage,
  formatBytes,
} from '../utils/storageInfo';
import { useI18n } from '../i18n/I18nProvider';
import { useTheme } from '../theme/ThemeProvider';
import { deleteAllData } from '../db/db';

export default function SettingsPage() {
  const [storageInfo, setStorageInfo] = useState(null);
  const [message, setMessage] = useState('');
  const { language, setLanguage, t } = useI18n();
  const { theme, setTheme } = useTheme();

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
    setTimeout(() => setMessage(''), 2000);
  }

  async function handleDeleteAllData() {
    const confirmed = window.confirm(t('confirmDeleteAllData'));
    if (!confirmed) return;

    await deleteAllData();
    setMessage(t('allDataDeleted'));
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

      <div className="card shadow-sm mt-3 border-danger">
        <div className="card-body">
          <h3 className="h6 text-danger mb-3">{t('dangerZone')}</h3>
          <p className="small text-muted mb-3">
            {t('deleteAllDataDescription')}
          </p>
          <button
            className="btn btn-danger"
            onClick={handleDeleteAllData}
          >
            {t('deleteAllData')}
          </button>
        </div>
      </div>
    </div>
  );
}