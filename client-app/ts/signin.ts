import { createAuthService } from '../../src/services/auth/authService';
import { isSupabaseConfigured } from '../../src/services/supabase/client';
import { isAdminRole } from '../../src/types/roles';
import { needsMfaCode, verifyMfaCode } from './mfa';

const authService = createAuthService();

function showError(message: string): void {
  const box = document.getElementById('signInError');
  if (!box) return;
  box.textContent = message;
  box.style.display = '';
}

function hideError(): void {
  const box = document.getElementById('signInError');
  if (box) box.style.display = 'none';
}

async function goToDashboard(replace: boolean): Promise<void> {
  const profile = await authService.getCurrentProfile();
  const target = profile && isAdminRole(profile.role) ? '/admin' : 'index.html';
  if (replace) window.location.replace(target);
  else window.location.href = target;
}

// Swaps the password form for the authenticator code form.
function showCodeStep(): void {
  const passwordForm = document.getElementById('signInForm');
  const codeForm = document.getElementById('signInCodeForm');
  if (passwordForm) passwordForm.style.display = 'none';
  if (codeForm) codeForm.style.display = '';
  document.getElementById('signInCode')?.focus();
}

/** Returns 'redirected', 'code' (session needs its 2FA code) or 'none' (signed out). */
async function resumeSignedInUser(): Promise<'redirected' | 'code' | 'none'> {
  const session = await authService.getSession();
  if (!session) return 'none';

  if (await needsMfaCode()) return 'code';
  await goToDashboard(true);
  return 'redirected';
}

function wireCodeForm(): void {
  const form = document.getElementById('signInCodeForm') as HTMLFormElement | null;
  const input = document.getElementById('signInCode') as HTMLInputElement | null;
  const submitButton = document.getElementById('signInCodeSubmit') as HTMLButtonElement | null;

  form?.addEventListener('submit', (event) => {
    event.preventDefault();
    hideError();

    const code = input?.value.trim() ?? '';
    if (!/^\d{6}$/.test(code)) {
      showError('Enter the 6-digit code from your authenticator app.');
      return;
    }

    if (submitButton) {
      submitButton.disabled = true;
      submitButton.textContent = 'Verifying…';
    }

    void verifyMfaCode(code)
      .then(() => goToDashboard(false))
      .catch((err: unknown) => {
        showError(err instanceof Error ? err.message : 'That code did not work. Try the current code.');
        if (input) input.value = '';
        if (submitButton) {
          submitButton.disabled = false;
          submitButton.textContent = 'Verify';
        }
      });
  });

  // Abandoning the code step signs the half-finished session out.
  document.getElementById('signInCodeCancel')?.addEventListener('click', (event) => {
    event.preventDefault();
    void authService.logout().finally(() => window.location.replace('sign-in.html'));
  });
}

function wireForm(): void {
  const form = document.getElementById('signInForm') as HTMLFormElement | null;
  const submitButton = document.getElementById('signInSubmit') as HTMLButtonElement | null;

  form?.addEventListener('submit', (event) => {
    event.preventDefault();
    hideError();

    if (!isSupabaseConfigured()) {
      showError('Supabase is not configured yet.');
      return;
    }

    const email = (document.getElementById('signInEmail') as HTMLInputElement | null)?.value.trim() ?? '';
    const password = (document.getElementById('signInPassword') as HTMLInputElement | null)?.value ?? '';
    if (!email || !password) {
      showError('Enter your email and password.');
      return;
    }

    if (submitButton) {
      submitButton.disabled = true;
      submitButton.textContent = 'Signing in…';
    }

    void authService
      .login({ email, password })
      .then(() => needsMfaCode())
      .then((codeNeeded) => {
        if (!codeNeeded) return goToDashboard(false);
        showCodeStep();
        if (submitButton) {
          submitButton.disabled = false;
          submitButton.textContent = 'Sign In';
        }
      })
      .catch((err: unknown) => {
        showError(err instanceof Error ? err.message : 'Unable to log in. Please try again.');
        if (submitButton) {
          submitButton.disabled = false;
          submitButton.textContent = 'Sign In';
        }
      });
  });
}

async function main(): Promise<void> {
  wireCodeForm();
  const state = isSupabaseConfigured() ? await resumeSignedInUser() : 'none';
  if (state === 'redirected') return;
  wireForm();
  if (state === 'code') showCodeStep();
}

void main();
