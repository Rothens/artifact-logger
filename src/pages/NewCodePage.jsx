import { useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { createCodeDefinition, createItemRecord, createItemRecordWithTimestamp } from '../db/db';
import { quickCaptureLocation } from '../utils/quickCapture';
import { useI18n } from '../i18n/I18nProvider';
import { VIBRATE_MS } from '../constants';

function useQuery() {
    const { search } = useLocation();
    return useMemo(() => new URLSearchParams(search), [search]);
}

export default function NewCodePage() {
    const navigate = useNavigate();
    const query = useQuery();

    const quickCapture = query.get('quickCapture') === 'true';
    const codeType = query.get('codeType') || 'qr_code';
    const codeValue = query.get('codeValue') || '';

    const [mode, setMode] = useState('unique_object');
    const [name, setName] = useState('');
    const [category, setCategory] = useState('other');
    const [notes, setNotes] = useState('');
    const [error, setError] = useState('');
    const { t } = useI18n();

    async function handleSubmit(e) {
        e.preventDefault();
        setError('');
        try {
            const codeDefinition = await createCodeDefinition({
                codeType, codeValue, mode, name, category, notes,
            });

            const item = quickCapture
                ? await createItemRecordWithTimestamp({ codeDefinitionId: codeDefinition.id, label: name, notes: '' })
                : await createItemRecord({ codeDefinitionId: codeDefinition.id, label: name, notes: '' });

            navigator.vibrate?.(VIBRATE_MS);

            if (quickCapture) {
                await quickCaptureLocation(item.id);
            }

            navigate(`/item/${item.id}`);
        } catch {
            setError(t('dbError'));
        }
    }

    return (
        <div>
            <h2 className="h5 mb-3">New Code</h2>

            <div className="card shadow-sm mb-3">
                <div className="card-body">
                    <div><strong>Type:</strong> {codeType}</div>
                    <div><strong>Value:</strong> {codeValue}</div>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="d-flex flex-column gap-3">
                <div>
                    <label className="form-label">Mode</label>
                    <select
                        className="form-select"
                        value={mode}
                        onChange={(e) => setMode(e.target.value)}
                    >
                        <option value="unique_object">Unique object</option>
                        <option value="repeatable_product">Repeatable product</option>
                    </select>
                    <div className="form-text">
                        Unique object = one physical artifact. Repeatable product = many purchases may share the same code.
                    </div>
                </div>

                <div>
                    <label className="form-label">Name</label>
                    <input
                        className="form-control"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Miyajima sand vial / Tuna Mayo Onigiri"
                    />
                </div>

                <div>
                    <label className="form-label">Category</label>
                    <select
                        className="form-select"
                        value={category}
                        onChange={(e) => setCategory(e.target.value)}
                    >
                        <option value="sand">Sand</option>
                        <option value="snack">Snack</option>
                        <option value="drink">Drink</option>
                        <option value="souvenir">Souvenir</option>
                        <option value="gift">Gift</option>
                        <option value="ticket">Ticket</option>
                        <option value="storage">Storage</option>
                        <option value="other">Other</option>
                    </select>
                </div>

                <div>
                    <label className="form-label">Product / Code Notes</label>
                    <textarea
                        className="form-control"
                        rows="3"
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                    />
                </div>

                <button type="submit" className="btn btn-primary">
                    Create
                </button>
                {error && <div className="alert alert-danger py-2">{error}</div>}
            </form>
        </div>
    );
}