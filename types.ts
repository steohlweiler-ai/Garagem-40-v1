
export type UserRole = 'admin' | 'stock_manager' | 'operador' | 'financeiro' | 'visualizador';

export interface UserPermissions {
  access_clients: boolean;
  view_values_execution: boolean;
  view_values_reports: boolean;
  create_templates: boolean;
  manage_reminders: boolean;
}

export interface UserAccount {
  id: string;
  organization_id: string;
  name: string;
  email: string;
  phone: string;
  role: UserRole;
  active: boolean;
  permissions: UserPermissions;
  created_at: string;
}

export enum ServiceStatus {
  PENDENTE = 'Pendente',
  EM_ANDAMENTO = 'Em Andamento',
  LEMBRETE = 'Lembrete',
  PRONTO = 'Pronto',
  ENTREGUE = 'Entregue'
}

export interface StatusLogEntry {
  id: string;
  status: ServiceStatus;
  timestamp: string;
  user_id?: string;
  user_name?: string;
  action_source: string;
}

export interface StatusConfig {
  key: ServiceStatus;
  label: string;
  color: string;
  textColor: string;
  priority: number;
  active: boolean;
}

export type TaskType = 'Troca' | 'Chap.' | 'Pintura' | 'Mecânica' | 'Outro';
export type ChargeType = 'Hora' | 'Fixo';
export type SortOption = 'atrasados' | 'entrega_proxima' | 'entrada_recente' | 'entrada_antiga' | 'status';

export interface FilterConfig {
  startDate?: string;
  endDate?: string;
  startDeliveryDate?: string;
  endDeliveryDate?: string;
  statuses: (ServiceStatus | 'Atrasado')[];
  sortBy: SortOption;
}

export interface Appointment {
  id: string;
  title: string;
  description?: string;
  date: string;
  time: string;
  vehicle_plate?: string;
  vehicle_brand?: string;
  vehicle_model?: string;
  client_name?: string;
  client_phone?: string;
  notify_before_minutes: number;
  notify_enabled: boolean;
  type: 'manual' | 'service_delivery';
  service_id?: string;
}

export interface VehicleColor {
  id: string;
  organization_id?: string;
  name: string;
  hex: string;
  finish?: string;
  active?: boolean;
}

export interface ServiceCost {
  id: string;
  name: string;
  type: 'hour' | 'fixed';
  value: number;
}

export interface ItemMedia {
  id: string;
  url: string;
  type: 'image' | 'video';
}

export interface Reminder {
  id: string;
  title: string;
  message?: string;
  date: string;
  time: string;
  status: 'active' | 'done';
}

export interface PriorityOverride {
  priority: 'baixa' | 'media' | 'alta';
  days: number;
  hours: number;
}

export interface DelayCriteria {
  active: boolean;
  scope: 'local' | 'global';
  thresholdDays: number;
  thresholdHours: number;
  considerWorkdays: boolean;
  considerBusinessHours: boolean;
  businessStart: string;
  businessEnd: string;
  priorityOverrides: PriorityOverride[];
  autoMarkDelayed: boolean;
  autoNotify: boolean;
}

export interface WorkshopSettings {
  id?: string;
  name: string;
  address: string;
  phone: string;
  cnpj: string;
  valor_hora_chapeacao?: number;
  valor_hora_pintura?: number;
  valor_hora_mecanica?: number;
}

export interface DelayAuditLog {
  id: string;
  timestamp: string;
  userId: string;
  userName: string;
  changes: string;
}

export interface ServiceTask {
  id: string;
  service_id: string;
  title: string;
  status: 'todo' | 'in_progress' | 'done';
  type?: string;
  value?: number;
  responsible_user_id?: string;
  started_at?: string;
  ended_at?: string;
  duration_seconds?: number;
  time_spent_seconds?: number;
  observation?: string;
  relato?: string;
  diagnostico?: string;
  media?: ItemMedia[];
  charge_type: ChargeType;
  rate_per_hour: number;
  fixed_value: number;
  manual_override_value: number | null;
  from_template_id: string | null;
  order: number;
}

export interface InspectionTemplateItem {
  id?: string; // Added ID from DB
  key: string;
  label: string;
  allow_subitems: boolean;
  subitems?: string[];
  allow_notes: boolean;
  allow_media: boolean;
  is_active: boolean;
  allowed_charge_type: 'Hora' | 'Fixo' | 'Ambos';
  default_charge_type: ChargeType;
  default_rate_per_hour: number;
  default_fixed_value: number;
  default_price: number;
  price?: number; // Added for compatibility
  defaultPrice?: number; // Added for compatibility
  default_estimated_time?: number;

  // New Granular Pricing Fields
  chap_ativo?: boolean;
  chap_tipo_cobranca?: 'hora' | 'fixo';
  chap_padrao?: number;

  pintura_ativo?: boolean;
  pintura_tipo_cobranca?: 'hora' | 'fixo';
  pintura_padrao?: number;

  troca_ativo?: boolean;
  troca_valor?: number;
}

export interface InspectionTemplateSection {
  section_name: string;
  items: InspectionTemplateItem[];
}

export interface EvaluationTemplate {
  id: string;
  organization_id?: string;
  name: string;
  active: boolean; // Changed from is_default or added
  sections: InspectionTemplateSection[];
  is_default: boolean; // Kept for compatibility if needed, or mapped from 'active'
  created_at?: string;
}

export interface InspectionData {
  template_id?: string;
  template_name?: string; // Added to track which template was used
  items: { [key: string]: boolean };
  general_notes: string;
}

export interface ServiceJob {
  id: string;
  organization_id: string;
  vehicle_id: string;
  client_id: string;
  status: ServiceStatus;
  status_history: StatusLogEntry[];
  entry_at: string;
  estimated_delivery?: string;
  total_value: number;
  total_duration_seconds?: number;
  tasks: ServiceTask[];
  reminders: Reminder[];
  priority: 'baixa' | 'media' | 'alta';
  archived?: boolean;
  created_by?: string;
  created_by_name?: string;
  inspection?: InspectionData;
  service_type?: 'novo' | 'retrabalho';
  active_template_id?: string; // New field to track active template for this OS
}

export interface Client {
  id: string;
  organization_id: string;
  name: string;
  phone: string;
  notes?: string;
  cpfCnpj?: string;
  address?: string;
}

export interface Vehicle {
  id: string;
  organization_id: string;
  client_id: string;
  plate: string;
  brand: string;
  model: string;
  color?: string;
  yearModel?: string;
  chassis?: string;
  mileage?: string;
  observations?: string;
}

export interface MediaItem {
  id: string;
  data: string;
  mime_type: string;
  uploaded_at: string;
}

export interface Product {
  id: string;
  name: string;
  sku: string;
  unit: 'un' | 'lt' | 'kg' | 'par' | 'cj';
  cost: number;
  current_stock: number;
  min_stock?: number;
}

export interface Supplier {
  id: string;
  name: string;
  cnpj: string;
  contact_name?: string;
  phone?: string;
}

export interface Invoice {
  id: string;
  supplier_id: string;
  number: string;
  date: string;
  total: number;
  imageBase64?: string;
  status: 'pending' | 'processed';
}

export interface StockMovement {
  id: string;
  product_id: string;
  vehicle_id?: string;
  qty: number;
  type: 'IN' | 'OUT';
  source: string;
  date: string;
  created_by?: string;
}

export interface StockAllocation {
  id: string;
  product_id: string;
  vehicle_id: string;
  service_id?: string;
  reserved_qty: number;
  consumed_qty: number;
  status: 'reserved' | 'consumed';
  date_allocated: string;
}

export interface InvoiceItemReview {
  id: string;
  description: string;
  qty: number;
  unit: string;
  unit_price: number;
  product_id?: string;
  observation?: string;
}

export interface CatalogItem {
  id: string;
  brand: string;
  model: string;
}

export interface IntegrationState {
  googleCalendarConnected: boolean;
  lastSync?: string;
  n8nConnected: boolean;
  n8nEvents: Record<string, boolean>;
}
