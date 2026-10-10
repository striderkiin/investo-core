export type SiteStatus = 'setting_up' | 'live' | 'parked' | 'cancelled';
export type BillingCycle = 'monthly' | 'yearly';
export type PaymentKind = 'launch' | 'monthly' | 'yearly' | 'parking' | 'custom';
export type BillingState = 'paid' | 'grace' | 'overdue' | 'unpaid' | 'cancelled';

export interface Buyer {
  id: string;
  name: string;
  email: string | null;
  contact: string | null;
  notes: string | null;
  created_at: string;
}

export interface Site {
  id: string;
  buyer_id: string;
  name: string;
  domain: string | null;
  temp_url: string | null;
  status: SiteStatus;
  billing_cycle: BillingCycle;
  monthly_fee: number;
  region: string;
  supabase_ref: string | null;
  paid_until: string | null;
  notes: string | null;
  created_at: string;
}

export interface SiteOverview extends Site {
  buyer_name: string;
  billing_state: BillingState;
  days_left: number | null;
}

export interface Payment {
  id: string;
  site_id: string;
  kind: PaymentKind;
  amount: number;
  method: string | null;
  reference: string | null;
  note: string | null;
  paid_at: string;
  paid_until_after: string | null;
  voided_at: string | null;
  created_at: string;
}

export interface SiteEvent {
  id: number;
  site_id: string;
  kind: string;
  detail: string | null;
  created_at: string;
}

export interface HqSettings {
  launch_fee: number;
  monthly_fee: number;
  yearly_fee: number;
  parking_fee: number;
  grace_days: number;
  default_region: string;
}

export const STATUS_LABEL: Record<SiteStatus, string> = {
  setting_up: 'Setting up',
  live: 'Live',
  parked: 'Parked',
  cancelled: 'Cancelled',
};

export const STATUS_VARIANT: Record<SiteStatus, string> = {
  setting_up: 'info',
  live: 'success',
  parked: 'secondary',
  cancelled: 'dark',
};

export const BILLING_LABEL: Record<BillingState, string> = {
  paid: 'Paid',
  grace: 'In grace period',
  overdue: 'Overdue',
  unpaid: 'Not paid yet',
  cancelled: 'Cancelled',
};

export const BILLING_VARIANT: Record<BillingState, string> = {
  paid: 'success',
  grace: 'warning',
  overdue: 'danger',
  unpaid: 'secondary',
  cancelled: 'dark',
};

export const PAYMENT_LABEL: Record<PaymentKind, string> = {
  launch: 'Launch (first payment)',
  monthly: 'Monthly',
  yearly: 'Yearly',
  parking: 'Parking',
  custom: 'Custom work',
};

// Supabase regions offered for new buyer sites.
export const REGIONS: { value: string; label: string }[] = [
  { value: 'eu-central-1', label: 'Europe, Frankfurt' },
  { value: 'eu-west-2', label: 'Europe, London' },
  { value: 'eu-west-1', label: 'Europe, Ireland' },
  { value: 'us-east-1', label: 'US East, Virginia' },
  { value: 'us-west-1', label: 'US West, California' },
  { value: 'ap-southeast-1', label: 'Asia, Singapore' },
  { value: 'ap-south-1', label: 'Asia, Mumbai' },
  { value: 'sa-east-1', label: 'South America, São Paulo' },
];

export const regionLabel = (value: string) => REGIONS.find((r) => r.value === value)?.label ?? value;

export const money = (value: number | string) =>
  `$${Number(value).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;

export const formatDate = (value: string | null) =>
  value ? new Date(value.length === 10 ? `${value}T00:00:00` : value).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';
