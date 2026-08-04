
export enum AssetStatus {
  ACTIVE = '在用',
  MAINTENANCE = '维修中',
  RETIRED = '已报废',
  LOST = '已丢失'
}

export enum InventoryCategory {
  ELECTRONICS = '电子产品',
  FURNITURE = '办公家具',
  STATIONERY = '办公文具',
  HARDWARE = '硬件设施',
  OTHER = '其他'
}

export enum ComputerType {
  DESKTOP = '台式机',
  LAPTOP = '笔记本'
}

export enum ComputerStatus {
  IN_USE = '已领用',
  IDLE = '闲置',
  REPAIR = '维修中'
}

export enum ContractStatus {
  ACTIVE = '生效中',
  PENDING = '审批中',
  EXPIRED = '已过期',
  TERMINATED = '已终止'
}

export enum ContractType {
  PURCHASE = '采购合同',
  SERVICE = '服务协议',
  LEASE = '租赁合同',
  NDA = '保密协议(NDA)',
  EMPLOYMENT = '劳动合同',
  FRAMEWORK = '框架合作协议',
  LICENSING = '软件/IP授权',
  CONSTRUCTION = '工程建设合同',
  CONSULTING = '咨询服务合同',
  RENEWAL = '续签协议',
  STRATEGIC = '战略合作协议',
  OTHER = '其他'
}

export interface FixedAsset {
  id: string;
  name: string;                
  assetCode: string;           
  activationDate: string;      
  depreciationStartDate: string; 
  originalValue: number;       
  vatAmount: number;           
  netValueExTax: number;       
  usefulLifeYears: number;     
  residualRate: number;        
  residualValue: number;       
  monthlyDepreciation: number; 
  annualDepreciation: number;  
  monthsDepreciated: number;   
  currentMonthDepreciation: number; 
  accumulatedDepreciation: number; 
  netBookValue: number;        
  remainingDepreciation: number; 
  model?: string;
  serialNumber?: string;
  location?: string;
  locationImage?: string;
  status: AssetStatus;
  assignedTo?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface InventoryItem {
  id: string;
  name: string;
  sku: string;
  spec?: string;
  barcode: string;
  supplier: string;
  supplierId?: string;
  category: InventoryCategory;
  department?: string;
  purchaseDate?: string;
  quantity: number;
  unit: string;
  reorderPoint: number;
  unitPrice: number;
  location: string;
  locationImage?: string;
  remark?: string;
  image?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface ComputerSpecs {
  cpu: string;
  ram: string;
  gpu: string;
  storage: string;
  monitor: string;
  motherboard: string;
  soundCard?: string;
  networkCard?: string;
}

export interface ComputerUsageRecord {
  id: string;
  assetId?: string;
  deviceCode: string; 
  assetName: string;
  type: ComputerType;
  user: string;
  department: string;
  assignDate: string;
  notes: string;
  specs?: ComputerSpecs;
  status: ComputerStatus;
  createdAt?: string;
  updatedAt?: string;
}

export interface SupplierContact {
  name: string;
  phone: string;
  email: string;
  role?: string;
}

export interface Supplier {
  id: string;
  name: string;
  email: string; // 新增字段
  logo?: string;
  contacts: SupplierContact[]; 
  address: string;
  categories: string[]; 
  rating: number;
  status: 'active' | 'inactive' | 'in_stock';
  bankName: string;
  bankBranch: string;
  bankAccount: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface ContractFile {
  id: string;
  name: string;
  url: string;
  type: 'contract' | 'invoice';
  uploadDate: string;
}

export interface Contract {
  id: string;
  contractNumber: string;
  title: string;
  supplierId: string;
  supplierName: string;
  type: string;
  amount: number;
  startDate: string;
  endDate: string;
  status: ContractStatus;
  attachments: ContractFile[];
  createdAt?: string;
  updatedAt?: string;
}

export interface AiInsight {
  title: string;
  description: string;
  severity: 'low' | 'medium' | 'high';
  type: 'optimization' | 'warning' | 'info';
}

export type ViewState = 'dashboard' | 'assets' | 'inventory' | 'computer-usage' | 'suppliers' | 'contracts' | 'settings' | 'logs' | 'analysis';

export interface User {
  id: string;
  name: string;
  phone: string;
  email?: string;
  password?: string;
  role: 'admin' | 'user' | 'viewer';
  department: string;
  status: 'active' | 'disabled';
  lastLogin: string;
  avatar?: string;
  createdAt?: string;
  canChangePassword?: boolean;
  accessibleViews?: ViewState[];
}

export interface AuditLog {
  id: string;
  operator: string;
  action: string;
  module: string;
  target: string;
  details: string;
  timestamp: string;
}

export type LogFunction = (action: string, module: string, target: string, details: string) => void;

export type AiProvider = 'gemini' | 'deepseek' | 'openai' | 'custom';

export interface AppSettings {
  appName: string;
  logoUrl: string;
  faviconUrl?: string;
  loginHeadline?: string;
  loginDescription?: string;
  loginCopyrightText?: string;
  prefixConfig: {
    asset: string;
    inventory: string;
    desktop: string;
    laptop: string;
  };
  aiConfig: {
    provider: AiProvider;
    apiKey?: string;
    baseUrl?: string;
    modelName: string;
    creativityLevel: number;
  };
}

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface ToastMessage {
  id: string;
  type: ToastType;
  message: string;
}

export type ShowToastFunction = (message: string, type?: ToastType) => void;

export type ConfirmFunction = (title: string, message: string, onConfirm: () => void) => void;
