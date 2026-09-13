import { requireClientSession } from './shell';
import { createDepositService } from '../../src/services/api/depositService';
import type { DepositSession } from '../../src/services/payments/PaymentProvider';
import type { DepositStatus } from '../../src/types/database';

const depositService = createDepositService();

const NETWORKS: Record<string, string[]> = {
  BTC: ['Bitcoin'],
  ETH: ['ERC20'],
  USDT: ['ERC20', 'TRC20'],
};

const POLL_INTERVAL_MS = 3000;
const TERMINAL_STATUSES: DepositStatus[] = ['completed', 'failed', 'rejected'];

let pollHandle: ReturnType<typeof setInterval> | null = null;

function populateNetworks(): void {
  const currencySelect = document.getElementById('depositCurrency') as HTMLSelectElement | null;
  const networkSelect = document.getElementById('depositNetwork') as HTMLSelectElement | null;
  if (!currencySelect || !networkSelect) return;

  function refresh(): void {
    const networks = NETWORKS[currencySelect!.value] ?? [];
    networkSelect!.innerHTML = networks.map((n) => `<option value="${n}">${n}</option>`).join('');
  }

  currencySelect.addEventListener('change', refresh);
  refresh();
}

function showError(message: string): void {
  const box = document.getElementById('depositError');
  if (!box) return;
  box.textContent = message;
  box.style.display = '';
}

function hideError(): void {
  const box = document.getElementById('depositError');
  if (box) box.style.display = 'none';
}

function showSessionPanel(): void {
  const formPanel = document.getElementById('depositFormPanel');
  const sessionPanel = document.getElementById('depositSessionPanel');
  if (formPanel) formPanel.style.display = 'none';
  if (sessionPanel) sessionPanel.style.display = '';
}

function showFormPanel(): void {
  const formPanel = document.getElementById('depositFormPanel');
  const sessionPanel = document.getElementById('depositSessionPanel');
  if (formPanel) formPanel.style.display = '';
  if (sessionPanel) sessionPanel.style.display = 'none';
  if (pollHandle) {
    clearInterval(pollHandle);
    pollHandle = null;
  }
}

function setStatus(status: DepositStatus): void {
  const statusText = document.getElementById('depositStatusText');
  const statusNote = document.getElementById('depositStatusNote');
  const againButton = document.getElementById('depositAgainButton') as HTMLButtonElement | null;
  const walletLink = document.getElementById('depositWalletLink');
  const cancelButton = document.getElementById('depositCancelButton');
  if (statusText) statusText.textContent = status;

  const isTerminal = TERMINAL_STATUSES.includes(status);
  if (statusNote) {
    statusNote.textContent = isTerminal ? '' : ' This updates automatically once your deposit is received.';
  }
  if (againButton) againButton.style.display = isTerminal ? '' : 'none';
  if (walletLink) walletLink.style.display = isTerminal ? '' : 'none';
  if (cancelButton) cancelButton.style.display = isTerminal ? 'none' : '';

  if (isTerminal && pollHandle) {
    clearInterval(pollHandle);
    pollHandle = null;
  }
}

function wireForm(userId: string): void {
  const form = document.getElementById('depositForm') as HTMLFormElement | null;
  const submitButton = document.getElementById('depositSubmit') as HTMLButtonElement | null;
  const copyButton = document.getElementById('depositCopyButton');
  const cancelButton = document.getElementById('depositCancelButton');
  const againButton = document.getElementById('depositAgainButton');
  if (!form || !submitButton) return;

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    hideError();

    const amount = Number((document.getElementById('depositAmount') as HTMLInputElement | null)?.value ?? '');
    const currency = (document.getElementById('depositCurrency') as HTMLSelectElement | null)?.value ?? '';
    const network = (document.getElementById('depositNetwork') as HTMLSelectElement | null)?.value ?? '';

    if (!amount || amount <= 0) {
      showError('Enter a valid amount.');
      return;
    }

    submitButton.disabled = true;
    submitButton.textContent = 'Starting deposit…';

    void depositService
      .createDeposit({ userId, amount, currency, network })
      .then((session: DepositSession) => {
        const instructions = document.getElementById('depositInstructions');
        if (instructions) {
          instructions.textContent = `Send ${amount} ${session.deposit.currency} via ${session.deposit.network} to the address below.`;
        }
        const addressInput = document.getElementById('depositAddress') as HTMLInputElement | null;
        if (addressInput) addressInput.value = session.address ?? '';

        showSessionPanel();
        setStatus(session.deposit.status);

        pollHandle = setInterval(() => {
          void depositService
            .getStatus(session.deposit.id)
            .then((status) => setStatus(status))
            .catch(() => {
              // Transient poll failure. The next tick will try again.
            });
        }, POLL_INTERVAL_MS);
      })
      .catch((err: unknown) => {
        showError(err instanceof Error ? err.message : 'Unable to start deposit. Please try again.');
      })
      .finally(() => {
        submitButton.disabled = false;
        submitButton.textContent = 'Continue';
      });
  });

  copyButton?.addEventListener('click', () => {
    const addressInput = document.getElementById('depositAddress') as HTMLInputElement | null;
    if (!addressInput?.value) return;
    void navigator.clipboard.writeText(addressInput.value).then(() => {
      copyButton.textContent = 'Copied';
      setTimeout(() => {
        copyButton.textContent = 'Copy';
      }, 2000);
    });
  });

  cancelButton?.addEventListener('click', () => {
    showFormPanel();
  });

  againButton?.addEventListener('click', () => {
    form.reset();
    showFormPanel();
  });
}

async function main() {
  const profile = await requireClientSession();
  populateNetworks();
  wireForm(profile.id);
}

void main();
