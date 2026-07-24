import React from 'react';
import { useLocation, Navigate, Link } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import { CheckCircle2, Download, ArrowRight } from 'lucide-react';
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
    <div className="min-h-screen bg-[#030712] flex items-center justify-center px-4 py-12">
      <div className="max-w-md w-full space-y-8 animate-fade-in-up">
        {/* Success indicator */}
        <div className="text-center">
          <div className="relative inline-flex">
            <div className="absolute inset-0 rounded-full bg-emerald-500/20 animate-ping" style={{ animationDuration: '2s' }}></div>
            <div className="relative w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
              <CheckCircle2 className="h-8 w-8 text-emerald-400" />
            </div>
          </div>
          <h2 className="mt-6 text-2xl sm:text-3xl font-bold text-white">
            You're All Set
          </h2>
          <p className="mt-3 text-sm text-gray-400 max-w-sm mx-auto leading-relaxed">
            Save this QR code — you'll need it to check in.
          </p>
        </div>

        {/* QR Card */}
        <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] backdrop-blur-xl overflow-hidden animate-fade-in-up animate-delay-200">
          <div className="px-6 py-4 border-b border-white/[0.04]">
            <h3 className="text-sm font-semibold text-gray-300 text-center tracking-wide uppercase">Your Entry Pass</h3>
          </div>
          <div className="p-6 sm:p-8 flex flex-col items-center">
            <div className="bg-white p-3 rounded-2xl shadow-2xl shadow-white/5 mb-6">
              <QRCodeSVG
                id="qr-code-svg"
                value={editUrl}
                size={200}
                level="H"
                includeMargin={true}
                className="rounded-xl"
              />
            </div>

            <p className="text-xs text-gray-500 mb-6 text-center font-mono bg-white/[0.03] border border-white/[0.06] px-4 py-2 rounded-lg w-full truncate">
              {token}
            </p>

            <div className="w-full space-y-3">
              <Button 
                onClick={downloadQR} 
                className="w-full h-11 rounded-xl shadow-lg shadow-brand-500/20 transition-all active:scale-[0.98]"
              >
                <Download className="w-4 h-4 mr-2" />
                Save QR Code
              </Button>
              <Link to={`/edit/${eventId}/${token}`} className="block w-full">
                <Button variant="outline" className="w-full h-11 rounded-xl border-white/[0.08] text-gray-300 hover:bg-white/[0.04] hover:text-white transition-all">
                  View / Edit Details
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
