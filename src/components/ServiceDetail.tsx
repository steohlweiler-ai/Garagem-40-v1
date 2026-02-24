import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  X, Play, CheckCircle, Clock, Camera, Printer, ChevronRight,
  ClipboardList, Edit3, Trash2, User, Wrench,
  Check, Info, Package, DollarSign, StickyNote, Plus, Calendar as CalendarIcon,
  Pause, Search, ChevronDown, ChevronUp, AlertTriangle, PlayCircle, RotateCcw,
  ArrowRight, LayoutPanelTop, BellRing, Trash, BellPlus, History, Video, Mic, Image as ImageIcon,
  CheckCircle2, Timer, Upload, Save, Calendar, Bell, Pencil
} from 'lucide-react';
import { dataProvider } from '../services/dataProvider';
import {
  ServiceJob,
  Vehicle,
  Client,
  ServiceTask,
  ItemMedia,
  ChargeType,
  Reminder,
  ServiceStatus,
  UserAccount
} from '../types';
import {
  formatDuration,
  formatCurrency,
  blobToBase64,
  generateUUID,
  calculateDelayStatus
} from '../utils/helpers';
import { calculateServiceStatus } from '../utils/statusMachine';
import StatusBadge from './StatusBadge';
import EvaluationSheet from './EvaluationSheet';
import PrintModal from './PrintModal';
import VoiceInput from './VoiceInput';
import CameraCapture from './CameraCapture';
import PriceDisplay from './PriceDisplay';

import { useServices as useLegacyServices } from '../providers/ServicesProvider';
import { useServiceById } from '../hooks/useServiceById';
import { useUpdateService } from '../hooks/useUpdateService';
import { useTaskMutations } from '../hooks/useTaskMutations';
import { useReminderMutations } from '../hooks/useReminderMutations';
import { MaintenanceBanner } from './MaintenanceBanner';
import { CircuitOpenError } from '../utils/errors';

interface ServiceDetailProps {
  serviceId: string;
  onClose: () => void;
  onUpdate: () => void;
  user: UserAccount | null;
}

const ServiceDetail: React.FC<ServiceDetailProps> = ({ serviceId, onClose, onUpdate, user }) => {
  // 1. Legacy Context (Ref Data)
  const { allVehicles, allClients, delayCriteria } = useLegacyServices();

  // 2. TanStack Query (Data Fetching)
  const {
    data: service,
    isLoading,
    error: queryError,
    refetch,
    isRefetching
  } = useServiceById(serviceId);

  const updateServiceMutation = useUpdateService();
  const taskMutations = useTaskMutations(serviceId);
  const reminderMutations = useReminderMutations(serviceId);

  // 3. UI/Local State
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [isHeaderExpanded, setIsHeaderExpanded] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [now, setNow] = useState(Date.now());

  const [cameraMode, setCameraMode] = useState<'photo' | 'video' | null>(null);
  const [isProcessingMedia, setIsProcessingMedia] = useState(false);
  const [loadingMedia, setLoadingMedia] = useState<Set<string>>(new Set());
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isAddingReminder, setIsAddingReminder] = useState(false);
  const [newReminderTitle, setNewReminderTitle] = useState('');
  const [historyData, setHistoryData] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [newReminderDate, setNewReminderDate] = useState(
    new Date().toISOString().split('T')[0]
  );
  const [newReminderTime, setNewReminderTime] = useState(
    new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  );

  const [editingReminder, setEditingReminder] = useState<Reminder | null>(null);
  const [editReminderData, setEditReminderData] = useState({ title: '', date: '', time: '' });

  const [selectedTaskForDetails, setSelectedTaskForDetails] = useState<ServiceTask | null>(null);

  const [isAddingTask, setIsAddingTask] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [priceInputValue, setPriceInputValue] = useState('');
  const [viewingMedia, setViewingMedia] = useState<ItemMedia | null>(null);

  // Derived Values
  const vehicle = useMemo(() => allVehicles.find(v => v.id === service?.vehicle_id) || null, [allVehicles, service?.vehicle_id]);
  const client = useMemo(() => allClients.find(c => c.id === service?.client_id) || null, [allClients, service?.client_id]);

  // Sync selected task when service data updates
  useEffect(() => {
    if (service && selectedTaskForDetails) {
      const updatedTask = service.tasks.find(t => t.id === selectedTaskForDetails.id);
      if (updatedTask) setSelectedTaskForDetails(updatedTask);
    }
  }, [service]);

  useEffect(() => {
    setSelectedTaskForDetails(null);
    setShowHistory(false);
  }, [serviceId]);


  useEffect(() => {
    if (selectedTaskForDetails) {
      const val = selectedTaskForDetails.charge_type === 'Fixo'
        ? selectedTaskForDetails.fixed_value
        : selectedTaskForDetails.rate_per_hour;
      setPriceInputValue(new Intl.NumberFormat('pt-BR', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      }).format(val || 0));
    }
  }, [
    selectedTaskForDetails?.fixed_value,
    selectedTaskForDetails?.rate_per_hour,
    selectedTaskForDetails?.charge_type
  ]);

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  // Use a refetch wrapper for legacy mutation logic
  const loadData = () => refetch();

  const isDelayed = useMemo(() => {
    if (!service?.estimated_delivery) return false;
    return calculateDelayStatus(
      service.estimated_delivery,
      delayCriteria,
      service.priority
    ).isDelayed;
  }, [service, delayCriteria]);

  const progress = useMemo(() => {
    if (!service || !service.tasks || service.tasks.length === 0) return 0;
    return Math.round(
      (service.tasks.filter(t => t.status === 'done').length /
        service.tasks.length) * 100
    );
  }, [service]);

  if (isLoading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm">
        <div className="bg-white p-10 rounded-[2.5rem] flex flex-col items-center gap-4 shadow-2xl">
          <svg className="animate-spin h-10 w-10 text-green-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest text-center">
            Buscando detalhes da OS...
          </p>
        </div>
      </div>
    );
  }

  if (queryError || !service) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
        <div className="bg-white p-8 rounded-[2.5rem] w-full max-w-md text-center shadow-2xl relative animate-in zoom-in duration-300">
          <button onClick={onClose} className="absolute top-6 right-6 p-2 text-slate-300 hover:text-slate-500 transition-colors">
            <X size={24} />
          </button>

          {queryError instanceof CircuitOpenError ? (
            <div className="py-4">
              <MaintenanceBanner
                message="O sistema de dados está em manutenção automática na tela de detalhes."
                onRetry={() => refetch()}
              />
            </div>
          ) : (
            <div className="space-y-6">
              <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mx-auto shadow-inner">
                <AlertTriangle size={40} className="text-red-500" />
              </div>
              <div>
                <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight">Falha na Conexão</h3>
                <p className="text-slate-500 text-xs mt-2 leading-relaxed">
                  {(queryError as any)?.message || 'Não foi possível carregar as informações deste serviço.'}
                </p>
              </div>
              <button
                onClick={() => refetch()}
                className="w-full py-4 bg-red-600 active:bg-red-700 text-white rounded-2xl font-black uppercase text-xs tracking-[2px] shadow-lg shadow-red-200 transition-all active:scale-95 flex items-center justify-center gap-2"
              >
                <RotateCcw size={14} />
                Tentar Novamente
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }


  const hasActiveReminders = service.reminders?.some(r => r.status === 'active');

  const refreshServiceStatus = async (currentServiceState: ServiceJob) => {
    const newStatus = calculateServiceStatus(currentServiceState);
    if (newStatus !== currentServiceState.status) {
      const newStatusEntry = {
        id: generateUUID(),
        status: newStatus,
        timestamp: new Date().toISOString(),
        action_source: 'SYSTEM_RULE',
        user_name: 'Sistema'
      };

      await updateServiceMutation.mutateAsync({
        id: currentServiceState.id,
        updates: {
          status: newStatus,
          status_history: [...(currentServiceState.status_history || []), newStatusEntry]
        } as any
      });
    }
  };

  const handleToggleReminder = async (reminder: Reminder) => {
    const nextStatus = reminder.status === 'active' ? 'done' : 'active';
    await reminderMutations.toggleStatus.mutateAsync({ id: reminder.id, status: nextStatus });

    // Check Status Logic
    const updatedReminders = (service?.reminders || []).map(r => r.id === reminder.id ? { ...r, status: nextStatus } : r);
    await refreshServiceStatus({ ...service!, reminders: updatedReminders } as ServiceJob);

    onUpdate();
  };

  const handleDeleteReminder = async (id: string) => {
    await reminderMutations.deleteReminder.mutateAsync(id);

    // Check Status Logic
    const updatedReminders = (service?.reminders || []).filter(r => r.id !== id);
    await refreshServiceStatus({ ...service!, reminders: updatedReminders } as ServiceJob);

    onUpdate();
  };

  const handleEditReminder = (reminder: Reminder) => {
    setEditingReminder(reminder);
    setEditReminderData({
      title: reminder.title,
      date: reminder.date,
      time: reminder.time
    });
  };

  const handleSaveReminderEdit = async () => {
    if (!editingReminder || !editReminderData.title || !editReminderData.date || !editReminderData.time) return;
    await reminderMutations.updateReminder.mutateAsync({
      id: editingReminder.id,
      updates: {
        title: editReminderData.title,
        date: editReminderData.date,
        time: editReminderData.time
      }
    });
    setEditingReminder(null);
    onUpdate();
  };

  const handleAddReminder = async () => {
    if (!newReminderTitle) return;

    const newR: Partial<Reminder> = {
      title: newReminderTitle,
      date: newReminderDate,
      time: newReminderTime
    };

    await reminderMutations.addReminder.mutateAsync(newR);

    // Check Status Logic (New reminder -> possibly LEMBRETE)
    const simReminder = { ...newR, status: 'active' } as Reminder;
    await refreshServiceStatus({ ...service!, reminders: [...(service?.reminders || []), simReminder] } as ServiceJob);

    setNewReminderTitle('');
    setIsAddingReminder(false);
    onUpdate();
  };

  const toggleTaskStatus = async (task: ServiceTask) => {
    const nextStatus = task.status === 'done' ? 'todo' : 'done';

    await taskMutations.updateTask.mutateAsync({
      taskId: task.id,
      updates: {
        status: nextStatus as any,
        started_at: undefined
      }
    });

    // Check Status Logic
    const updatedTasks = (service?.tasks || []).map(t => t.id === task.id ? { ...t, status: nextStatus as any } : t);
    await refreshServiceStatus({ ...service!, tasks: updatedTasks } as any);
  };

  const handleToggleTaskTimer = async (task: ServiceTask) => {
    if (task.status === 'done' || !user) return;

    if (task.status === 'in_progress') {
      const sessionSeconds = task.started_at
        ? Math.floor((Date.now() - new Date(task.started_at).getTime()) / 1000)
        : 0;

      const total = (task.time_spent_seconds || 0) + sessionSeconds;

      await taskMutations.stopTask.mutateAsync({
        taskId: task.id,
        sessionDuration: sessionSeconds,
        totalDuration: total,
        user: { id: user.id, name: user.name },
        startedAt: task.started_at!
      });
    } else {
      // Pause other running tasks first
      for (const t of service?.tasks || []) {
        if (t.status === 'in_progress' && t.id !== task.id) {
          const sSec = t.started_at
            ? Math.floor((Date.now() - new Date(t.started_at).getTime()) / 1000)
            : 0;

          await taskMutations.stopTask.mutateAsync({
            taskId: t.id,
            sessionDuration: sSec,
            totalDuration: (t.time_spent_seconds || 0) + sSec,
            user: { id: user.id, name: user.name },
            startedAt: t.started_at!
          });
        }
      }

      // Start Logic
      await taskMutations.startTask.mutateAsync({
        taskId: task.id,
        user: { id: user.id, name: user.name }
      });
    }

    // CHECK STATUS MACHINE with fresh logic
    // Refetch is handled by onSettled of the mutations
  };

  const handleUpdateTaskCharge = async (updates: Partial<ServiceTask>) => {
    if (!selectedTaskForDetails) return;
    await taskMutations.updateTask.mutateAsync({
      taskId: selectedTaskForDetails.id,
      updates
    });
  };

  const addMediaToTask = async (mediaSource: { url: string; type: 'image' | 'video' } | File) => {
    if (!selectedTaskForDetails) return;
    setIsProcessingMedia(true);
    try {
      let finalUrl = '';
      let mediaType: 'image' | 'video' = 'image';

      if (mediaSource instanceof File) {
        // UPLOAD TO STORAGE
        const uploadedUrl = await dataProvider.uploadFile(mediaSource, 'evidencias');
        if (!uploadedUrl) {
          alert('Erro ao fazer upload da mídia.');
          return;
        }
        finalUrl = uploadedUrl;
        mediaType = mediaSource.type.startsWith('video') ? 'video' : 'image';
      } else if (mediaSource.url.startsWith('blob:')) {
        // BLOB URL CONVERSION (From Camera)
        const response = await fetch(mediaSource.url);
        const blob = await response.blob();
        const ext = mediaSource.type === 'video' ? 'webm' : 'jpg';
        const filename = `capture_${Date.now()}.${ext}`;
        const file = new File([blob], filename, { type: blob.type });

        const uploadedUrl = await dataProvider.uploadFile(file, 'evidencias');
        if (!uploadedUrl) {
          alert('Erro ao salvar captura da câmera.');
          return;
        }
        finalUrl = uploadedUrl;
        mediaType = mediaSource.type;
      } else {
        // Reuse existing URL
        finalUrl = mediaSource.url;
        mediaType = mediaSource.type;
      }

      const newMedia: ItemMedia = { id: generateUUID(), url: finalUrl, type: mediaType };
      const currentMedia = selectedTaskForDetails.media || [];
      await dataProvider.updateTask(serviceId, selectedTaskForDetails.id, { media: [...currentMedia, newMedia] });
      loadData();
      onUpdate();
    } catch (e) {
      console.error(e);
      alert('Erro ao adicionar mídia.');
    } finally {
      setIsProcessingMedia(false);
      setCameraMode(null);
    }
  };

  const removeMediaFromTask = async (mediaId: string) => {
    if (!selectedTaskForDetails || !window.confirm('Excluir mídia?')) return;
    const updatedMedia = (selectedTaskForDetails.media || []).filter(m => m.id !== mediaId);
    await dataProvider.updateTask(serviceId, selectedTaskForDetails.id, { media: updatedMedia });
    loadData();
    onUpdate();
  };

  const handleDeliverService = async () => {
    if (service?.status === ServiceStatus.ENTREGUE) return;
    if (!window.confirm('Confirmar entrega do veículo? Isso encerrará o serviço.')) return;

    const newStatusEntry = {
      id: generateUUID(),
      status: ServiceStatus.ENTREGUE,
      timestamp: new Date().toISOString(),
      action_source: 'MANUAL_DELIVERY',
      user_name: user?.name || 'Usuário'
    };

    await updateServiceMutation.mutateAsync({
      id: serviceId,
      updates: {
        status: ServiceStatus.ENTREGUE,
        status_history: [...(service.status_history || []), newStatusEntry]
      } as any
    });

    onUpdate();
    onClose();
  };

  const handleAddTask = async () => {
    if (!newTaskTitle.trim() || !service) return;

    await taskMutations.addTask.mutateAsync({
      title: newTaskTitle,
      extras: {
        type: 'Extra',
        charge_type: 'Fixo',
        fixed_value: 0,
        rate_per_hour: 0,
        order: service.tasks.length
      }
    });

    setNewTaskTitle('');
    setIsAddingTask(false);
  };

  const handleDeleteTask = async (taskId: string) => {
    if (!window.confirm('Excluir esta etapa permanentemente?')) return;
    await taskMutations.deleteTask.mutateAsync(taskId);
  };

  return (
    <div className="fixed inset-0 z-50 flex md:items-center md:justify-center bg-slate-900/60 backdrop-blur-sm md:p-10 font-['Arial'] animate-in fade-in">
      {/* LIGHTBOX MEDIA VIEWER */}
      {viewingMedia && (
        <div className="fixed inset-0 z-[200] bg-black/95 flex flex-col items-center justify-center p-4 animate-in fade-in duration-200">
          <button
            onClick={() => setViewingMedia(null)}
            className="absolute top-6 right-6 p-3 bg-white/10 rounded-full text-white hover:bg-white/20 transition-all z-10"
          >
            <X size={24} />
          </button>

          <div className="relative w-full h-full flex items-center justify-center max-w-5xl max-h-[85vh]">
            {viewingMedia.type === 'video' ? (
              <video
                src={viewingMedia.url}
                controls
                autoPlay
                className="max-w-full max-h-full rounded-lg shadow-2xl"
              />
            ) : (
              <img
                src={viewingMedia.url}
                alt="Evidence"
                className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
              />
            )}
          </div>
          <p className="text-slate-400 text-sm mt-4 font-mono">
            {viewingMedia.type === 'video' ? 'Reproduzindo Vídeo' : 'Visualizando Imagem'}
          </p>
        </div>
      )}
      {cameraMode && (
        <CameraCapture
          mode={cameraMode}
          onCapture={addMediaToTask}
          onClose={() => setCameraMode(null)}
        />
      )}

      <input
        type="file"
        ref={fileInputRef}
        accept="image/*,video/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) addMediaToTask(file);
        }}
      />

      <div className="bg-gradient-to-br from-slate-100 via-slate-50 to-slate-100 w-full md:max-w-4xl h-full md:h-[95vh] flex flex-col md:rounded-[2.5rem] overflow-hidden shadow-2xl relative">

        {/* HEADER PRINCIPAL */}
        <div className="bg-[#1e293b] text-white shrink-0 z-20 shadow-lg">
          <div className="flex items-center justify-between p-4 px-6 sm:h-[90px]">
            <button
              onClick={onClose}
              className="p-3 bg-white/10 rounded-2xl active:scale-90 transition-all touch-target"
            >
              <X size={22} />
            </button>

            <div className="text-center flex flex-col items-center">
              <h2 className="text-2xl font-black font-mono tracking-tighter leading-none">
                {vehicle?.plate}
              </h2>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-[2px] mt-2">
                {vehicle?.brand} {vehicle?.model}
              </p>
            </div>

            <button
              onClick={() => setIsHeaderExpanded(!isHeaderExpanded)}
              className={`p-3 rounded-2xl transition-all ${isHeaderExpanded
                ? 'bg-white/20 text-white'
                : 'bg-white/5 text-slate-400'
                }`}
            >
              {isHeaderExpanded ? <ChevronUp size={22} /> : <ChevronDown size={22} />}
            </button>
          </div>


          {isHeaderExpanded && (
            <div className="p-4 sm:p-6 pt-4 pb-6 sm:pb-8 px-4 sm:px-10 space-y-4 sm:space-y-6 animate-in slide-in-from-top-4 border-t border-white/5 bg-gradient-to-b from-slate-900/50 to-slate-900/30 backdrop-blur-sm">
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
                {/* Card Proprietário */}
                <div className="bg-white/5 backdrop-blur-md rounded-2xl p-3.5 sm:p-4 border border-white/10 shadow-lg hover:bg-white/10 transition-all">
                  <p className="text-[8px] font-black uppercase text-slate-500 tracking-[2px] mb-1.5 sm:mb-2">
                    Proprietário
                  </p>
                  <p className="text-[11px] sm:text-[11px] font-black uppercase tracking-tight text-white truncate">
                    {client?.name}
                  </p>
                </div>

                {/* Card Entrada */}
                <div className="bg-white/5 backdrop-blur-md rounded-2xl p-3.5 sm:p-4 border border-white/10 shadow-lg hover:bg-white/10 transition-all">
                  <p className="text-[8px] font-black uppercase text-slate-500 tracking-[2px] mb-1.5 sm:mb-2">
                    Entrada
                  </p>
                  <p className="text-[11px] sm:text-[11px] font-black uppercase tracking-tight text-white">
                    {new Date(service.entry_at).toLocaleDateString('pt-BR')}
                  </p>
                </div>

                {/* Card Previsão Saída */}
                <div className="bg-white/5 backdrop-blur-md rounded-2xl p-3.5 sm:p-4 border border-white/10 shadow-lg hover:bg-white/10 transition-all">
                  <p className="text-[8px] font-black uppercase text-slate-500 tracking-[2px] mb-1.5 sm:mb-2">
                    Previsão Saída
                  </p>
                  <p className="text-[11px] sm:text-[11px] font-black uppercase tracking-tight text-green-400 truncate">
                    {service.estimated_delivery
                      ? new Date(service.estimated_delivery).toLocaleString('pt-BR')
                      : '---'}
                  </p>
                </div>

                {/* Card Logs (com botão) */}
                <div className="bg-white/5 backdrop-blur-md rounded-2xl p-3.5 sm:p-4 border border-white/10 shadow-lg flex items-center justify-center">
                  <button
                    onClick={async () => {
                      if (!showHistory) {
                        setLoadingHistory(true);
                        const data = await dataProvider.getTaskHistory(serviceId);
                        setHistoryData(data);
                        setLoadingHistory(false);
                      }
                      setShowHistory(!showHistory);
                    }}
                    className={`flex items-center gap-2 px-3 sm:px-4 py-2 border rounded-xl transition-all shadow-sm w-full justify-center ${showHistory
                      ? 'bg-blue-500 text-white border-blue-600'
                      : 'bg-blue-500/20 border-blue-400/30 text-blue-300 hover:bg-blue-500/30 hover:text-blue-200'}`}
                  >
                    <History size={14} strokeWidth={3} />
                    <span className="text-[9px] font-black uppercase tracking-wider">Logs</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* HISTORY SECTION (New) */}
          {showHistory && (
            <div className="bg-slate-900 border-y border-white/10 p-4 sm:p-6 animate-in slide-in-from-top-4 space-y-4">
              <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                <History size={14} /> Histórico de Execução
              </h3>

              {loadingHistory ? (
                <div className="text-slate-500 text-xs italic">Carregando histórico...</div>
              ) : historyData.length === 0 ? (
                <div className="text-slate-500 text-xs italic">Nenhum registro encontrado.</div>
              ) : (
                <div className="space-y-2 max-h-60 overflow-y-auto custom-scrollbar pr-2">
                  {historyData.map((log: any) => (
                    <div key={log.id} className="flex items-start gap-3 text-xs bg-white/5 p-3 rounded-xl border border-white/5">
                      <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center shrink-0">
                        <User size={14} className="text-slate-400" />
                      </div>
                      <div>
                        <p className="text-slate-300 font-bold mb-0.5">
                          {log.user_name || 'Usuário Desconhecido'}
                        </p>
                        <p className="text-slate-400">
                          Executou <span className="text-slate-200 font-medium">"{log.tarefas?.title || 'Tarefa'}"</span> por {formatDuration(log.duration_seconds || 0)}
                        </p>
                        <p className="text-[10px] text-slate-600 mt-1 uppercase font-bold tracking-wider">
                          {new Date(log.started_at).toLocaleString('pt-BR')}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="h-1 w-full bg-white/5 overflow-hidden">
            <div
              className="h-full bg-green-500 transition-all duration-1000 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>

          <div className="flex w-full h-16 border-t border-white/5 overflow-hidden shadow-inner">
            <button
              onClick={() => setIsAddingReminder(true)}
              className={`flex-1 flex items-center justify-center gap-3 transition-all active:brightness-95 ${hasActiveReminders
                ? 'bg-amber-400 text-amber-950'
                : 'bg-slate-800/40 text-slate-400'
                }`}
            >
              <BellRing size={18} strokeWidth={hasActiveReminders ? 3 : 2} />
              <span className="text-[11px] font-black uppercase tracking-[2.5px]">
                Lembretes
              </span>
              <Plus
                size={14}
                className={hasActiveReminders ? 'text-amber-900' : 'text-slate-500'}
                strokeWidth={4}
              />
            </button>

            <div className="w-[1px] bg-white/5" />

            <div className="flex-[0.9] flex items-center justify-center bg-slate-900/10">
              <StatusBadge
                status={service.status}
                size="sm"
                delayed={isDelayed}
                minimal
              />
            </div>
          </div>
        </div>

        {/* ÁREA DE CONTEÚDO */}
        <div className="flex-1 overflow-y-auto p-0 space-y-0 custom-scrollbar pb-40 relative">

          {/* LISTA DE LEMBRETES */}
          {isAddingReminder && (
            <div className="p-4 bg-amber-50 border-b border-amber-100 flex flex-col gap-3 animate-in slide-in-from-top-2">
              <VoiceInput
                value={newReminderTitle}
                onTranscript={setNewReminderTitle}
                placeholder="Título do Lembrete..."
                multiline={false}
                className="w-full !p-3 !pr-16 !rounded-xl !border !border-amber-200 !bg-white !text-base !font-medium !text-slate-700 !outline-none focus:!ring-2 focus:!ring-amber-300"
              />
              <div className="flex gap-2">
                <input
                  type="date"
                  className="p-2 rounded-xl border border-amber-200 bg-white text-sm font-medium text-slate-500 outline-none w-1/2"
                  value={newReminderDate}
                  onChange={(e) => setNewReminderDate(e.target.value)}
                />
                <input
                  type="time"
                  className="p-2 rounded-xl border-amber-200 bg-white text-sm font-medium text-slate-500 outline-none w-1/3"
                  value={newReminderTime}
                  onChange={(e) => setNewReminderTime(e.target.value)}
                />
                <button
                  onClick={handleAddReminder}
                  disabled={reminderMutations.addReminder.isPending}
                  className="flex-1 bg-amber-400 text-amber-950 rounded-xl font-black uppercase text-[10px] tracking-widest hover:bg-amber-500 transition-colors disabled:opacity-50"
                >
                  {reminderMutations.addReminder.isPending ? (
                    <RefreshCw size={14} className="animate-spin mx-auto" />
                  ) : (
                    'Salvar'
                  )}
                </button>
              </div>
            </div>
          )}

          {service.reminders && service.reminders.length > 0 && (
            <section className="sticky top-0 z-10 bg-[#f8fafc] border-b border-amber-100 p-4 sm:p-6 space-y-4 animate-in slide-in-from-top-4 shadow-sm">
              <div className="flex justify-between items-center px-1">
                <h3 className="text-[10px] font-black text-amber-600 uppercase tracking-[4px] flex items-center gap-2">
                  <Bell size={14} className="text-amber-500" /> Alertas Internos
                </h3>
              </div>

              <div className="flex flex-col gap-2">
                {service.reminders.map(rem => (
                  <div
                    key={rem.id}
                    className={`p-4 rounded-2xl border-2 flex items-center justify-between transition-all ${rem.status === 'done'
                      ? 'bg-slate-50/50 border-slate-100 opacity-40'
                      : 'bg-amber-50 border-amber-200 shadow-sm'
                      }`}
                  >
                    <div className="flex gap-4 items-center">
                      <button
                        onClick={() => handleToggleReminder(rem)}
                        disabled={reminderMutations.toggleStatus.isPending}
                        className={`w-7 h-7 rounded-full border-2 flex items-center justify-center transition-all disabled:opacity-50 ${rem.status === 'done'
                          ? 'bg-green-500 border-green-500 text-white'
                          : 'bg-white border-amber-300'
                          }`}
                      >
                        {reminderMutations.toggleStatus.isPending && reminderMutations.toggleStatus.variables?.id === rem.id ? (
                          <RefreshCw size={12} className="animate-spin" />
                        ) : rem.status === 'done' ? (
                          <Check size={12} strokeWidth={4} />
                        ) : null}
                      </button>

                      <div>
                        <p
                          className={`text-sm font-semibold uppercase tracking-tight ${rem.status === 'done'
                            ? 'line-through text-slate-400'
                            : 'text-amber-900'
                            }`}
                        >
                          {rem.title}
                        </p>
                        <p className="text-xs font-medium text-amber-500 uppercase mt-0.5">
                          {rem.date} • {rem.time}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleEditReminder(rem)}
                        className="p-2 text-amber-300 hover:text-indigo-500 active:scale-125 transition-all"
                        title="Editar lembrete"
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        onClick={() => handleDeleteReminder(rem.id)}
                        disabled={reminderMutations.deleteReminder.isPending}
                        className="p-2 text-amber-300 hover:text-red-500 active:scale-125 transition-all disabled:opacity-50"
                        title="Excluir lembrete"
                      >
                        {reminderMutations.deleteReminder.isPending && reminderMutations.deleteReminder.variables === rem.id ? (
                          <RefreshCw size={14} className="animate-spin" />
                        ) : (
                          <Trash size={14} />
                        )}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* PLANO DE EXECUÇÃO */}
          <div className="p-4 sm:p-10 space-y-8">
            <section className="space-y-6 animate-in fade-in duration-700">
              <div className="flex justify-between items-center px-4 border-b border-slate-100 pb-2">
                <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-[4px]">
                  Plano de Execução
                </h3>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-black text-slate-300 uppercase tracking-widest">
                    {service.tasks.filter(t => t.status === 'done').length}/
                    {service.tasks.length}
                  </span>
                  <CheckCircle2
                    size={14}
                    className={progress === 100 ? 'text-green-500' : 'text-slate-200'}
                  />
                </div>
              </div>

              {/* LISTA DE TASKS — CONTINUA NA PARTE 3/3 */}
              <div className="flex flex-col gap-5">
                {(service.tasks || []).sort((a, b) => (a.order || 0) - (b.order || 0)).map(task => {
                  const isTaskInProgress = task.status === 'in_progress';
                  const elapsed =
                    isTaskInProgress && task.started_at
                      ? Math.floor(
                        (now - new Date(task.started_at).getTime()) / 1000
                      )
                      : 0;

                  const displaySeconds =
                    (task.time_spent_seconds || 0) + elapsed;

                  return (
                    <div
                      key={task.id}
                      className={`relative bg-white rounded-3xl border transition-all duration-300 shadow-sm hover:shadow-md ${isTaskInProgress
                        ? 'border-purple-200 shadow-purple-100 ring-4 ring-purple-50/50'
                        : task.status === 'done'
                          ? 'border-green-100 opacity-75'
                          : 'border-slate-100'
                        }`}
                    >
                      {/* LAYOUT COMPACTO: ROW ÚNICA (PREDOMINANTE) */}
                      <div className="flex items-center p-3 sm:p-4 gap-3">

                        {/* 1. BUTTON CHECK (Left) */}
                        <button
                          onClick={() => toggleTaskStatus(task)}
                          disabled={taskMutations.updateTask.isPending}
                          className={`w-10 h-10 sm:w-12 sm:h-12 rounded-2xl border-2 flex items-center justify-center shrink-0 transition-all active:scale-90 ${task.status === 'done'
                            ? 'bg-green-500 border-green-500 text-white shadow-md shadow-green-200'
                            : 'bg-slate-50 border-slate-200 text-transparent hover:border-slate-300'
                            } disabled:opacity-50`}
                        >
                          {taskMutations.updateTask.isPending && taskMutations.updateTask.variables?.taskId === task.id ? (
                            <RotateCcw size={20} className="animate-spin text-slate-300" />
                          ) : (
                            <Check size={20} strokeWidth={4} />
                          )}
                        </button>

                        {/* 2. MAIN INFO (Middle) */}
                        <div className="flex-1 min-w-0 flex flex-col justify-center">
                          <h4
                            className={`text-xs sm:text-sm font-black uppercase tracking-tight leading-tight mb-1 truncate ${task.status === 'done'
                              ? 'text-slate-400 line-through'
                              : 'text-slate-900'
                              }`}
                          >
                            {task.title}
                          </h4>

                          <div className="flex flex-wrap items-center gap-2">
                            {/* Badges */}
                            <span className="text-[8px] font-black bg-slate-100 text-slate-500 px-2 py-0.5 rounded-lg uppercase border border-slate-200">
                              {task.charge_type === 'Fixo' ? 'Fix' : 'Hora'}
                            </span>

                            {task.charge_type === 'Hora' && (
                              <span className="text-[8px] font-black bg-blue-50 text-blue-600 px-2 py-0.5 rounded-lg uppercase border border-blue-100">
                                {task.type || 'Serv'}
                              </span>
                            )}



                            {/* EXECUTOR BADGE (Inline - Persisted) */}
                            {typeof task.last_executor_name === 'string' && task.last_executor_name.length > 0 && (
                              <span className={`text-[8px] font-black px-2 py-0.5 rounded-lg uppercase border animate-in fade-in flex items-center gap-1 ${isTaskInProgress
                                ? 'bg-purple-100 text-purple-700 border-purple-200'
                                : 'bg-slate-100 text-slate-500 border-slate-200'
                                }`}>
                                {isTaskInProgress ? (
                                  <span className="w-1.5 h-1.5 bg-purple-500 rounded-full animate-pulse" />
                                ) : (
                                  <User size={8} className="text-slate-400" />
                                )}
                                {task.last_executor_name.split(' ')[0]}
                              </span>
                            )}

                            <PriceDisplay
                              value={
                                task.charge_type === 'Fixo'
                                  ? task.fixed_value
                                  : (task.rate_per_hour *
                                    (task.time_spent_seconds || 0)) /
                                  3600
                              }
                              user={user}
                              className="text-[9px] font-black text-slate-700 bg-slate-50 px-2 py-0.5 rounded-lg border border-slate-100 ml-auto sm:ml-0"
                            />
                          </div>
                        </div>

                        {/* 3. ACTIONS (Right) */}
                        <div className="flex items-center gap-2 sm:gap-3 shrink-0">

                          {/* Timer / Play Button Combined */}
                          <div className="flex flex-col items-end gap-1">
                            <button
                              onClick={() => handleToggleTaskTimer(task)}
                              disabled={taskMutations.startTask.isPending || taskMutations.stopTask.isPending}
                              className={`w-10 h-10 sm:w-11 sm:h-11 rounded-full flex items-center justify-center transition-all shadow-sm active:scale-95 border-2 ${isTaskInProgress
                                ? 'bg-purple-600 border-purple-500 text-white animate-pulse shadow-purple-200'
                                : 'bg-white text-slate-400 border-slate-200 hover:border-slate-300 hover:text-slate-600'
                                } disabled:opacity-50`}
                            >
                              {(taskMutations.startTask.isPending && taskMutations.startTask.variables?.taskId === task.id) ||
                                (taskMutations.stopTask.isPending && taskMutations.stopTask.variables?.taskId === task.id) ? (
                                <RotateCcw size={16} className="animate-spin" />
                              ) : isTaskInProgress ? (
                                <Pause size={16} fill="currentColor" />
                              ) : (
                                <Play size={16} fill="currentColor" className="ml-0.5" />
                              )}
                            </button>

                            {/* Timer Display (Always visible or only if started?) - User requests similar to image which shows timer */}
                            {(isTaskInProgress || (task.time_spent_seconds || 0) > 0) && (
                              <span className={`text-[9px] font-black font-mono tracking-tight ${isTaskInProgress ? 'text-purple-600 animate-pulse' : 'text-slate-400'}`}>
                                {formatDuration(displaySeconds)}
                              </span>
                            )}
                          </div>

                          {/* Details Button */}
                          <button
                            onClick={() => setSelectedTaskForDetails(task)}
                            className="w-8 h-8 sm:w-10 sm:h-10 bg-slate-50 rounded-xl text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-all active:scale-90 border border-slate-200 flex items-center justify-center"
                          >
                            <Search size={16} strokeWidth={2.5} />
                          </button>

                          {/* Delete Button */}
                          <button
                            onClick={() => handleDeleteTask(task.id)}
                            disabled={taskMutations.deleteTask.isPending}
                            className="w-8 h-8 sm:w-10 sm:h-10 bg-red-50 rounded-xl text-red-300 hover:text-red-500 hover:bg-red-100 transition-all active:scale-90 border border-red-100 flex items-center justify-center disabled:opacity-50"
                            title="Excluir etapa"
                          >
                            {taskMutations.deleteTask.isPending && taskMutations.deleteTask.variables === task.id ? (
                              <RotateCcw size={16} className="animate-spin" />
                            ) : (
                              <Trash2 size={16} strokeWidth={2.5} />
                            )}
                          </button>
                        </div>
                      </div>

                      {/* 4. EXECUTOR BADGE (Absolute or row?) - Keeping safe logic */}


                      {/* 5. MEDIA INDICATOR (Mini) */}
                      {task.media && task.media.length > 0 && (
                        <div className="absolute -bottom-2 left-6 flex -space-x-1.5">
                          {task.media.slice(0, 3).map(m => (
                            <div key={m.id} className="w-5 h-5 rounded-full border border-white bg-slate-200 overflow-hidden shadow-sm">
                              {m.type === 'video' ? (
                                <div className="w-full h-full flex items-center justify-center bg-slate-800 text-white"><Video size={8} /></div>
                              ) : (
                                <img src={m.url} className="w-full h-full object-cover" />
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}

                {
                  service.tasks.length === 0 && (
                    <div className="py-20 text-center border-2 border-dashed border-slate-100 rounded-[3rem] bg-slate-50/50">
                      <LayoutPanelTop
                        size={40}
                        className="text-slate-200 mx-auto mb-4"
                      />
                      <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest px-10">
                        Nenhum item adicionado ao plano de execução
                      </p>
                    </div>
                  )
                }
              </div>

              {/* ADICIONAR NOVA ETAPA MANUAL */}
              <div className="pt-2">
                {
                  isAddingTask ? (
                    <div className="bg-white rounded-[2.5rem] border-2 border-slate-100 shadow-sm p-6 animate-in slide-in-from-top-2" >
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl border-2 border-slate-100 bg-slate-50 flex items-center justify-center text-slate-300">
                          <Wrench size={24} strokeWidth={2} />
                        </div>
                        <div className="flex-1">
                          <VoiceInput
                            value={newTaskTitle}
                            onTranscript={setNewTaskTitle}
                            placeholder="Nome da nova etapa..."
                            multiline={false}
                            autoFocus
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleAddTask();
                              if (e.key === 'Escape') setIsAddingTask(false);
                            }}
                            className="!w-full !p-2 !pr-14 !bg-transparent !border-0 !shadow-none !text-sm !font-black !text-slate-800 !placeholder-slate-300 !outline-none !uppercase !tracking-tight !ring-0"
                          />
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => setIsAddingTask(false)}
                            className="p-3 text-slate-300 hover:text-red-400 transition-colors"
                          >
                            <X size={20} />
                          </button>
                          <button
                            onClick={handleAddTask}
                            disabled={taskMutations.addTask.isPending}
                            className="p-3 bg-slate-900 text-white rounded-xl hover:scale-105 active:scale-95 transition-all shadow-lg disabled:opacity-50"
                          >
                            {taskMutations.addTask.isPending ? (
                              <RotateCcw size={20} className="animate-spin" />
                            ) : (
                              <Check size={20} />
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => setIsAddingTask(true)}
                      className="w-full py-4 border-2 border-dashed border-slate-200 rounded-[2.5rem] flex items-center justify-center gap-3 text-slate-400 hover:text-slate-600 hover:border-slate-300 hover:bg-slate-50 transition-all group"
                    >
                      <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center group-hover:bg-white group-hover:shadow-sm transition-all">
                        <Plus size={16} />
                      </div>
                      <span className="text-[10px] font-black uppercase tracking-widest">
                        Adicionar Nova Etapa
                      </span>
                    </button>
                  )}
              </div>

              {/* TOTAIS DAS ETAPAS */}
              {
                service.tasks.length > 0 && (
                  <div className="mt-6 bg-gradient-to-br from-slate-800 to-slate-900 rounded-[2.5rem] p-8 shadow-2xl border-2 border-slate-700 animate-in fade-in-50">
                    <div className="flex items-center justify-between mb-6">
                      <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-[4px] flex items-center gap-2">
                        <Info size={14} className="text-slate-500" />
                        Resumo Geral
                      </h4>
                    </div>

                    <div className="grid grid-cols-2 gap-6">
                      {/* TEMPO TOTAL */}
                      <div className="bg-gradient-to-br from-purple-500/10 to-purple-600/10 rounded-2xl p-4 border border-purple-400/20 shadow-lg flex flex-col items-center text-center">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="w-8 h-8 rounded-xl bg-purple-500/20 flex items-center justify-center">
                            <Clock size={16} className="text-purple-400" strokeWidth={2.5} />
                          </div>
                          <span className="text-[8px] font-black uppercase text-purple-300 tracking-[2px]">
                            Tempo Total
                          </span>
                        </div>
                        <span className="text-xl font-black font-mono text-white leading-none">
                          {formatDuration(
                            service.tasks.reduce((acc, task) => {
                              const isTaskInProgress = task.status === 'in_progress';
                              const elapsed = isTaskInProgress && task.started_at
                                ? Math.floor((now - new Date(task.started_at).getTime()) / 1000)
                                : 0;
                              return acc + (task.time_spent_seconds || 0) + elapsed;
                            }, 0)
                          )}
                        </span>
                        <div className="text-[8px] font-bold text-purple-300/70 uppercase tracking-wider mt-1">
                          {service.tasks.filter(t => t.status === 'done').length} de {service.tasks.length} concluídas
                        </div>
                      </div>

                      {/* VALOR TOTAL */}
                      <div className="bg-gradient-to-br from-green-500/10 to-emerald-600/10 rounded-2xl p-4 border border-green-400/20 shadow-lg flex flex-col items-center text-center">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="w-8 h-8 rounded-xl bg-green-500/20 flex items-center justify-center">
                            <DollarSign size={16} className="text-green-400" strokeWidth={2.5} />
                          </div>
                          <span className="text-[8px] font-black uppercase text-green-300 tracking-[2px]">
                            Valor Total
                          </span>
                        </div>
                        <div className="w-full flex justify-center">
                          {(() => {
                            const totalValue = service.tasks.reduce((acc, task) => {
                              if (task.charge_type === 'Fixo') {
                                return acc + (task.fixed_value || 0);
                              } else {
                                const isTaskInProgress = task.status === 'in_progress';
                                const elapsed = isTaskInProgress && task.started_at
                                  ? Math.floor((now - new Date(task.started_at).getTime()) / 1000)
                                  : 0;
                                const totalSeconds = (task.time_spent_seconds || 0) + elapsed;
                                return acc + ((task.rate_per_hour || 0) * totalSeconds) / 3600;
                              }
                            }, 0);

                            return (
                              <PriceDisplay
                                value={totalValue}
                                user={user}
                                className="text-xl font-black font-mono text-white leading-none whitespace-nowrap block"
                              />
                            );
                          })()}
                        </div>
                        <div className="text-[8px] font-bold text-green-300/70 uppercase tracking-wider mt-1">
                          Soma de todas as etapas
                        </div>
                      </div>
                    </div>
                  </div>
                )
              }
            </section >
          </div >
        </div >

        {/* BARRA INFERIOR DE AÇÕES */}
        < div className="bg-[#1e293b] border-t border-white/10 p-4 pb-6 flex items-center justify-around shrink-0 z-30 shadow-[0_-10px_40px_-15px_rgba(0,0,0,0.3)] rounded-b-[2.5rem]" >
          <button
            onClick={() => setIsSheetOpen(true)}
            className="flex flex-col items-center gap-1 group"
          >
            <div className="p-3 bg-blue-500/10 rounded-2xl group-active:scale-90 transition-all border-2 border-blue-500/20 text-blue-400 group-hover:text-blue-300 group-hover:border-blue-400/30 shadow-xl shadow-blue-500/5">
              <ClipboardList size={22} strokeWidth={2.5} />
            </div>
            <span className="text-[8px] font-black uppercase text-blue-400 group-hover:text-blue-300 tracking-widest">
              Ficha
            </span>
          </button>

          <button
            onClick={() => setShowPrintModal(true)}
            className="flex flex-col items-center gap-1 group"
          >
            <div className="p-3 bg-orange-500/10 rounded-2xl group-active:scale-90 transition-all border-2 border-orange-500/20 text-amber-400 group-hover:text-amber-300 group-hover:border-orange-400/30 shadow-xl shadow-orange-500/5">
              <Printer size={22} strokeWidth={2.5} />
            </div>
            <span className="text-[8px] font-black uppercase text-amber-400 group-hover:text-amber-300 tracking-widest">
              Imprimir
            </span>
          </button>

          <button
            onClick={handleDeliverService}
            disabled={updateServiceMutation.isPending}
            className="flex flex-col items-center gap-1 group disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <div className={`p-3 rounded-2xl group-active:scale-90 transition-all border-2 shadow-xl ${progress === 100
              ? 'bg-green-500 text-white shadow-green-500/20 border-green-400 group-hover:bg-green-400'
              : 'bg-green-500/10 text-green-400 shadow-green-500/5 border-green-500/20 group-hover:text-green-300 group-hover:border-green-400/30'
              }`}>
              {updateServiceMutation.isPending ? (
                <RotateCcw size={22} className="animate-spin" />
              ) : (
                <CheckCircle size={22} strokeWidth={2.5} />
              )}
            </div>
            <span className={`text-[8px] font-black uppercase tracking-widest ${progress === 100 ? 'text-green-400' : 'text-green-400 group-hover:text-green-300'
              }`}>
              {updateServiceMutation.isPending ? 'Sincronizando...' : 'Entregar'}
            </span>
          </button>
        </div >

        {/* PANEL DETALHES DA ETAPA (LUPA) */}
        {
          selectedTaskForDetails && (
            <div className="fixed inset-0 z-[100] flex items-end justify-center animate-in fade-in duration-300">
              <div
                className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
                onClick={() => setSelectedTaskForDetails(null)}
              />

              <div className="bg-white w-full max-w-2xl rounded-t-[3.5rem] p-8 space-y-8 animate-in slide-in-from-bottom-20 shadow-2xl relative z-10 max-h-[90vh] overflow-y-auto font-['Arial'] custom-scrollbar">

                {/* CABEÇALHO */}
                <div className="flex justify-between items-start">
                  <div className="space-y-1">
                    <span className="text-[9px] font-black bg-blue-50 text-blue-600 px-3 py-1 rounded-full uppercase">
                      {selectedTaskForDetails.type || 'Etapa'}
                    </span>
                    <h3 className="text-xl font-black uppercase text-slate-800 pt-2 tracking-tight">
                      {selectedTaskForDetails.title}
                    </h3>
                  </div>

                  <button
                    onClick={() => setSelectedTaskForDetails(null)}
                    className="p-4 bg-slate-100 rounded-full text-slate-400 active:scale-90"
                  >
                    <X size={24} />
                  </button>
                </div>

                {/* CONFIGURAÇÃO DE VALOR (Apenas se tiver permissão financeira) */}
                {user?.permissions?.view_financials && (
                  <div className="bg-slate-50 p-6 rounded-[2.5rem] border-2 border-slate-100 space-y-5">
                    <div className="flex justify-between items-center">
                      <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-widest flex items-center gap-2">
                        <DollarSign size={14} /> Configuração de Valor
                      </h4>
                      <span className="text-[8px] font-black bg-white px-2 py-0.5 rounded-lg border border-slate-200 text-slate-300 uppercase">
                        Item da OS
                      </span>
                    </div>

                    <div className="flex p-1 bg-white border border-slate-200 rounded-2xl">
                      {['Hora', 'Fixo'].map(ct => (
                        <button
                          key={ct}
                          onClick={() =>
                            handleUpdateTaskCharge({ charge_type: ct as ChargeType })
                          }
                          className={`flex-1 py-3 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${selectedTaskForDetails.charge_type === ct
                            ? 'bg-slate-900 text-white shadow-lg'
                            : 'text-slate-400 hover:bg-slate-50'
                            }`}
                        >
                          {ct}
                        </button>
                      ))}
                    </div>

                    {/* CAMPO DE VALOR */}
                    <div className="space-y-1.5">
                      <label className="text-[9px] font-black uppercase text-slate-400 ml-1">
                        {selectedTaskForDetails.charge_type === 'Fixo'
                          ? 'Preço do Serviço (R$)'
                          : 'Valor da Hora Técnica (R$)'}
                      </label>

                      <div className="relative">
                        <input
                          type="text"
                          inputMode="decimal"
                          value={priceInputValue}
                          onFocus={(e) => e.target.select()} // Seleciona tudo ao clicar
                          onChange={(e) => setPriceInputValue(e.target.value)}
                          onBlur={() => {
                            const clean = priceInputValue.replace(/\./g, '').replace(',', '.');
                            const val = parseFloat(clean) || 0;
                            handleUpdateTaskCharge(
                              selectedTaskForDetails.charge_type === 'Fixo'
                                ? { fixed_value: val }
                                : { rate_per_hour: val }
                            );
                          }}
                          placeholder="0,00"
                          className="w-full p-4 pr-20 bg-white border-2 border-transparent focus:border-green-500 rounded-2xl text-lg font-black outline-none transition-all shadow-inner"
                        />
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 z-20">
                          <VoiceInput
                            multiline={false}
                            normalizeAs="currency"
                            value=""
                            onTranscript={(text) => {
                              // Normalizer retorna "123.45" (US format), apenas parsear
                              const val = parseFloat(text) || 0;
                              handleUpdateTaskCharge(
                                selectedTaskForDetails.charge_type === 'Fixo'
                                  ? { fixed_value: val }
                                  : { rate_per_hour: val }
                              );
                            }}
                            className="!w-12 !h-12 !p-0 !bg-transparent !border-0 !shadow-none"
                          />
                        </div>
                        <span className="absolute right-16 top-1/2 -translate-y-1/2 text-slate-400 font-black text-sm pointer-events-none z-10">
                          R$
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* OBSERVAÇÕES */}
                <div className="space-y-6">
                  <div className="grid grid-cols-1 gap-6">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1 flex items-center gap-2">
                        <User size={12} /> Relato do Cliente
                      </label>
                      <div className="p-5 bg-white rounded-2xl text-sm text-slate-700 font-medium italic border-2 border-slate-50 leading-relaxed shadow-sm">
                        {selectedTaskForDetails.relato || "Sem observações registradas."}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1 flex items-center gap-2">
                        <Wrench size={12} /> Diagnóstico Técnico
                      </label>
                      <VoiceInput
                        value={selectedTaskForDetails.diagnostico || ''}
                        onTranscript={(v) => handleUpdateTaskCharge({ diagnostico: v })}
                        placeholder="Atualize o diagnóstico aqui..."
                        className="!bg-white !rounded-2xl !border-2 !border-slate-50 !shadow-sm"
                      />
                    </div>
                  </div>

                  {/* GALERIA DE MÍDIAS */}
                  <div className="space-y-4">
                    <div className="flex justify-between items-center px-1">
                      <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest flex items-center gap-2">
                        <ImageIcon size={12} /> Galeria de Evidências
                      </label>
                      <div className="flex gap-2">
                        <button onClick={() => setCameraMode('photo')} className="p-2 bg-slate-900 text-white rounded-lg active:scale-90 transition-all">
                          <Camera size={16} />
                        </button>
                        <button onClick={() => setCameraMode('video')} className="p-2 bg-slate-900 text-white rounded-lg active:scale-90 transition-all">
                          <Video size={16} />
                        </button>
                        <button onClick={() => fileInputRef.current?.click()} className="p-2 bg-slate-100 text-slate-500 rounded-lg active:scale-90 transition-all border border-slate-200">
                          <Upload size={16} />
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                      {selectedTaskForDetails.media && selectedTaskForDetails.media.length > 0 ? (
                        selectedTaskForDetails.media.map(m => (
                          <div
                            key={m.id}
                            onClick={() => setViewingMedia(m)}
                            className="aspect-square rounded-[2rem] overflow-hidden border-2 border-slate-100 shadow-sm group relative bg-slate-50 cursor-pointer"
                          >
                            {loadingMedia.has(m.id) && (
                              <div className="absolute inset-0 flex items-center justify-center bg-slate-100 z-10">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-400"></div>
                              </div>
                            )}
                            {m.type === 'image' ? (
                              <img
                                src={m.url}
                                className="w-full h-full object-cover transition-transform group-hover:scale-110"
                                onLoad={() => {
                                  console.log('✅ [MEDIA] Image loaded:', m.url);
                                  setLoadingMedia(prev => {
                                    const next = new Set(prev);
                                    next.delete(m.id);
                                    return next;
                                  });
                                }}
                                onError={(e) => {
                                  console.error('❌ [MEDIA] Image load error:', m.url);
                                  console.error('❌ [MEDIA] Check Supabase bucket permissions');
                                  setLoadingMedia(prev => {
                                    const next = new Set(prev);
                                    next.delete(m.id);
                                    return next;
                                  });
                                  // Show broken image placeholder
                                  e.currentTarget.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="100" height="100"%3E%3Crect fill="%23ddd" width="100" height="100"/%3E%3Ctext x="50" y="50" text-anchor="middle" dy=".3em" fill="%23999" font-size="12"%3EImagem%3C/text%3E%3C/svg%3E';
                                }}
                              />
                            ) : (
                              <div className="relative w-full h-full">
                                <video
                                  src={m.url}
                                  className="w-full h-full object-cover"
                                  onLoadedData={() => {
                                    console.log('✅ [MEDIA] Video loaded:', m.url);
                                    setLoadingMedia(prev => {
                                      const next = new Set(prev);
                                      next.delete(m.id);
                                      return next;
                                    });
                                  }}
                                  onError={() => {
                                    console.error('❌ [MEDIA] Video load error:', m.url);
                                    console.error('❌ [MEDIA] Check Supabase bucket permissions');
                                    setLoadingMedia(prev => {
                                      const next = new Set(prev);
                                      next.delete(m.id);
                                      return next;
                                    });
                                  }}
                                />
                                <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/10 transition-colors">
                                  <div className="w-10 h-10 bg-white/30 backdrop-blur-md rounded-full flex items-center justify-center shadow-lg">
                                    <Play size={16} className="text-white fill-white ml-0.5" />
                                  </div>
                                </div>
                              </div>
                            )}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                removeMediaFromTask(m.id);
                              }}
                              className="absolute top-2 right-2 p-2 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-lg z-10"
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                        ))
                      ) : (
                        <div className="col-span-full py-10 text-center border-2 border-dashed border-slate-100 rounded-[2.5rem] bg-slate-50/30">
                          <ImageIcon size={32} className="text-slate-200 mx-auto mb-2" />
                          <p className="text-[9px] font-black text-slate-300 uppercase tracking-[2px]">Nenhuma mídia anexada</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* RODAPÉ */}
                <div className="pt-8 border-t flex justify-between items-center sticky bottom-0 bg-white">
                  <div className="flex flex-col">
                    <div className="flex items-center gap-2 text-slate-800">
                      <Timer size={14} className="text-green-500" />
                      <span className="text-[12px] font-black font-mono tracking-tight">
                        {formatDuration(selectedTaskForDetails.time_spent_seconds)}
                      </span>
                    </div>
                    <span className="text-[7px] font-black text-slate-300 uppercase tracking-widest">Tempo Registrado</span>
                  </div>
                  <button
                    onClick={() => setSelectedTaskForDetails(null)}
                    className="py-5 px-12 bg-slate-900 text-white rounded-2xl font-black uppercase text-[10px] tracking-[2px] shadow-2xl active:scale-95 transition-all flex items-center gap-3"
                  >
                    Concluir Edição <Check size={18} strokeWidth={4} />
                  </button>
                </div>

              </div>
            </div>
          )
        }

      </div >

      {isSheetOpen && (
        <EvaluationSheet
          service={service}
          onClose={() => {
            setIsSheetOpen(false);
            loadData();
            onUpdate();
          }}
        />
      )}

      {
        showPrintModal && (
          <PrintModal
            service={service}
            vehicle={vehicle}
            client={client}
            onClose={() => setShowPrintModal(false)}
          />
        )
      }

      {/* Modal de Edição de Lembrete */}
      {
        editingReminder && (
          <div className="fixed inset-0 z-[160] bg-slate-900/60 backdrop-blur-md flex items-end justify-center animate-in fade-in">
            <div className="bg-white w-full max-w-2xl rounded-t-[3.5rem] p-8 space-y-6 animate-in slide-in-from-bottom-20">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-xl font-bold uppercase text-slate-800 tracking-tight leading-none">Editar Lembrete</h3>
                  <p className="text-[10px] font-medium text-slate-400 uppercase mt-2 tracking-widest">{editingReminder.title}</p>
                </div>
                <button onClick={() => setEditingReminder(null)} className="p-4 bg-slate-100 rounded-full text-slate-300 active:scale-90 transition-all touch-target"><X size={24} /></button>
              </div>
              <div className="space-y-4">
                {/* Título */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase text-slate-400 ml-1 tracking-widest">Descrição *</label>
                  <VoiceInput
                    multiline={false}
                    value={editReminderData.title}
                    onTranscript={(text) => setEditReminderData({ ...editReminderData, title: text })}
                    placeholder="Descrição do lembrete"
                    className="!bg-amber-50 !border-amber-200 focus:!border-amber-400 !text-slate-800"
                  />
                </div>
                {/* Data e Hora */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase text-slate-400 ml-1 tracking-widest">Data *</label>
                    <input
                      type="date"
                      value={editReminderData.date}
                      onChange={e => setEditReminderData({ ...editReminderData, date: e.target.value })}
                      className="w-full p-4 bg-slate-50 border-2 border-transparent focus:border-amber-400 rounded-2xl text-sm font-semibold outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase text-slate-400 ml-1 tracking-widest">Horário *</label>
                    <input
                      type="time"
                      value={editReminderData.time}
                      onChange={e => setEditReminderData({ ...editReminderData, time: e.target.value })}
                      className="w-full p-4 bg-slate-50 border-2 border-transparent focus:border-amber-400 rounded-2xl text-sm font-semibold outline-none"
                    />
                  </div>
                </div>
                <div className="flex gap-4 pt-4 border-t">
                  <button onClick={() => setEditingReminder(null)} className="flex-1 py-5 bg-slate-50 text-slate-400 rounded-2xl font-bold uppercase text-[10px] tracking-widest">Cancelar</button>
                  <button onClick={handleSaveReminderEdit} className="flex-[2] py-5 bg-amber-500 text-white rounded-2xl font-bold uppercase text-[10px] tracking-widest shadow-xl active:scale-95 transition-all">Salvar</button>
                </div>
              </div>
            </div>
          </div>
        )
      }
    </div >
  );
};

export default ServiceDetail;
