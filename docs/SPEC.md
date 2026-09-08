# INVESTO CORE SUITE — Final Master Product & Technical Specification

Development → Demo → Sandbox → Production

## 1. Project Mission

Act as a Senior Full-Stack Software Architect, Senior Frontend Engineer, Backend Engineer, Database Architect, Security Engineer, and Product Designer.

Build a complete, modular, production-oriented web application called **INVESTO CORE SUITE** — a configurable, white-label financial and investment platform framework.

The platform must provide a complete experience for:
- Platform Owners
- White-Label Administrators
- Finance Administrators
- Support Administrators
- Operations Administrators
- Clients

The application must include: Client Dashboard, Administrator Control Center, Financial Management, Investment Management, Deposit Management, Withdrawal Management, Treasury Management, User Management, Referral Management, Support Center, Notification System, Dynamic Branding, White-Label Configuration, Integration Management, API Credential Management, Market Simulation, Manual Live Chart Controls, Environment Management, Sandbox Testing, Compliance Configuration, Security Controls, Role-Based Permissions, Audit Logging.

The application must be designed as a real software product. Do not build a static HTML mockup. Do not build the application as one giant component. Use modular architecture and reusable components.

## 2. Product Architecture

The system must support four operating environments:

```
DEVELOPMENT → DEMO → SANDBOX → PRODUCTION
```

Each environment must use the same core application architecture while changing: data sources, credentials, providers, environment configuration, available controls, security restrictions. The frontend must not need to be rebuilt when moving between environments.

## 3. Core Product Principles

The application must be: Modular, Responsive, Secure by design, API-driven, Database-driven, White-label ready, Environment-aware, Role-based, Auditable, Scalable, Maintainable.

The architecture must separate: UI → Business Logic → API / Service Layer → Database / External Providers. Do not put critical business logic directly inside UI components.

## 4. Required Technology Stack

### Frontend
React, TypeScript, Vite, Bootstrap 5.3, Bootstrap Icons, React Router, Chart.js, React Chart.js integration, Custom CSS. Bootstrap must be the primary UI framework. Do not replace Bootstrap with Tailwind.

### Backend / Platform
Supabase, PostgreSQL, Supabase Auth, Supabase Storage, Supabase Realtime, Supabase Edge Functions where appropriate.

Create a service abstraction layer so the application can later support: Supabase Edge Functions, Node.js, Express, Dedicated microservices. Do not tightly couple all business logic to one provider.

### State Management
React Context, Custom hooks, Local component state, Service layer, Server/database state. Avoid unnecessary state libraries unless genuinely required.

## 5. Project Structure

```
investo-core/
├── src/
│   ├── app/
│   │   ├── App.tsx
│   │   ├── routes.tsx
│   │   └── providers.tsx
│   ├── components/
│   │   ├── common/
│   │   ├── layout/
│   │   ├── charts/
│   │   ├── forms/
│   │   ├── tables/
│   │   ├── modals/
│   │   ├── notifications/
│   │   └── controls/
│   ├── features/
│   │   ├── auth/
│   │   ├── client/
│   │   ├── admin/
│   │   ├── users/
│   │   ├── financial/
│   │   ├── market/
│   │   ├── investments/
│   │   ├── deposits/
│   │   ├── withdrawals/
│   │   ├── transactions/
│   │   ├── treasury/
│   │   ├── referrals/
│   │   ├── activity/
│   │   ├── support/
│   │   ├── notifications/
│   │   ├── branding/
│   │   ├── white-label/
│   │   ├── integrations/
│   │   ├── compliance/
│   │   ├── security/
│   │   ├── roles/
│   │   └── settings/
│   ├── hooks/
│   ├── services/
│   │   ├── api/
│   │   ├── auth/
│   │   ├── supabase/
│   │   ├── payments/
│   │   ├── market/
│   │   └── integrations/
│   ├── types/
│   ├── utils/
│   ├── config/
│   ├── styles/
│   └── main.tsx
├── supabase/
│   ├── migrations/
│   ├── functions/
│   └── seed.sql
├── public/
├── .env.example
├── README.md
└── package.json
```

## 6. User Roles

Implement role-based access control.

**Super Admin** — Full platform access. Can: manage all settings, manage administrators, manage roles, configure white-label settings, configure integrations, configure provider credentials, manage users, manage financial settings, manage investment plans, manage environment settings, view audit logs, manage branding, manage compliance settings.

**Finance Admin** — Can: view users, view financial information, manage deposits, review withdrawals, process authorized financial actions, view treasury, view transactions. Cannot: manage Super Admin accounts, access sensitive credentials without explicit permission, change core security configuration.

**Support Admin** — Can: view users, view user profiles, view transactions, manage support tickets, send notifications. Cannot: adjust balances, approve financial actions, access API secrets.

**Operations Admin** — Can: manage announcements, manage investment plans, manage branding, manage operational settings.

**Client** — Can only access their own: dashboard, investments, deposits, withdrawals, transactions, referral information, notifications, support, settings.

## 7. Authentication

Use Supabase Authentication. Required features: registration, login, logout, email verification, password reset, password update, protected routes, session management, role-based access, account status validation.

Production-ready extension: multi-factor authentication, authenticator applications, recovery codes, device management, session termination, login history.

## 8. Global Application Layout — Public Layout

Pages: Landing Page, Login, Registration, Forgot Password, Reset Password, Terms, Privacy, Risk Disclosure, Contact.

## 9. Client Application Layout

Responsive client dashboard. Desktop: sidebar + top navigation. Mobile: responsive navigation, collapsible sidebar, accessible primary actions.

Client navigation: Dashboard, Investments, Deposit, Withdraw, Transactions, Referral, Notifications, Support, Settings.

## 10. Admin Application Layout

Professional administrative control center. Desktop: collapsible sidebar, top navigation, environment badge, notification center, admin profile menu.

Admin navigation: Overview, Financial Center, Market Controls, Users, Investments, Deposits, Withdrawals, Transactions, Treasury, Referrals, Activity, Online Users, Announcements, Support, White Label, Branding, Integrations, Compliance, Security, Admins & Roles, Audit Logs, System Settings.

## 11. Environment Management

Support four environments, each set via `ENVIRONMENT` variable:

- **Development** (`ENVIRONMENT=development`) — for local development.
- **Demo** (`ENVIRONMENT=demo`) — demo users, demo balances, demo transactions, simulated market data, simulated activity. No real money movement.
- **Sandbox** (`ENVIRONMENT=sandbox`) — test credentials, sandbox provider environments, test networks where supported, test transactions, test webhooks. No production money.
- **Production** (`ENVIRONMENT=production`) — production credentials, production database, authorized providers, production security settings.

**Environment Rules**: Environment configuration must be controlled server-side. Do not allow an ordinary frontend user to switch between sandbox/production. The Admin UI may display the active environment (a badge: DEVELOPMENT / DEMO / SANDBOX / PRODUCTION) but environment changes must require appropriate authorization.

## 12. Client Dashboard

Premium modern financial dashboard. Portfolio Summary displays: Total Balance, Available Balance, Total Invested, Today's Change, Total Earnings, Pending Withdrawals. Use animated number transitions.

## 13. Live Market Section

Professional live market chart using Chart.js. Support: line chart, responsive display, time labels, tooltips, smooth animation, historical data, live updates.

Display: Current Value, 24 Hour Change, Current Trend, Market Status. Example: Current Value $42,580.25, 24 Hour Change +2.8%, Trend Upward.

## 14. Automatic Market Engine

The market chart should normally operate automatically. Modes: Automatic, Manual Controlled.

Automatic behavior options: Stable, Upward, Downward, Volatile, Random.

Admin can configure: update interval, volatility, trend strength, minimum movement, maximum movement, starting value.

## 15. Manual Live Chart Control System (REQUIRED FEATURE)

The Admin Dashboard must include a complete **Live Market Control Panel** allowing the administrator to temporarily take manual control of the live chart.

**Master Manual Chart Toggle**: Manual Live Chart Control `[OFF] / [ON]`.
- When OFF: chart follows automatic market behavior; manual increase/decrease controls disabled; admin cannot manually modify enabled metrics.
- When ON: manual controls become active; admin can control selected chart metrics; changes update the Client Dashboard immediately.

## 16. Individual Chart Control Toggles

Each manual capability has its own ON/OFF toggle: Market Value, Percentage Change, Trend Direction, Volatility, Chart Movement. This allows the admin to control only specific metrics (e.g., Market Value ON, Percentage Change OFF, Trend Direction OFF → admin manually controls value while percentage change and trend remain automatic).

## 17. Manual Market Value Controls

When enabled, display large ▲ Increase / ▼ Decrease arrow buttons around the current Market Value (e.g. $42,580.25). Every tap must immediately update: admin display, live client chart, current market value, chart data point.

## 18. Step Control System

Admin chooses how much each tap changes the value. Presets: $1, $5, $10, $50, $100, $500, $1,000. Also provide a **Custom Step** (e.g. $250) — each tap adds/subtracts that amount (e.g. $42,580 → $42,830 → ...).

## 19. Percentage Change Controls

When enabled: Percentage Change (e.g. +2.8%) with ▲/▼ controls. Step options: 0.01%, 0.1%, 0.5%, 1%, Custom. Example: selecting 0.5% and tapping ▲▲ moves 2.8% → 3.3% → 3.8%.

## 20. Trend Direction Controls

When enabled, allow admin to select: ▲ Bullish, ━ Stable, ▼ Bearish. Chart behavior/indicators should reflect the selected direction.

## 21. Manual Chart Movement Control

Provide Movement Strength (1–5, or a slider: Low/Medium/High/Extreme) controlling how dramatically the next chart points move. Admin can also enable Smooth Movement or Sharp Movement.

## 22. Manual Volatility Control

When enabled: Volatility Low/Medium/High/Extreme. Chart should update accordingly.

## 23. Manual Control Preview

Before affecting the live client chart, provide optional Preview Mode: **Preview Only** (shows changes inside Admin only) vs **Apply Live** (updates Client chart immediately).

## 24. Reset Manual Controls

Provide: Reset Current Metric, Reset All Manual Controls, Return To Automatic. When returning to automatic, Manual Live Chart Control turns OFF and the chart smoothly resumes automatic behavior. Do not create a sudden visual jump unless the admin explicitly chooses Immediate Reset.

## 25. Market Control Presets

Allow admin to save presets (e.g. Demo Growth, Demo Decline, Stable Market, High Volatility, Custom Preset). Admin can: create, save, edit, delete, apply preset.

## 26. Market Control Audit Log

Every manual chart action must create an audit entry recording: Admin, Action, Module, Previous value, New value, Step, Environment, Timestamp.

## 27. Financial Center

Dedicated Financial Control Center displaying: Total User Balances, Total Invested, Total Deposits, Total Withdrawals, Pending Withdrawals, Platform Revenue, Treasury Balance, User Liabilities, Available Platform Funds.

## 28. Global Financial Settings

**Deposit Settings**: Minimum Deposit, Maximum Deposit, Deposit Fee, Deposit Status — with ▲/▼ increase/decrease controls plus direct input.

**Withdrawal Settings**: Minimum Withdrawal, Maximum Withdrawal, Withdrawal Fee, Daily Limit, Processing Threshold, Automatic Processing Limit — with ▲/▼ controls plus direct editing.

## 29. Global Yield Control Center

Configure: Global Yield Enabled, Default Daily Rate, Default Weekly Rate, Default Monthly Rate. Controls: Pause All, Resume All, Set All To Zero, Restore Default.

## 30. Investment Plan Management

Default plans: Starter, Growth, Professional, Elite. Each plan includes: Name, Description, Minimum Amount, Maximum Amount, Rate, Rate Type, Duration, Status. Admin can: create, edit, activate, deactivate, pause, duplicate, delete plan.

## 31. Plan Rate Controls

Each plan supports Rate with ▲/▼ controls (e.g. 1.5%). Step options: 0.01%, 0.1%, 0.5%, 1%, Custom. Also allow direct input.

## 32. Client Investments

Client Dashboard displays: Active Investments, Completed Investments, Paused Investments, Investment Earnings. Investment card shows: Plan, Amount, Rate, Duration, Started, Ends, Progress, Current Earnings, Status.

## 33. User Management

Complete user management system. Table columns: Avatar, Name, Email, Balance, Available Balance, Invested, Status, Joined Date, Actions.

Actions: View, Edit, Adjust Balance, Add Bonus, Suspend, Restore, Restrict, Freeze Withdrawals, View Ledger, View Referrals, View Security.

## 34. User Financial Adjustment System

Admin can adjust: Total Balance, Available Balance, Bonus Balance, Investment Amount. Adjustment types: Credit, Debit. Requires: Amount, Reason, Notes. Every adjustment must create: Ledger entry, Transaction, Audit log — recording Previous Balance, Adjustment, New Balance, Admin, Reason, Timestamp.

## 35. Full User Financial Ledger

Each user has a complete financial ledger. Summary: Total Deposited, Total Withdrawn, Total Invested, Total Yield, Total Bonuses, Referral Earnings, Current Balance, Available Balance.

Ledger columns: Date, Transaction Type, Amount, Balance Before, Balance After, Status, Reference. Filters: Deposits, Withdrawals, Investments, Yield, Bonus, Referral.

## 36. Account Status Management

Account states: **Active** (full access) · **Restricted** (can login/view dashboard, cannot perform selected restricted actions) · **Withdrawal Freeze** (can login/view dashboard/view investments, cannot submit withdrawals) · **Suspended** (access restricted) · **Frozen** (all major financial actions blocked; support access may remain available).

## 37. Deposit Management

**Deposit Center**. Admin views: Pending, Processing, Completed, Failed, Rejected. Deposit details: User, Amount, Currency, Network, Provider, Reference, Status, Date.

## 38. Client Deposit Flow

1. Client clicks Deposit. 2. Selects currency. 3. Selects network. 4. Enters amount if required. 5. App requests payment session. 6. Backend/provider returns payment details. 7. Client sees Address, QR Code, Amount, Currency, Network, Status. 8. Provider confirms payment via backend webhook. 9. Backend validates. 10. Transaction updates. 11. Client receives notification.

**Never trust the frontend to confirm payment.**

## 39. Crypto Sandbox Integration

Create a provider abstraction layer, e.g. `PaymentProvider` with `createDeposit()`, `getDepositStatus()`, `requestWithdrawal()`, `getWithdrawalStatus()`, `verifyWebhook()`. The actual provider must be replaceable. Support: Demo Provider, Sandbox Provider, Production Provider. Sandbox credentials must be separate from production credentials.

## 40. Withdrawal Management

**Withdrawal Queue**. Display: User, Amount, Currency, Network, Destination, Requested Date, Status. Statuses: Pending, Review, Processing, Completed, Rejected, Failed. Actions: View, Approve, Reject, Hold, Request Information. Require confirmation for sensitive actions.

## 41. Client Withdrawal Flow

Client enters: Amount, Currency, Network, Destination. Backend validates: authentication, account status, withdrawal status, available balance, limits, destination format, security requirements. Flow: Withdrawal Request → Pending → Review → Processing → Completed. Client receives real-time updates.

## 42. Treasury Dashboard

**Treasury Management**. Display: Total Platform Assets, Total User Liabilities, Available Operating Balance, Pending Withdrawals, Pending Deposits, Withdrawal Reserve, Provider Balances. Demo → Demo Treasury; Sandbox → Sandbox Treasury; Production → use provider balances only through secure server-side integration.

## 43. Treasury Controls

Authorized admins can: view balances, view transaction history, view reserves, configure alerts. Demo/Sandbox simulation actions may include: Add Demo Funds, Adjust Sandbox Balance, Move To Reserve. Production operations must be provider-driven and server-side.

## 44. Transaction Center

Complete transaction management. Search by: User, Email, Reference, Transaction ID. Filters: Deposit, Withdrawal, Investment, Yield, Bonus, Referral. Status: Pending, Processing, Completed, Failed, Rejected.

## 45. Activity Simulation Engine

**Activity Engine** (primarily for Demo Mode). Admin controls: Enable/Disable Activity Simulation. Event types: Deposit, Withdrawal, Investment, Referral Bonus, Plan Upgrade.

Frequency: Low, Medium, High, Custom. Volume (Events Per Hour): 5, 20, 50, 100, Custom. Variation/Noise Level: Low, Medium, High. Controls: amount variation, timing variation, event order, event frequency, generic display name selection. All demo activity must be clearly identified as demo/simulated.

## 46. Online User Simulator

Admin settings: Enable/Disable Online User Simulation. Configure: base users, minimum, maximum, fluctuation speed. Display: "Simulated Online Users" count (e.g. 1,024 → 1,037 → 1,018). Demo Mode must identify this as simulated.

## 47. Referral Management

Client Dashboard: Referral Code, Referral Link, Direct Referrals, Referral Earnings, Referral Bonuses. Action: Copy Link.

## 48. Admin Referral Analytics

Display: Total Referrals, Active Referrers, Referral Earnings, Top Referrers, Conversion Rate.

## 49. Referral Tree Viewer

Create a visual referral hierarchy (tree diagram of User A → User B/C → User D/E). Clicking a user shows: Name, Email, Deposits, Investments, Referral Earnings.

## 50. Support Center

Client can Create Ticket. Categories: Deposit, Withdrawal, Account, Investment, Technical Issue, Other. Statuses: Open, In Progress, Waiting, Resolved, Closed. Admin can: Reply, Assign, Change status, Close ticket. Use realtime updates where appropriate.

## 51. Notification System

Client notifications: Deposit Confirmed, Withdrawal Pending, Withdrawal Processing, Withdrawal Completed, Investment Started, Investment Completed, Referral Bonus, System Announcement.

Admin notifications: New User, Large Withdrawal, Failed Payment, Security Alert, Support Ticket.

Use: in-app notifications, realtime updates. Create future provider abstraction for Email, SMS, Push.

## 52. Announcement System

Admin can create: Maintenance Notice, Promotion, System Update, Important Notice. Display options: Everyone, Clients, Admins, Specific Role. Delivery: Banner, Popup, Notification, Email (handled server-side).

## 53. Maintenance Mode

**Maintenance Control**. Master toggle: Maintenance Mode OFF/ON. Admin can configure: Pause Yield, Disable Withdrawals, Disable Deposits, Show Banner, Restrict Client Access, Allow Admin Access. Default banner: "High Traffic Maintenance". Default message: "Due to high volume, some services are temporarily unavailable." Admin can customize all messages.

## 54. White-Label Engine

**White-Label Configuration Center**. The platform owner must be able to configure their own version of Investo. Sections: General Identity, Branding, Domain, Business Information, Financial Configuration, Provider Integrations, Communication, Compliance, Legal, Environment.

## 55. General White-Label Identity

Fields: Platform Name, Legal Business Name, Display Name, Short Description, Support Name, Support Email, Support Phone, Website.

## 56. Branding Engine

**Site Name** — updates Navbar, Page titles, Dashboard, Emails, Notifications, Footer (e.g. "Investo" → "CryptoNova").

**Logo** — support upload logo, light logo, dark logo, favicon (use Supabase Storage). **Logo Text** — optional text-based logo.

**Brand Colors** — configure Primary, Secondary, Success, Warning, Danger, Background, Surface, Text. Use CSS variables; changes update immediately in preview.

**Theme** — Light, Dark, System.

**Typography** — configure Primary Font, Heading Font. Use approved web fonts.

## 57. White-Label Domain Settings

Fields: Primary Domain, Application URL, API URL, Support URL. Display domain status: Not Configured, Pending Verification, Verified, Active. Do not implement DNS verification purely in frontend — create backend/provider abstraction.

## 58. White-Label Business Information

Fields: Business Name, Business Registration Number, Business Address, Support Address, Country, Timezone, Default Currency, Operating Regions.

## 59. API & Integration Management

**Integrations Center**. Integrations may include: Crypto/Payment Provider, Email Provider, SMS Provider, Notification Provider, KYC Provider, Analytics Provider, Monitoring Provider.

Each integration card displays: Provider Name, Environment, Status (Connected/Disconnected/Error), Last Tested, Actions. Actions: Configure, Test Connection, Update, Rotate Credential, Disconnect.

## 60. API Credential Management

Admin configuration interface for authorized platform owners. Fields: Provider, API Key, API Secret, Webhook Secret, Environment (Sandbox/Production).

**CRITICAL SECURITY REQUIREMENT**: Secrets must never be exposed in the frontend after saving. The system must: send credentials securely to backend, encrypt or securely store credentials, return only masked information (e.g. `API Key ••••••••••••8F2A`). Admin can: Update, Replace, Rotate Credential, Test Connection, Disconnect. **The frontend must never retrieve full stored secrets.**

## 61. Integration Access Control

Only authorized roles can: configure providers, add/replace/rotate credentials. Support Admins must not access secrets. All credential changes must be logged.

## 62. Payment Provider Configuration

Fields: Provider Name, Environment, Webhook Endpoint, Connection Status, Sandbox Status, Production Status. Show: Connected ✓ / Disconnected / Configuration Required / Connection Error. Do not display production secrets.

## 63. Email Provider Settings

Configure: Provider, From Name, From Email, Reply-To Email, Environment, Status. Create "Send Test Email" — must call the backend.

## 64. KYC / Compliance Integrations

Create integration placeholders and architecture for: KYC Provider, Identity Verification, Document Verification, Risk Checks. Admin sees: Not Configured / Sandbox / Production / Connected.

## 65. Compliance Center

**Compliance Settings**. Sections: Client Eligibility, Identity Verification, Risk Disclosures, Jurisdiction Controls, Transaction Monitoring, Reporting. Features should be configurable according to actual jurisdiction and business model. Do not hard-code legal assumptions.

## 66. Client Onboarding Status

Statuses: Registered, Email Verified, Profile Complete, Verification Pending, Verified, Restricted. Admin can view onboarding progress.

## 67. Security Center

Display: Failed Logins, Suspicious Activity, Blocked Users, Active Sessions, Admin Sessions, Security Events.

## 68. User Security

Client settings: Password, Email, Two-Factor Authentication, Active Sessions, Login History. Actions: Change Password, Enable/Disable 2FA, Terminate Session, Terminate All Sessions.

## 69. Admin & Role Management

Super Admin can: Create Admin, Edit Admin, Deactivate Admin, Assign Role, Change Permissions, Reset Access. Create granular permission architecture, e.g.: `users.read`, `users.write`, `users.adjust_balance`, `withdrawals.read`, `withdrawals.approve`, `branding.manage`, `integrations.manage`, `audit.read`.

## 70. Admin Audit Log

Complete audit system. Every important admin action must create an entry with fields: Admin, Action, Module, Target, Previous Value, New Value, Environment, Timestamp, Session Metadata. Examples: Changed Site Name, Changed Brand Color, Added Provider, Updated API Credential, Adjusted Balance, Approved Withdrawal, Changed Market Value, Enabled/Disabled Manual Chart Control, Enabled Maintenance.

## 71. System Settings

Sections:
- **General**: Site Name, Support Email, Support Phone, Default Currency, Timezone, Date Format.
- **Financial**: Deposit Minimum/Maximum, Withdrawal Minimum/Maximum, Withdrawal Fee, Daily Limit.
- **Investment**: Yield Enabled, Default Rate, Investment Limits, Plan Availability.
- **Security**: Email Verification, 2FA, Session Timeout, Login Attempt Limit.
- **Maintenance**: Enabled, Message, Affected Services.

## 72. Database Architecture

Create PostgreSQL tables (via migrations, never manually through application code) for: `profiles`, `users`, `roles`, `permissions`, `role_permissions`, `user_roles`, `investment_plans`, `investments`, `transactions`, `deposits`, `withdrawals`, `wallets`, `treasury_accounts`, `referrals`, `referral_rewards`, `notifications`, `support_tickets`, `support_messages`, `announcements`, `branding`, `white_label_settings`, `system_settings`, `integration_configs`, `credential_metadata`, `payment_events`, `market_settings`, `market_data`, `market_control_presets`, `activity_settings`, `online_user_settings`, `maintenance_settings`, `admin_audit_logs`, `security_events`, `user_sessions`, `compliance_settings`.

## 73. Row Level Security

Implement Supabase RLS. Clients: can only read their own data, can only modify permitted personal records. Admins: access based on permissions. Sensitive records must not be exposed directly to unauthorized users. Credential secrets must never be readable by ordinary client queries.

## 74. Realtime Architecture

Use realtime selectively for: deposit status, withdrawal status, notifications, support messages, client portfolio updates where appropriate, admin queue updates, live market data. Do not create unnecessary realtime subscriptions; clean up subscriptions correctly.

## 75. API Service Layer

Create reusable services: `authService`, `userService`, `financialService`, `marketService`, `investmentService`, `depositService`, `withdrawalService`, `transactionService`, `treasuryService`, `referralService`, `supportService`, `notificationService`, `brandingService`, `whiteLabelService`, `integrationService`, `securityService`. Components must not directly contain provider-specific logic.

## 76. Market Service Architecture

`MarketService` functions: `getCurrentMarket()`, `getMarketHistory()`, `startAutomaticMarket()`, `stopAutomaticMarket()`, `enableManualControl()`, `disableManualControl()`, `increaseMarketValue()`, `decreaseMarketValue()`, `adjustPercentageChange()`, `setTrend()`, `setVolatility()`, `applyPreset()`, `resetMarket()`. The UI should call the service layer.

## 77. Manual Chart Control Data Model

Settings: `manual_control_enabled`, `market_value_control_enabled`, `percentage_control_enabled`, `trend_control_enabled`, `volatility_control_enabled`, `movement_control_enabled`, `market_value_step`, `percentage_step`, `current_market_value`, `current_percentage_change`, `current_trend`, `current_volatility`, `preview_mode`. All settings must persist appropriately.

## 78. Demo and Sandbox Data Separation

Never mix Demo Data, Sandbox Data, Production Data. Each environment must use clear configuration and separation. Production data must never accidentally appear in Demo. Sandbox credentials must never accidentally be used in Production.

## 79. Environment Variables

Create `.env.example`:
```
VITE_APP_ENVIRONMENT=
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
SERVER_API_URL=
PAYMENT_PROVIDER=
EMAIL_PROVIDER=
KYC_PROVIDER=
```
Server-side secrets must NOT use VITE-prefixed variables, e.g.:
```
PAYMENT_API_SECRET=
PAYMENT_WEBHOOK_SECRET=
EMAIL_API_SECRET=
KYC_API_SECRET=
```
Never commit real secrets.

## 80. Payment Webhook Architecture

Flow: Provider → Webhook → Backend Validation → Verify Signature → Verify Transaction → Update Database → Create Transaction → Notify Client → Realtime Update. Never allow frontend clients to directly mark deposits as completed.

## 81. Client Deposit Architecture

Client → Create Deposit Request → Backend → Payment Provider → Return Payment Session → Client Displays Details → Provider Detects Payment → Webhook → Backend Verifies → Database Updated → Client Notified.

## 82. Client Withdrawal Architecture

Client → Withdrawal Request → Backend Validation → Create Pending Withdrawal → Admin/Authorized Workflow → Provider Processing → Status Update → Database → Realtime Client Update.

## 83. Error Handling

Every feature must include: loading state, empty state, error state, success state, retry option where appropriate. Use consistent Bootstrap alerts, badges, and toasts.

## 84. Notifications (UI helpers)

Create reusable: `showNotification()`, `showToast()`, `showSuccess()`, `showError()`, `showWarning()`. Do not duplicate notification logic.

## 85. Modals

Use reusable modals for: Deposit, Withdraw, User Details, Balance Adjustment, Plan Edit, Provider Configuration, Credential Update, Market Preset, Maintenance Confirmation, Withdrawal Confirmation.

## 86. Responsive Design

Support Desktop, Laptop, Tablet, Mobile. Requirements: collapsible sidebars, responsive tables, mobile-friendly charts, responsive forms, accessible buttons, touch-friendly controls. The ▲ and ▼ chart controls must work properly on touch devices.

## 87. Design System

Typography: Inter by default, allow white-label configuration. Style: Modern financial SaaS — clean, premium, professional, high information density. Use: Bootstrap cards, clear spacing, subtle shadows, consistent borders, accessible contrast. Avoid: excessive gradients, excessive glass effects, excessive animation, unnecessary decorative elements.

## 88. Accessibility

Include: labels, keyboard navigation, ARIA attributes, accessible modals, focus management, contrast, status text. Do not communicate important information using color alone.

## 89. Local Development

Provide `npm install`, `npm run dev`. Include complete README covering: environment variables, Supabase setup, database migrations, seed data, local development, sandbox configuration.

## 90. Database Seed Data

Development seed data must include: 1 Super Admin, multiple Admin roles, at least 20 users, investment plans, at least 50 transactions, pending withdrawals, referral relationships, support tickets, notifications, market history. Do not use production credentials.

## 91. Production Requirements

Before considering the build production-ready, verify:
- **Security**: RLS enabled, protected routes, permission checks, server-side secret storage, webhook verification, input validation, rate limiting where applicable.
- **Data**: database migrations, backup strategy documentation, environment separation.
- **Financial Operations**: server-side calculations, transaction records, audit logs, idempotency for provider operations where applicable.
- **Integrations**: sandbox configuration, production configuration, connection testing, error handling.

## 92. Testing Requirements

Create tests for critical business logic: authentication, role permissions, balance adjustments, market controls, manual chart toggles, ▲ increase controls, ▼ decrease controls, step values, market presets, deposit flow, withdrawal validation, account restrictions, maintenance mode, provider configuration permissions.

## 93. Manual Chart Control Acceptance Test

**Scenario 1**: Automatic Market, Manual Control = OFF → chart updates automatically, manual arrows disabled.

**Scenario 2**: Manual Control = ON, Market Value Control = ON, Step = $100, admin taps ▲ → $42,580 → $42,680, client chart updates.

**Scenario 3**: Admin taps ▲▲▲ with Step $100 → $42,580 → $42,680 → $42,780 → $42,880.

**Scenario 4**: Admin changes Step $100 → $500, taps ▲ → $42,880 → $43,380.

**Scenario 5**: Admin disables Market Value Control (OFF) → value arrows disabled; other enabled controls continue functioning.

**Scenario 6**: Admin selects Return To Automatic → manual controls disabled, automatic chart resumes, client chart continues updating.

## 94. Build Phases

**DO NOT attempt to generate the entire application as one uncontrolled block. Build in phases.**

- **Phase 1 — Foundation**: Vite, React, TypeScript, Bootstrap, Routing, Supabase connection, Authentication, Layouts, Roles, Database foundation.
- **Phase 2 — Client Core**: Client Dashboard, Portfolio, Investments, Transactions, Notifications, Settings.
- **Phase 3 — Admin Core**: Admin Dashboard, User Management, Financial Center, Transactions, Investment Management.
- **Phase 4 — Market System**: Live chart, Automatic market engine, Manual market controls (master toggle, individual toggles, ▲/▼ controls, step controls, percentage controls, trend controls, presets, audit logs). Complete and test this phase fully.
- **Phase 5 — Financial Flows**: Deposits, Withdrawals, Treasury, Financial ledger, Balance adjustments.
- **Phase 6 — White Label**: Branding, Logo, Colors, Theme, Business information, Domain settings, White-label settings.
- **Phase 7 — Integrations**: Provider architecture, Credential management, Connection testing, Sandbox configuration, Webhook architecture.
- **Phase 8 — Operations**: Referrals, Support, Announcements, Notifications, Maintenance, Activity, Online users.
- **Phase 9 — Security**: Permissions, RLS, Audit logs, Sessions, Security events.
- **Phase 10 — Sandbox**: Connect Supabase, sandbox providers, test webhooks, test payment workflows.
- **Phase 11 — Production Hardening**: Review secrets, permissions, validation, error handling, logging, environment separation, security, database performance.

Before moving to each next phase: (1) Complete the phase. (2) Verify the architecture. (3) Check for errors. (4) Confirm all required files exist. (5) Preserve compatibility with future phases.

The final system must provide a complete path from LOCAL DEVELOPMENT → DEMO → SANDBOX TESTING → PRODUCTION DEPLOYMENT without requiring the core frontend to be rebuilt.

## 95. Code Quality Rules

The generated application must: compile successfully, have no TypeScript errors, have no dead buttons, have no placeholder functionality, have no duplicate business logic, use reusable components, use reusable services, separate UI from business logic, use TypeScript types, use environment variables, include error handling, include loading states, include empty states. Do not leave TODOs for core functionality.

## 96. Final Acceptance Checklist

- **Authentication**: Registration, Login, Logout, Password reset, Protected routes all work.
- **Client**: Dashboard, Investments, Transactions, Notifications, Support all work.
- **Admin**: Dashboard, Users, Financial Center, Investments, Withdrawals, Treasury all work.
- **Market**: Automatic chart, manual master toggle, individual toggles, ▲ increase, ▼ decrease, step values, custom values, percentage control, trend control, volatility, presets, return to automatic, client updates all work.
- **White Label**: Site name, logo, colors, theme, business settings all work.
- **Integrations**: Provider configuration works, secrets are not exposed, credentials can be updated, connections can be tested, sandbox configuration works.
- **Security**: RLS works, roles work, permissions work, audit logs work, sensitive actions are protected.

## 97. Final Output Requirement

Build the application as a real, modular project. Do not output a single static HTML file. Start with Phase 1 — Foundation.
