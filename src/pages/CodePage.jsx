import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  getCodeDefinitionById,
  saveCodeDefinition,
  getItemRecordsByCodeDefinitionId,
} from '../db/db';
import { useI18n } from '../i18n/I18nProvider';

export default function CodePage() {
  const { id } = useParams();

  const [codeDefinition, setCodeDefinition] = useState(null);
  const [items, setItems] = useState([]);
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);
  const { t } = useI18n();

  useEffect(() => {
    async function load() {
      try {
        const code = await getCodeDefinitionById(id);
        const relatedItems = await getItemRecordsByCodeDefinitionId(id);
        relatedItems.sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || ''));
        setCodeDefinition(code);
        setItems(relatedItems);
      } catch {
        setMessage(t('loadError'));
      }
    }
    load();
  }, [id]);

  if (!codeDefinition) {
    return <div>{t('loading')}</div>;
  }

  function updateField(field, value) {
    setCodeDefinition((prev) => ({
      ...prev,
      [field]: value,
    }));
  }

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);
    try {
      const saved = await saveCodeDefinition(codeDefinition);
      setCodeDefinition(saved);
      setMessage(t('saved'));
      setTimeout(() => setMessage(''), 1200);
    } catch {
      setMessage(t('dbError'));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <h2 className="h5 mb-3">{t('codeDefinition')}</h2>

      <form onSubmit={handleSave} className="d-flex flex-column gap-3">
        <div>
          <label className="form-label">{t('codeType')}</label>
          <input className="form-control" value={codeDefinition.codeType} readOnly />
        </div>

        <div>
          <label className="form-label">{t('codeValue')}</label>
          <input className="form-control" value={codeDefinition.codeValue} readOnly />
        </div>

        <div>
          <label className="form-label">{t('mode')}</label>
          <select
            className="form-select"
            value={codeDefinition.mode}
            onChange={(e) => updateField('mode', e.target.value)}
          >
            <option value="unique_object">{t('uniqueObject')}</option>
            <option value="repeatable_product">{t('repeatableProduct')}</option>
          </select>
        </div>

        <div>
          <label className="form-label">{t('name')}</label>
          <input
            className="form-control"
            value={codeDefinition.name || ''}
            onChange={(e) => updateField('name', e.target.value)}
          />
        </div>

        <div>
          <label className="form-label">{t('category')}</label>
          <select
            className="form-select"
            value={codeDefinition.category || 'other'}
            onChange={(e) => updateField('category', e.target.value)}
          >
            <option value="sand">{t('sand')}</option>
            <option value="snack">{t('snack')}</option>
            <option value="drink">{t('drink')}</option>
            <option value="souvenir">{t('souvenir')}</option>
            <option value="gift">{t('gift')}</option>
            <option value="ticket">{t('ticket')}</option>
            <option value="storage">{t('storage')}</option>
            <option value="other">{t('other')}</option>
          </select>
        </div>

        <div>
          <label className="form-label">{t('notes')}</label>
          <textarea
            className="form-control"
            rows="4"
            value={codeDefinition.notes || ''}
            onChange={(e) => updateField('notes', e.target.value)}
          />
        </div>

        <button type="submit" className="btn btn-success" disabled={saving}>
          {saving ? <span className="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true"></span> : null}
          {t('saveCodeInfo')}
        </button>

        {message && <div className="alert alert-info py-2">{message}</div>}
      </form>

      <hr />

      <h3 className="h6">{t('linkedItems')} ({items.length})</h3>

      <div className="list-group">
        {items.map((item) => (
          <a
            key={item.id}
            className="list-group-item list-group-item-action"
            href={`/item/${item.id}`}
          >
            <div className="fw-semibold">{item.label || 'Untitled item'}</div>
            <div className="small text-muted">
              {item.collectedAt
                ? new Date(item.collectedAt).toLocaleString()
                : 'No collected time'}
            </div>
          </a>
        ))}
      </div>
    </div>
  );
}