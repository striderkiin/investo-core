import { createAuthService } from '../../src/services/auth/authService';
import { isSupabaseConfigured } from '../../src/services/supabase/client';

const authService = createAuthService();

function showError(message: string): void {
  const box = document.getElementById('resetError');
  if (!box) return;
  box.textContent = message;
  box.style.display = '';
}

function hideError(): void {
  const box = document.getElementById('resetError');
  if (box) box.style.display = 'none';
}

function showSuccess(): void {
  const inner = document.getElementById('resetInner');
  const success = document.getElementById('resetSuccess');
  if (inner) inner.style.display = 'none';
  if (success) success.style.display = '';
  setTimeout(() => {
    window.location.replace('sign-in.html');
  }, 2000);
}

function wireForm(): void {
  const form = document.getElementById('resetForm') as HTMLFormElement | null;
  const submitButton = document.getElementById('resetSubmit') as HTMLButtonElement | null;

  form?.addEventListener('submit', (event) => {
    event.preventDefault();
    hideError();

    if (!isSupabaseConfigured()) {
      showError('Supabase is not configured yet.');
      return;
    }

    const password = (document.getElementById('resetPassword') as HTMLInputElement | null)?.value ?? '';
    const confirmPassword = (document.getElementById('resetConfirmPassword') as HTMLInputElement | null)?.value ?? '';

    if (password !== confirmPassword) {
      showError('Passwords do not match.');
      return;
    }
    if (password.length < 8) {
      showError('Password must be at least 8 characters.');
      return;
    }

    if (submitButton) {
      submitButton.disabled = true;
      submitButton.textContent = 'Updating…';
    }

    void authService
      .updatePassword(password)
      .then(() => {
        showSuccess();
      })
      .catch((err: unknown) => {
        showError(err instanceof Error ? err.message : 'Unable to reset password.');
        if (submitButton) {
          submitButton.disabled = false;
          submitButton.textContent = 'Update Password';
        }
      });
  });
}

wireForm();
