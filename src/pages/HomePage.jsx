import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { getAllItemRecords, getCodeDefinitionById } from '../db/db';
import { exportAllData } from '../utils/exportData';
import { useI18n } from '../i18n/I18nProvider';

export default function HomePage() {
    const [items, setItems] = useState([]);
    const location = useLocation();
    const { t } = useI18n();

    useEffect(() => {
        async function load() {
            const allItems = await getAllItemRecords();
            allItems.sort((a, b) => {
                const aTime = a.updatedAt || '';
                const bTime = b.updatedAt || '';
                return bTime.localeCompare(aTime);
            });

            const enriched = await Promise.all(
                allItems.map(async (item) => {
                    const codeDefinition = await getCodeDefinitionById(item.codeDefinitionId);
                    return { ...item, codeDefinition };
                })
            );

            setItems(enriched);
        }

        load();
    }, [location.key]);

    function translateMode(mode) {
        if (mode === 'unique_object') return t('uniqueObjectMode');
        if (mode === 'repeatable_product') return t('repeatableProductMode');
        return mode || 'unknown';
    }

    return (
        <div>
            <div className="d-flex gap-2 mb-3">
                <Link to="/scan" className="btn btn-primary">
                    {t('scanEnterCode')}
                </Link>
                <button className="btn btn-outline-secondary" onClick={exportAllData}>
                    {t('exportJson')}
                </button>
            </div>

            <h2 className="h5 mb-3">{t('recentItems')}</h2>

            {items.length === 0 && (
                <div className="alert alert-light border">
                    {t('noItemsYet')}
                </div>
            )}

            <div className="row g-3">
                {items.map((item) => (
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
        </div>
    );
}