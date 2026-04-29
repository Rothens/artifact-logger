import { useEffect, useRef, useState } from 'react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';

const SCANNER_ELEMENT_ID = 'camera-scanner';
const CAMERA_STORAGE_KEY = 'artifactLogger.preferredCameraId';

export default function CameraScanner({ onDetected, onError }) {
  const scannerRef = useRef(null);
  const hasScannedRef = useRef(false);

  const [startError, setStartError] = useState('');
  const [cameras, setCameras] = useState([]);
  const [selectedCameraId, setSelectedCameraId] = useState('');
  const [scannerReady, setScannerReady] = useState(false);
  const scannerElementId = `camera-scanner-${selectedCameraId || 'default'}`;

  useEffect(() => {
    let cancelled = false;
    let html5QrCode = null;

    async function loadCameras() {
      try {
        const availableCameras = await Html5Qrcode.getCameras();

        if (!availableCameras || availableCameras.length === 0) {
          throw new Error('No camera found.');
        }

        if (cancelled) return;

        setCameras(availableCameras);

        const rememberedCameraId = localStorage.getItem(CAMERA_STORAGE_KEY);
        const rememberedExists = availableCameras.some(
          (camera) => camera.id === rememberedCameraId
        );

        if (rememberedCameraId && rememberedExists) {
          setSelectedCameraId(rememberedCameraId);
          return;
        }

        const preferredCamera =
          availableCameras.find((c) => {
            const label = (c.label || '').toLowerCase();
            return (
              label.includes('back') ||
              label.includes('rear') ||
              label.includes('environment')
            );
          }) || availableCameras[0];

        setSelectedCameraId(preferredCamera.id);
      } catch (err) {
        const message = err?.message || 'Failed to load cameras.';
        setStartError(message);
        onError?.(message);
      }
    }

    loadCameras();

    return () => {
      cancelled = true;
    };
  }, [onError]);

  useEffect(() => {
    if (!selectedCameraId) return;

    let cancelled = false;
    let html5QrCode = null;

    async function startScanner() {
      try {
        hasScannedRef.current = false;
        setStartError('');
        setScannerReady(false);

        const formatsToSupport = [
          Html5QrcodeSupportedFormats.QR_CODE,
          Html5QrcodeSupportedFormats.EAN_13,
          Html5QrcodeSupportedFormats.UPC_A,
          Html5QrcodeSupportedFormats.CODE_128,
        ];

        html5QrCode = new Html5Qrcode(SCANNER_ELEMENT_ID);
        scannerRef.current = html5QrCode;

        localStorage.setItem(CAMERA_STORAGE_KEY, selectedCameraId);

        await html5QrCode.start(
          selectedCameraId,
          {
            fps: 10,
            qrbox: (viewfinderWidth, viewfinderHeight) => {
              const minEdge = Math.min(viewfinderWidth, viewfinderHeight);
              return {
                width: Math.floor(minEdge * 0.9),
                height: Math.floor(minEdge * 0.6),
              };
            },
            formatsToSupport,
            videoConstraints: {
                facingMode: {ideal: 'environment'},
              width: { ideal: 1280 },
              height: { ideal: 720 },
            },
          },
          async (decodedText, decodedResult) => {
            if (hasScannedRef.current) return;
            hasScannedRef.current = true;

            const formatName =
              decodedResult?.result?.format?.formatName ||
              decodedResult?.result?.format?.format ||
              'unknown';

            console.log('decoded!', decodedText, decodedResult);

            onDetected({
              codeValue: decodedText,
              codeType: normalizeFormat(formatName),
              rawFormat: formatName,
            });

            try {
              await html5QrCode.stop();
            } catch (err) {
              console.warn('scanner stop failed:', err);
            }
          },
          (errorMessage) => {
            console.debug('scan miss:', errorMessage);
          }
        );

        if (!cancelled) {
          setScannerReady(true);
        }
      } catch (err) {
        const message = err?.message || 'Failed to start scanner.';
        setStartError(message);
        onError?.(message);
      }
    }

    startScanner();

    return () => {
      cancelled = true;

      async function cleanup() {
        if (html5QrCode) {
          try {
            await html5QrCode.stop();
          } catch {
            // ignore
          }

          try {
            await html5QrCode.clear();
          } catch {
            // ignore
          }
        }

        scannerRef.current = null;
        setScannerReady(false);
      }

      cleanup();
    };
  }, [selectedCameraId, onDetected, onError]);

  return (
    <div>
      <div className="mb-3">
        <label className="form-label">Camera</label>
        <select
          className="form-select"
          value={selectedCameraId}
          onChange={(e) => setSelectedCameraId(e.target.value)}
          disabled={cameras.length === 0}
        >
          {cameras.map((camera, index) => (
            <option key={camera.id} value={camera.id}>
              {camera.label || `Camera ${index + 1}`}
            </option>
          ))}
        </select>
      </div>

      <div  key={selectedCameraId} id={SCANNER_ELEMENT_ID} className="scanner-box" />

      {!scannerReady && !startError && (
        <div className="small text-muted mt-2">Starting camera...</div>
      )}

      {startError && <div className="alert alert-danger mt-3">{startError}</div>}
    </div>
  );
}

function normalizeFormat(formatName) {
  const normalized = String(formatName).toUpperCase();

  switch (normalized) {
    case 'QR_CODE':
    case 'QR CODE':
      return 'qr_code';
    case 'EAN_13':
    case 'EAN-13':
      return 'ean_13';
    case 'UPC_A':
    case 'UPC-A':
      return 'upc_a';
    case 'CODE_128':
    case 'CODE-128':
      return 'code_128';
    default:
      return 'other';
  }
}