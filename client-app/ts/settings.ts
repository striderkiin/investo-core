import { requireClientSession } from './shell';
import { createSecurityService } from '../../src/services/api/securityService';
import { createAuthService } from '../../src/services/auth/authService';
import { createUserService } from '../../src/services/api/userService';
import { createReferralService } from '../../src/services/api/referralService';
import type { Profile } from '../../src/types/database';
import { formatCurrency } from './format';

const securityService = createSecurityService();
const authService = createAuthService();
const userService = createUserService();
const referralService = createReferralService();

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

function renderProfile(profile: Profile): void {
  const nameInput = document.getElementById('profileFullNameInput') as HTMLInputElement | null;
  const emailInput = document.getElementById('profileEmailInput') as HTMLInputElement | null;
  if (nameInput) nameInput.value = profile.fullName;
  if (emailInput) emailInput.value = profile.email;

  setText('profileAccountStatus', profile.accountStatus.replace('_', ' '));
  setText('profileMemberSince', new Date(profile.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' }));
}

function wireProfileSave(profile: Profile): void {
  const button = document.getElementById('profileSaveButton');
  const nameInput = document.getElementById('profileFullNameInput') as HTMLInputElement | null;
  if (!button || !nameInput) return;

  button.addEventListener('click', () => {
    const fullName = nameInput.value.trim();
    if (!fullName) return;
    void userService.updateProfile(profile.id, { fullName }).then(() => {
      window.alert('Profile updated.');
    });
  });
}

async function renderReferral(profile: Profile): Promise<void> {
  const linkInput = document.getElementById('referralLinkInput') as HTMLInputElement | null;
  if (linkInput) linkInput.value = `${window.location.origin}/register?ref=${profile.referralCode}`;

  const copyButton = document.getElementById('referralCopyButton');
  copyButton?.addEventListener('click', () => {
    if (linkInput) void navigator.clipboard.writeText(linkInput.value);
  });

  const [referrals, earnings] = await Promise.all([referralService.listMyReferrals(profile.id), referralService.getTotalEarnings(profile.id)]);
  setText('referralCount', String(referrals.length));
  setText('referralEarnings', formatCurrency(earnings));
}

async function main() {
  const profile = await requireClientSession();
  renderProfile(profile);
  wireProfileSave(profile);
  wireTwoFa();
  wireSessionManagement();
  wirePasswordReset();
  await Promise.all([loadTwoFaStatus(), loadSessions(profile.id), renderReferral(profile)]);
}

void main();
