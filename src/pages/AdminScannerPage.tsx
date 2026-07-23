import React, { useEffect, useState } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { Card, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { getRegistrationByToken, markAttendance } from '../firebase/db';
import { getSettings } from '../firebase/settings';
import type { Registration, EventSettings } from '../types';

export const AdminScannerPage: React.FC = () => {
  const [scanResult, setScanResult] = useState<string | null>(null);
  const [attendee, setAttendee] = useState<Registration | null>(null);
  const [settings, setSettings] = useState<EventSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const config = await getSettings();
        setSettings(config);
      } catch (err) {
        console.error("Failed to load settings in scanner", err);
      } finally {
        setLoading(false);
      }
    };
    fetchSettings();
  }, []);

  useEffect(() => {
    if (loading) return; // Wait until settings are loaded
    
    const scanner = new Html5QrcodeScanner(
      "qr-reader",
      { fps: 10, qrbox: { width: 250, height: 250 } },
      /* verbose= */ false
    );

    scanner.render(
      (decodedText) => {
        if (decodedText !== scanResult) {
          setScanResult(decodedText);
          scanner.pause(true); // Pause scanning after successful read
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
  }, [scanResult, loading]);

  useEffect(() => {
    if (scanResult) {
      handleLookup(scanResult);
    }
  }, [scanResult]);

  const handleLookup = async (scannedText: string) => {
    setLoading(true);
    setError(null);
    setSuccessMsg(null);
    setAttendee(null);

    // Extract token if the scanned text is a full URL
    let token = scannedText;
    try {
      if (scannedText.startsWith('http')) {
        const url = new URL(scannedText);
        const pathParts = url.pathname.split('/');
        token = pathParts[pathParts.length - 1];
      }
    } catch (e) {
      // Ignore
    }

    try {
      const data = await getRegistrationByToken(token);
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
    if (!attendee) return;
    
    setLoading(true);
    try {
      await markAttendance(attendee.id);
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-gray-50">QR Scanner</h1>
        <p className="text-gray-500 dark:text-gray-400">Scan attendee QR codes to mark them present.</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardContent className="p-6">
            <div id="qr-reader" className="w-full overflow-hidden rounded-lg"></div>
          </CardContent>
        </Card>

        <div>
          {loading && (
            <Card className="h-full flex items-center justify-center min-h-[300px]">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600"></div>
            </Card>
          )}

          {!loading && !attendee && !error && (
            <Card className="h-full flex flex-col items-center justify-center min-h-[300px] text-gray-400">
              <p>Scan a QR code to view attendee details</p>
            </Card>
          )}

          {!loading && error && (
            <Card className="h-full flex flex-col items-center justify-center min-h-[300px] border-red-200 bg-red-50 dark:bg-red-950/20 dark:border-red-900/50">
              <p className="text-red-600 font-medium mb-4">{error}</p>
              <Button onClick={resetScanner} variant="outline">Scan Another</Button>
            </Card>
          )}

          {!loading && attendee && settings && (
            <Card className="h-full flex flex-col min-h-[300px] border-brand-200 shadow-md">
              <CardContent className="p-6 flex-1 flex flex-col">
                <div className="mb-6 border-b border-gray-100 dark:border-gray-800 pb-4">
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{getPrimaryName()}</h2>
                  <p className="text-gray-500">{getPrimaryEmail()}</p>
                </div>
                
                <div className="space-y-3 mb-8 flex-1 overflow-y-auto max-h-[300px] pr-2">
                  {settings.formFields.filter(f => f.id !== 'fullName' && f.id !== 'email').map(field => (
                    <div key={field.id} className="grid grid-cols-3">
                      <span className="text-gray-500 font-medium text-sm">{field.label}</span>
                      <span className="col-span-2 font-medium">{attendee.responses[field.id] || '-'}</span>
                    </div>
                  ))}
                  
                  <div className="pt-2 border-t border-gray-100 dark:border-gray-800 mt-2"></div>
                  
                  <div className="grid grid-cols-3">
                    <span className="text-gray-500 font-medium text-sm">Status</span>
                    <span className="col-span-2 font-medium">
                      {attendee.present ? (
                        <span className="text-green-600 flex items-center">
                          Already Checked In
                        </span>
                      ) : (
                        <span className="text-yellow-600">Pending</span>
                      )}
                    </span>
                  </div>
                  {attendee.present && attendee.checkedInAt && (
                    <div className="grid grid-cols-3">
                      <span className="text-gray-500 font-medium text-sm">Time</span>
                      <span className="col-span-2 font-medium text-sm text-gray-600">
                        {new Date(attendee.checkedInAt).toLocaleString()}
                      </span>
                    </div>
                  )}
                </div>

                <div className="space-y-3 mt-auto pt-4 border-t border-gray-100 dark:border-gray-800">
                  {successMsg && (
                    <div className="p-3 bg-green-50 text-green-700 rounded-md text-sm font-medium text-center">
                      {successMsg}
                    </div>
                  )}
                  
                  {!attendee.present ? (
                    <Button onClick={handleMarkPresent} variant="success" className="w-full h-14 text-lg">
                      Mark Present
                    </Button>
                  ) : (
                    <Button onClick={resetScanner} variant="outline" className="w-full h-12">
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
