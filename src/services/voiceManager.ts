
type VoiceCallback = (text: string) => void;
type ErrorCallback = (error: string) => void;

export enum VoiceState {
  IDLE = 'IDLE',
  STARTING = 'STARTING',
  LISTENING = 'LISTENING',
  ERROR = 'ERROR'
}

class VoiceManager {
  private recognition: any = null;
  private state: VoiceState = VoiceState.IDLE;
  private watchdogTimer: number | null = null;

  private onResultCb: VoiceCallback | null = null;
  private onErrorCb: ErrorCallback | null = null;
  private onStateChangeCb: ((state: VoiceState) => void) | null = null;

  constructor() {
    this.initRecognition();
  }

  private initRecognition() {
    if (typeof window === 'undefined') return;

    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) return;

    if (this.recognition) {
      try {
        this.recognition.abort();
      } catch (e) { }
    }

    this.recognition = new SR();
    this.recognition.lang = 'pt-BR';
    this.recognition.continuous = false;
    this.recognition.interimResults = false;

    this.recognition.onstart = () => {
      this.clearWatchdog();
      this.updateState(VoiceState.LISTENING);
    };

    this.recognition.onresult = (event: any) => {
      this.clearWatchdog();
      if (event.results && event.results[0]) {
        const text = event.results[0][0].transcript;
        if (this.onResultCb) this.onResultCb(text);
      }
    };

    this.recognition.onerror = (event: any) => {
      this.clearWatchdog();
      console.warn('Voice Engine Error:', event.error);

      let msg = 'Erro no microfone';
      if (event.error === 'not-allowed') msg = 'Acesso Negado (Use HTTPS)';
      if (event.error === 'network') msg = 'Erro de Rede';
      if (event.error === 'no-speech') {
        this.updateState(VoiceState.IDLE);
        return;
      }

      if (this.onErrorCb) this.onErrorCb(msg);
      this.updateState(VoiceState.ERROR);
    };

    this.recognition.onend = () => {
      this.clearWatchdog();
      this.updateState(VoiceState.IDLE);
    };
  }

  private updateState(state: VoiceState) {
    this.state = state;
    if (this.onStateChangeCb) this.onStateChangeCb(state);
  }

  private clearWatchdog() {
    if (this.watchdogTimer) {
      clearTimeout(this.watchdogTimer);
      this.watchdogTimer = null;
    }
  }

  private startWatchdog(ms: number, errorMsg: string) {
    this.clearWatchdog();
    this.watchdogTimer = window.setTimeout(() => {
      this.stop();
      if (this.onErrorCb) this.onErrorCb(errorMsg);
    }, ms);
  }

  public async start(onResult: VoiceCallback, onError: ErrorCallback, onStateChange: (state: VoiceState) => void) {
    if (!this.recognition) {
      this.initRecognition();
      if (!this.recognition) {
        onError('Não suportado');
        return;
      }
    }

    this.onResultCb = onResult;
    this.onErrorCb = onError;
    this.onStateChangeCb = onStateChange;

    try {
      this.updateState(VoiceState.STARTING);

      // Acorda o contexto de áudio se necessário
      const AudioCtx = (window as any).AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        const t = new AudioCtx();
        if (t.state === 'suspended') await t.resume();
      }

      this.recognition.start();
      this.startWatchdog(5000, 'Sem resposta do mic');
    } catch (e) {
      this.updateState(VoiceState.IDLE);
      onError('Clique p/ tentar');
    }
  }

  public stop() {
    this.clearWatchdog();
    if (this.recognition) {
      try {
        this.recognition.stop();
      } catch (e) { }
    }
    this.updateState(VoiceState.IDLE);
  }

  public isSupported() {
    return !!((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition);
  }

  // Check if browser is Firefox (which doesn't support SpeechRecognition)
  public isFirefox() {
    return navigator.userAgent.toLowerCase().includes('firefox');
  }

  // Get user-friendly message for unsupported browsers
  public getUnsupportedMessage() {
    if (this.isFirefox()) {
      return 'Firefox não suporta reconhecimento de voz. Use Chrome ou Safari.';
    }
    return 'Navegador não suporta microfone';
  }

  public getState() {
    return this.state;
  }
}

export const voiceManager = new VoiceManager();
