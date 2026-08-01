import React, { useEffect, useState, useRef, useCallback } from 'react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { Card, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { getRegistrationByToken, markAttendance } from '../firebase/db';
import { useAdminEvent } from '../contexts/AdminEventContext';
import { X, CheckCircle2, AlertCircle, Camera, CameraOff, RefreshCw } from 'lucide-react';
import type { Registration } from '../types';

export const AdminScannerPage: React.FC = () => {
  const { selectedEvent: activeEvent } = useAdminEvent();

  // Scanner state
  const [cameras, setCameras] = useState<{ id: string; label: string }[]>([]);
  const [selectedCamera, setSelectedCamera] = useState<string>('');
  const [isScanning, setIsScanning] = useState(false);
  const [scannerError, setScannerError] = useState<string | null>(null);
  const scannerInstanceRef = useRef<Html5Qrcode | null>(null);
  const isCleaningUp = useRef(false);

  // Attendee lookup state
  const [attendee, setAttendee] = useState<Registration | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const lastScanned = useRef<string>('');

  // Load available cameras on mount
  useEffect(() => {
    Html5Qrcode.getCameras()
      .then((devices) => {
        if (devices && devices.length) {
          setCameras(devices);
          // Prefer back camera on mobile
          const back = devices.find(d => d.label.toLowerCase().includes('back') || d.label.toLowerCase().includes('rear') || d.label.toLowerCase().includes('environment'));
          setSelectedCamera(back ? back.id : devices[0].id);
        }
      })
      .catch(() => setScannerError('Could not access cameras. Please allow camera permissions.'));
  }, []);

  const stopScanner = useCallback(async () => {
    if (!scannerInstanceRef.current || isCleaningUp.current) return;
    isCleaningUp.current = true;
    try {
      if (scannerInstanceRef.current.isScanning) {
        await scannerInstanceRef.current.stop();
      }
    } catch (_) { /* ignore */ }
    isCleaningUp.current = false;
    setIsScanning(false);
  }, []);

  const startScanner = useCallback(async (cameraId: string) => {
    if (!cameraId) return;
    setScannerError(null);

    // Stop any existing instance first
    if (scannerInstanceRef.current) {
      await stopScanner();
    }

    try {
      const html5Qrcode = new Html5Qrcode('qr-video-region', {
        formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
        verbose: false,
      });
      scannerInstanceRef.current = html5Qrcode;

      await html5Qrcode.start(
        cameraId,
        { fps: 10, qrbox: { width: 220, height: 220 }, aspectRatio: 1.0 },
        (decodedText) => {
          if (decodedText !== lastScanned.current) {
            lastScanned.current = decodedText;
            handleLookup(decodedText);
          }
        },
        () => { /* ignore per-frame errors */ }
      );
      setIsScanning(true);
    } catch (err: any) {
      setScannerError('Failed to start camera. ' + (err?.message || ''));
      setIsScanning(false);
    }
  }, [stopScanner]);

  // Cleanup on unmount
  useEffect(() => {
    return () => { stopScanner(); };
  }, [stopScanner]);

  const handleLookup = async (scannedText: string) => {
    if (!activeEvent) return;
    setLoading(true);
    setError(null);
    setSuccessMsg(null);
    setAttendee(null);

    let token = scannedText;
    let qrEventId = activeEvent.id;

    try {
      if (scannedText.startsWith('http')) {
        const url = new URL(scannedText);
        const parts = url.pathname.split('/');
        token = parts[parts.length - 1];
        qrEventId = parts[parts.length - 2];
      }
    } catch (_) { /* raw token */ }

    if (qrEventId !== activeEvent.id) {
      setError(`This QR belongs to a different event.`);
      setLoading(false);
      return;
    }

    try {
      const data = await getRegistrationByToken(activeEvent.id, token);
      if (data) {
        setAttendee(data);
      } else {
        setError('QR code invalid or attendee not found.');
      }
    } catch {
      setError('Error looking up attendee.');
    } finally {
      setLoading(false);
    }
  };

  const handleMarkPresent = async () => {
    if (!attendee || !activeEvent) return;
    setLoading(true);
    try {
      await markAttendance(activeEvent.id, attendee.id);
      setAttendee({ ...attendee, present: true, checkedInAt: Date.now() });
      setSuccessMsg('Successfully marked present!');
    } catch {
      setError('Failed to update attendance.');
    } finally {
      setLoading(false);
    }
  };

  const resetModal = () => {
    setAttendee(null);
    setError(null);
    setSuccessMsg(null);
    lastScanned.current = '';
  };

  const getPrimaryName = () => attendee?.responses['fullName'] || Object.values(attendee?.responses || {})[0] || 'Attendee';
  const getPrimaryEmail = () => attendee?.responses['email'] || '';

  if (!activeEvent) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-gray-500 dark:text-gray-400 gap-2">
        <Camera className="w-10 h-10 opacity-40" />
        <p className="text-lg font-medium">No Active Event</p>
        <p className="text-sm">Please create and activate an event to start scanning.</p>
      </div>
    );
  }

  return (
    <div className="space-y-5 max-w-2xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-gray-50">QR Scanner</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Scanning tickets for <span className="font-semibold text-brand-600">{activeEvent.name}</span>
        </p>
      </div>

      {/* Scanner Card */}
      <Card className="overflow-hidden shadow-xl border-brand-100 dark:border-gray-800">
        {/* Camera Viewport */}
        <div className="relative bg-black" style={{ minHeight: 280 }}>
          {/* This div is where Html5Qrcode mounts the video */}
          <div id="qr-video-region" className="w-full" />

          {/* Overlay when not scanning */}
          {!isScanning && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-950/90 gap-3">
              <div className="w-16 h-16 rounded-full bg-gray-800 flex items-center justify-center">
                <CameraOff className="w-7 h-7 text-gray-400" />
              </div>
              <p className="text-gray-400 text-sm font-medium">Camera not started</p>
            </div>
          )}

          {/* Scanning aim overlay */}
          {isScanning && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-52 h-52 relative">
                {/* Corner markers */}
                <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-brand-400 rounded-tl-lg" />
                <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-brand-400 rounded-tr-lg" />
                <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-brand-400 rounded-bl-lg" />
                <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-brand-400 rounded-br-lg" />
                {/* Scan line */}
                <div className="absolute inset-x-2 top-0 h-0.5 bg-brand-400/70 animate-[scan_2s_ease-in-out_infinite]" />
              </div>
            </div>
          )}
        </div>

        {/* Controls */}
        <CardContent className="p-4 space-y-3 bg-gray-50 dark:bg-gray-900/60">
          {scannerError && (
            <div className="flex items-center gap-2 text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 px-3 py-2 rounded-lg border border-red-200 dark:border-red-800">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {scannerError}
            </div>
          )}

          {/* Camera selector */}
          {cameras.length > 1 && (
            <div className="flex items-center gap-2">
              <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 whitespace-nowrap">Camera</label>
              <select
                value={selectedCamera}
                onChange={(e) => setSelectedCamera(e.target.value)}
                disabled={isScanning}
                className="flex-1 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500 disabled:opacity-50"
              >
                {cameras.map((cam) => (
                  <option key={cam.id} value={cam.id}>{cam.label || `Camera ${cam.id.slice(0, 8)}`}</option>
                ))}
              </select>
            </div>
          )}

          {/* Start / Stop buttons */}
          <div className="flex gap-2">
            {!isScanning ? (
              <Button
                onClick={() => startScanner(selectedCamera)}
                disabled={!selectedCamera || cameras.length === 0}
                className="flex-1 h-11 font-semibold"
              >
                <Camera className="w-4 h-4 mr-2" />
                Start Camera
              </Button>
            ) : (
              <>
                <Button
                  onClick={stopScanner}
                  variant="outline"
                  className="flex-1 h-11 text-red-600 border-red-300 hover:bg-red-50 dark:hover:bg-red-900/20"
                >
                  <CameraOff className="w-4 h-4 mr-2" />
                  Stop Camera
                </Button>
                <Button
                  onClick={() => { stopScanner().then(() => startScanner(selectedCamera)); }}
                  variant="ghost"
                  className="h-11 w-11 p-0"
                  title="Restart camera"
                >
                  <RefreshCw className="w-4 h-4" />
                </Button>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Attendee Result Modal */}
      {(loading || attendee || error) && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 bg-black/70 backdrop-blur-sm">
          <div
            className="bg-white dark:bg-gray-900 rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-md flex flex-col"
            style={{ maxHeight: '82dvh' }}
          >
            {/* ── Header ── always visible */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-800 shrink-0">
              <h3 className="font-bold text-lg text-gray-900 dark:text-white">Scan Result</h3>
              <button
                onClick={resetModal}
                className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* ── Body ── scrollable, constrained between header and footer */}
            <div className="overflow-y-auto" style={{ flex: '1 1 0', minHeight: 0 }}>

              {/* Loading */}
              {loading && (
                <div className="flex flex-col items-center py-12 gap-3">
                  <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-brand-600" />
                  <p className="text-gray-500 font-medium text-sm">Looking up ticket…</p>
                </div>
              )}

              {/* Error */}
              {!loading && error && (
                <div className="flex flex-col items-center py-10 px-5 text-center gap-4">
                  <div className="w-16 h-16 bg-red-50 dark:bg-red-900/30 rounded-full flex items-center justify-center">
                    <AlertCircle className="w-8 h-8 text-red-500" />
                  </div>
                  <div>
                    <h4 className="text-base font-bold text-gray-900 dark:text-white mb-1">Invalid Ticket</h4>
                    <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
                  </div>
                </div>
              )}

              {/* Attendee info */}
              {!loading && attendee && activeEvent && (
                <div className="p-5 space-y-4">

                  {/* Name + email */}
                  <div className="text-center pb-1">
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white">{getPrimaryName()}</h2>
                    <p className="text-gray-500 text-sm mt-0.5 break-all">{getPrimaryEmail()}</p>
                  </div>

                  {/* Fields */}
                  <div className="bg-gray-50 dark:bg-gray-800/60 rounded-xl divide-y divide-gray-100 dark:divide-gray-700/50">
                    {activeEvent.formFields
                      .filter(f => f.id !== 'fullName' && f.id !== 'email')
                      .map(field => {
                        const val = attendee.responses[field.id] || '—';
                        const isLong = field.type === 'textarea' || val.length > 80;
                        return (
                          <div key={field.id} className="px-4 py-3 min-w-0">
                            <p className="text-xs font-semibold tracking-wide uppercase text-gray-400 dark:text-gray-500 mb-1">
                              {field.label}
                            </p>
                            {isLong ? (
                              <div className="max-h-28 overflow-y-auto rounded-lg bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 px-3 py-2">
                                <p className="text-sm font-medium text-gray-900 dark:text-gray-100 whitespace-pre-wrap break-words leading-relaxed">
                                  {val}
                                </p>
                              </div>
                            ) : (
                              <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 break-words">
                                {val}
                              </p>
                            )}
                          </div>
                        );
                      })}
                  </div>

                  {/* Status */}
                  <div className="flex items-center justify-between px-4 py-3 rounded-xl border border-gray-100 dark:border-gray-800">
                    <span className="text-gray-500 text-sm font-medium">Status</span>
                    {attendee.present ? (
                      <div className="text-right">
                        <span className="inline-flex items-center gap-1.5 text-green-600 dark:text-green-400 font-bold text-sm">
                          <CheckCircle2 className="w-4 h-4" /> Already Checked In
                        </span>
                        {attendee.checkedInAt && (
                          <div className="text-xs text-gray-400 mt-0.5">
                            at {new Date(attendee.checkedInAt).toLocaleTimeString()}
                          </div>
                        )}
                      </div>
                    ) : (
                      <span className="inline-flex items-center gap-2 text-amber-600 dark:text-amber-400 font-bold text-sm">
                        <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                        Pending
                      </span>
                    )}
                  </div>

                  {successMsg && (
                    <div className="p-3 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 rounded-lg text-sm font-medium text-center border border-green-200 dark:border-green-800">
                      {successMsg}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* ── Footer ── always pinned at bottom */}
            {!loading && (
              <div className="px-5 py-4 border-t border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/50 flex gap-2 shrink-0">
                {attendee && !attendee.present ? (
                  <Button onClick={handleMarkPresent} variant="success" className="flex-1 h-11 font-semibold">
                    <CheckCircle2 className="w-4 h-4 mr-2" />
                    Mark Present
                  </Button>
                ) : (
                  <Button onClick={resetModal} variant="outline" className="flex-1 h-11">
                    Scan Next Ticket
                  </Button>
                )}
              </div>
            )}
          </div>
        </div>
      )}
      <style>{`
        @keyframes scan {
          0% { top: 0; opacity: 1; }
          50% { top: calc(100% - 2px); opacity: 0.6; }
          100% { top: 0; opacity: 1; }
        }
        #qr-video-region video {
          width: 100% !important;
          height: 100% !important;
          object-fit: cover !important;
          display: block !important;
        }
        #qr-video-region canvas {
          display: none !important;
        }
      `}</style>
    </div>
  );
};
