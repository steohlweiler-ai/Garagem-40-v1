import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  X, Camera, User, ClipboardCheck, CheckCircle, Car, Check, Wrench,
  Search, ChevronDown, ChevronRight, Palette, Plus, MapPin,
  Upload, Sparkles, Calendar as CalendarIcon, Video, Trash2, Maximize2, Play, Image as ImageIcon, Loader2,
  Users, Briefcase, Phone, Mail, MessageSquare, Info, Smartphone, AlertTriangle, UserPlus, Hash
} from 'lucide-react';
import { dataProvider } from '../../services/dataProvider';
import { ServiceJob, ServiceStatus, EvaluationTemplate, ItemMedia, Client, Vehicle, ChargeType, CatalogItem, WorkshopSettings, InspectionTemplateItem } from '../../types';
import { blobToBase64, formatCurrency, generateUUID } from '../../utils/helpers';
import VoiceInput from '../VoiceInput';
import Stepper from '../Stepper';
import CameraCapture from '../CameraCapture';
import ColorSelector from '../ColorSelector';
import PlateScanner from '../PlateScanner';

interface NewServiceWizardProps {
  onClose: () => void;
  onCreated: (service: ServiceJob) => void;
}

interface ItemDetail {
  checked: boolean;
  selectedTypes: string[];
  relato: string;
  diagnostico: string;
  autoDiagnostico: boolean;
  media: ItemMedia[];

  defaultChargeType?: ChargeType;
  defaultFixedValue?: number;
  defaultRatePerHour?: number;
}

const STEPS = [
  { id: 1, label: 'VEÍCULO', icon: <Car size={16} /> },
  { id: 2, label: 'CLIENTE', icon: <User size={16} /> },
  { id: 3, label: 'AVALIAÇÃO', icon: <ClipboardCheck size={16} /> },
  { id: 4, label: 'CONFIRMAR', icon: <CheckCircle size={16} /> },
];

const NewServiceWizard: React.FC<NewServiceWizardProps> = ({ onClose, onCreated }) => {
  const [step, setStep] = useState(1);
  const [cameraMode, setCameraMode] = useState<'photo' | 'video' | null>(null);
  const [mediaModalItem, setMediaModalItem] = useState<string | null>(null);
  const [viewMedia, setViewMedia] = useState<{ url: string; type: 'image' | 'video' } | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showPlateScanner, setShowPlateScanner] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const plateDropdownRef = useRef<HTMLDivElement>(null);
  const modelDropdownRef = useRef<HTMLDivElement>(null);

  const [activeTemplate, setActiveTemplate] = useState<EvaluationTemplate | null>(null);
  const [availableTemplates, setAvailableTemplates] = useState<EvaluationTemplate[]>([]);
  const [showTemplateSelector, setShowTemplateSelector] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedItem, setExpandedItem] = useState<string | null>(null);

  const [plate, setPlate] = useState('');
  const [brand, setBrand] = useState('');
  const [model, setModel] = useState('');
  const [color, setColor] = useState('');
  const [estimatedDelivery, setEstimatedDelivery] = useState('');
  const [selectedVehicleId, setSelectedVehicleId] = useState<string | null>(null);
  const [catalog, setCatalog] = useState<CatalogItem[]>([]);
  const [settings, setSettings] = useState<WorkshopSettings | null>(null);

  const [showModelDropdown, setShowModelDropdown] = useState(false);
  const modelSuggestions = useMemo(() => {
    if (!model || model.length < 1) return [];
    return catalog.filter(c =>
      c.model.toLowerCase().includes(model.toLowerCase()) ||
      c.brand.toLowerCase().includes(model.toLowerCase())
    ).slice(0, 8);
  }, [model, catalog]);

  const [showPlateDropdown, setShowPlateDropdown] = useState(false);
  const [plateSuggestions, setPlateSuggestions] = useState<(Vehicle & { ownerName?: string })[]>([]);

  const [clientType, setClientType] = useState<'PF' | 'PJ'>('PF');
  const [clientName, setClientName] = useState('');
  const [cpfCnpj, setCpfCnpj] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [clientAddress, setClientAddress] = useState('');

  const [clientSuggestions, setClientSuggestions] = useState<Client[]>([]);
  const [showClientDropdown, setShowClientDropdown] = useState(false);

  const [showOwnerConfirmModal, setShowOwnerConfirmModal] = useState<Client | null>(null);
  const [showKmUpdateModal, setShowKmUpdateModal] = useState(false);
  const [checklist, setChecklist] = useState<Record<string, ItemDetail>>({});

  useEffect(() => {
    const loadData = async () => {
      const templates = await dataProvider.getTemplates(true);
      console.log('[Wizard] Templates loaded:', templates);
      setAvailableTemplates(templates);
      const defaultTemplate = templates.find(t => t.is_default) || templates[0];
      console.log('[Wizard] Selected default template:', defaultTemplate);
      if (defaultTemplate) applyTemplate(defaultTemplate);
      else console.warn('[Wizard] No templates available to select as default');

      const cat = await dataProvider.getCatalog();
      setCatalog(cat);

      const s = await dataProvider.getWorkshopSettings();
      setSettings(s);
    };
    loadData();

    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) setShowClientDropdown(false);
      if (plateDropdownRef.current && !plateDropdownRef.current.contains(event.target as Node)) setShowPlateDropdown(false);
      if (modelDropdownRef.current && !modelDropdownRef.current.contains(event.target as Node)) setShowModelDropdown(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const applyTemplate = (template: EvaluationTemplate) => {
    setActiveTemplate(template);
    setExpandedItem(null);
    const initialChecklist: Record<string, ItemDetail> = {};
    template.sections.forEach(section => {
      section.items.forEach(item => {
        initialChecklist[item.label] = {
          checked: false, selectedTypes: [], relato: '', diagnostico: '', autoDiagnostico: false, media: [],
          defaultChargeType: item.default_charge_type, defaultFixedValue: item.default_fixed_value, defaultRatePerHour: item.default_rate_per_hour
        };
      });
    });
    setChecklist(initialChecklist);
  };

  const handleEstimatedDeliveryClick = () => {
    if (!estimatedDelivery) {
      const today = new Date();
      today.setHours(8, 0, 0, 0);
      const iso = new Date(today.getTime() - today.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
      setEstimatedDelivery(iso);
    }
  };

  const handlePlateChange = async (val: string) => {
    const cleanVal = val.toUpperCase().replace(/[^A-Z0-9]/g, '');
    setPlate(cleanVal);
    if (cleanVal.length >= 1) {
      const allVehicles = await dataProvider.getVehicles();
      const filtered = await Promise.all(
        allVehicles
          .filter(v => v.plate.toUpperCase().includes(cleanVal))
          .map(async v => {
            const owner = await dataProvider.getClientById(v.client_id);
            return { ...v, ownerName: owner?.name };
          })
      );
      setPlateSuggestions(filtered.slice(0, 5));
      setShowPlateDropdown(true);
    } else setShowPlateDropdown(false);
  };

  const handleModelChange = (val: string) => {
    setModel(val);
    if (val.length >= 1) setShowModelDropdown(true);
    else setShowModelDropdown(false);
  };

  const selectPlate = async (v: Vehicle & { ownerName?: string }) => {
    setPlate(v.plate); setBrand(v.brand); setModel(v.model); setColor(v.color || '');
    setSelectedVehicleId(v.id);
    const client = await dataProvider.getClientById(v.client_id);
    if (client) setShowOwnerConfirmModal(client);
    setShowPlateDropdown(false);
  };

  const confirmOwner = (same: boolean) => {
    if (same && showOwnerConfirmModal) {
      setClientName(showOwnerConfirmModal.name);
      setClientPhone(showOwnerConfirmModal.phone);
      setCpfCnpj(showOwnerConfirmModal.cpfCnpj || '');
      setClientAddress(showOwnerConfirmModal.address || '');
    } else {
      setClientName(''); setClientPhone(''); setCpfCnpj(''); setClientAddress('');
    }
    setShowOwnerConfirmModal(null);
  };

  const handleClientNameChange = async (val: string) => {
    setClientName(val);
    if (val.length >= 2) {
      const allClients = await dataProvider.getClients();
      const filtered = allClients.filter(c => c.name.toLowerCase().includes(val.toLowerCase()));
      setClientSuggestions(filtered.slice(0, 5));
      setShowClientDropdown(true);
    } else setShowClientDropdown(false);
  };

  const selectClient = (client: Client) => {
    setClientName(client.name); setClientPhone(client.phone); setCpfCnpj(client.cpfCnpj || ''); setClientAddress(client.address || '');
    setShowClientDropdown(false);
  };

  const updateItemDetail = (item: string, updates: Partial<ItemDetail>) => {
    setChecklist(prev => {
      const current = prev[item];
      const next = { ...current, ...updates };
      if (updates.autoDiagnostico === true) {
        next.diagnostico = "De acordo com o relato do cliente.";
      } else if (updates.autoDiagnostico === false && current.diagnostico === "De acordo com o relato do cliente.") {
        next.diagnostico = "";
      }
      return { ...prev, [item]: next };
    });
  };

  const handleToggleType = (item: string, type: string) => {
    setChecklist(prev => {
      const currentItem = prev[item];
      const currentTypes = currentItem.selectedTypes;
      let newTypes: string[] = [];

      // Logic: Mutually Exclusive
      if (type === 'Troca' || type === 'troca') { // Case insensitive check
        // If selecting Troca, clear everything else and toggle Troca
        // If Troca is already selected, deselect it (empty array)
        const isTrocaSelected = currentTypes.some(t => t.toLowerCase() === 'troca');
        newTypes = isTrocaSelected ? [] : [type];
      } else {
        // If selecting Chap. or Pintura
        // 1. Remove Troca if present
        // 2. Toggle the selected type
        const typesWithoutTroca = currentTypes.filter(t => t.toLowerCase() !== 'troca');
        const isTypeSelected = typesWithoutTroca.includes(type);

        if (isTypeSelected) {
          newTypes = typesWithoutTroca.filter(t => t !== type);
        } else {
          newTypes = [...typesWithoutTroca, type];
        }
      }

      return { ...prev, [item]: { ...currentItem, checked: newTypes.length > 0, selectedTypes: newTypes } };
    });
  };



  const calculatePrice = (type: string, item: InspectionTemplateItem) => {
    if (!settings) return 0;
    if (type === 'Troca') return item.troca_valor || 0;
    if (type === 'Chap.') {
      if (item.chap_tipo_cobranca === 'hora') return (item.chap_padrao || 0) * (settings.valor_hora_chapeacao || 0);
      return item.chap_padrao || 0;
    }
    if (type === 'Pintura') {
      if (item.pintura_tipo_cobranca === 'hora') return (item.pintura_padrao || 0) * (settings.valor_hora_pintura || 0);
      return item.pintura_padrao || 0;
    }
    // Fallback for generic or old template structure
    if (item.default_charge_type === 'Hora') return (item.default_rate_per_hour || 0) * (settings.valor_hora_mecanica || 120);
    return item.default_fixed_value || 0;
  };

  const handleNext = () => {
    if (step === 1 && isStep1Valid) {
      if (selectedVehicleId) setShowKmUpdateModal(true);
      else setStep(2);
      return;
    }
    if (step === 2 && isStep2Valid) { setStep(3); return; }
    if (step === 3) { setStep(4); return; }
    if (step === 4) handleCreate();
  };

  const handleCreate = async () => {
    console.log('[Wizard] Starting Service Order creation...');

    // Validação Final
    if (!plate || !model || !brand) {
      alert('Por favor, preencha os dados obrigatórios do veículo (Placa, Modelo, Marca).');
      return;
    }
    if (!clientName || !clientPhone) {
      alert('Por favor, preencha os dados obrigatórios do cliente (Nome, Telefone).');
      return;
    }

    try {
      if (brand && model) await dataProvider.addToCatalog(brand, model);

      // 1. Create or update client
      let client: Client;
      const allClients = await dataProvider.getClients();
      const existingClient = allClients.find(c => c.name === clientName);
      const clientPayload = { organization_id: 'org_1', name: clientName, phone: clientPhone, address: clientAddress, cpfCnpj: cpfCnpj };
      if (existingClient) {
        client = existingClient;
        await dataProvider.updateClient(client.id, clientPayload);
      } else {
        const newClient = await dataProvider.addClient(clientPayload);
        client = newClient!;
      }

      // 2. Create or update vehicle
      let vehicle: Vehicle;
      const vehiclePayload = { organization_id: 'org_1', client_id: client.id, plate: plate.toUpperCase(), brand, model, color };
      if (selectedVehicleId) {
        const vehicleData = await dataProvider.getVehicleById(selectedVehicleId);
        vehicle = vehicleData!;
        await dataProvider.updateVehicle(vehicle.id, vehiclePayload);
      } else {
        const newVehicle = await dataProvider.addVehicle(vehiclePayload);
        vehicle = newVehicle!;
      }

      // 3. Create service
      const service = await dataProvider.addService({
        organization_id: 'org_1',
        vehicle_id: vehicle.id,
        client_id: client.id,
        status: ServiceStatus.PENDENTE,
        entry_at: new Date().toISOString(),
        estimated_delivery: estimatedDelivery,
        total_value: 0,
        priority: 'media'
      });

      if (!service) {
        console.error('Failed to create service');
        return;
      }

      // 4. Create tasks from checklist
      for (const [item, detail] of Object.entries(checklist) as [string, ItemDetail][]) {
        if (!detail.checked) continue;

        const isTroca = detail.selectedTypes.includes('troca') || detail.selectedTypes.includes('Troca'); // Case sensitive handling
        const hasChap = detail.selectedTypes.includes('chap.') || detail.selectedTypes.includes('Chap.');
        const hasPintura = detail.selectedTypes.includes('pintura') || detail.selectedTypes.includes('Pintura');

        // Find original item template for pricing
        let itemTemplate: InspectionTemplateItem | undefined;
        if (activeTemplate) {
          for (const sect of activeTemplate.sections) {
            const found = sect.items.find(i => i.label === item);
            if (found) { itemTemplate = found; break; }
          }
        }

        if (isTroca && itemTemplate) {
          const price = calculatePrice('Troca', itemTemplate);
          await dataProvider.addTask(service.id, `Troca do ${item}`, { type: 'Troca', relato: detail.relato, diagnostico: detail.diagnostico, media: detail.media, charge_type: 'Fixo', fixed_value: price, rate_per_hour: 0 } as any);
        } else if (isTroca) {
          // Fallback if template id lost
          await dataProvider.addTask(service.id, `Troca do ${item}`, { type: 'Troca', relato: detail.relato, diagnostico: detail.diagnostico, media: detail.media } as any);
        }

        if (hasChap && itemTemplate) {
          const price = calculatePrice('Chap.', itemTemplate);
          const isHourly = itemTemplate.chap_tipo_cobranca === 'hora';
          const usedRate = isHourly ? settings?.valor_hora_chapeacao : 0;
          await dataProvider.addTask(service.id, `${item} - Chapeação`, { type: 'Chap.', relato: detail.relato, diagnostico: detail.diagnostico, media: detail.media, charge_type: isHourly ? 'Hora' : 'Fixo', fixed_value: price, rate_per_hour: usedRate } as any);
        }

        if (hasPintura && itemTemplate) {
          const price = calculatePrice('Pintura', itemTemplate);
          const isHourly = itemTemplate.pintura_tipo_cobranca === 'hora';
          const usedRate = isHourly ? settings?.valor_hora_pintura : 0;
          await dataProvider.addTask(service.id, `${item} - Pintura`, { type: 'Pintura', relato: detail.relato, diagnostico: detail.diagnostico, media: detail.media, charge_type: isHourly ? 'Hora' : 'Fixo', fixed_value: price, rate_per_hour: usedRate } as any);
        }

        if (!hasChap && !hasPintura && !isTroca) {
          // Standard/Generic Item - respects template default_charge_type
          const price = itemTemplate ? calculatePrice('General', itemTemplate) : 0;
          await dataProvider.addTask(service.id, item, {
            type: detail.selectedTypes.join(' + ') || 'Avaliação',
            relato: detail.relato,
            diagnostico: detail.diagnostico,
            media: detail.media,
            charge_type: detail.defaultChargeType || 'Fixo',
            fixed_value: price,
            rate_per_hour: detail.defaultRatePerHour || 0
          } as any);
        }
      }

      const completeService = await dataProvider.getServiceById(service.id);
      console.log('[Wizard] Service Order created successfully:', completeService);
      onCreated(completeService || service);
    } catch (error) {
      console.error('[Wizard] Error creating Service Order:', error);
      alert('Erro ao criar OS. Verifique o console para mais detalhes.');
    }
  };

  const isStep1Valid = plate && model && brand;
  const isStep2Valid = clientName && cpfCnpj && clientPhone && clientAddress;

  const addMediaToItem = async (mediaSource: { url: string; type: 'image' | 'video' } | File) => {
    if (!mediaModalItem) return;
    setIsProcessing(true);
    try {
      let finalUrl = '';
      let mediaType: 'image' | 'video' = 'image';
      if (mediaSource instanceof File) {
        finalUrl = await blobToBase64(mediaSource);
        mediaType = mediaSource.type.startsWith('video') ? 'video' : 'image';
      } else {
        const response = await fetch(mediaSource.url);
        finalUrl = await blobToBase64(await response.blob());
        mediaType = mediaSource.type;
      }
      const newMedia: ItemMedia = { id: generateUUID(), url: finalUrl, type: mediaType };
      setChecklist(prev => ({
        ...prev,
        [mediaModalItem!]: { ...prev[mediaModalItem!], media: [...(prev[mediaModalItem!].media || []), newMedia], checked: true }
      }));
    } catch (e) { console.error(e); } finally { setIsProcessing(false); setMediaModalItem(null); setCameraMode(null); }
  };

  // 🚗 Handle Plate Scanner Result
  const handlePlateDetected = (detectedPlate: string) => {
    handlePlateChange(detectedPlate);
    setShowPlateScanner(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex md:items-center md:justify-center bg-slate-900/60 backdrop-blur-sm md:p-10 font-['Arial'] animate-in fade-in">
      {cameraMode && <CameraCapture mode={cameraMode} onCapture={addMediaToItem} onClose={() => setCameraMode(null)} />}
      {showPlateScanner && <PlateScanner onPlateDetected={handlePlateDetected} onClose={() => setShowPlateScanner(false)} />}

      {viewMedia && (
        <div className="fixed inset-0 z-[200] bg-black/95 flex items-center justify-center p-4 animate-in fade-in" onClick={() => setViewMedia(null)}>
          <button onClick={() => setViewMedia(null)} className="absolute top-6 right-6 p-3 bg-white/10 rounded-full text-white hover:bg-white/20 transition-colors z-50">
            <X size={28} />
          </button>

          <div className="relative max-w-5xl max-h-[90vh] w-full flex items-center justify-center" onClick={e => e.stopPropagation()}>
            {viewMedia.type === 'video' ? (
              <video
                src={viewMedia.url}
                controls
                autoPlay
                className="max-w-full max-h-[85vh] rounded-2xl shadow-2xl"
              />
            ) : (
              <img
                src={viewMedia.url}
                alt="Media preview"
                className="max-w-full max-h-[85vh] rounded-2xl shadow-2xl object-contain"
              />
            )}
          </div>
        </div>
      )}

      <input type="file" ref={fileInputRef} accept="image/*,video/*" className="hidden" onChange={(e) => { const file = e.target.files?.[0]; if (file) addMediaToItem(file); }} />

      <div className="bg-white w-full md:max-w-4xl h-full md:h-[95vh] flex flex-col md:rounded-[2.5rem] overflow-hidden shadow-2xl animate-in slide-in-from-bottom-10 duration-500">
        {/* HEADER DARK ELEGANTE */}
        <div className="flex items-center justify-between p-6 border-b border-white/10 shrink-0 bg-gradient-to-r from-slate-900 to-slate-800 text-white shadow-xl">
          <button onClick={onClose} className="p-3 bg-white/10 rounded-2xl active:scale-90 transition-all hover:bg-white/20 border border-white/10">
            <X size={24} strokeWidth={2.5} />
          </button>
          <div className="flex flex-col items-center">
            <h2 className="text-lg font-black tracking-tight uppercase">Nova Ordem de Serviço</h2>
            <p className="text-[8px] font-black text-white/40 uppercase tracking-[3px] mt-1">Criar Nova OS</p>
          </div>
          <div className="w-12 h-12" /> {/* Spacer */}
        </div>

        <Stepper currentStep={step} steps={STEPS} />

        <div className="flex-1 overflow-y-auto p-4 sm:p-8 space-y-6 custom-scrollbar">
          {step === 1 && (
            <div className="max-w-2xl mx-auto space-y-6">
              <div className="space-y-2 relative" ref={plateDropdownRef}>
                <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">Placa (Manual ou Voz)</label>
                <div className="flex gap-2 items-center">
                  <div className="flex-1">
                    <VoiceInput multiline={false} value={plate} onTranscript={handlePlateChange} placeholder="ABC1234" normalizeAs="plate" className="!text-[28px] !font-black !font-mono !py-6 !shadow-inner !bg-slate-50 !border-transparent" />
                  </div>
                  <button
                    onClick={() => setShowPlateScanner(true)}
                    className="p-4 bg-green-600 text-white rounded-2xl active:scale-95 transition-all shadow-lg hover:bg-green-700 hover:shadow-green-500/30 shrink-0"
                    title="Escanear placa com câmera"
                  >
                    <Camera size={24} />
                  </button>
                </div>
                {showPlateDropdown && plate.length >= 1 && (
                  <div className="absolute top-full left-0 right-0 bg-white border-2 border-slate-100 rounded-2xl mt-2 shadow-2xl z-[60] overflow-hidden">
                    {plateSuggestions.map(v => (
                      <button key={v.id} onClick={() => selectPlate(v)} className="w-full p-4 text-left hover:bg-slate-50 border-b flex items-center justify-between">
                        <div className="flex items-center gap-4"><div className="w-10 h-10 bg-slate-900 rounded-lg flex items-center justify-center text-white"><Car size={20} /></div><div><p className="font-black text-sm uppercase text-slate-800 font-mono">{v.plate}</p><p className="text-[9px] font-bold text-slate-400 uppercase">{v.brand} {v.model}</p></div></div>
                        <ChevronRight size={14} className="text-slate-300" />
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2 relative" ref={modelDropdownRef}>
                  <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">Modelo</label>
                  <VoiceInput multiline={false} value={model} onTranscript={handleModelChange} placeholder="Ex: Corolla" className="!py-4 !bg-slate-50 !border-transparent" />
                  {showModelDropdown && modelSuggestions.length > 0 && (
                    <div className="absolute top-full left-0 right-0 bg-white border-2 border-slate-100 rounded-2xl mt-2 shadow-2xl z-[60] overflow-hidden">
                      {modelSuggestions.map(item => (
                        <button key={item.id} onClick={() => { setModel(item.model); setBrand(item.brand); setShowModelDropdown(false); }} className="w-full p-4 text-left hover:bg-slate-50 border-b last:border-0"><p className="font-black text-xs uppercase text-slate-800 tracking-tight">{item.model}</p><p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">{item.brand}</p></button>
                      ))}
                    </div>
                  )}
                </div>
                <div className="space-y-2">
                  <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">Marca</label>
                  <VoiceInput multiline={false} value={brand} onTranscript={setBrand} placeholder="Ex: Toyota" className="!py-4 !bg-slate-50 !border-transparent" />
                </div>
              </div>
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">Cor do Veículo</label>
                  <ColorSelector value={color} onChange={setColor} />
                </div>
                <div className="space-y-2">
                  <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">Entrega Prevista</label>
                  <input type="datetime-local" value={estimatedDelivery} onClick={handleEstimatedDeliveryClick} onChange={(e) => setEstimatedDelivery(e.target.value)} className="w-full p-5 bg-slate-50 border-2 border-transparent focus:border-green-500 rounded-[1.5rem] text-sm font-black h-[76px]" />
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="max-w-2xl mx-auto space-y-6">
              <div className="flex p-1 bg-slate-100 rounded-2xl">{['PF', 'PJ'].map(t => (
                <button key={t} onClick={() => setClientType(t as any)} className={`flex-1 py-3 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${clientType === t ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-400'}`}>{t}</button>
              ))}</div>
              <div className="space-y-5">
                <div className="space-y-2 relative" ref={dropdownRef}>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nome do Cliente *</label>
                  <VoiceInput multiline={false} value={clientName} onTranscript={handleClientNameChange} placeholder="Digite ou fale o nome..." normalizeAs="name" className="!bg-slate-50 !border-transparent" />
                  {showClientDropdown && clientName.length >= 2 && (
                    <div className="absolute top-full left-0 right-0 bg-white border-2 border-slate-100 rounded-2xl mt-2 shadow-2xl z-[60] overflow-hidden">
                      {clientSuggestions.map(item => (
                        <button key={item.id} onClick={() => selectClient(item)} className="w-full p-4 text-left hover:bg-slate-50 flex items-center justify-between border-b last:border-0"><span className="font-black text-[12px] uppercase text-slate-800">{item.name}</span><Check size={14} className="text-green-500" /></button>
                      ))}
                    </div>
                  )}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{clientType === 'PF' ? 'CPF' : 'CNPJ'} *</label>
                    <VoiceInput multiline={false} value={cpfCnpj} onTranscript={setCpfCnpj} placeholder={clientType === 'PF' ? '000.000.000-00' : '00.000.000/0001-00'} normalizeAs={clientType === 'PF' ? 'cpf' : 'cnpj'} className="!bg-slate-50 !border-transparent" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">WhatsApp *</label>
                    <VoiceInput multiline={false} value={clientPhone} onTranscript={setClientPhone} placeholder="(00) 00000-0000" normalizeAs="phone" className="!bg-slate-50 !border-transparent" />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Endereço Completo *</label>
                  <VoiceInput multiline={false} value={clientAddress} onTranscript={setClientAddress} placeholder="Rua, Número, Bairro, Cidade..." className="!bg-slate-50 !border-transparent" />
                </div>
              </div>
            </div>
          )}

          {step === 3 && !activeTemplate && (
            <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
              <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center text-slate-400">
                <AlertTriangle size={32} />
              </div>
              <div>
                <h3 className="text-lg font-black text-slate-700 uppercase">Nenhum Modelo Selecionado</h3>
                <p className="text-sm text-slate-500 max-w-xs mx-auto mt-1">
                  Não foi possível carregar o modelo de avaliação padrão.
                </p>
              </div>
              <button
                onClick={() => {
                  const t = availableTemplates.find(t => t.is_default) || availableTemplates[0];
                  if (t) applyTemplate(t);
                  else console.error('[Wizard] Retry failed: Still no templates available');
                }}
                className="px-6 py-3 bg-indigo-600 text-white rounded-xl font-bold uppercase text-xs tracking-widest shadow-lg active:scale-95 transition-all"
              >
                Tentar Novamente
              </button>
            </div>
          )}

          {step === 3 && activeTemplate && (
            <div className="space-y-6">
              {/* TEMPLATE SELECTOR HEADER */}
              <div className="flex items-center justify-between bg-slate-50 p-4 rounded-2xl border border-slate-100">
                <div>
                  <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest block mb-1">Modelo de Avaliação</span>
                  <h3 className="text-sm font-black uppercase text-slate-800 tracking-tight flex items-center gap-2">
                    {activeTemplate.name}
                    {availableTemplates.length > 1 && (
                      <button onClick={() => setShowTemplateSelector(!showTemplateSelector)} className="text-[10px] font-bold text-blue-500 bg-blue-50 px-2 py-0.5 rounded-md hover:bg-blue-100 transition-colors uppercase tracking-wide">
                        Alterar
                      </button>
                    )}
                  </h3>
                </div>
                {showTemplateSelector && (
                  <div className="absolute top-24 left-4 right-4 bg-white border-2 border-slate-100 rounded-2xl shadow-2xl z-[70] overflow-hidden animate-in slide-in-from-top-2 p-2">
                    <div className="p-2 border-b border-slate-50 mb-1 flex justify-between items-center">
                      <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Selecionar Modelo</span>
                      <button onClick={() => setShowTemplateSelector(false)}><X size={16} className="text-slate-300" /></button>
                    </div>
                    <div className="max-h-60 overflow-y-auto">
                      {availableTemplates.map(t => (
                        <button
                          key={t.id}
                          onClick={() => { applyTemplate(t); setShowTemplateSelector(false); }}
                          className={`w-full text-left p-3 rounded-xl mb-1 flex items-center justify-between ${activeTemplate.id === t.id ? 'bg-green-50 text-green-700' : 'hover:bg-slate-50 text-slate-600'}`}
                        >
                          <span className="text-xs font-bold uppercase">{t.name}</span>
                          {activeTemplate.id === t.id && <Check size={14} />}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="max-w-xl mx-auto relative">
                <input type="text" placeholder="Buscar item de avaliação..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-12 pr-4 py-4 bg-slate-100 border-2 border-transparent focus:border-green-500 rounded-2xl text-sm font-bold outline-none shadow-inner" />
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
                {activeTemplate.sections.map(section => {
                  const filtered = section.items.filter(item => item.label.toLowerCase().includes(searchTerm.toLowerCase()));
                  if (filtered.length === 0) return null;
                  return (
                    <div key={section.section_name} className="space-y-3">
                      <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 border-l-4 border-green-500 pl-3 bg-slate-50/50 py-2">{section.section_name}</h3>
                      <div className="space-y-2">
                        {filtered.map(item => {
                          const detail = checklist[item.label] || { checked: false, selectedTypes: [], relato: '', diagnostico: '', autoDiagnostico: false, media: [] };
                          const isExpanded = expandedItem === item.label;
                          return (
                            <div key={item.key} className="space-y-2">
                              <div className={`w-full flex items-stretch border-2 rounded-[1.75rem] transition-all overflow-hidden ${detail.checked ? 'bg-green-50 border-green-500 shadow-md' : 'bg-white border-slate-100'}`}>
                                <button onClick={() => updateItemDetail(item.label, { checked: !detail.checked })} className={`p-4 flex items-center justify-center border-r transition-colors ${detail.checked ? 'border-green-200 bg-green-100 text-green-700' : 'border-slate-50 bg-slate-50 text-slate-300'}`}><div className={`w-7 h-7 rounded-lg border-2 flex items-center justify-center ${detail.checked ? 'bg-green-600 border-green-600 text-white shadow-sm' : 'bg-white border-slate-300'}`}>{detail.checked && <Check size={16} strokeWidth={4} />}</div></button>
                                <button onClick={() => setExpandedItem(isExpanded ? null : item.label)} className="flex-1 flex items-center gap-4 p-4 text-left transition-colors"><span className={`text-[12px] sm:text-sm font-black uppercase tracking-tight flex-1 ${detail.checked ? 'text-green-800' : 'text-slate-500'}`}>{item.label}</span><ChevronDown size={18} className={`text-slate-300 transition-transform ${isExpanded ? 'rotate-180' : ''}`} /></button>
                              </div>
                              {isExpanded && (
                                <div className="bg-slate-50 p-6 rounded-[2rem] border-2 border-slate-100 space-y-5 mx-1 animate-in slide-in-from-top-2">
                                  <div className="flex gap-2 flex-wrap">{item.subitems?.map(st => {
                                    // Logic: Check if disabled properties
                                    const isTroca = detail.selectedTypes.some(t => t.toLowerCase() === 'troca');
                                    const isCurrentTroca = st.toLowerCase() === 'troca';

                                    // Disable Chap/Pintura if Troca is selected (visual feedback only, logic is handled in toggle)
                                    // Disable Troca if Chap/Pintura is selected (visual feedback only)

                                    return (
                                      <button
                                        key={st}
                                        onClick={() => handleToggleType(item.label, st)}
                                        className={`px-4 py-2 rounded-xl border-2 text-[9px] font-black uppercase transition-all ${detail.selectedTypes.includes(st) ? 'bg-green-600 border-green-600 text-white shadow-md' : 'bg-white border-slate-200 text-slate-400'}`}
                                      >
                                        {st}
                                      </button>
                                    );
                                  })}</div>
                                  <div className="space-y-2"><label className="text-[9px] font-black uppercase text-slate-400 tracking-widest ml-1">Relato</label><VoiceInput value={detail.relato} onTranscript={(v) => updateItemDetail(item.label, { relato: v })} placeholder="Relato do cliente..." className="!bg-white !rounded-2xl !min-h-[100px] !text-sm" /></div>
                                  <div className="space-y-2">
                                    <div className="flex justify-between items-center px-1"><label className="text-[9px] font-black uppercase text-slate-400 tracking-widest">Diagnóstico Técnico</label><label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={detail.autoDiagnostico} onChange={e => updateItemDetail(item.label, { autoDiagnostico: e.target.checked })} className="w-4 h-4 rounded border-slate-300" /><span className="text-[8px] font-black text-slate-400 uppercase">Preencher do Relato</span></label></div>
                                    <VoiceInput value={detail.diagnostico} onTranscript={(v) => updateItemDetail(item.label, { diagnostico: v })} placeholder="Sua análise técnica..." className="!bg-white !rounded-2xl !min-h-[100px] !text-sm" />
                                  </div>
                                  <div className="space-y-3">
                                    <label className="text-[9px] font-black uppercase text-slate-400 tracking-widest ml-1">Fotos & Vídeos</label>
                                    <div className="flex gap-2">
                                      <button onClick={() => { setMediaModalItem(item.label); setCameraMode('photo'); }} className="p-3 bg-white border border-slate-200 rounded-xl text-slate-600 hover:bg-green-50 shadow-sm"><Camera size={18} /></button>
                                      <button onClick={() => { setMediaModalItem(item.label); setCameraMode('video'); }} className="p-3 bg-white border border-slate-200 rounded-xl text-slate-600 hover:bg-green-50 shadow-sm"><Video size={18} /></button>
                                      <button onClick={() => { setMediaModalItem(item.label); fileInputRef.current?.click(); }} className="p-3 bg-white border border-slate-200 rounded-xl text-slate-600 hover:bg-green-50 shadow-sm"><Upload size={18} /></button>
                                    </div>
                                    {detail.media && detail.media.length > 0 && (
                                      <div className="flex gap-2 overflow-x-auto pb-2 custom-scrollbar">
                                        {detail.media.map(m => (
                                          <div
                                            key={m.id}
                                            className="relative w-16 h-16 rounded-xl overflow-hidden border border-slate-200 shrink-0 shadow-sm cursor-pointer hover:border-green-400 transition-colors group"
                                            onClick={() => setViewMedia({ url: m.url, type: m.type })}
                                          >
                                            {m.type === 'image' ? <img src={m.url} className="w-full h-full object-cover" /> : <div className="w-full h-full bg-slate-900 flex items-center justify-center text-white"><Play size={16} /></div>}
                                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                                              <Maximize2 size={12} className="text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="py-20 text-center space-y-8 max-w-xl mx-auto">
              <div className="w-32 h-32 bg-green-50 text-green-600 rounded-[3rem] flex items-center justify-center mx-auto shadow-2xl ring-16 ring-green-500/5 rotate-3"><CheckCircle size={64} strokeWidth={3} /></div>
              <div><h3 className="text-3xl font-black text-slate-800 uppercase tracking-tight">OS Pronta!</h3><p className="text-slate-500 font-bold uppercase text-[12px] tracking-widest mt-2 opacity-60">Revise os dados e confirme a abertura.</p></div>
              <div className="bg-slate-50 p-8 rounded-[2.5rem] border-2 border-slate-100 grid grid-cols-2 gap-8 text-left shadow-inner">
                <div><p className="text-[9px] font-black uppercase text-slate-400 tracking-widest mb-2">Veículo</p><p className="text-xl font-black font-mono text-slate-800 leading-none">{plate}</p><p className="text-[10px] font-bold text-slate-500 uppercase mt-2">{brand} {model}</p></div>
                <div><p className="text-[9px] font-black uppercase text-slate-400 tracking-widest mb-2">Cliente</p><p className="text-sm font-black text-slate-800 uppercase truncate">{clientName || 'Consumidor'}</p><p className="text-[10px] font-bold text-slate-500 uppercase mt-2">{clientPhone}</p></div>
              </div>
            </div>
          )}
        </div>

        {/* FOOTER COM BOTÕES ELEGANTES */}
        <div className="p-6 border-t border-slate-100 flex gap-4 bg-gradient-to-r from-slate-50 to-white shrink-0 safe-bottom shadow-[0_-10px_30px_-10px_rgba(0,0,0,0.05)]">
          <button
            onClick={() => step > 1 ? setStep(step - 1) : onClose()}
            className="flex-1 py-5 bg-slate-100 border-2 border-slate-200 rounded-[2rem] text-slate-600 font-black text-[11px] uppercase tracking-[2px] active:scale-95 transition-all hover:bg-slate-200 hover:border-slate-300"
          >
            Voltar
          </button>
          <button
            onClick={handleNext}
            disabled={(step === 1 && !isStep1Valid) || (step === 2 && !isStep2Valid)}
            className={`flex-[2] py-5 rounded-[2rem] font-black text-[11px] uppercase tracking-[2px] shadow-2xl transition-all ${((step === 1 && !isStep1Valid) || (step === 2 && !isStep2Valid)) ? 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none' : 'bg-gradient-to-r from-green-600 to-green-500 text-white hover:from-green-700 hover:to-green-600 active:scale-95 shadow-green-500/30'}`}
          >
            {step === 4 ? 'Confirmar e Criar OS' : 'Próximo Passo'}
          </button>
        </div>
      </div>
    </div >
  );
};

export default NewServiceWizard;
