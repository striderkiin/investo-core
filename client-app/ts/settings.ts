import { requireClientSession } from './shell';
import { createSecurityService } from '../../src/services/api/securityService';
import { createAuthService } from '../../src/services/auth/authService';
import { createUserService } from '../../src/services/api/userService';
import { createReferralService } from '../../src/services/api/referralService';
import { createSupportService } from '../../src/services/api/supportService';
import { createKycService } from '../../src/services/api/kycService';
import type { Profile, SocialProofDisplayMode } from '../../src/types/database';
import type { ReferredUserSummary } from '../../src/services/api/referralService';
import { formatCurrency } from './format';

const securityService = createSecurityService();
const authService = createAuthService();
const userService = createUserService();
const referralService = createReferralService();
const supportService = createSupportService();
const kycService = createKycService();

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

function wireTwoFa(profile: Profile): void {
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
      void securityService
        .unenrollMfa(enrolledFactorId)
        .then(() => securityService.logSecurityEvent(profile.id, '2fa_disabled'))
        .then(() => {
          void loadTwoFaStatus();
          void renderActivityLog(profile.id);
        });
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
    void securityService
      .verifyMfaEnrollment(factorId, code)
      .then(() => securityService.logSecurityEvent(profile.id, '2fa_enabled'))
      .then(() => {
        enrollPanel.style.display = 'none';
        verifyCodeInput.value = '';
        void loadTwoFaStatus();
        void renderActivityLog(profile.id);
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

function wirePasswordReset(profile: Profile): void {
  const form = document.getElementById('passwordResetForm') as HTMLFormElement | null;
  const newPasswordInput = document.getElementById('newPasswordInput') as HTMLInputElement | null;
  const confirmPasswordInput = document.getElementById('confirmPasswordInput') as HTMLInputElement | null;
  if (!form || !newPasswordInput || !confirmPasswordInput) return;

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
    void authService
      .updatePassword(newPasswordInput.value)
      .then(() => securityService.logSecurityEvent(profile.id, 'password_changed'))
      .then(() => {
        newPasswordInput.value = '';
        confirmPasswordInput.value = '';
        window.alert('Password updated.');
        void renderActivityLog(profile.id);
      });
  });
}

function wireDeleteAccount(profile: Profile): void {
  const form = document.getElementById('deleteAccountForm');
  const reasonInput = document.getElementById('deleteAccountReason') as HTMLTextAreaElement | null;
  const button = document.getElementById('deleteAccountButton');
  const confirmation = document.getElementById('deleteAccountConfirmation');
  if (!form || !button || !confirmation) return;

  button.addEventListener('click', () => {
    if (!window.confirm('Are you sure you want to request deletion of your account? This will notify our support team.')) return;

    const reason = reasonInput?.value.trim() || 'I would like to request deletion of my account.';
    void supportService
      .createTicket(profile.id, 'Account deletion request', 'account', reason)
      .then(() => {
        form.style.display = 'none';
        confirmation.style.display = 'block';
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

function renderSocialProofPrivacy(profile: Profile): void {
  const optInCheckbox = document.getElementById('socialProofOptInCheckbox') as HTMLInputElement | null;
  const modeSelect = document.getElementById('socialProofDisplayMode') as HTMLSelectElement | null;
  const nicknameInput = document.getElementById('socialProofNicknameInput') as HTMLInputElement | null;
  if (!optInCheckbox || !modeSelect || !nicknameInput) return;

  optInCheckbox.checked = profile.socialProofOptIn;
  modeSelect.value = profile.socialProofDisplayMode ?? 'first_initial';
  nicknameInput.value = profile.socialProofNickname ?? '';
}

function wireSocialProofPrivacy(profile: Profile): void {
  const optInCheckbox = document.getElementById('socialProofOptInCheckbox') as HTMLInputElement | null;
  const modeSelect = document.getElementById('socialProofDisplayMode') as HTMLSelectElement | null;
  const nicknameInput = document.getElementById('socialProofNicknameInput') as HTMLInputElement | null;
  const saveButton = document.getElementById('socialProofSaveButton');
  if (!optInCheckbox || !modeSelect || !nicknameInput || !saveButton) return;

  saveButton.addEventListener('click', () => {
    void userService
      .updateProfile(profile.id, {
        socialProofOptIn: optInCheckbox.checked,
        socialProofDisplayMode: modeSelect.value as SocialProofDisplayMode,
        socialProofNickname: nicknameInput.value.trim() || null,
      })
      .then((updated) => {
        profile.socialProofOptIn = updated.socialProofOptIn;
        profile.socialProofDisplayMode = updated.socialProofDisplayMode;
        profile.socialProofNickname = updated.socialProofNickname;
        window.alert('Privacy settings saved.');
      });
  });
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  return (parts[0]![0] + (parts[1]?.[0] ?? '')).toUpperCase();
}

function renderReferredUsersList(users: ReferredUserSummary[]): void {
  const container = document.getElementById('referralListContainer');
  if (!container) return;

  if (users.length === 0) {
    container.innerHTML = '<p class="f12-regular text-Gray mb-0">No referrals yet. Share your link above to start earning.</p>';
    return;
  }

  const items = users
    .map(
      (user) => `
        <li>
          <div class="wallet-activity-item pb-0">
            <div class="icon">
              <div style="width:2.25rem;height:2.25rem;border-radius:50%;display:flex;align-items:center;justify-content:center;background:rgba(168,68,46,0.12);color:var(--YellowGreen);font-size:12px;font-weight:700;">${initials(user.fullName)}</div>
            </div>
            <div class="content">
              <div class="mb-2">
                <span class="f14-bold">${user.fullName}</span>
              </div>
              <div class="f12-medium text-Gray">${user.email}</div>
            </div>
            <div class="price f14-bold">${formatCurrency(user.totalBalance)}</div>
            <div class="status f12-medium text-GrayDark">${new Date(user.joinedAt).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}</div>
          </div>
        </li>`
    )
    .join('');

  container.innerHTML = `<ul class="list-wallet-activity mb-0">${items}</ul>`;
}

async function renderReferral(profile: Profile): Promise<void> {
  const linkInput = document.getElementById('referralLinkInput') as HTMLInputElement | null;
  if (linkInput) linkInput.value = `${window.location.origin}/client-app/sign-up.html?ref=${profile.referralCode}`;

  const copyButton = document.getElementById('referralCopyButton');
  copyButton?.addEventListener('click', () => {
    if (linkInput) void navigator.clipboard.writeText(linkInput.value);
  });

  const [referredUsers, earnings] = await Promise.all([referralService.getReferredUsers(profile.id), referralService.getTotalEarnings(profile.id)]);
  setText('referralCount', String(referredUsers.length));
  setText('referralEarnings', formatCurrency(earnings));
  renderReferredUsersList(referredUsers);
}

const EVENT_LABEL: Record<string, string> = {
  password_changed: 'Password changed',
  '2fa_enabled': 'Two-factor authentication enabled',
  '2fa_disabled': 'Two-factor authentication disabled',
  session_terminated: 'Session signed out',
  failed_login: 'Failed sign-in attempt',
  suspicious_activity: 'Suspicious activity detected',
  account_blocked: 'Account blocked',
};

async function renderActivityLog(userId: string): Promise<void> {
  const container = document.getElementById('activityLogContainer');
  if (!container) return;

  const events = await securityService.listMySecurityEvents(userId, 20);
  if (events.length === 0) {
    container.innerHTML = '<p class="f12-regular text-Gray mb-0">No account activity recorded yet.</p>';
    return;
  }

  const items = events
    .map(
      (event) => `
        <li>
          <div class="wallet-activity-item pb-0">
            <div class="icon">
              <div style="width:2.25rem;height:2.25rem;border-radius:50%;display:flex;align-items:center;justify-content:center;background:rgba(168,68,46,0.12);color:var(--YellowGreen);">
                <i class="icon-setting-5" style="font-size:14px;"></i>
              </div>
            </div>
            <div class="content">
              <div class="mb-2">
                <span class="f14-bold">${EVENT_LABEL[event.eventType] ?? event.eventType}</span>
              </div>
              <div class="f12-medium text-Gray">${new Date(event.createdAt).toLocaleString()}</div>
            </div>
          </div>
        </li>`
    )
    .join('');

  container.innerHTML = `<ul class="list-wallet-activity mb-0">${items}</ul>`;
}

function setKycBadge(label: string, className: string): void {
  const badge = document.getElementById('kycStatusBadge');
  if (badge) badge.innerHTML = `<div class="box-status ${className}"><span class="font-poppins">${label}</span></div>`;
}

async function renderKyc(profile: Profile): Promise<void> {
  const form = document.getElementById('kycForm') as HTMLFormElement | null;
  const statusMessage = document.getElementById('kycStatusMessage');
  const rejectionNotice = document.getElementById('kycRejectionNotice');
  const legalNameInput = document.getElementById('kycLegalNameInput') as HTMLInputElement | null;
  const dobInput = document.getElementById('kycDobInput') as HTMLInputElement | null;
  const countryInput = document.getElementById('kycCountryInput') as HTMLInputElement | null;
  if (!form || !statusMessage || !rejectionNotice || !legalNameInput || !dobInput || !countryInput) return;

  const submission = await kycService.getMySubmission(profile.id);

  if (!submission) {
    setKycBadge('NOT SUBMITTED', 'bg-LightGray');
    statusMessage.textContent = 'Verify your identity to unlock full account features.';
    rejectionNotice.style.display = 'none';
    form.style.display = 'block';
    return;
  }

  if (submission.status === 'pending') {
    setKycBadge('PENDING', 'bg-LightGray');
    statusMessage.textContent = 'Your submission is under review. This usually takes 1-2 business days.';
    rejectionNotice.style.display = 'none';
    form.style.display = 'none';
    return;
  }

  if (submission.status === 'approved') {
    setKycBadge('VERIFIED', 'bg-YellowGreen text-White');
    statusMessage.textContent = 'Your identity has been verified.';
    rejectionNotice.style.display = 'none';
    form.style.display = 'none';
    return;
  }

  // rejected — pre-fill the form so the user can correct and resubmit
  setKycBadge('REJECTED', 'bg-LightGray type-red');
  statusMessage.textContent = 'Your submission was rejected. Please review the notes below and resubmit.';
  rejectionNotice.textContent = submission.reviewNotes || 'Please double-check your documents and resubmit.';
  rejectionNotice.style.display = 'block';
  legalNameInput.value = submission.legalFullName;
  dobInput.value = submission.dateOfBirth;
  countryInput.value = submission.country;
  form.style.display = 'block';
}

function wireKyc(profile: Profile): void {
  const form = document.getElementById('kycForm') as HTMLFormElement | null;
  const legalNameInput = document.getElementById('kycLegalNameInput') as HTMLInputElement | null;
  const dobInput = document.getElementById('kycDobInput') as HTMLInputElement | null;
  const countryInput = document.getElementById('kycCountryInput') as HTMLInputElement | null;
  const idDocumentInput = document.getElementById('kycIdDocumentInput') as HTMLInputElement | null;
  const proofOfAddressInput = document.getElementById('kycProofOfAddressInput') as HTMLInputElement | null;
  const submitButton = document.getElementById('kycSubmitButton') as HTMLButtonElement | null;
  const errorEl = document.getElementById('kycFormError');
  if (!form || !legalNameInput || !dobInput || !countryInput || !idDocumentInput || !proofOfAddressInput || !submitButton || !errorEl) return;

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    errorEl.style.display = 'none';

    const idFile = idDocumentInput.files?.[0];
    const proofFile = proofOfAddressInput.files?.[0];
    if (!idFile || !proofFile) {
      errorEl.textContent = 'Please attach both documents.';
      errorEl.style.display = '';
      return;
    }

    submitButton.disabled = true;
    submitButton.textContent = 'Submitting…';

    void Promise.all([kycService.uploadDocument(profile.id, idFile, 'id'), kycService.uploadDocument(profile.id, proofFile, 'address')])
      .then(([idDocumentPath, proofOfAddressPath]) =>
        kycService.submit({
          legalFullName: legalNameInput.value.trim(),
          dateOfBirth: dobInput.value,
          country: countryInput.value.trim(),
          idDocumentPath,
          proofOfAddressPath,
        })
      )
      .then(() => {
        window.alert('Your documents have been submitted for review.');
        return renderKyc(profile);
      })
      .catch((err: unknown) => {
        errorEl.textContent = err instanceof Error ? err.message : 'Unable to submit your documents. Please try again.';
        errorEl.style.display = '';
      })
      .finally(() => {
        submitButton.disabled = false;
        submitButton.textContent = 'Submit for Verification';
      });
  });
}

async function main() {
  const profile = await requireClientSession();
  renderProfile(profile);
  wireProfileSave(profile);
  renderSocialProofPrivacy(profile);
  wireSocialProofPrivacy(profile);
  wireTwoFa(profile);
  wireSessionManagement();
  wirePasswordReset(profile);
  wireDeleteAccount(profile);
  wireKyc(profile);
  await Promise.all([loadTwoFaStatus(), loadSessions(profile.id), renderReferral(profile), renderActivityLog(profile.id), renderKyc(profile)]);
}

void main();
