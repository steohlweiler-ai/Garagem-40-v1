
import { DelayCriteria, ServiceJob } from '../types';

export const formatPlate = (plate: string) => plate.toUpperCase().replace(/[^A-Z0-9]/g, '').substring(0, 7);

export const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
};

export const formatDuration = (seconds?: number) => {
  if (!seconds || seconds < 0) return '00:00';
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  if (hrs > 0) return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

export const generateUUID = () => crypto.randomUUID();

export const debounce = <T extends (...args: any[]) => any>(func: T, wait: number) => {
  let timeout: ReturnType<typeof setTimeout>;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
};

export const blobToBase64 = (blob: Blob): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
};

export const isWorkday = (date: Date) => {
  const day = date.getDay();
  return day !== 0 && day !== 6; // 0=Sunday, 6=Saturday
};

export const calculateDelayStatus = (
  deliveryDateStr: string,
  criteria: DelayCriteria | null,
  priority?: 'baixa' | 'media' | 'alta'
): { isDelayed: boolean; reason: string } => {
  if (!criteria) return { isDelayed: false, reason: "Carregando critérios..." };
  const now = new Date();
  const deliveryDate = new Date(deliveryDateStr);

  if (isNaN(deliveryDate.getTime())) return { isDelayed: false, reason: "Data inválida" };

  let daysToAdd = criteria.thresholdDays;
  let hoursToAdd = criteria.thresholdHours;

  // Aplica overrides de prioridade se existirem
  if (priority && criteria.priorityOverrides) {
    const override = criteria.priorityOverrides.find(o => o.priority === priority);
    if (override) {
      daysToAdd = override.days;
      hoursToAdd = override.hours;
    }
  }

  // Threshold em milissegundos (base simples)
  let thresholdMs = (daysToAdd * 24 * 60 * 60 * 1000) + (hoursToAdd * 60 * 60 * 1000);
  let limitDate = new Date(deliveryDate.getTime() + thresholdMs);

  // Se considerar dias úteis, precisamos "empurrar" o limite se cair em fim de semana
  // ou se o threshold atravessar fins de semana
  if (criteria.considerWorkdays) {
    let tempDate = new Date(deliveryDate);
    let daysCounter = 0;
    while (daysCounter < daysToAdd) {
      tempDate.setDate(tempDate.getDate() + 1);
      if (isWorkday(tempDate)) daysCounter++;
    }
    // Adiciona as horas
    tempDate.setHours(tempDate.getHours() + hoursToAdd);
    // Se a data final cair em fim de semana, move para segunda
    while (!isWorkday(tempDate)) {
      tempDate.setDate(tempDate.getDate() + 1);
    }
    limitDate = tempDate;
  }

  // Se considerar horário comercial, agora só é atrasado se 'now' estiver dentro ou após o horário comercial
  if (criteria.considerBusinessHours) {
    const [startH, startM] = criteria.businessStart.split(':').map(Number);
    const [endH, endM] = criteria.businessEnd.split(':').map(Number);

    const nowH = now.getHours();
    const nowM = now.getMinutes();

    const businessStartTime = startH * 60 + startM;
    const businessEndTime = endH * 60 + endM;
    const nowTime = nowH * 60 + nowM;

    // Se estiver fora do horário comercial (ex: noite), e o limite já passou, 
    // a regra pode dizer que só "atrasa" oficialmente quando abre a oficina.
    // Mas a regra solicitada diz: now > (previsão + threshold).
  }

  const isDelayed = now > limitDate;
  const reason = isDelayed
    ? `Atrasado. Limite era ${limitDate.toLocaleString('pt-BR')}`
    : `No prazo. Limite em ${limitDate.toLocaleString('pt-BR')}`;

  return { isDelayed, reason };
};
