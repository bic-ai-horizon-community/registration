import React, { useEffect, useState, useRef } from 'react';
import { useLocation, Navigate, Link } from 'react-router-dom';
import QRCode from 'qrcode';
import { CheckCircle, Download, Printer } from 'lucide-react';
import { Card, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';

export const SuccessPage: React.FC = () => {
  const location = useLocation();
  const { token, fullName, id } = location.state || {};
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (token) {
      const editUrl = `${window.location.origin}/edit/${token}`;
      QRCode.toDataURL(editUrl, {
        width: 300,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#ffffff',
        },
      })
      .then(url => setQrCodeUrl(url))
      .catch(err => console.error(err));
    }
  }, [token]);

  if (!token) {
    return <Navigate to="/" replace />;
  }

  const handleDownload = () => {
    if (!qrCodeUrl) return;
    const link = document.createElement('a');
    link.href = qrCodeUrl;
    link.download = `AI_Horizon_Ticket_${fullName.replace(/\s+/g, '_')}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrint = () => {
    const printContent = printRef.current;
    if (!printContent) return;
    
    const originalContents = document.body.innerHTML;
    document.body.innerHTML = printContent.innerHTML;
    window.print();
    document.body.innerHTML = originalContents;
    window.location.reload(); // Reload to restore React state after messing with DOM
  };

  return (
    <div className="max-w-xl mx-auto py-8">
      <div className="text-center mb-8">
        <div className="mx-auto w-16 h-16 bg-green-100 dark:bg-green-900/30 text-green-600 rounded-full flex items-center justify-center mb-4">
          <CheckCircle className="w-10 h-10" />
        </div>
        <h1 className="text-3xl font-bold tracking-tight mb-2 text-gray-900 dark:text-gray-50">
          Registration Successful!
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Thank you for registering, {fullName}. Please save your QR code.
        </p>
      </div>

      <Card className="overflow-hidden mb-6" ref={printRef}>
        <div className="bg-brand-600 p-6 text-center text-white">
          <h2 className="text-2xl font-bold mb-1">AI Horizon 2026</h2>
          <p className="opacity-90 text-sm font-medium tracking-wider uppercase">Official Entry Ticket</p>
        </div>
        <CardContent className="p-8 flex flex-col items-center bg-white dark:bg-[#020817]">
          {qrCodeUrl ? (
            <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm mb-6 inline-block">
              <img src={qrCodeUrl} alt="Your Ticket QR Code" className="w-64 h-64 object-contain" />
            </div>
          ) : (
            <div className="w-64 h-64 bg-gray-100 dark:bg-gray-800 animate-pulse rounded-xl mb-6"></div>
          )}
          
          <div className="text-center w-full border-t border-gray-100 dark:border-gray-800 pt-6">
            <h3 className="text-xl font-semibold mb-1 text-gray-900 dark:text-gray-50">{fullName}</h3>
            <p className="text-sm text-gray-500 font-mono tracking-widest break-all">ID: {id}</p>
          </div>
          
          <div className="mt-8 text-center text-sm text-gray-500 max-w-xs mx-auto leading-relaxed">
            Please present this QR code at the registration desk for check-in.
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-col sm:flex-row gap-4">
        <Button onClick={handleDownload} variant="primary" className="flex-1">
          <Download className="w-4 h-4 mr-2" />
          Download Ticket
        </Button>
        <Button onClick={handlePrint} variant="outline" className="flex-1">
          <Printer className="w-4 h-4 mr-2" />
          Print Ticket
        </Button>
      </div>
      
      <div className="mt-8 text-center">
        <Link to="/" className="text-brand-600 hover:underline font-medium">
          Go to your Dashboard
        </Link>
      </div>
    </div>
  );
};
