import { createAuthService } from '../../src/services/auth/authService';
import { isSupabaseConfigured } from '../../src/services/supabase/client';
import { isAdminRole } from '../../src/types/roles';

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

async function redirectSignedInUser(): Promise<boolean> {
  const session = await authService.getSession();
  if (!session) return false;

  const profile = await authService.getCurrentProfile();
  window.location.replace(profile && isAdminRole(profile.role) ? '/admin' : 'index.html');
  return true;
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
      .then(() => authService.getCurrentProfile())
      .then((profile) => {
        window.location.href = profile && isAdminRole(profile.role) ? '/admin' : 'index.html';
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
  const redirected = await redirectSignedInUser();
  if (redirected) return;
  wireForm();
}

void main();
