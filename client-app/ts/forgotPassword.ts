import { createAuthService } from '../../src/services/auth/authService';
import { isSupabaseConfigured } from '../../src/services/supabase/client';

const authService = createAuthService();

function showError(message: string): void {
  const box = document.getElementById('forgotError');
  if (!box) return;
  box.textContent = message;
  box.style.display = '';
}

function hideError(): void {
  const box = document.getElementById('forgotError');
  if (box) box.style.display = 'none';
}

function showSuccess(email: string): void {
  const inner = document.getElementById('forgotInner');
  const success = document.getElementById('forgotSuccess');
  const emailEl = document.getElementById('forgotSuccessEmail');
  if (inner) inner.style.display = 'none';
  if (success) success.style.display = '';
  if (emailEl) emailEl.textContent = email;
}

function wireForm(): void {
  const form = document.getElementById('forgotForm') as HTMLFormElement | null;
  const submitButton = document.getElementById('forgotSubmit') as HTMLButtonElement | null;

  form?.addEventListener('submit', (event) => {
    event.preventDefault();
    hideError();

    if (!isSupabaseConfigured()) {
      showError('Supabase is not configured yet.');
      return;
    }

    const email = (document.getElementById('forgotEmail') as HTMLInputElement | null)?.value.trim() ?? '';
    if (!email) {
      showError('Enter your email address.');
      return;
    }

    if (submitButton) {
      submitButton.disabled = true;
      submitButton.textContent = 'Sending…';
    }

    void authService
      .requestPasswordReset(email, `${window.location.origin}/client-app/reset-password.html`)
      .then(() => {
        showSuccess(email);
      })
      .catch((err: unknown) => {
        showError(err instanceof Error ? err.message : 'Unable to send reset email.');
        if (submitButton) {
          submitButton.disabled = false;
          submitButton.textContent = 'Send Reset Link';
        }
      });
  });
}

wireForm();
