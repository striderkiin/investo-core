import { requireClientSession } from './shell';
import { createWithdrawalService } from '../../src/services/api/withdrawalService';
import { formatCurrency } from './format';
import { getSupabaseClient } from '../../src/services/supabase/client';
import type { Profile } from '../../src/types/database';

const withdrawalService = createWithdrawalService();

// Payouts are USDT only. TRC20 first: its network fee is about $1, ERC20's is far higher.
const NETWORKS: Record<string, string[]> = {
  USDT: ['TRC20', 'ERC20'],
};

function populateNetworks(): void {
  const currencySelect = document.getElementById('withdrawCurrency') as HTMLSelectElement | null;
  const networkSelect = document.getElementById('withdrawNetwork') as HTMLSelectElement | null;
  if (!currencySelect || !networkSelect) return;

  function refresh(): void {
    const networks = NETWORKS[currencySelect!.value] ?? [];
    networkSelect!.innerHTML = networks.map((n) => `<option value="${n}">${n}</option>`).join('');
  }

  currencySelect.addEventListener('change', refresh);
  refresh();
}

function showError(message: string): void {
  const box = document.getElementById('withdrawError');
  if (!box) return;
  box.textContent = message;
  box.style.display = '';
}

function hideError(): void {
  const box = document.getElementById('withdrawError');
  if (box) box.style.display = 'none';
}

function showResultPanel(): void {
  const formPanel = document.getElementById('withdrawFormPanel');
  const resultPanel = document.getElementById('withdrawResultPanel');
  if (formPanel) formPanel.style.display = 'none';
  if (resultPanel) resultPanel.style.display = '';
}

function showFormPanel(): void {
  const formPanel = document.getElementById('withdrawFormPanel');
  const resultPanel = document.getElementById('withdrawResultPanel');
  if (formPanel) formPanel.style.display = '';
  if (resultPanel) resultPanel.style.display = 'none';
}

function wireForm(profile: Profile): void {
  const balanceEl = document.getElementById('withdrawAvailableBalance');
  if (balanceEl) balanceEl.textContent = formatCurrency(profile.availableBalance);

  const form = document.getElementById('withdrawForm') as HTMLFormElement | null;
  const submitButton = document.getElementById('withdrawSubmit') as HTMLButtonElement | null;
  const againButton = document.getElementById('withdrawAgainButton');
  if (!form || !submitButton) return;

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    hideError();

    const amount = Number((document.getElementById('withdrawAmount') as HTMLInputElement | null)?.value ?? '');
    const currency = (document.getElementById('withdrawCurrency') as HTMLSelectElement | null)?.value ?? '';
    const network = (document.getElementById('withdrawNetwork') as HTMLSelectElement | null)?.value ?? '';
    const destination = ((document.getElementById('withdrawDestination') as HTMLInputElement | null)?.value ?? '').trim();

    if (!amount || amount <= 0) {
      showError('Enter a valid amount.');
      return;
    }
    if (amount > profile.availableBalance) {
      showError('That amount is more than your available balance.');
      return;
    }
    if (!destination) {
      showError('Enter a destination address.');
      return;
    }

    submitButton.disabled = true;
    submitButton.textContent = 'Submitting…';

    void withdrawalService
      .request({ amount, currency, network, destination })
      .then((withdrawal) => {
        const resultText = document.getElementById('withdrawResultText');
        if (resultText) {
          resultText.textContent = `Your withdrawal request for ${formatCurrency(withdrawal.amount)} ${withdrawal.currency} has been submitted. Status: ${withdrawal.status}.`;
        }
        showResultPanel();
      })
      .catch((err: unknown) => {
        showError(err instanceof Error ? err.message : 'Unable to submit withdrawal request. Please try again.');
      })
      .finally(() => {
        submitButton.disabled = false;
        submitButton.textContent = 'Request Withdrawal';
      });
  });

  againButton?.addEventListener('click', () => {
    form.reset();
    showFormPanel();
  });
}

type WithdrawalRules = { minimum: number; maximum: number; kyc_verified: boolean; kyc_limit: number; kyc_remaining: number | null };

/** Shows this customer's limits: the minimum (lowest of their active plans) and, without verification, what is left of the limit. */
async function showRules(): Promise<void> {
  const box = document.getElementById('withdrawRules');
  if (!box) return;
  const { data, error } = await getSupabaseClient().rpc('my_withdrawal_rules');
  if (error || !data) return;
  const rules = data as WithdrawalRules;
  const lines = [`Minimum withdrawal: ${formatCurrency(Number(rules.minimum))}.`];
  if (!rules.kyc_verified) {
    lines.push(
      `Without identity verification you can withdraw up to ${formatCurrency(Number(rules.kyc_limit))} in total. You have ${formatCurrency(Number(rules.kyc_remaining ?? 0))} left. <a href="settings.html">Verify your identity</a> to withdraw more.`,
    );
  }
  box.innerHTML = lines.join('<br>');
  box.style.display = '';
}

async function main() {
  const profile = await requireClientSession();
  populateNetworks();
  wireForm(profile);
  void showRules();
}

void main();
