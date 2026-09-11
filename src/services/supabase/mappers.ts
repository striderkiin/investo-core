import type {
  AccountStatus,
  AdminAuditLog,
  AppNotification,
  AutomaticMarketBehavior,
  ContactMessage,
  ContactMessageStatus,
  Deposit,
  DepositStatus,
  Investment,
  InvestmentPlan,
  InvestmentPlanRateType,
  InvestmentPlanStatus,
  InvestmentStatus,
  MarketAdjustmentDirection,
  MarketAdjustmentType,
  MarketAsset,
  MarketControlPreset,
  MarketDataPoint,
  MarketMode,
  MarketOverrideHistoryEntry,
  MarketProviderHistoryPoint,
  MarketProviderState,
  MarketSettings,
  MarketTrend,
  MarketVolatility,
  NotificationType,
  Profile,
  Referral,
  ReferralReward,
  SocialProofBroadcastScope,
  SocialProofDemoActivity,
  SocialProofDemoEventType,
  SocialProofEvent,
  SocialProofEventSource,
  SocialProofMetric,
  SocialProofPopupPosition,
  SocialProofPrivacyMode,
  SocialProofSettings,
  SocialProofTemplate,
  SupportMessage,
  SupportTicket,
  SupportTicketCategory,
  SupportTicketStatus,
  Transaction,
  TransactionStatus,
  TransactionType,
  TreasuryAccount,
  Withdrawal,
  WithdrawalStatus,
} from '../../types/database';
import type { RoleName } from '../../types/roles';

export interface ProfileRow {
  id: string;
  email: string;
  full_name: string;
  avatar_url: string | null;
  role: RoleName;
  account_status: AccountStatus;
  total_balance: number;
  available_balance: number;
  bonus_balance: number;
  invested_balance: number;
  referral_code: string;
  referred_by: string | null;
  created_at: string;
  updated_at: string;
}

export function mapProfileRow(row: ProfileRow): Profile {
  return {
    id: row.id,
    email: row.email,
    fullName: row.full_name,
    avatarUrl: row.avatar_url,
    role: row.role,
    accountStatus: row.account_status,
    totalBalance: Number(row.total_balance),
    availableBalance: Number(row.available_balance),
    bonusBalance: Number(row.bonus_balance),
    investedBalance: Number(row.invested_balance),
    referralCode: row.referral_code,
    referredBy: row.referred_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export interface InvestmentPlanRow {
  id: string;
  name: string;
  description: string;
  min_amount: number;
  max_amount: number;
  rate: number;
  rate_type: InvestmentPlanRateType;
  duration_days: number;
  status: InvestmentPlanStatus;
  created_at: string;
  updated_at: string;
}

export function mapInvestmentPlanRow(row: InvestmentPlanRow): InvestmentPlan {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    minAmount: Number(row.min_amount),
    maxAmount: Number(row.max_amount),
    rate: Number(row.rate),
    rateType: row.rate_type,
    durationDays: row.duration_days,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export interface InvestmentRow {
  id: string;
  user_id: string;
  plan_id: string;
  amount: number;
  rate: number;
  rate_type: InvestmentPlanRateType;
  duration_days: number;
  status: InvestmentStatus;
  started_at: string;
  ends_at: string;
  current_earnings: number;
  created_at: string;
}

export function mapInvestmentRow(row: InvestmentRow): Investment {
  return {
    id: row.id,
    userId: row.user_id,
    planId: row.plan_id,
    amount: Number(row.amount),
    rate: Number(row.rate),
    rateType: row.rate_type,
    durationDays: row.duration_days,
    status: row.status,
    startedAt: row.started_at,
    endsAt: row.ends_at,
    currentEarnings: Number(row.current_earnings),
    createdAt: row.created_at,
  };
}

export interface TransactionRow {
  id: string;
  user_id: string;
  type: TransactionType;
  amount: number;
  balance_before: number;
  balance_after: number;
  status: TransactionStatus;
  reference: string;
  description: string | null;
  created_at: string;
}

export function mapTransactionRow(row: TransactionRow): Transaction {
  return {
    id: row.id,
    userId: row.user_id,
    type: row.type,
    amount: Number(row.amount),
    balanceBefore: Number(row.balance_before),
    balanceAfter: Number(row.balance_after),
    status: row.status,
    reference: row.reference,
    description: row.description,
    createdAt: row.created_at,
  };
}

export interface DepositRow {
  id: string;
  user_id: string;
  amount: number;
  currency: string;
  network: string;
  provider: string;
  provider_reference: string | null;
  status: DepositStatus;
  transaction_id: string | null;
  created_at: string;
  updated_at: string;
}

export function mapDepositRow(row: DepositRow): Deposit {
  return {
    id: row.id,
    userId: row.user_id,
    amount: Number(row.amount),
    currency: row.currency,
    network: row.network,
    provider: row.provider,
    providerReference: row.provider_reference,
    status: row.status,
    transactionId: row.transaction_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export interface WithdrawalRow {
  id: string;
  user_id: string;
  amount: number;
  fee: number;
  currency: string;
  network: string;
  destination: string;
  status: WithdrawalStatus;
  reviewed_by: string | null;
  transaction_id: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export function mapWithdrawalRow(row: WithdrawalRow): Withdrawal {
  return {
    id: row.id,
    userId: row.user_id,
    amount: Number(row.amount),
    fee: Number(row.fee),
    currency: row.currency,
    network: row.network,
    destination: row.destination,
    status: row.status,
    reviewedBy: row.reviewed_by,
    transactionId: row.transaction_id,
    notes: row.notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export interface TreasuryAccountRow {
  id: string;
  name: string;
  balance: number;
  reserve_balance: number;
  environment: string;
  updated_at: string;
}

export function mapTreasuryAccountRow(row: TreasuryAccountRow): TreasuryAccount {
  return {
    id: row.id,
    name: row.name,
    balance: Number(row.balance),
    reserveBalance: Number(row.reserve_balance),
    environment: row.environment,
    updatedAt: row.updated_at,
  };
}

export interface ReferralRow {
  id: string;
  referrer_id: string;
  referred_id: string;
  created_at: string;
}

export function mapReferralRow(row: ReferralRow): Referral {
  return { id: row.id, referrerId: row.referrer_id, referredId: row.referred_id, createdAt: row.created_at };
}

export interface ReferralRewardRow {
  id: string;
  referral_id: string;
  amount: number;
  reason: string;
  created_at: string;
}

export function mapReferralRewardRow(row: ReferralRewardRow): ReferralReward {
  return { id: row.id, referralId: row.referral_id, amount: Number(row.amount), reason: row.reason, createdAt: row.created_at };
}

export interface NotificationRow {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  message: string;
  read_at: string | null;
  created_at: string;
}

export function mapNotificationRow(row: NotificationRow): AppNotification {
  return {
    id: row.id,
    userId: row.user_id,
    type: row.type,
    title: row.title,
    message: row.message,
    readAt: row.read_at,
    createdAt: row.created_at,
  };
}

export interface SupportTicketRow {
  id: string;
  user_id: string;
  subject: string;
  category: SupportTicketCategory;
  status: SupportTicketStatus;
  assigned_to: string | null;
  created_at: string;
  updated_at: string;
}

export function mapSupportTicketRow(row: SupportTicketRow): SupportTicket {
  return {
    id: row.id,
    userId: row.user_id,
    subject: row.subject,
    category: row.category,
    status: row.status,
    assignedTo: row.assigned_to,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export interface SupportMessageRow {
  id: string;
  ticket_id: string;
  sender_id: string;
  is_admin: boolean;
  message: string;
  created_at: string;
}

export function mapSupportMessageRow(row: SupportMessageRow): SupportMessage {
  return {
    id: row.id,
    ticketId: row.ticket_id,
    senderId: row.sender_id,
    isAdmin: row.is_admin,
    message: row.message,
    createdAt: row.created_at,
  };
}

export interface MarketSettingsRow {
  id: string;
  mode: MarketMode;
  automatic_behavior: AutomaticMarketBehavior;
  update_interval_ms: number;
  min_movement: number;
  max_movement: number;
  starting_value: number;
  manual_control_enabled: boolean;
  market_value_control_enabled: boolean;
  percentage_control_enabled: boolean;
  trend_control_enabled: boolean;
  volatility_control_enabled: boolean;
  movement_control_enabled: boolean;
  market_value_step: number;
  percentage_step: number;
  current_market_value: number;
  current_percentage_change: number;
  current_trend: MarketTrend;
  current_volatility: MarketVolatility;
  movement_strength: number;
  preview_mode: boolean;
  updated_at: string;
}

export function mapMarketSettingsRow(row: MarketSettingsRow): MarketSettings {
  return {
    id: row.id,
    mode: row.mode,
    automaticBehavior: row.automatic_behavior,
    updateIntervalMs: row.update_interval_ms,
    minMovement: Number(row.min_movement),
    maxMovement: Number(row.max_movement),
    startingValue: Number(row.starting_value),
    manualControlEnabled: row.manual_control_enabled,
    marketValueControlEnabled: row.market_value_control_enabled,
    percentageControlEnabled: row.percentage_control_enabled,
    trendControlEnabled: row.trend_control_enabled,
    volatilityControlEnabled: row.volatility_control_enabled,
    movementControlEnabled: row.movement_control_enabled,
    marketValueStep: Number(row.market_value_step),
    percentageStep: Number(row.percentage_step),
    currentMarketValue: Number(row.current_market_value),
    currentPercentageChange: Number(row.current_percentage_change),
    currentTrend: row.current_trend,
    currentVolatility: row.current_volatility,
    movementStrength: row.movement_strength,
    previewMode: row.preview_mode,
    updatedAt: row.updated_at,
  };
}

export interface MarketDataRow {
  id: string;
  value: number;
  percentage_change: number;
  trend: MarketTrend;
  is_manual: boolean;
  recorded_at: string;
}

export function mapMarketDataRow(row: MarketDataRow): MarketDataPoint {
  return {
    id: row.id,
    value: Number(row.value),
    percentageChange: Number(row.percentage_change),
    trend: row.trend,
    isManual: row.is_manual,
    recordedAt: row.recorded_at,
  };
}

export interface MarketControlPresetRow {
  id: string;
  name: string;
  settings: Partial<MarketSettings>;
  created_by: string;
  created_at: string;
}

export function mapMarketControlPresetRow(row: MarketControlPresetRow): MarketControlPreset {
  return {
    id: row.id,
    name: row.name,
    settings: row.settings,
    createdBy: row.created_by,
    createdAt: row.created_at,
  };
}

export interface MarketAssetRow {
  id: string;
  symbol: string;
  display_name: string;
  enabled: boolean;
  sort_order: number;
  created_at: string;
}

export function mapMarketAssetRow(row: MarketAssetRow): MarketAsset {
  return {
    id: row.id,
    symbol: row.symbol,
    displayName: row.display_name,
    enabled: row.enabled,
    sortOrder: row.sort_order,
    createdAt: row.created_at,
  };
}

export interface MarketProviderStateRow {
  id: string;
  asset_id: string;
  provider_price: number;
  manual_offset: number;
  effective_price: number;
  manual_increase_enabled: boolean;
  manual_decrease_enabled: boolean;
  direct_value_entry_enabled: boolean;
  percentage_adjustment_enabled: boolean;
  automatic_behavior: AutomaticMarketBehavior;
  min_movement: number;
  max_movement: number;
  updated_at: string;
}

export function mapMarketProviderStateRow(row: MarketProviderStateRow): MarketProviderState {
  return {
    id: row.id,
    assetId: row.asset_id,
    providerPrice: Number(row.provider_price),
    manualOffset: Number(row.manual_offset),
    effectivePrice: Number(row.effective_price),
    manualIncreaseEnabled: row.manual_increase_enabled,
    manualDecreaseEnabled: row.manual_decrease_enabled,
    directValueEntryEnabled: row.direct_value_entry_enabled,
    percentageAdjustmentEnabled: row.percentage_adjustment_enabled,
    automaticBehavior: row.automatic_behavior,
    minMovement: Number(row.min_movement),
    maxMovement: Number(row.max_movement),
    updatedAt: row.updated_at,
  };
}

export interface MarketProviderHistoryRow {
  id: string;
  asset_id: string;
  value: number;
  is_manual: boolean;
  recorded_at: string;
}

export function mapMarketProviderHistoryRow(row: MarketProviderHistoryRow): MarketProviderHistoryPoint {
  return {
    id: row.id,
    assetId: row.asset_id,
    value: Number(row.value),
    isManual: row.is_manual,
    recordedAt: row.recorded_at,
  };
}

export interface MarketOverrideHistoryRow {
  id: string;
  asset_id: string;
  admin_id: string | null;
  adjustment_type: MarketAdjustmentType;
  direction: MarketAdjustmentDirection;
  input_value: number | null;
  previous_offset: number;
  new_offset: number;
  previous_effective_price: number;
  new_effective_price: number;
  undone: boolean;
  created_at: string;
}

export function mapMarketOverrideHistoryRow(row: MarketOverrideHistoryRow): MarketOverrideHistoryEntry {
  return {
    id: row.id,
    assetId: row.asset_id,
    adminId: row.admin_id,
    adjustmentType: row.adjustment_type,
    direction: row.direction,
    inputValue: row.input_value === null ? null : Number(row.input_value),
    previousOffset: Number(row.previous_offset),
    newOffset: Number(row.new_offset),
    previousEffectivePrice: Number(row.previous_effective_price),
    newEffectivePrice: Number(row.new_effective_price),
    undone: row.undone,
    createdAt: row.created_at,
  };
}

export interface SocialProofSettingsRow {
  id: string;
  enabled: boolean;
  demo_mode_enabled: boolean;
  test_mode_enabled: boolean;
  popup_position: SocialProofPopupPosition;
  display_duration_seconds: number;
  min_delay_seconds: number;
  max_delay_seconds: number;
  max_queue: number;
  max_per_session: number;
  max_per_minute: number;
  enable_sound: boolean;
  show_close_button: boolean;
  privacy_mode: SocialProofPrivacyMode;
  enabled_event_types: string[];
  test_event_types: string[];
  updated_at: string;
}

export function mapSocialProofSettingsRow(row: SocialProofSettingsRow): SocialProofSettings {
  return {
    id: row.id,
    enabled: row.enabled,
    demoModeEnabled: row.demo_mode_enabled,
    testModeEnabled: row.test_mode_enabled,
    popupPosition: row.popup_position,
    displayDurationSeconds: row.display_duration_seconds,
    minDelaySeconds: row.min_delay_seconds,
    maxDelaySeconds: row.max_delay_seconds,
    maxQueue: row.max_queue,
    maxPerSession: row.max_per_session,
    maxPerMinute: row.max_per_minute,
    enableSound: row.enable_sound,
    showCloseButton: row.show_close_button,
    privacyMode: row.privacy_mode,
    enabledEventTypes: row.enabled_event_types ?? [],
    testEventTypes: row.test_event_types ?? [],
    updatedAt: row.updated_at,
  };
}

export interface SocialProofTemplateRow {
  id: string;
  event_type: string;
  template: string;
  updated_at: string;
}

export function mapSocialProofTemplateRow(row: SocialProofTemplateRow): SocialProofTemplate {
  return { id: row.id, eventType: row.event_type, template: row.template, updatedAt: row.updated_at };
}

export interface SocialProofDemoActivityRow {
  id: string;
  event_type: SocialProofDemoEventType;
  message: string;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export function mapSocialProofDemoActivityRow(row: SocialProofDemoActivityRow): SocialProofDemoActivity {
  return {
    id: row.id,
    eventType: row.event_type,
    message: row.message,
    sortOrder: row.sort_order,
    isActive: row.is_active,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export interface SocialProofEventRow {
  id: string;
  event_type: string;
  source: SocialProofEventSource;
  display_name: string;
  message: string;
  amount: number | null;
  plan_name: string | null;
  reference_table: string | null;
  reference_id: string | null;
  generated_by_admin_id: string | null;
  environment: string;
  broadcast_scope: SocialProofBroadcastScope;
  created_at: string;
  expires_at: string;
}

export function mapSocialProofEventRow(row: SocialProofEventRow): SocialProofEvent {
  return {
    id: row.id,
    eventType: row.event_type,
    source: row.source,
    displayName: row.display_name,
    message: row.message,
    amount: row.amount === null ? null : Number(row.amount),
    planName: row.plan_name,
    referenceTable: row.reference_table,
    referenceId: row.reference_id,
    generatedByAdminId: row.generated_by_admin_id,
    environment: row.environment,
    broadcastScope: row.broadcast_scope,
    createdAt: row.created_at,
    expiresAt: row.expires_at,
  };
}

export interface SocialProofMetricRow {
  metric_date: string;
  event_type: string;
  source: SocialProofEventSource;
  shown_count: number;
  clicked_count: number;
  dismissed_count: number;
}

export function mapSocialProofMetricRow(row: SocialProofMetricRow): SocialProofMetric {
  return {
    metricDate: row.metric_date,
    eventType: row.event_type,
    source: row.source,
    shownCount: row.shown_count,
    clickedCount: row.clicked_count,
    dismissedCount: row.dismissed_count,
  };
}

export interface ContactMessageRow {
  id: string;
  name: string;
  email: string;
  subject: string;
  message: string;
  status: ContactMessageStatus;
  submitted_by: string | null;
  responded_by: string | null;
  responded_at: string | null;
  created_at: string;
}

export function mapContactMessageRow(row: ContactMessageRow): ContactMessage {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    subject: row.subject,
    message: row.message,
    status: row.status,
    submittedBy: row.submitted_by,
    respondedBy: row.responded_by,
    respondedAt: row.responded_at,
    createdAt: row.created_at,
  };
}

export interface AdminAuditLogRow {
  id: string;
  admin_id: string;
  action: string;
  module: string;
  target: string | null;
  previous_value: string | null;
  new_value: string | null;
  environment: string;
  created_at: string;
}

export function mapAdminAuditLogRow(row: AdminAuditLogRow): AdminAuditLog {
  return {
    id: row.id,
    adminId: row.admin_id,
    action: row.action,
    module: row.module,
    target: row.target,
    previousValue: row.previous_value,
    newValue: row.new_value,
    environment: row.environment,
    createdAt: row.created_at,
  };
}
