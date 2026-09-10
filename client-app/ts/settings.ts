import { requireClientSession } from './shell';
import { createSecurityService } from '../../src/services/api/securityService';
import { createAuthService } from '../../src/services/auth/authService';

const securityService = createSecurityService();
const authService = createAuthService();

let enrolledFactorId: string | null = null;

function setText(id: string, text: string): void {
  const el = document.getElementById(id);
  if (el) el.textContent = text;
}

async function loadTwoFaStatus(): Promise<void> {
  const factors = await securityService.listMfaFactors();
  const verified = factors.find((f) => f.status === 'verified');
  const checkbox = document.getElementById('twoFaCheckbox') as HTMLInputElement | null;

  if (verified) {
    enrolledFactorId = verified.id;
    if (checkbox) checkbox.checked = true;
    setText('twoFaSubtitle', 'Enabled');
    setText('securityTwoFaStatus', 'Enabled');
  } else {
    enrolledFactorId = null;
    if (checkbox) checkbox.checked = false;
    setText('twoFaSubtitle', 'Not enabled');
    setText('securityTwoFaStatus', 'Disabled');
  }
}

function wireTwoFa(): void {
  const checkbox = document.getElementById('twoFaCheckbox') as HTMLInputElement | null;
  const enrollPanel = document.getElementById('twoFaEnrollPanel');
  const qrCode = document.getElementById('twoFaQrCode') as HTMLImageElement | null;
  const secretEl = document.getElementById('twoFaSecret');
  const verifyForm = document.getElementById('twoFaVerifyForm') as HTMLFormElement | null;
  const verifyCodeInput = document.getElementById('twoFaVerifyCode') as HTMLInputElement | null;
  const cancelButton = document.getElementById('twoFaEnrollCancel');
  if (!checkbox || !enrollPanel || !qrCode || !secretEl || !verifyForm || !verifyCodeInput || !cancelButton) return;

  checkbox.addEventListener('change', () => {
    if (checkbox.checked) {
      void securityService.enrollMfa().then((data) => {
        qrCode.src = `data:image/svg+xml;utf-8,${encodeURIComponent(data.totp.qr_code)}`;
        secretEl.textContent = data.totp.secret;
        enrollPanel.style.display = 'block';
        checkbox.dataset.pendingFactorId = data.id;
      });
    } else if (enrolledFactorId) {
      if (!window.confirm('Disable two-factor authentication?')) {
        checkbox.checked = true;
        return;
      }
      void securityService.unenrollMfa(enrolledFactorId).then(() => loadTwoFaStatus());
    }
  });

  cancelButton.addEventListener('click', () => {
    enrollPanel.style.display = 'none';
    checkbox.checked = false;
  });

  verifyForm.addEventListener('submit', (event) => {
    event.preventDefault();
    const factorId = checkbox.dataset.pendingFactorId;
    const code = verifyCodeInput.value.trim();
    if (!factorId || code.length !== 6) return;
    void securityService.verifyMfaEnrollment(factorId, code).then(() => {
      enrollPanel.style.display = 'none';
      verifyCodeInput.value = '';
      void loadTwoFaStatus();
    });
  });
}

async function loadSessions(userId: string): Promise<void> {
  const sessions = await securityService.listMySessions(userId);
  setText('securitySessionCount', String(sessions.length));
  setText('deviceManagementSubtitle', `${sessions.length} tracked session${sessions.length === 1 ? '' : 's'} on this account`);

  const mostRecent = sessions[0];
  setText('lastSignedInAt', mostRecent ? new Date(mostRecent.lastActiveAt).toLocaleString() : 'No active sessions');
}

function wireSessionManagement(): void {
  const button = document.getElementById('terminateSessionsButton');
  if (!button) return;
  button.addEventListener('click', () => {
    if (!window.confirm('Sign out of all other devices/sessions?')) return;
    void securityService.terminateOtherSessions();
  });
}

function wirePasswordReset(): void {
  const toggle = document.getElementById('passwordResetToggle');
  const form = document.getElementById('passwordResetForm') as HTMLFormElement | null;
  const newPasswordInput = document.getElementById('newPasswordInput') as HTMLInputElement | null;
  const confirmPasswordInput = document.getElementById('confirmPasswordInput') as HTMLInputElement | null;
  if (!toggle || !form || !newPasswordInput || !confirmPasswordInput) return;

  toggle.addEventListener('click', () => {
    form.style.display = form.style.display === 'block' ? 'none' : 'block';
  });

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    if (newPasswordInput.value !== confirmPasswordInput.value) {
      window.alert('Passwords do not match.');
      return;
    }
    if (newPasswordInput.value.length < 8) {
      window.alert('Password must be at least 8 characters.');
      return;
    }
    void authService.updatePassword(newPasswordInput.value).then(() => {
      newPasswordInput.value = '';
      confirmPasswordInput.value = '';
      form.style.display = 'none';
      window.alert('Password updated.');
    });
  });
}

async function main() {
  const profile = await requireClientSession();
  wireTwoFa();
  wireSessionManagement();
  wirePasswordReset();
  await Promise.all([loadTwoFaStatus(), loadSessions(profile.id)]);
}

void main();
