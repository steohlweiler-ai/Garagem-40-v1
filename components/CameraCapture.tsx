
import React, { useRef, useState, useEffect } from 'react';
import { X, Camera, RotateCw, Check, Video, StopCircle, RefreshCcw } from 'lucide-react';

interface CameraCaptureProps {
  mode: 'photo' | 'video';
  onCapture: (file: { url: string; type: 'image' | 'video' }) => void;
  onClose: () => void;
}

const CameraCapture: React.FC<CameraCaptureProps> = ({ mode, onCapture, onClose }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [capturedBlob, setCapturedBlob] = useState<Blob | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    startCamera();
    return () => stopCamera();
  }, []);

  useEffect(() => {
    let interval: number;
    if (isRecording) {
      interval = window.setInterval(() => setRecordingTime(prev => prev + 1), 1000);
    }
    return () => clearInterval(interval);
  }, [isRecording]);

  const startCamera = async () => {
    try {
      const s = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: mode === 'video'
      });
      setStream(s);
      if (videoRef.current) videoRef.current.srcObject = s;
    } catch (err) {
      setError('Câmera bloqueada ou não encontrada. Verifique as permissões.');
    }
  };

  const stopCamera = () => {
    stream?.getTracks().forEach(track => track.stop());
    setStream(null);
  };

  const takePhoto = () => {
    if (!videoRef.current) return;
    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    const ctx = canvas.getContext('2d');
    ctx?.drawImage(videoRef.current, 0, 0);

    canvas.toBlob((blob) => {
      if (blob) {
        setCapturedBlob(blob);
        setPreviewUrl(URL.createObjectURL(blob));
        stopCamera();
      }
    }, 'image/jpeg', 0.85);
  };

  const startRecording = () => {
    if (!stream) return;
    const chunks: Blob[] = [];
    const recorder = new MediaRecorder(stream);
    mediaRecorderRef.current = recorder;

    recorder.ondataavailable = (e) => chunks.push(e.data);
    recorder.onstop = () => {
      const blob = new Blob(chunks, { type: 'video/mp4' });
      setCapturedBlob(blob);
      setPreviewUrl(URL.createObjectURL(blob));
      stopCamera();
    };

    recorder.start();
    setIsRecording(true);
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    setIsRecording(false);
  };

  const handleConfirm = () => {
    if (previewUrl) {
      onCapture({ url: previewUrl, type: mode === 'photo' ? 'image' : 'video' });
    }
  };

  const handleRetry = () => {
    setPreviewUrl(null);
    setCapturedBlob(null);
    setRecordingTime(0);
    startCamera();
  };

  if (error) {
    return (
      <div className="fixed inset-0 z-[150] bg-slate-900 flex flex-col items-center justify-center p-10 text-center">
        <X className="text-red-500 mb-4" size={48} />
        <h3 className="text-white font-black uppercase mb-2">Erro de Acesso</h3>
        <p className="text-slate-400 text-sm mb-6">{error}</p>
        <button onClick={onClose} className="px-8 py-3 bg-white rounded-xl font-black text-xs uppercase">Fechar</button>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[150] bg-black flex flex-col overflow-hidden">
      {/* Viewport da Câmera */}
      <div className="flex-1 relative bg-slate-900 flex items-center justify-center overflow-hidden">
        {previewUrl ? (
          mode === 'photo' ? (
            <img src={previewUrl} className="max-w-full max-h-full object-contain" alt="Preview" />
          ) : (
            <video src={previewUrl} className="max-w-full max-h-full" controls autoPlay />
          )
        ) : (
          <video ref={videoRef} autoPlay playsInline muted className="max-w-full max-h-full object-contain" />
        )}

        {/* HUD - Overlay */}
        {!previewUrl && (
          <div className="absolute inset-0 pointer-events-none border-[30px] border-black/20 flex items-center justify-center">
            <div className="w-64 h-64 border-2 border-white/20 rounded-3xl" />
            {isRecording && (
              <div className="absolute top-10 left-1/2 -translate-x-1/2 bg-red-600 text-white px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-2 animate-pulse">
                <div className="w-2 h-2 bg-white rounded-full" />
                REC {new Date(recordingTime * 1000).toISOString().substr(14, 5)}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Controles */}
      <div className="bg-black p-10 flex items-center justify-between safe-bottom">
        {previewUrl ? (
          <>
            <button onClick={handleRetry} className="flex flex-col items-center gap-2 text-white/60 active:scale-90 transition-all">
              <RefreshCcw size={24} />
              <span className="text-[8px] font-black uppercase tracking-widest">Tentar Novamente</span>
            </button>
            <button onClick={handleConfirm} className="w-20 h-20 bg-green-600 rounded-full flex items-center justify-center text-white shadow-2xl active:scale-95 transition-all">
              <Check size={32} strokeWidth={4} />
            </button>
            <button onClick={onClose} className="flex flex-col items-center gap-2 text-white/60">
              <X size={24} />
              <span className="text-[8px] font-black uppercase tracking-widest">Cancelar</span>
            </button>
          </>
        ) : (
          <>
            <button onClick={onClose} className="text-white/40 text-[10px] font-black uppercase tracking-widest">FECHAR</button>

            {mode === 'photo' ? (
              <button onClick={takePhoto} className="w-20 h-20 bg-white rounded-full border-8 border-white/20 flex items-center justify-center active:scale-90 transition-all">
                <div className="w-14 h-14 bg-white rounded-full border-2 border-slate-200" />
              </button>
            ) : (
              <button
                onClick={isRecording ? stopRecording : startRecording}
                className={`w-20 h-20 rounded-full border-8 flex items-center justify-center active:scale-90 transition-all ${isRecording ? 'bg-white border-red-500/20' : 'bg-white border-white/20'}`}
              >
                {isRecording ? (
                  <StopCircle size={40} className="text-red-600" />
                ) : (
                  <div className="w-12 h-12 bg-red-600 rounded-full" />
                )}
              </button>
            )}

            <div className="w-16" />
          </>
        )}
      </div>
    </div>
  );
};

export default CameraCapture;
