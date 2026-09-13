import { createAuthService } from '../../src/services/auth/authService';
import { isSupabaseConfigured } from '../../src/services/supabase/client';
import { isAdminRole } from '../../src/types/roles';

const authService = createAuthService();

function showError(message: string): void {
  const box = document.getElementById('signUpError');
  if (!box) return;
  box.textContent = message;
  box.style.display = '';
}

function hideError(): void {
  const box = document.getElementById('signUpError');
  if (box) box.style.display = 'none';
}

async function redirectSignedInUser(): Promise<boolean> {
  const session = await authService.getSession();
  if (!session) return false;

  const profile = await authService.getCurrentProfile();
  window.location.replace(profile && isAdminRole(profile.role) ? '/admin' : 'index.html');
  return true;
}

function prefillReferralCode(): void {
  const ref = new URLSearchParams(window.location.search).get('ref');
  if (!ref) return;

  const field = document.getElementById('signUpReferralField');
  const input = document.getElementById('signUpReferral') as HTMLInputElement | null;
  if (field) field.style.display = '';
  if (input) input.value = ref;
}

function showSuccess(email: string): void {
  const inner = document.getElementById('signUpInner');
  const success = document.getElementById('signUpSuccess');
  const emailEl = document.getElementById('signUpSuccessEmail');
  if (inner) inner.style.display = 'none';
  if (success) success.style.display = '';
  if (emailEl) emailEl.textContent = email;
}

function wireForm(): void {
  const form = document.getElementById('signUpForm') as HTMLFormElement | null;
  const submitButton = document.getElementById('signUpSubmit') as HTMLButtonElement | null;

  form?.addEventListener('submit', (event) => {
    event.preventDefault();
    hideError();

    if (!isSupabaseConfigured()) {
      showError('Supabase is not configured yet.');
      return;
    }

    const fullName = (document.getElementById('signUpName') as HTMLInputElement | null)?.value.trim() ?? '';
    const email = (document.getElementById('signUpEmail') as HTMLInputElement | null)?.value.trim() ?? '';
    const password = (document.getElementById('signUpPassword') as HTMLInputElement | null)?.value ?? '';
    const confirmPassword = (document.getElementById('signUpConfirmPassword') as HTMLInputElement | null)?.value ?? '';
    const referralCode = (document.getElementById('signUpReferral') as HTMLInputElement | null)?.value.trim() || undefined;

    if (!fullName || !email || !password) {
      showError('Fill in your name, email, and password.');
      return;
    }
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
      submitButton.textContent = 'Creating account…';
    }

    void authService
      .register({ email, password, fullName, referralCode })
      .then(() => {
        showSuccess(email);
      })
      .catch((err: unknown) => {
        showError(err instanceof Error ? err.message : 'Unable to register. Please try again.');
        if (submitButton) {
          submitButton.disabled = false;
          submitButton.textContent = 'Sign Up';
        }
      });
  });
}

async function main(): Promise<void> {
  const redirected = await redirectSignedInUser();
  if (redirected) return;
  prefillReferralCode();
  wireForm();
}

void main();
