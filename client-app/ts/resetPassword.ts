import { createAuthService } from '../../src/services/auth/authService';
import { isSupabaseConfigured } from '../../src/services/supabase/client';

const authService = createAuthService();

// Links from HQ and the admin panel carry a one-time code (?token_hash=...)
// that is only used when the form is sent. Older links sign in on open and
// arrive with tokens or an error in the address after #.
const params = new URLSearchParams(window.location.search);
const recoveryCode = params.get('type') === 'recovery' ? params.get('token_hash') : null;
const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ''));
const linkError = hashParams.get('error_code') ?? params.get('error_code');
const EXPIRED = 'This link has expired or was already used. Ask for a new one.';
// The code works once: after it signs in, a second try (for example after a
// too-short password) reuses that sign-in.
let codeUsed = false;

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

    void (async () => {
      if (recoveryCode && !codeUsed) {
        await authService.verifyRecoveryCode(recoveryCode).catch(() => {
          throw new Error(EXPIRED);
        });
        codeUsed = true;
      } else if (!(await authService.getSession().catch(() => null))) {
        throw new Error(linkError ? EXPIRED : 'Open the link from your email or message again to set your password.');
      }
      await authService.updatePassword(password);
    })()
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

if (linkError && !recoveryCode) showError(EXPIRED);
wireForm();
