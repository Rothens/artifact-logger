import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { useI18n } from '../i18n/I18nProvider';

// Map routes to the section anchor that should be highlighted on open
const ROUTE_TO_ANCHOR = {
  '/': 'help-home',
  '/scan': 'help-scan',
  '/new-code': 'help-scan',
  '/settings': 'help-settings',
};

function routeToAnchor(pathname) {
  if (ROUTE_TO_ANCHOR[pathname]) return ROUTE_TO_ANCHOR[pathname];
  if (pathname.startsWith('/item/')) return 'help-item';
  if (pathname.startsWith('/code/')) return 'help-item';
  return 'help-home';
}

function Section({ id, title, steps, active }) {
  return (
    <div
      id={id}
      className={`mb-4 p-3 rounded ${active ? 'border border-primary bg-primary bg-opacity-10' : ''}`}
    >
      <h6 className="fw-bold mb-2">{title}</h6>
      <ol className="mb-0 ps-3">
        {steps.map((step, i) => (
          <li key={i} className="mb-1 small">{step}</li>
        ))}
      </ol>
    </div>
  );
}

export default function HelpModal({ show, onClose }) {
  const { t } = useI18n();
  const location = useLocation();
  const bodyRef = useRef(null);
  const activeAnchor = routeToAnchor(location.pathname);

  // Scroll to the relevant section when the modal opens
  useEffect(() => {
    if (!show) return;
    // Small delay so the modal has rendered before we scroll
    const id = setTimeout(() => {
      const el = document.getElementById(activeAnchor);
      el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 120);
    return () => clearTimeout(id);
  }, [show, activeAnchor]);

  // Close on Escape
  useEffect(() => {
    if (!show) return;
    function onKey(e) { if (e.key === 'Escape') onClose(); }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [show, onClose]);

  if (!show) return null;

  const sections = [
    {
      id: 'help-home',
      title: t('helpSectionHome'),
      steps: [t('helpHomeStep1'), t('helpHomeStep2'), t('helpHomeStep3')],
    },
    {
      id: 'help-scan',
      title: t('helpSectionScan'),
      steps: [t('helpScanStep1'), t('helpScanStep2'), t('helpScanStep3')],
    },
    {
      id: 'help-item',
      title: t('helpSectionItem'),
      steps: [
        t('helpItemStep1'),
        t('helpItemStep2'),
        t('helpItemStep3'),
        t('helpItemStep4'),
        t('helpItemStep5'),
      ],
    },
    {
      id: 'help-settings',
      title: t('helpSectionSettings'),
      steps: [
        t('helpSettingsStep1'),
        t('helpSettingsStep2'),
        t('helpSettingsStep3'),
        t('helpSettingsStep4'),
      ],
    },
    {
      id: 'help-data',
      title: t('helpSectionData'),
      steps: [t('helpDataStep1'), t('helpDataStep2'), t('helpDataStep3')],
    },
  ];

  return (
    <>
      {/* Backdrop */}
      <div
        className="modal-backdrop fade show"
        onClick={onClose}
        style={{ zIndex: 1040 }}
      />

      {/* Modal */}
      <div
        className="modal fade show d-block"
        role="dialog"
        aria-modal="true"
        aria-labelledby="helpModalLabel"
        style={{ zIndex: 1050 }}
      >
        <div className="modal-dialog modal-dialog-scrollable modal-dialog-centered">
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title" id="helpModalLabel">
                {t('helpTitle')}
              </h5>
              <button
                type="button"
                className="btn-close"
                onClick={onClose}
                aria-label={t('helpClose')}
              />
            </div>

            <div className="modal-body" ref={bodyRef}>
              {/* Jump links */}
              <div className="d-flex flex-wrap gap-2 mb-4">
                {sections.map((s) => (
                  <a
                    key={s.id}
                    href={`#${s.id}`}
                    className={`badge text-decoration-none ${activeAnchor === s.id ? 'text-bg-primary' : 'text-bg-secondary'}`}
                    onClick={(e) => {
                      e.preventDefault();
                      document.getElementById(s.id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }}
                  >
                    {s.title}
                  </a>
                ))}
              </div>

              {sections.map((s) => (
                <Section
                  key={s.id}
                  id={s.id}
                  title={s.title}
                  steps={s.steps}
                  active={activeAnchor === s.id}
                />
              ))}
            </div>

            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" onClick={onClose}>
                {t('helpClose')}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
