import type { RoleName } from './roles';

export type AccountStatus = 'active' | 'restricted' | 'withdrawal_freeze' | 'suspended' | 'frozen';

export interface Profile {
  id: string;
  email: string;
  fullName: string;
  avatarUrl: string | null;
  role: RoleName;
  accountStatus: AccountStatus;
  totalBalance: number;
  availableBalance: number;
  bonusBalance: number;
  investedBalance: number;
  referralCode: string;
  referredBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export type InvestmentPlanRateType = 'daily' | 'weekly' | 'monthly';
export type InvestmentPlanStatus = 'active' | 'paused' | 'inactive';

export interface InvestmentPlan {
  id: string;
  name: string;
  description: string;
  minAmount: number;
  maxAmount: number;
  rate: number;
  rateType: InvestmentPlanRateType;
  durationDays: number;
  status: InvestmentPlanStatus;
  createdAt: string;
  updatedAt: string;
}

export type InvestmentStatus = 'active' | 'completed' | 'paused' | 'cancelled';

export interface Investment {
  id: string;
  userId: string;
  planId: string;
  amount: number;
  rate: number;
  rateType: InvestmentPlanRateType;
  durationDays: number;
  status: InvestmentStatus;
  startedAt: string;
  endsAt: string;
  currentEarnings: number;
  createdAt: string;
}

export type TransactionType = 'deposit' | 'withdrawal' | 'investment' | 'yield' | 'bonus' | 'referral' | 'adjustment';
export type TransactionStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'rejected';

export interface Transaction {
  id: string;
  userId: string;
  type: TransactionType;
  amount: number;
  balanceBefore: number;
  balanceAfter: number;
  status: TransactionStatus;
  reference: string;
  description: string | null;
  createdAt: string;
}

export type DepositStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'rejected';

export interface Deposit {
  id: string;
  userId: string;
  amount: number;
  currency: string;
  network: string;
  provider: string;
  providerReference: string | null;
  status: DepositStatus;
  transactionId: string | null;
  createdAt: string;
  updatedAt: string;
}

export type WithdrawalStatus = 'pending' | 'review' | 'processing' | 'completed' | 'rejected' | 'failed';

export interface Withdrawal {
  id: string;
  userId: string;
  amount: number;
  fee: number;
  currency: string;
  network: string;
  destination: string;
  status: WithdrawalStatus;
  reviewedBy: string | null;
  transactionId: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface TreasuryAccount {
  id: string;
  name: string;
  balance: number;
  reserveBalance: number;
  environment: string;
  updatedAt: string;
}

export interface Referral {
  id: string;
  referrerId: string;
  referredId: string;
  createdAt: string;
}

export interface ReferralReward {
  id: string;
  referralId: string;
  amount: number;
  reason: string;
  createdAt: string;
}

export type NotificationType =
  | 'deposit_confirmed'
  | 'withdrawal_pending'
  | 'withdrawal_processing'
  | 'withdrawal_completed'
  | 'investment_started'
  | 'investment_completed'
  | 'referral_bonus'
  | 'system_announcement'
  | 'new_user'
  | 'large_withdrawal'
  | 'failed_payment'
  | 'security_alert'
  | 'support_ticket';

export interface AppNotification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  readAt: string | null;
  createdAt: string;
}

export type SupportTicketCategory = 'deposit' | 'withdrawal' | 'account' | 'investment' | 'technical' | 'other';
export type SupportTicketStatus = 'open' | 'in_progress' | 'waiting' | 'resolved' | 'closed';

export interface SupportTicket {
  id: string;
  userId: string;
  subject: string;
  category: SupportTicketCategory;
  status: SupportTicketStatus;
  assignedTo: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SupportMessage {
  id: string;
  ticketId: string;
  senderId: string;
  isAdmin: boolean;
  message: string;
  createdAt: string;
}

export type MarketTrend = 'bullish' | 'stable' | 'bearish';
export type MarketVolatility = 'low' | 'medium' | 'high' | 'extreme';
export type MarketMode = 'automatic' | 'manual';
export type AutomaticMarketBehavior = 'stable' | 'upward' | 'downward' | 'volatile' | 'random';

export interface MarketSettings {
  id: string;
  mode: MarketMode;
  automaticBehavior: AutomaticMarketBehavior;
  updateIntervalMs: number;
  minMovement: number;
  maxMovement: number;
  startingValue: number;
  manualControlEnabled: boolean;
  marketValueControlEnabled: boolean;
  percentageControlEnabled: boolean;
  trendControlEnabled: boolean;
  volatilityControlEnabled: boolean;
  movementControlEnabled: boolean;
  marketValueStep: number;
  percentageStep: number;
  currentMarketValue: number;
  currentPercentageChange: number;
  currentTrend: MarketTrend;
  currentVolatility: MarketVolatility;
  movementStrength: number;
  previewMode: boolean;
  updatedAt: string;
}

export interface MarketDataPoint {
  id: string;
  value: number;
  percentageChange: number;
  trend: MarketTrend;
  isManual: boolean;
  recordedAt: string;
}

export interface MarketControlPreset {
  id: string;
  name: string;
  settings: Partial<MarketSettings>;
  createdBy: string;
  createdAt: string;
}

// --- Live Provider + Manual Override architecture (post-build correction) ---
// Additive to MarketSettings/MarketDataPoint above, which remain the
// "automatic vs. manual chart simulation" system exactly as originally
// built. This is a separate, per-asset layer: effectivePrice = providerPrice
// + manualOffset, where providerPrice keeps advancing on its own regardless
// of any active override.

export interface MarketAsset {
  id: string;
  symbol: string;
  displayName: string;
  enabled: boolean;
  sortOrder: number;
  createdAt: string;
}

export type MarketAdjustmentDirection = 'increase' | 'decrease' | 'set';
export type MarketAdjustmentType = 'fixed' | 'percentage' | 'direct' | 'undo' | 'reset' | 'reset_all';
export type MarketCapabilityKey =
  | 'manualIncreaseEnabled'
  | 'manualDecreaseEnabled'
  | 'directValueEntryEnabled'
  | 'percentageAdjustmentEnabled';

export interface MarketProviderState {
  id: string;
  assetId: string;
  providerPrice: number;
  manualOffset: number;
  effectivePrice: number;
  manualIncreaseEnabled: boolean;
  manualDecreaseEnabled: boolean;
  directValueEntryEnabled: boolean;
  percentageAdjustmentEnabled: boolean;
  automaticBehavior: AutomaticMarketBehavior;
  minMovement: number;
  maxMovement: number;
  updatedAt: string;
}

export interface MarketProviderHistoryPoint {
  id: string;
  assetId: string;
  value: number;
  isManual: boolean;
  recordedAt: string;
}

export interface MarketOverrideHistoryEntry {
  id: string;
  assetId: string;
  adminId: string | null;
  adjustmentType: MarketAdjustmentType;
  direction: MarketAdjustmentDirection;
  inputValue: number | null;
  previousOffset: number;
  newOffset: number;
  previousEffectivePrice: number;
  newEffectivePrice: number;
  undone: boolean;
  createdAt: string;
}

// --- Social Proof & Activity Notification System (post-build correction) ---

export type SocialProofPopupPosition = 'bottom-left' | 'bottom-right';
export type SocialProofPrivacyMode = 'first_name' | 'first_initial' | 'anonymous';
export type SocialProofEventSource = 'production' | 'admin_test';
export type SocialProofBroadcastScope = 'production' | 'client_test';

export interface SocialProofSettings {
  id: string;
  enabled: boolean;
  demoModeEnabled: boolean;
  testModeEnabled: boolean;
  popupPosition: SocialProofPopupPosition;
  displayDurationSeconds: number;
  minDelaySeconds: number;
  maxDelaySeconds: number;
  maxQueue: number;
  maxPerSession: number;
  maxPerMinute: number;
  enableSound: boolean;
  showCloseButton: boolean;
  privacyMode: SocialProofPrivacyMode;
  enabledEventTypes: string[];
  testEventTypes: string[];
  updatedAt: string;
}

export interface SocialProofTemplate {
  id: string;
  eventType: string;
  template: string;
  updatedAt: string;
}

export type SocialProofDemoEventType = 'deposit' | 'investment' | 'withdrawal' | 'market' | 'account';

export interface SocialProofDemoActivity {
  id: string;
  eventType: SocialProofDemoEventType;
  message: string;
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface SocialProofEvent {
  id: string;
  eventType: string;
  source: SocialProofEventSource;
  displayName: string;
  message: string;
  amount: number | null;
  planName: string | null;
  referenceTable: string | null;
  referenceId: string | null;
  generatedByAdminId: string | null;
  environment: string;
  broadcastScope: SocialProofBroadcastScope;
  createdAt: string;
  expiresAt: string;
}

export interface SocialProofMetric {
  metricDate: string;
  eventType: string;
  source: SocialProofEventSource;
  shownCount: number;
  clickedCount: number;
  dismissedCount: number;
}

export type SocialLinkPlatform = 'twitter' | 'facebook' | 'instagram' | 'linkedin' | 'youtube' | 'tiktok';

export interface SocialLink {
  id: string;
  platform: SocialLinkPlatform;
  url: string;
  enabled: boolean;
  sortOrder: number;
  updatedAt: string;
}

export type ContactMessageStatus = 'new' | 'read' | 'responded' | 'closed';

export interface ContactMessage {
  id: string;
  name: string;
  email: string;
  subject: string;
  message: string;
  status: ContactMessageStatus;
  submittedBy: string | null;
  respondedBy: string | null;
  respondedAt: string | null;
  createdAt: string;
}

export interface AdminAuditLog {
  id: string;
  adminId: string;
  action: string;
  module: string;
  target: string | null;
  previousValue: string | null;
  newValue: string | null;
  environment: string;
  createdAt: string;
}
