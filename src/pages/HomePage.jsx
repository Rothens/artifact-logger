import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { getAllItemRecords, getCodeDefinitionById } from '../db/db';
import { exportAllData } from '../utils/exportData';
import { syncToMuseum } from '../utils/museumSync';
import { getSyncSettings } from '../utils/syncSettings';
import { useI18n } from '../i18n/I18nProvider';

const ALL_CATEGORIES = ['sand', 'snack', 'drink', 'souvenir', 'gift', 'ticket', 'storage', 'other'];

export default function HomePage() {
    const [items, setItems] = useState([]);
    const [error, setError] = useState('');
    const [search, setSearch] = useState('');
    const [categoryFilter, setCategoryFilter] = useState('');
    const [syncStatus, setSyncStatus] = useState(null); // null | { phase, done, total } | { done: true, result } | { error }
    const location = useLocation();
    const { t } = useI18n();

    const syncConfigured = Boolean(getSyncSettings().baseUrl && getSyncSettings().token);

    useEffect(() => {
        async function load() {
            try {
                const allItems = await getAllItemRecords();
                allItems.sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || ''));
                const enriched = await Promise.all(
                    allItems.map(async (item) => {
                        const codeDefinition = await getCodeDefinitionById(item.codeDefinitionId);
                        return { ...item, codeDefinition };
                    })
                );
                setItems(enriched);
            } catch {
                setError(t('loadError'));
            }
        }
        load();
    }, [location.key]);

    function translateMode(mode) {
        if (mode === 'unique_object') return t('uniqueObjectMode');
        if (mode === 'repeatable_product') return t('repeatableProductMode');
        return mode || 'unknown';
    }

    async function handleExport(includePhotos) {
        try {
            await exportAllData({ includePhotos });
        } catch {
            setError(t('dbError'));
        }
    }

    async function handleSync() {
        setSyncStatus({ phase: 'push' });
        try {
            const result = await syncToMuseum(({ phase, done, total }) => {
                setSyncStatus({ phase, done, total });
            });
            setSyncStatus({ phase: 'done', result });
        } catch (err) {
            setSyncStatus({ phase: 'error', error: err.message });
        }
    }

    const filtered = items.filter((item) => {
        if (categoryFilter && item.codeDefinition?.category !== categoryFilter) return false;
        if (search) {
            const q = search.toLowerCase();
            const name = (item.label || item.codeDefinition?.name || '').toLowerCase();
            if (!name.includes(q)) return false;
        }
        return true;
    });

    return (
        <div>
            <div className="d-flex flex-wrap gap-2 mb-3">
                <Link to="/scan" className="btn btn-primary">
                    {t('scanEnterCode')}
                </Link>
                <button className="btn btn-outline-secondary" onClick={() => handleExport(true)}>
                    <i className="bi bi-download me-1"></i>{t('exportJson')}
                </button>
                <button
                    className="btn btn-outline-secondary"
                    onClick={() => handleExport(false)}
                    title={t('exportJsonSlimHint')}
                >
                    <i className="bi bi-download me-1"></i>{t('exportJsonSlim')}
                </button>
                <button
                    className="btn btn-outline-primary"
                    onClick={syncConfigured ? handleSync : undefined}
                    disabled={syncStatus?.phase === 'push' || syncStatus?.phase === 'photos'}
                    title={syncConfigured ? undefined : t('museumSyncNotConfigured')}
                    style={!syncConfigured ? { opacity: 0.5, cursor: 'not-allowed' } : undefined}
                >
                    <i className="bi bi-cloud-upload me-1"></i>{t('museumSyncNow')}
                </button>
            </div>

            {/* Sync status */}
            {syncStatus && (
                <div className={`alert py-2 mb-3 ${syncStatus.phase === 'error' ? 'alert-danger' : syncStatus.phase === 'done' ? 'alert-success' : 'alert-info'}`}>
                    {syncStatus.phase === 'push' && (
                        <><span className="spinner-border spinner-border-sm me-2"></span>Syncing data…</>
                    )}
                    {syncStatus.phase === 'photos' && (
                        <><span className="spinner-border spinner-border-sm me-2"></span>
                        {t('museumSyncProgress').replace('{{done}}', syncStatus.done).replace('{{total}}', syncStatus.total)}</>
                    )}
                    {syncStatus.phase === 'done' && (() => {
                        const r = syncStatus.result;
                        return t('museumSyncDone')
                            .replace('{{codesNew}}', r.codesNew)
                            .replace('{{itemsNew}}', r.itemsNew)
                            .replace('{{photos}}', r.photosUploaded);
                    })()}
                    {syncStatus.phase === 'error' && (
                        t('museumSyncError').replace('{{error}}', syncStatus.error)
                    )}
                </div>
            )}

            {error && <div className="alert alert-danger py-2 mb-3">{error}</div>}

            {/* Search + filter bar */}
            <div className="d-flex gap-2 mb-3">
                <input
                    type="search"
                    className="form-control"
                    placeholder={t('searchPlaceholder')}
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                />
                <select
                    className="form-select"
                    style={{ maxWidth: 180 }}
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value)}
                >
                    <option value="">{t('filterAll')}</option>
                    {ALL_CATEGORIES.map((cat) => (
                        <option key={cat} value={cat}>{t(cat)}</option>
                    ))}
                </select>
            </div>

            <h2 className="h5 mb-3">
                {t('recentItems')}
                {(search || categoryFilter) && (
                    <span className="badge bg-secondary fw-normal ms-2">{filtered.length} / {items.length}</span>
                )}
            </h2>

            {items.length === 0 ? (
                <div className="alert alert-light border">
                    {t('noItemsYet')}
                </div>
            ) : filtered.length === 0 ? (
                <div className="alert alert-light border">
                    {t('noItemsFiltered')}
                </div>
            ) : (
                <div className="row g-3">
                    {filtered.map((item) => (
                        <div className="col-12 col-md-6" key={item.id}>
                            <div className="card shadow-sm h-100">
                                <div className="card-body">
                                    <div className="d-flex flex-wrap gap-2 mb-2">
                                        <span className="badge text-bg-secondary">
                                            {t(item.codeDefinition?.category || 'other')}
                                        </span>
                                        <span className="badge text-bg-light border">
                                            {translateMode(item.codeDefinition?.mode)}
                                        </span>
                                        {item.collectedAt && (
                                            <span className="badge text-bg-success">
                                                {t('collectedAt')}
                                            </span>
                                        )}
                                        {item.location && (
                                            <span className="badge text-bg-info">
                                                {t('location')}
                                            </span>
                                        )}
                                    </div>

                                    <h3 className="h6 mb-1">
                                        {item.label || item.codeDefinition?.name || t('untitledItem')}
                                    </h3>

                                    <div className="small mb-2">
                                        {t('codeType')}: {item.codeDefinition?.codeType} / {item.codeDefinition?.codeValue}
                                    </div>

                                    {item.collectedAt && (
                                        <div className="small mb-2">
                                            {t('collectedAt')}: {new Date(item.collectedAt).toLocaleString()}
                                        </div>
                                    )}

                                    <Link className="btn btn-sm btn-outline-primary" to={`/item/${item.id}`}>
                                        {t('openItem')}
                                    </Link>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
