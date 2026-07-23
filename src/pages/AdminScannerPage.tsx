import React, { useEffect, useState } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { Card, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { getRegistrationByToken, markAttendance } from '../firebase/db';
import { useAdminEvent } from '../contexts/AdminEventContext';
import type { Registration } from '../types';

export const AdminScannerPage: React.FC = () => {
  const [scanResult, setScanResult] = useState<string | null>(null);
  const [attendee, setAttendee] = useState<Registration | null>(null);
  const { selectedEvent: activeEvent } = useAdminEvent();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!activeEvent) return;

    // Calculate responsive qrbox size
    const containerWidth = Math.min(window.innerWidth - 64, 500);
    const qrSize = Math.min(containerWidth - 40, 250);

    const scanner = new Html5QrcodeScanner(
      "qr-reader",
      {
        fps: 10,
        qrbox: { width: qrSize, height: qrSize },
        aspectRatio: 1.0,
      },
      false
    );

    scanner.render(
      (decodedText) => {
        if (decodedText !== scanResult) {
          setScanResult(decodedText);
          scanner.pause(true);
        }
      },
      () => {
        // Ignore continuous scan errors
      }
    );

    return () => {
      scanner.clear().catch(error => {
        console.error("Failed to clear html5QrcodeScanner. ", error);
      });
    };
  }, [activeEvent]);

  useEffect(() => {
    if (scanResult && activeEvent) {
      handleLookup(scanResult);
    }
  }, [scanResult, activeEvent]);

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
        const pathParts = url.pathname.split('/');
        // URL format: /edit/:eventId/:token
        token = pathParts[pathParts.length - 1];
        qrEventId = pathParts[pathParts.length - 2];
      }
    } catch (e) {
      // Ignore URL parse error, assume it's a raw token
    }

    if (qrEventId !== activeEvent.id) {
      setError(`QR code belongs to a different event. Currently viewing: ${activeEvent.name}.`);
      setLoading(false);
      return;
    }

    try {
      const data = await getRegistrationByToken(activeEvent.id, token);
      if (data) {
        setAttendee(data);
      } else {
        setError("QR code invalid or attendee not found.");
      }
    } catch (err: any) {
      setError("Error looking up attendee.");
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
      setSuccessMsg("Successfully marked present!");
    } catch (err: any) {
      setError("Failed to update attendance.");
    } finally {
      setLoading(false);
    }
  };

  const resetScanner = () => {
    window.location.reload();
  };

  const getPrimaryName = () => {
    if (!attendee) return '';
    return attendee.responses['fullName'] || Object.values(attendee.responses)[0] || 'Attendee';
  };

  const getPrimaryEmail = () => {
    if (!attendee) return '';
    return attendee.responses['email'] || '';
  };

  if (!activeEvent) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-gray-500">
        <p className="text-lg font-medium">No Active Event</p>
        <p className="text-sm">Please create and activate an event to start scanning.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-gray-900 dark:text-gray-50">QR Scanner</h1>
        <p className="text-sm sm:text-base text-gray-500 dark:text-gray-400">Scan attendee QR codes for <span className="font-semibold text-brand-600">{activeEvent.name}</span>.</p>
      </div>

      <div className="grid gap-4 sm:gap-6 grid-cols-1 lg:grid-cols-2">
        <Card className="overflow-hidden">
          <CardContent className="p-3 sm:p-6">
            <div id="qr-reader" className="w-full overflow-hidden rounded-lg qr-scanner-container"></div>
          </CardContent>
        </Card>

        <div className="min-h-[200px] sm:min-h-[300px]">
          {loading && (
            <Card className="h-full flex items-center justify-center min-h-[200px] sm:min-h-[300px]">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600"></div>
            </Card>
          )}

          {!loading && !attendee && !error && (
            <Card className="h-full flex flex-col items-center justify-center min-h-[200px] sm:min-h-[300px] text-gray-400">
              <ScanPlaceholder />
              <p className="mt-3 text-sm sm:text-base">Scan a QR code to view attendee details</p>
            </Card>
          )}

          {!loading && error && (
            <Card className="h-full flex flex-col items-center justify-center min-h-[200px] sm:min-h-[300px] border-red-200 bg-red-50 dark:bg-red-950/20 dark:border-red-900/50">
              <p className="text-red-600 font-medium mb-4 text-sm sm:text-base px-4 text-center">{error}</p>
              <Button onClick={resetScanner} variant="outline">Scan Another</Button>
            </Card>
          )}

          {!loading && attendee && activeEvent && (
            <Card className="h-full flex flex-col border-brand-200 shadow-md">
              <CardContent className="p-4 sm:p-6 flex-1 flex flex-col">
                <div className="mb-4 sm:mb-6 border-b border-gray-100 dark:border-gray-800 pb-3 sm:pb-4">
                  <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">{getPrimaryName()}</h2>
                  <p className="text-gray-500 text-sm sm:text-base">{getPrimaryEmail()}</p>
                </div>

                <div className="space-y-2.5 sm:space-y-3 mb-6 sm:mb-8 flex-1 overflow-y-auto max-h-[250px] sm:max-h-[300px] pr-2">
                  {activeEvent.formFields.filter(f => f.id !== 'fullName' && f.id !== 'email').map(field => (
                    <div key={field.id} className="flex flex-col sm:grid sm:grid-cols-3 gap-0.5 sm:gap-0">
                      <span className="text-gray-500 font-medium text-xs sm:text-sm">{field.label}</span>
                      <span className="sm:col-span-2 font-medium text-sm sm:text-base">{attendee.responses[field.id] || '-'}</span>
                    </div>
                  ))}

                  <div className="pt-2 border-t border-gray-100 dark:border-gray-800 mt-2"></div>

                  <div className="flex flex-col sm:grid sm:grid-cols-3 gap-0.5 sm:gap-0">
                    <span className="text-gray-500 font-medium text-xs sm:text-sm">Status</span>
                    <span className="sm:col-span-2 font-medium">
                      {attendee.present ? (
                        <span className="text-green-600 flex items-center text-sm sm:text-base">✓ Already Checked In</span>
                      ) : (
                        <span className="text-yellow-600 text-sm sm:text-base">⏳ Pending</span>
                      )}
                    </span>
                  </div>
                  {attendee.present && attendee.checkedInAt && (
                    <div className="flex flex-col sm:grid sm:grid-cols-3 gap-0.5 sm:gap-0">
                      <span className="text-gray-500 font-medium text-xs sm:text-sm">Time</span>
                      <span className="sm:col-span-2 font-medium text-xs sm:text-sm text-gray-600">
                        {new Date(attendee.checkedInAt).toLocaleString()}
                      </span>
                    </div>
                  )}
                </div>

                <div className="space-y-2.5 sm:space-y-3 mt-auto pt-3 sm:pt-4 border-t border-gray-100 dark:border-gray-800">
                  {successMsg && (
                    <div className="p-3 bg-green-50 text-green-700 rounded-md text-sm font-medium text-center">
                      {successMsg}
                    </div>
                  )}

                  {!attendee.present ? (
                    <Button onClick={handleMarkPresent} variant="success" className="w-full h-12 sm:h-14 text-base sm:text-lg">
                      ✓ Mark Present
                    </Button>
                  ) : (
                    <Button onClick={resetScanner} variant="outline" className="w-full h-11 sm:h-12">
                      Scan Next Attendee
                    </Button>
                  )}

                  {!attendee.present && (
                    <Button onClick={resetScanner} variant="ghost" className="w-full">
                      Cancel & Scan Another
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

const ScanPlaceholder: React.FC = () => (
  <svg className="w-12 h-12 sm:w-16 sm:h-16 text-gray-300 dark:text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
  </svg>
);
