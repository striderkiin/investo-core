import { requireClientSession } from './shell';
import { createWithdrawalService } from '../../src/services/api/withdrawalService';
import { formatCurrency } from './format';
import type { Profile } from '../../src/types/database';

const withdrawalService = createWithdrawalService();

const NETWORKS: Record<string, string[]> = {
  BTC: ['Bitcoin'],
  ETH: ['ERC20'],
  USDT: ['ERC20', 'TRC20'],
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

async function main() {
  const profile = await requireClientSession();
  populateNetworks();
  wireForm(profile);
}

void main();
