import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    resolveExistingCodeScan,
    createItemRecord,
    createItemRecordWithTimestamp,
} from '../db/db';
import { quickCaptureLocation } from '../utils/quickCapture';
import CameraScanner from '../components/CameraScanner';

export default function ScanPage() {
    const navigate = useNavigate();

    const [codeType, setCodeType] = useState('qr_code');
    const [codeValue, setCodeValue] = useState('');
    const [error, setError] = useState('');
    const [repeatableAction, setRepeatableAction] = useState(null);
    const [mode, setMode] = useState('camera'); // camera | manual
    const [quickCapture, setQuickCapture] = useState(true);
    const [statusMessage, setStatusMessage] = useState('');

    async function handleResolvedScan(resolvedCodeType, resolvedCodeValue) {
        console.log('handleResolvedScan:', resolvedCodeType, resolvedCodeValue);

        setError('');
        setRepeatableAction(null);

        const trimmed = resolvedCodeValue.trim();
        if (!trimmed) {
            setError('Code value is empty.');
            return;
        }

        const result = await resolveExistingCodeScan(resolvedCodeType, trimmed);
        console.log('resolveExistingCodeScan result:', result);

        if (result.kind === 'new_code') {
            navigate(
                `/new-code?codeType=${encodeURIComponent(resolvedCodeType)}&codeValue=${encodeURIComponent(trimmed)}&quickCapture=${quickCapture}`
            );
            return;
        }

        if (result.kind === 'open_unique_item') {
            if (quickCapture) {
                navigator.vibrate?.(50);

                const patched = {
                    ...result.item,
                    collectedAt: new Date().toISOString(),
                };

                // reuse partial updater through direct save route later if you want
                // for now just navigate and let user save manually, or we can make this stricter
                navigate(`/item/${result.item.id}`);
                return;
            }

            navigate(`/item/${result.item.id}`);
            return;
        }

        if (result.kind === 'repeatable_product') {
            if (quickCapture) {
                const item = await createAndQuickCapture(result.codeDefinition.id);
                navigate(`/item/${item.id}`);
                return;
            }

            setRepeatableAction(result);
        }
    }

    async function handleManualSubmit(e) {
        e.preventDefault();
        await handleResolvedScan(codeType, codeValue);
    }

    async function handleCameraDetected(scanResult) {
        console.log('handleCameraDetected:', scanResult);

        setCodeType(scanResult.codeType);
        setCodeValue(scanResult.codeValue);

        await handleResolvedScan(scanResult.codeType, scanResult.codeValue);
    }

    async function handleAddNewInstance() {
        if (!repeatableAction) return;

        const item = quickCapture
            ? await createAndQuickCapture(repeatableAction.codeDefinition.id)
            : await createItemRecord({
                codeDefinitionId: repeatableAction.codeDefinition.id,
            });

        navigate(`/item/${item.id}`);
    }

    function handleOpenLatest() {
        if (!repeatableAction?.latestItem) return;
        navigate(`/item/${repeatableAction.latestItem.id}`);
    }

    function handleEditProduct() {
        if (!repeatableAction?.codeDefinition) return;
        navigate(`/code/${repeatableAction.codeDefinition.id}`);
    }

    async function createAndQuickCapture(codeDefinitionId) {
        const item = await createItemRecordWithTimestamp({
            codeDefinitionId,
        });

        navigator.vibrate?.(50);

        setStatusMessage('Item created. Capturing location...');

        const locationResult = await quickCaptureLocation(item.id);

        if (locationResult.ok) {
            setStatusMessage('Item saved with time and location.');
        } else {
            setStatusMessage(`Item saved with time only. Location failed: ${locationResult.reason}`);
        }

        setTimeout(() => setStatusMessage(''), 2000);

        return item;
    }

    return (
        <div>
            <h2 className="h5 mb-3">Scan / Enter Code</h2>

            <div className="d-flex gap-2 mb-3">
                <button
                    className={`btn ${mode === 'camera' ? 'btn-primary' : 'btn-outline-primary'}`}
                    onClick={() => {
                        setMode('camera');
                        setError('');
                        setRepeatableAction(null);
                    }}
                    type="button"
                >
                    Camera
                </button>

                <button
                    className={`btn ${mode === 'manual' ? 'btn-primary' : 'btn-outline-primary'}`}
                    onClick={() => {
                        setMode('manual');
                        setError('');
                        setRepeatableAction(null);
                    }}
                    type="button"
                >
                    Manual
                </button>
            </div>
            <div className="form-check form-switch mb-3">
                <input
                    id="quickCaptureSwitch"
                    className="form-check-input"
                    type="checkbox"
                    checked={quickCapture}
                    onChange={(e) => setQuickCapture(e.target.checked)}
                />
                <label htmlFor="quickCaptureSwitch" className="form-check-label">
                    Quick capture mode
                </label>
                <div className="form-text">
                    Automatically create items with current time, try to capture location, and move fast.
                </div>
            </div>

            {mode === 'camera' ? (
                <div className="card shadow-sm mb-3">
                    <div className="card-body">
                        <p className="small text-muted">
                            Point the camera at a QR or barcode.
                        </p>
                        <CameraScanner
                            onDetected={handleCameraDetected}
                            onError={(message) => setError(message)}
                        />
                    </div>
                </div>
            ) : (
                <form onSubmit={handleManualSubmit} className="d-flex flex-column gap-3">
                    <div>
                        <label className="form-label">Code Type</label>
                        <select
                            className="form-select"
                            value={codeType}
                            onChange={(e) => setCodeType(e.target.value)}
                        >
                            <option value="qr_code">QR Code</option>
                            <option value="ean_13">EAN-13</option>
                            <option value="upc_a">UPC-A</option>
                            <option value="code_128">Code 128</option>
                            <option value="other">Other</option>
                        </select>
                    </div>

                    <div>
                        <label className="form-label">Code Value</label>
                        <input
                            className="form-control"
                            value={codeValue}
                            onChange={(e) => setCodeValue(e.target.value)}
                            placeholder="Paste or type scanned value"
                        />
                    </div>

                    <button type="submit" className="btn btn-primary">
                        Continue
                    </button>
                </form>
            )}

            {codeValue && (
                <div className="small text-muted mt-3">
                    Last value: {codeType} / {codeValue}
                </div>
            )}

            {error && <div className="alert alert-danger mt-3">{error}</div>}
            {statusMessage && <div className="alert alert-info mt-3">{statusMessage}</div>}

            {repeatableAction && (
                <div className="card shadow-sm mt-4">
                    <div className="card-body">
                        <h3 className="h6">Known repeatable product</h3>
                        <p className="mb-3">
                            {repeatableAction.codeDefinition.name || 'Unnamed product'}
                        </p>

                        <div className="d-flex flex-wrap gap-2">
                            <button className="btn btn-success" onClick={handleAddNewInstance}>
                                Add new instance
                            </button>

                            <button
                                className="btn btn-outline-primary"
                                onClick={handleOpenLatest}
                                disabled={!repeatableAction.latestItem}
                            >
                                Open latest instance
                            </button>

                            <button className="btn btn-outline-secondary" onClick={handleEditProduct}>
                                Edit product info
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}