import React, { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, Loader2, AlertTriangle, Check } from 'lucide-react';
import { voiceManager, VoiceState } from '../services/voiceManager';
import { normalizeVoiceText, NormalizationType } from '../utils/voiceNormalizer';
import { processSpokenForInsert } from '../utils/voicePunctuation';

interface VoiceInputProps {
  onTranscript: (text: string) => void;
  placeholder?: string;
  value: string;
  multiline?: boolean;
  className?: string;
  normalizeAs?: NormalizationType;
  dictation?: boolean;
  onKeyDown?: React.KeyboardEventHandler<HTMLInputElement | HTMLTextAreaElement>;
  autoFocus?: boolean;
}

const VoiceInput = React.forwardRef<
  HTMLTextAreaElement | HTMLInputElement,
  VoiceInputProps
>(
  (
    {
      onTranscript,
      placeholder,
      value = '',
      multiline = true,
      className = '',
      normalizeAs = 'default',
      dictation = false,
      onKeyDown,
      autoFocus = false,
    },
    ref
  ) => {
    const [vState, setVState] = useState<VoiceState>(VoiceState.IDLE);
    const [error, setError] = useState<string | null>(null);
    const [showSuccess, setShowSuccess] = useState(false);
    const [listeningSeconds, setListeningSeconds] = useState(0);

    const isThisInstanceActive = useRef(false);
    const timerRef = useRef<number | null>(null);

    const isSupported = voiceManager.isSupported();
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

    const isListening =
      vState === VoiceState.LISTENING || vState === VoiceState.STARTING;

    useEffect(() => {
      if (isListening) {
        setListeningSeconds(0);
        timerRef.current = window.setInterval(() => {
          setListeningSeconds((s) => s + 1);
        }, 1000);
      } else {
        if (timerRef.current) {
          clearInterval(timerRef.current);
          timerRef.current = null;
        }
      }

      return () => {
        if (timerRef.current) clearInterval(timerRef.current);
      };
    }, [isListening]);

    useEffect(() => {
      return () => {
        if (isThisInstanceActive.current) {
          voiceManager.stop();
        }
      };
    }, []);

    const formatTime = (s: number) =>
      `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(
        2,
        '0'
      )}`;

    const handleStart = (e: any) => {
      if (e.cancelable) e.preventDefault();

      if (!isSupported) {
        setError(voiceManager.getUnsupportedMessage());
        return;
      }

      if (voiceManager.getState() !== VoiceState.IDLE) return;

      if (document.activeElement instanceof HTMLElement) {
        document.activeElement.blur(); // fecha teclado virtual
      }

      setError(null);
      setShowSuccess(false);
      isThisInstanceActive.current = true;

      if ('vibrate' in navigator) navigator.vibrate(40);

      voiceManager.start(
        (spokenRaw) => {
          setShowSuccess(true);
          setTimeout(() => setShowSuccess(false), 2000);

          const newText = processSpokenForInsert(spokenRaw, value, {
            dictation,
            normalizeFn: (s) => {
              if (normalizeAs && normalizeAs !== 'default') {
                // Explicitly cast normalizeAs to NormalizationType to resolve assignability error
                return normalizeVoiceText(s, normalizeAs as NormalizationType);
              }
              return s;
            },
          });

          onTranscript(newText);
        },
        (err) => {
          setError(err);
          isThisInstanceActive.current = false;
        },
        (newState) => {
          setVState(newState);
          if (newState === VoiceState.IDLE || newState === VoiceState.ERROR) {
            isThisInstanceActive.current = false;
          }
        }
      );
    };

    const handleStop = (e: any) => {
      if (e.cancelable) e.preventDefault();
      if (isThisInstanceActive.current) {
        voiceManager.stop();
        isThisInstanceActive.current = false;
      }
    };

    const handlers = isMobile
      ? {
        onTouchStart: handleStart,
        onTouchEnd: handleStop,
        onTouchCancel: handleStop,
      }
      : {
        onMouseDown: handleStart,
        onMouseUp: handleStop,
        onMouseLeave: handleStop,
      };

    return (
      <div className="relative w-full">
        {multiline ? (
          <textarea
            ref={ref as React.Ref<HTMLTextAreaElement>}
            className={`w-full p-4 pr-16 bg-white border-2 rounded-[1.25rem] text-[18px] font-medium shadow-sm outline-none transition ${isListening
              ? 'border-green-300 ring-4 ring-green-50'
              : 'border-slate-100'
              } ${className}`}
            placeholder={placeholder || 'Segure para falar…'}
            value={value}
            onChange={(e) => onTranscript(e.target.value)}
            onKeyDown={onKeyDown}
            autoFocus={autoFocus}
          />
        ) : (
          <input
            ref={ref as React.Ref<HTMLInputElement>}
            className={`w-full p-4 pr-16 bg-white border-2 rounded-[1.25rem] text-[18px] font-medium shadow-sm outline-none transition ${isListening
              ? 'border-green-300 ring-4 ring-green-50'
              : 'border-slate-100'
              } ${className}`}
            placeholder={placeholder}
            value={value}
            onChange={(e) => onTranscript(e.target.value)}
            onKeyDown={onKeyDown}
            autoFocus={autoFocus}
          />
        )}

        {/* Mic button */}
        <div className="absolute right-2 top-1/2 -translate-y-1/2 z-20">
          <button
            {...handlers}
            role="button"
            aria-label={isListening ? 'Parar ditado' : 'Iniciar ditado'}
            aria-pressed={isListening}
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                !isListening ? handleStart(e) : handleStop(e);
                e.preventDefault();
              }
            }}
            className={`w-12 h-12 rounded-full flex items-center justify-center shadow-xl transition ${!isSupported
              ? 'bg-slate-200 text-slate-400'
              : showSuccess
                ? 'bg-emerald-500 text-white'
                : isListening
                  ? 'bg-red-500 text-white ring-4 ring-red-100'
                  : 'bg-green-600 text-white hover:bg-green-700'
              }`}
          >
            {!isSupported ? (
              <MicOff size={20} />
            ) : showSuccess ? (
              <Check size={20} strokeWidth={3} />
            ) : vState === VoiceState.STARTING ? (
              <Loader2 size={20} className="animate-spin" />
            ) : (
              <Mic size={20} />
            )}
          </button>
        </div>

        {/* Listening overlay */}
        {isListening && (
          <div className="absolute left-4 bottom-4 bg-white/95 px-4 py-2 rounded-full shadow-md text-sm flex items-center gap-2">
            <span className="animate-pulse text-green-600 font-semibold">
              Ouvindo…
            </span>
            <span className="font-mono text-slate-600">
              {formatTime(listeningSeconds)}
            </span>
          </div>
        )}

        {/* Error */}
        {error && (
          <div
            onClick={() => setError(null)}
            className="absolute -top-10 right-0 bg-slate-900 text-white text-[10px] font-bold px-3 py-2 rounded-xl shadow-xl cursor-pointer flex gap-2 items-center"
          >
            <AlertTriangle size={12} className="text-yellow-400" />
            {error.toUpperCase()}
          </div>
        )}

        {/* aria-live for screen readers */}
        <div aria-live="polite" className="sr-only">
          {value}
        </div>
      </div>
    );
  });

export default VoiceInput;