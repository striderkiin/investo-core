import type { Deposit, DepositStatus, WithdrawalStatus } from '../../types/database';

export interface CreateDepositInput {
  userId: string;
  amount: number;
  currency: string;
  network: string;
}

export interface DepositSession {
  deposit: Deposit;
  address: string | null;
  qrCodeData: string | null;
}

export interface WithdrawalRequestInput {
  userId: string;
  amount: number;
  currency: string;
  network: string;
  destination: string;
}

export interface WithdrawalRequestResult {
  providerReference: string;
  status: WithdrawalStatus;
}

/**
 * Every payment provider (Demo, Sandbox, Production) implements this interface.
 * Components and the deposit/withdrawal UI never talk to a provider directly —
 * they go through depositService/withdrawalService, which resolve the active
 * provider for the current environment. Swapping providers never requires
 * touching the frontend.
 */
export interface PaymentProvider {
  readonly name: string;
  createDeposit(input: CreateDepositInput): Promise<DepositSession>;
  getDepositStatus(depositId: string): Promise<DepositStatus>;
  requestWithdrawal(input: WithdrawalRequestInput): Promise<WithdrawalRequestResult>;
  getWithdrawalStatus(providerReference: string): Promise<WithdrawalStatus>;
  verifyWebhook(payload: unknown, signature: string | null): boolean;
}
