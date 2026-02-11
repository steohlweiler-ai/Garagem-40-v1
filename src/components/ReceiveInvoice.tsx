
import React, { useState, useRef } from 'react';
import {
  Camera, FileText, Upload, X, Check, Image as ImageIcon,
  Loader2, AlertCircle, ArrowRight, Trash2, Maximize2, Sparkles
} from 'lucide-react';
import { dataProvider } from '../services/dataProvider';
import { blobToBase64 } from '../utils/helpers';
import { UserAccount } from '../types';
import { automationService } from '../services/automationService'; // Importação do serviço de automação
import CameraCapture from './CameraCapture';
import ValidateInvoiceItems from './ValidateInvoiceItems';

interface ReceiveInvoiceProps {
  onClose: () => void;
  onProcessed: () => void;
  user: UserAccount | null;
}

const ReceiveInvoice: React.FC<ReceiveInvoiceProps> = ({ onClose, onProcessed, user }) => {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [cameraMode, setCameraMode] = useState<'photo' | null>(null);
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleCapture = async (media: { url: string; type: 'image' | 'video' }) => {
    setIsProcessing(true);
    try {
      const response = await fetch(media.url);
      const blob = await response.blob();
      const base64 = await blobToBase64(blob);
      setImageBase64(base64);
      setFileName('foto_capturada.jpg');
      setStep(2);
    } catch (error) {
      console.error("Erro ao processar imagem da câmera:", error);
    } finally {
      setIsProcessing(false);
      setCameraMode(null);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    try {
      const base64 = await blobToBase64(file);
      setImageBase64(base64);
      setFileName(file.name);
      setStep(2);
    } catch (error) {
      console.error("Erro ao carregar arquivo:", error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleAdvanceToValidation = async () => {
    if (!imageBase64) return;
    setIsProcessing(true);

    /**
     * PONTO DE INTEGRAÇÃO: OCR REAL
     * Aqui chamamos o serviço de automação que fará o POST para o n8n ou Gemini.
     * O mock continua funcionando como fallback visual.
     */
    try {
      await automationService.processInvoiceOCR(imageBase64);
    } catch (e) {
      console.warn("Falha na automação externa, prosseguindo com dados mock.");
    }

    // Simulação de tempo de resposta da rede
    setTimeout(() => {
      setIsProcessing(false);
      setStep(3);
    }, 1500);
  };

  const handleFinalize = () => {
    onProcessed();
  };

  if (step === 3) {
    return (
      <ValidateInvoiceItems
        onClose={() => setStep(2)}
        onFinish={handleFinalize}
        invoiceImage={imageBase64 || undefined}
        user={user}
      />
    );
  }

  return (
    <div className="fixed inset-0 z-[180] bg-white flex flex-col animate-in slide-in-from-bottom-5 font-['Arial']">
      {cameraMode && (
        <CameraCapture
          mode="photo"
          onCapture={handleCapture}
          onClose={() => setCameraMode(null)}
        />
      )}

      {/* Header */}
      <div className="p-5 pt-8 border-b flex justify-between items-center bg-slate-900 text-white shrink-0">
        <button onClick={onClose} className="p-4 bg-white/10 rounded-full active:scale-90 touch-target">
          <X size={20} />
        </button>
        <div className="text-center">
          <h2 className="text-base font-black uppercase tracking-tighter">Entrada de Estoque</h2>
          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Recebimento de Nota</p>
        </div>
        <div className="w-12" />
      </div>

      {/* Progress Indicator */}
      <div className="flex bg-slate-100 p-1 mx-5 mt-6 rounded-2xl shrink-0">
        <div className={`flex-1 py-2 text-center rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${step === 1 ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400'}`}>
          1. Captura
        </div>
        <div className={`flex-1 py-2 text-center rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${step === 2 ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400'}`}>
          2. OCR/Anexo
        </div>
        <div className={`flex-1 py-2 text-center rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${(step as any) === 3 ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400'}`}>
          {/* Fix: cast step to any to allow comparison with 3 when narrowed to 1 | 2 by early return */}
          3. Revisão
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto p-6 flex flex-col">
        {step === 1 ? (
          <div className="flex-1 flex flex-col justify-center gap-8 animate-in fade-in duration-500">
            <div className="text-center space-y-3">
              <div className="w-20 h-20 bg-green-50 text-green-600 rounded-[2rem] flex items-center justify-center mx-auto shadow-xl">
                <FileText size={40} />
              </div>
              <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight">Como deseja enviar?</h3>
              <p className="text-slate-400 text-xs font-medium px-10">Capture a imagem nítida da Nota Fiscal para processamento.</p>
            </div>

            <div className="space-y-4">
              <button
                onClick={() => setCameraMode('photo')}
                className="w-full py-8 bg-slate-900 text-white rounded-[2.5rem] flex flex-col items-center gap-3 shadow-2xl active:scale-[0.98] transition-all group"
              >
                <div className="p-4 bg-white/10 rounded-2xl group-active:scale-110 transition-transform">
                  <Camera size={32} className="text-green-400" />
                </div>
                <span className="text-[12px] font-black uppercase tracking-[2px]">Tirar foto da nota</span>
              </button>

              <div className="relative">
                <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-100"></div></div>
                <span className="relative bg-white px-4 left-1/2 -translate-x-1/2 text-[9px] font-black text-slate-300 uppercase tracking-widest">Ou</span>
              </div>

              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileUpload}
                accept="image/*,application/pdf"
                className="hidden"
              />

              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-full py-6 bg-white border-2 border-slate-100 rounded-[2.5rem] flex items-center justify-center gap-4 text-slate-600 active:bg-slate-50 transition-all shadow-sm"
              >
                <Upload size={20} />
                <span className="text-[10px] font-black uppercase tracking-widest">Anexar Arquivo ou PDF</span>
              </button>
            </div>

            <div className="mt-auto p-4 bg-blue-50 border border-blue-100 rounded-2xl flex gap-3">
              <AlertCircle className="text-blue-500 shrink-0" size={20} />
              <p className="text-[10px] text-blue-800 font-medium leading-relaxed italic">
                Dica: Evite sombras e reflexos na imagem para facilitar a leitura futura dos dados.
              </p>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col animate-in slide-in-from-right-5 duration-500">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-[3px]">Visualização do Anexo</h3>
              <button
                onClick={() => { setStep(1); setImageBase64(null); }}
                className="text-[10px] font-black text-red-500 uppercase flex items-center gap-1 active:scale-95"
              >
                <Trash2 size={14} /> Substituir
              </button>
            </div>

            <div className="flex-1 bg-slate-100 rounded-[2.5rem] overflow-hidden border-4 border-white shadow-inner relative group min-h-[300px]">
              {imageBase64 && (
                <img
                  src={imageBase64}
                  alt="Preview da Nota"
                  className="w-full h-full object-contain"
                />
              )}
              <div className="absolute top-4 right-4 p-3 bg-slate-900/60 backdrop-blur-md rounded-xl text-white opacity-0 group-hover:opacity-100 transition-opacity">
                <Maximize2 size={20} />
              </div>
            </div>

            <div className="mt-6 space-y-4">
              <div className="p-5 bg-white border-2 border-slate-50 rounded-2xl flex items-center gap-4 shadow-sm">
                <div className="w-12 h-12 bg-slate-50 rounded-xl flex items-center justify-center text-slate-400">
                  <ImageIcon size={24} />
                </div>
                <div className="flex-1 truncate">
                  <p className="text-[10px] font-black text-slate-800 uppercase truncate">{fileName}</p>
                  <p className="text-[9px] font-bold text-slate-400 uppercase mt-1">Pronto para leitura</p>
                </div>
                <div className="p-2 bg-green-50 text-green-600 rounded-lg">
                  <Check size={16} strokeWidth={4} />
                </div>
              </div>

              <div className="p-6 bg-slate-900 rounded-[2rem] text-white space-y-3 shadow-xl">
                <div className="flex items-center gap-2 text-green-400">
                  <Sparkles size={16} />
                  <span className="text-[10px] font-black uppercase tracking-widest">Módulo de Visão</span>
                </div>
                <p className="text-[11px] font-medium leading-relaxed text-slate-300">
                  O sistema processará a imagem para extrair fornecedor e itens. Avance para validar o que foi lido.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Footer Actions */}
      <div className="p-6 border-t bg-white safe-bottom flex gap-3 shadow-[0_-10px_20px_rgba(0,0,0,0.02)] shrink-0">
        {step === 1 ? (
          <button
            onClick={onClose}
            className="w-full py-5 bg-slate-100 text-slate-400 rounded-2xl font-black uppercase text-[11px] tracking-[2px] active:scale-95 transition-all"
          >
            Cancelar
          </button>
        ) : (
          <>
            <button
              onClick={() => setStep(1)}
              className="flex-1 py-5 bg-slate-50 text-slate-400 rounded-2xl font-black uppercase text-[11px] tracking-[2px] active:scale-95 transition-all"
            >
              Voltar
            </button>
            <button
              onClick={handleAdvanceToValidation}
              disabled={isProcessing}
              className="flex-[2] py-5 bg-green-600 text-white rounded-2xl font-black uppercase text-[11px] tracking-[2px] shadow-xl flex items-center justify-center gap-3 active:scale-95 transition-all"
            >
              {isProcessing ? <Loader2 className="animate-spin" size={18} /> : (
                <>Processar Itens <ArrowRight size={18} /></>
              )}
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default ReceiveInvoice;
