import { useI18n } from '../i18n/I18nProvider';

/**
 * A Bootstrap modal used in place of window.confirm().
 * Usage:
 *   const [confirmOpen, setConfirmOpen] = useState(false);
 *   <ConfirmModal
 *     open={confirmOpen}
 *     message={t('confirmDeleteItem')}
 *     onConfirm={handleDelete}
 *     onCancel={() => setConfirmOpen(false)}
 *   />
 */
export default function ConfirmModal({ open, message, onConfirm, onCancel, danger = true }) {
  const { t } = useI18n();

  if (!open) return null;

  return (
    <>
      <div className="modal show d-block" tabIndex="-1" role="dialog">
        <div className="modal-dialog modal-dialog-centered" role="document">
          <div className="modal-content">
            <div className="modal-body pt-4 pb-3 px-4">
              <p className="mb-0">{message}</p>
            </div>
            <div className="modal-footer border-0 pt-0">
              <button type="button" className="btn btn-secondary" onClick={onCancel}>
                {t('confirmCancel')}
              </button>
              <button
                type="button"
                className={`btn ${danger ? 'btn-danger' : 'btn-primary'}`}
                onClick={onConfirm}
              >
                {t('confirmDelete')}
              </button>
            </div>
          </div>
        </div>
      </div>
      <div className="modal-backdrop show"></div>
    </>
  );
}
