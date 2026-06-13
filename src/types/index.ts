export interface Variation {
  id: string;
  name: string;
  price: number;
  stock_on_hand?: number;
  cost_price?: number;
  margin?: number;
}

export interface AddOn {
  id: string;
  name: string;
  price: number;
  category: string;
  quantity?: number;
}

export interface MenuItem {
  id: string;
  name: string;
  description: string;
  basePrice: number;
  category: string;
  image?: string;
  popular?: boolean;
  available?: boolean;
  sku?: string;
  variations?: Variation[];
  addOns?: AddOn[];
  // Discount pricing fields
  discountPrice?: number;
  discountStartDate?: string;
  discountEndDate?: string;
  discountActive?: boolean;
  // Computed effective price (calculated in the app)
  effectivePrice?: number;
  isOnDiscount?: boolean;
  // Stock information
  currentStock?: number;
  isTracked?: boolean;
  isOutOfStock?: boolean;
  // Admin-only fields
  costPrice?: number;
  margin?: number;
  expiryDate?: string;
  internalNotes?: string;
}

export interface CartItem extends MenuItem {
  quantity: number;
  selectedVariation?: Variation;
  selectedAddOns?: AddOn[];
  totalPrice: number;
}

export interface OrderData {
  items: CartItem[];
  customerName: string;
  contactNumber: string;
  serviceType: 'pickup' | 'store-delivery' | 'lalamove';
  address?: string;
  pickupTime?: string;
  paymentMethod: 'cash' | 'gcash' | 'maya' | 'bank-transfer' | 'qrph';
  referenceNumber?: string;
  total: number;
  notes?: string;
}

export type PaymentMethod = 'cash' | 'gcash' | 'maya' | 'bank-transfer' | 'qrph';
export type ServiceType = 'pickup' | 'store-delivery' | 'lalamove';

export interface DeliverySubdivision {
  id: string;
  name: string;
  delivery_fee: number;
  sort_order: number;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface DeliveryGlobalSettings {
  id: string;
  free_delivery_promo: boolean;
  updated_at: string;
}

// Site Settings Types
export interface SiteSetting {
  id: string;
  value: string;
  type: 'text' | 'image' | 'boolean' | 'number';
  description?: string;
  updated_at: string;
}

export interface SiteSettings {
  site_name: string;
  site_logo: string;
  site_description: string;
  currency: string;
  currency_code: string;
}

// Announcement Types
export interface Announcement {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'success' | 'error';
  active: boolean;
  start_date?: string;
  end_date?: string;
  created_at: string;
  updated_at: string;
}