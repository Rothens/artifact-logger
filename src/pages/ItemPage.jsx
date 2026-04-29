import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
    getItemRecordById,
    saveItemRecord,
    getCodeDefinitionById,
    deleteItemRecord,
} from '../db/db';
import { compressImageFile } from '../utils/imageCompression';
import { formatBytes } from '../utils/storageInfo';
import { useI18n } from '../i18n/I18nProvider';
import ConfirmModal from '../components/ConfirmModal';
import {
    GEO_OPTIONS,
    PHOTO_MAX_WIDTH, PHOTO_MAX_HEIGHT, PHOTO_QUALITY, PHOTO_OUTPUT_TYPE,
    VIBRATE_MS,
    MSG_SHORT, MSG_MEDIUM, MSG_LONG,
} from '../constants';

export default function ItemPage() {
    const navigate = useNavigate();
    const { id } = useParams();

    const [item, setItem] = useState(null);
    const [codeDefinition, setCodeDefinition] = useState(null);
    const [message, setMessage] = useState('');
    const [saving, setSaving] = useState(false);
    const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
    const { t } = useI18n();
    const fileInputRef = useRef(null);
    const cameraInputRef = useRef(null);

    useEffect(() => {
        async function load() {
            try {
                const loadedItem = await getItemRecordById(id);
                setItem(loadedItem);
                if (loadedItem) {
                    const loadedCodeDefinition = await getCodeDefinitionById(loadedItem.codeDefinitionId);
                    setCodeDefinition(loadedCodeDefinition);
                }
            } catch {
                setMessage(t('loadError'));
            }
        }
        load();
    }, [id]);

    if (!item || !codeDefinition) {
        return <div>{t('loading')}</div>;
    }

    function translateMode(mode) {
        if (mode === 'unique_object') return t('uniqueObjectMode');
        if (mode === 'repeatable_product') return t('repeatableProductMode');
        return mode;
    }

    async function handleDeleteItem() {
        try {
            await deleteItemRecord(item.id);
            navigate('/');
        } catch {
            setMessage(t('dbError'));
        }
    }

    async function captureAllNowAndSave() {
        setSaving(true);
        const updatedItem = {
            ...item,
            collectedAt: new Date().toISOString(),
        };

        setItem(updatedItem);

        if (!navigator.geolocation) {
            try {
                await saveItemRecord(updatedItem);
                setMessage(t('timeCapturedAndSavedNoGeo'));
                setTimeout(() => setMessage(''), MSG_MEDIUM);
            } catch {
                setMessage(t('dbError'));
            } finally {
                setSaving(false);
            }
            return;
        }

        navigator.geolocation.getCurrentPosition(
            async (position) => {
                const finalItem = {
                    ...updatedItem,
                    location: {
                        lat: position.coords.latitude,
                        lng: position.coords.longitude,
                        accuracyMeters: position.coords.accuracy,
                    },
                };
                setItem(finalItem);
                try {
                    await saveItemRecord(finalItem);
                    navigator.vibrate?.(VIBRATE_MS);
                    setMessage(t('timeLocationSaveComplete'));
                    setTimeout(() => setMessage(''), MSG_MEDIUM);
                } catch {
                    setMessage(t('dbError'));
                } finally {
                    setSaving(false);
                }
            },
            async (error) => {
                try {
                    await saveItemRecord(updatedItem);
                    setMessage(t('savedWithTimeOnlyLocationFailed').replace('{{error}}', error.message));
                    setTimeout(() => setMessage(''), MSG_LONG);
                } catch {
                    setMessage(t('dbError'));
                } finally {
                    setSaving(false);
                }
            },
            GEO_OPTIONS
        );
    }

    function updateField(field, value) {
        setItem((prev) => ({
            ...prev,
            [field]: value,
        }));
    }

    function updateMetadataField(field, value) {
        setItem((prev) => ({
            ...prev,
            metadata: {
                ...prev.metadata,
                [field]: value,
            },
        }));
    }

    function captureCurrentTime() {
        setItem((prev) => ({
            ...prev,
            collectedAt: new Date().toISOString(),
        }));
        setMessage(t('timeCaptured'));
        setTimeout(() => setMessage(''), MSG_SHORT);
    }

    function captureCurrentLocation() {
        if (!navigator.geolocation) {
            setMessage(t('geolocationNotSupported'));
            return;
        }

        navigator.geolocation.getCurrentPosition(
            (position) => {
                setItem((prev) => ({
                    ...prev,
                    location: {
                        lat: position.coords.latitude,
                        lng: position.coords.longitude,
                        accuracyMeters: position.coords.accuracy,
                    },
                }));
                setMessage(t('locationCaptured'));
                setTimeout(() => setMessage(''), MSG_SHORT);
            },
            (error) => {
                setMessage(t('locationFailed').replace('{{error}}', error.message));
            },
            GEO_OPTIONS
        );
    }

    function captureAllNow() {
        captureCurrentTime();
        captureCurrentLocation();
    }

    async function handlePhotoChange(e) {
        const file = e.target.files?.[0];
        if (!file) return;

        try {
            setMessage(t('compressingPhoto'));

            const compressedPhoto = await compressImageFile(file, {
                maxWidth: PHOTO_MAX_WIDTH,
                maxHeight: PHOTO_MAX_HEIGHT,
                quality: PHOTO_QUALITY,
                outputType: PHOTO_OUTPUT_TYPE,
            });

            setItem((prev) => ({
                ...prev,
                photo: compressedPhoto,
            }));

            setMessage(
                t('photoCompressed')
                    .replace('{{from}}', formatBytes(compressedPhoto.originalSize))
                    .replace('{{to}}', formatBytes(compressedPhoto.compressedSize))
            );
            setTimeout(() => setMessage(''), MSG_LONG);
        } catch (error) {
            console.error(error);
            setMessage(
                t('photoCompressionFailed').replace('{{error}}', error.message)
            );
            setTimeout(() => setMessage(''), MSG_LONG);
        }
    }

    async function handleSave(e) {
        e.preventDefault();
        setSaving(true);
        try {
            await saveItemRecord(item);
            setMessage(t('saved'));
            setTimeout(() => setMessage(''), MSG_SHORT);
        } catch {
            setMessage(t('dbError'));
        } finally {
            setSaving(false);
        }
    }

    return (
        <div>
            <div className="d-flex justify-content-between align-items-start mb-3">
                <div>
                    <h2 className="h5 mb-1">
                        {item.label || codeDefinition.name || t('untitledItem')}
                    </h2>
                    <div className="small text-muted">
                        {t(codeDefinition.category) || codeDefinition.category} · {translateMode(codeDefinition.mode)}
                    </div>
                    <div className="small text-muted">
                        {codeDefinition.codeType} / {codeDefinition.codeValue}
                    </div>
                </div>

                <Link className="btn btn-sm btn-outline-secondary" to={`/code/${codeDefinition.id}`}>
                    {t('editCodeInfo')}
                </Link>
            </div>

            <form onSubmit={handleSave} className="d-flex flex-column gap-3">
                <div>
                    <label className="form-label">{t('itemLabel')}</label>
                    <input
                        className="form-control"
                        value={item.label || ''}
                        onChange={(e) => updateField('label', e.target.value)}
                        placeholder={t('nearToriiPlaceholder')}
                    />
                </div>

                <div>
                    <label className="form-label">{t('itemNotes')}</label>
                    <textarea
                        className="form-control"
                        rows="4"
                        value={item.notes || ''}
                        onChange={(e) => updateField('notes', e.target.value)}
                    />
                </div>

                <div className="d-flex flex-wrap gap-2">
                    <button type="button" className="btn btn-outline-primary" onClick={captureCurrentTime}>
                        {t('captureTime')}
                    </button>
                    <button type="button" className="btn btn-outline-primary" onClick={captureCurrentLocation}>
                        {t('captureLocation')}
                    </button>
                    <button type="button" className="btn btn-outline-success" onClick={captureAllNow}>
                        {t('captureAllNow')}
                    </button>
                    <button
                        type="button"
                        className="btn btn-warning"
                        onClick={captureAllNowAndSave}
                        disabled={saving}
                    >
                        {saving ? <span className="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true"></span> : null}
                        {t('captureAllNowAndSave')}
                    </button>
                </div>

                <div>
                    <label className="form-label">{t('collectedAt')}</label>
                    <input
                        className="form-control"
                        value={item.collectedAt || ''}
                        readOnly
                    />
                </div>

                <div>
                    <label className="form-label">{t('location')}</label>
                    <div className="form-control">
                        {item.location
                            ? `${item.location.lat}, ${item.location.lng} (±${Math.round(item.location.accuracyMeters || 0)}m)`
                            : t('noLocationCaptured')}
                    </div>

                    {item.location && (
                        <a
                            className="d-inline-block mt-2"
                            href={`https://www.google.com/maps?q=${item.location.lat},${item.location.lng}`}
                            target="_blank"
                            rel="noreferrer"
                        >
                            {t('openInMap')}
                        </a>
                    )}
                </div>

                <div>
                    <label className="form-label">{t('photo')}</label>
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handlePhotoChange}
                        style={{ display: 'none' }}
                    />
                    <input
                        ref={cameraInputRef}
                        type="file"
                        accept="image/*"
                        capture="environment"
                        onChange={handlePhotoChange}
                        style={{ display: 'none' }}
                    />
                    <div className="d-flex gap-2">
                        <button
                            type="button"
                            className="btn btn-sm btn-outline-secondary"
                            onClick={() => fileInputRef.current?.click()}
                        >
                            {t('chooseFile')}
                        </button>
                        <button
                            type="button"
                            className="btn btn-sm btn-outline-secondary"
                            onClick={() => cameraInputRef.current?.click()}
                        >
                            {t('takePhoto')}
                        </button>
                    </div>
                    {item.photo?.dataUrl && (
                        <div className="mt-2">
                            <img
                                src={item.photo.dataUrl}
                                alt={t('photo')}
                                className="img-fluid rounded"
                                style={{ maxHeight: '240px' }}
                            />
                            <div className="small text-muted mt-1">
                                {item.photo.width}×{item.photo.height}
                                {item.photo.compressedSize
                                    ? ` · ${formatBytes(item.photo.compressedSize)}`
                                    : ''}
                            </div>
                        </div>
                    )}
                    {item.photo?.dataUrl && (
                        <button
                            type="button"
                            className="btn btn-sm btn-outline-danger mt-2"
                            onClick={() => {
                                setItem((prev) => ({
                                    ...prev,
                                    photo: null,
                                }));
                            }}
                        >
                            {t('removePhoto')}
                        </button>
                    )}
                </div>

                <hr />

                <h3 className="h6 mb-0">{t('metadata')}</h3>

                <div>
                    <label className="form-label">{t('shopSource')}</label>
                    <input
                        className="form-control"
                        value={item.metadata?.sourceShop || ''}
                        onChange={(e) => updateMetadataField('sourceShop', e.target.value)}
                    />
                </div>

                <div className="row g-3">
                    <div className="col-6">
                        <label className="form-label">{t('price')}</label>
                        <input
                            className="form-control"
                            type="number"
                            value={item.metadata?.price || ''}
                            onChange={(e) => updateMetadataField('price', e.target.value)}
                        />
                    </div>

                    <div className="col-6">
                        <label className="form-label">{t('currency')}</label>
                        <input
                            className="form-control"
                            value={item.metadata?.currency || 'JPY'}
                            onChange={(e) => updateMetadataField('currency', e.target.value)}
                        />
                    </div>
                </div>

                <div>
                    <label className="form-label">{t('recipient')}</label>
                    <input
                        className="form-control"
                        value={item.metadata?.recipient || ''}
                        onChange={(e) => updateMetadataField('recipient', e.target.value)}
                    />
                </div>

                <div className="form-check">
                    <input
                        id="consumedCheck"
                        className="form-check-input"
                        type="checkbox"
                        checked={!!item.metadata?.consumed}
                        onChange={(e) => updateMetadataField('consumed', e.target.checked)}
                    />
                    <label htmlFor="consumedCheck" className="form-check-label">
                        {t('consumed')}
                    </label>
                </div>

                <div className="form-check">
                    <input
                        id="giftedCheck"
                        className="form-check-input"
                        type="checkbox"
                        checked={!!item.metadata?.gifted}
                        onChange={(e) => updateMetadataField('gifted', e.target.checked)}
                    />
                    <label htmlFor="giftedCheck" className="form-check-label">
                        {t('gifted')}
                    </label>
                </div>

                <button type="submit" className="btn btn-success" disabled={saving}>
                    {saving ? <span className="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true"></span> : null}
                    {t('saveItem')}
                </button>

                <button type="button" className="btn btn-outline-danger" onClick={() => setConfirmDeleteOpen(true)}>{t('deleteItem')}</button>

                {message && <div className="alert alert-info py-2">{message}</div>}
            </form>

            <ConfirmModal
                open={confirmDeleteOpen}
                message={t('confirmDeleteItem')}
                onConfirm={handleDeleteItem}
                onCancel={() => setConfirmDeleteOpen(false)}
            />
        </div>
    );
}