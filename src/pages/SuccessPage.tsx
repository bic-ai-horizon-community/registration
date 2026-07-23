import React from 'react';
import { useLocation, Navigate, Link } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import { CheckCircle2, Download } from 'lucide-react';
import { Card, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';

export const SuccessPage: React.FC = () => {
  const location = useLocation();
  const { token, eventId } = location.state || {};

  if (!token || !eventId) {
    return <Navigate to="/" replace />;
  }

  const editUrl = `${window.location.origin}/edit/${eventId}/${token}`;

  const downloadQR = () => {
    const svg = document.getElementById('qr-code-svg') as unknown as SVGElement;
    if (!svg) return;
    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      ctx?.drawImage(img, 0, 0);
      const pngUrl = canvas.toDataURL('image/png').replace('image/png', 'image/octet-stream');
      const downloadLink = document.createElement('a');
      downloadLink.href = pngUrl;
      downloadLink.download = 'registration-qr.png';
      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);
    };
    img.src = 'data:image/svg+xml;base64,' + btoa(svgData);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#020817] py-12 px-4 sm:px-6 lg:px-8 flex items-center justify-center">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-green-100 dark:bg-green-900/30">
            <CheckCircle2 className="h-10 w-10 text-green-600 dark:text-green-500" />
          </div>
          <h2 className="mt-6 text-3xl font-extrabold text-gray-900 dark:text-white">
            Registration Successful!
          </h2>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            We've saved your spot. Make sure you come loginned in this site or You can also save this QR code for entry.
            This QR is very important to mark your registration and presence in this Event.
          </p>
        </div>

        <Card className="overflow-hidden border-brand-100 dark:border-brand-900/30 shadow-xl shadow-brand-500/10">
          <div className="bg-brand-50 dark:bg-brand-900/20 px-6 py-4 border-b border-brand-100 dark:border-brand-900/30">
            <h3 className="text-lg font-medium text-brand-900 dark:text-brand-300 text-center">Your Entry Pass</h3>
          </div>
          <CardContent className="p-8 flex flex-col items-center">
            <div className="bg-white p-4 rounded-xl shadow-inner border border-gray-100 mb-6 inline-block">
              <QRCodeSVG
                id="qr-code-svg"
                value={editUrl}
                size={220}
                level="H"
                includeMargin={true}
                className="rounded-lg"
              />
            </div>

            <p className="text-xs text-gray-500 dark:text-gray-400 mb-6 text-center font-mono bg-gray-100 dark:bg-gray-800 px-3 py-1.5 rounded-md">
              ID: {token}
            </p>

            <div className="w-full space-y-3">
              <Button onClick={downloadQR} className="w-full" variant="primary">
                <Download className="w-4 h-4 mr-2" />
                Save QR Code
              </Button>
              <Link to={`/edit/${eventId}/${token}`} className="block w-full">
                <Button variant="outline" className="w-full">
                  View / Edit Details
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
