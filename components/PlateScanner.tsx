
import React, { useRef, useState } from 'react';
import { Camera, RefreshCw, Check } from 'lucide-react';
import { aiService } from '../services/aiService';

interface PlateScannerProps {
  onPlateDetected: (plate: string) => void;
  onClose: () => void;
}

const PlateScanner: React.FC<PlateScannerProps> = ({ onPlateDetected, onClose }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [scanning, setScanning] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);

  const startCamera = async () => {
    try {
      const s = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      setStream(s);
      if (videoRef.current) videoRef.current.srcObject = s;
    } catch (err) {
      console.error("Camera access denied", err);
    }
  };

  const captureAndScan = async () => {
    if (!videoRef.current || !canvasRef.current) return;
    setScanning(true);
    
    const context = canvasRef.current.getContext('2d');
    canvasRef.current.width = videoRef.current.videoWidth;
    canvasRef.current.height = videoRef.current.videoHeight;
    context?.drawImage(videoRef.current, 0, 0);
    
    const base64Image = canvasRef.current.toDataURL('image/jpeg').split(',')[1];
    
    try {
      const plate = await aiService.scanPlate(base64Image);
      if (plate && plate.length >= 7) {
        onPlateDetected(plate);
        stopCamera();
      }
    } catch (err) {
      console.error("OCR Failed", err);
    } finally {
      setScanning(false);
    }
  };

  const stopCamera = () => {
    stream?.getTracks().forEach(track => track.stop());
    onClose();
  };

  React.useEffect(() => {
    startCamera();
    return () => stream?.getTracks().forEach(track => track.stop());
  }, []);

  return (
    <div className="fixed inset-0 z-[60] bg-black flex flex-col">
      <div className="flex-1 relative">
        <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
        <div className="absolute inset-0 border-[40px] border-black/50 pointer-events-none flex items-center justify-center">
          <div className="w-64 h-32 border-2 border-green-400 rounded-lg bg-white/5 relative">
             <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-full h-0.5 bg-green-400/50 animate-bounce" />
             </div>
          </div>
        </div>
      </div>
      
      <canvas ref={canvasRef} className="hidden" />

      <div className="p-8 bg-black flex justify-between items-center">
        <button onClick={stopCamera} className="text-white font-bold">CANCELAR</button>
        <button 
          onClick={captureAndScan}
          disabled={scanning}
          className={`w-20 h-20 rounded-full border-4 flex items-center justify-center transition-all ${scanning ? 'border-gray-600 bg-gray-800' : 'border-white bg-green-600'}`}
        >
          {scanning ? <RefreshCw className="animate-spin text-white" /> : <Camera size={32} className="text-white" />}
        </button>
        <div className="w-16" />
      </div>
    </div>
  );
};

export default PlateScanner;
