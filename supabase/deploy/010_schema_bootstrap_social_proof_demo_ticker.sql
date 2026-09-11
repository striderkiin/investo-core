-- Demo Activity Ticker: a standalone, admin-toggleable rotation of canned,
-- fictional marketing activity messages ("Daniel A. just deposited $500").
-- Deliberately separate from the real Social Proof event system (0018):
-- that one only ever displays genuine, privacy-filtered user activity and
-- is gated to `authenticated` sessions on purpose (social_proof_events
-- select policy). This ticker is explicit, operator-authored placeholder
-- content, so it's fine — and required — for it to be anon-readable: it
-- needs to render on the logged-out public landing page, not just the
-- authenticated client dashboard and admin panel.

alter table social_proof_settings add column demo_mode_enabled boolean not null default false;

create table social_proof_demo_activities (
  id uuid primary key default gen_random_uuid(),
  event_type text not null check (event_type in ('deposit', 'investment', 'withdrawal', 'market', 'account')),
  message text not null,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger trg_social_proof_demo_activities_updated_at
  before update on social_proof_demo_activities
  for each row execute function set_updated_at();

alter table social_proof_demo_activities enable row level security;

create policy "social proof demo activities are publicly readable" on social_proof_demo_activities for select using (true);
create policy "social proof demo activities managed by permission" on social_proof_demo_activities for all
  using (has_permission('social_proof.manage')) with check (has_permission('social_proof.manage'));

insert into social_proof_demo_activities (event_type, message, sort_order) values
  ('deposit', 'Daniel A. just deposited $500', 1),
  ('deposit', '@cryptomike just funded their account', 2),
  ('deposit', 'Maya added $750 to their balance', 3),
  ('deposit', 'xoxo_finance just made a deposit', 4),
  ('deposit', 'Aisha K. funded their account with $3,500', 5),
  ('deposit', 'BigMoneyJay just added funds', 6),
  ('deposit', 'Nina ✦ just deposited $600', 7),
  ('deposit', 'thatguy_kev funded their account', 8),
  ('deposit', 'Fatima L. added $1,250 to their account', 9),
  ('deposit', 'moonchild just made a deposit', 10),
  ('deposit', 'Tee deposited $3,000', 11),
  ('deposit', 'digitalnomad just funded their account', 12),
  ('investment', 'Sarah M. invested $1,200 in Growth Plan', 13),
  ('investment', 'JayJay activated the Balanced Plan', 14),
  ('investment', '@luna.builds started a $4,000 investment', 15),
  ('investment', 'Noah E. started a new investment', 16),
  ('investment', 'KweenB joined the Starter Plan', 17),
  ('investment', 'Marcus G. upgraded to Premium Plan', 18),
  ('investment', 'the.real.ami invested $1,500', 19),
  ('investment', 'O.G. Sam activated a Premium Plan', 20),
  ('investment', 'Zee started a $950 investment', 21),
  ('investment', '@moneymoves activated a new investment', 22),
  ('investment', 'Riri invested $2,000', 23),
  ('investment', 'QuietStorm upgraded their investment', 24),
  ('withdrawal', 'Michael O. just withdrew $850', 25),
  ('withdrawal', 'CryptoQueen completed a withdrawal', 26),
  ('withdrawal', 'Grace T. just withdrew $320', 27),
  ('withdrawal', '@tobi.exe completed a $1,500 withdrawal', 28),
  ('withdrawal', 'Maya A. completed a withdrawal', 29),
  ('withdrawal', 'lowkeyrich just withdrew $900', 30),
  ('withdrawal', 'Hannah C. completed a withdrawal', 31),
  ('withdrawal', 'Ace just withdrew $5,000', 32),
  ('withdrawal', 'n0sleep completed a $1,100 withdrawal', 33),
  ('withdrawal', 'Zoe K. just completed a withdrawal', 34),
  ('withdrawal', '@sundaymoney completed a $1,450 withdrawal', 35),
  ('withdrawal', 'BobbyD withdrew funds successfully', 36),
  ('market', 'Bitcoin is up 2.4% today', 37),
  ('market', 'Ethereum gained 1.8%', 38),
  ('market', 'Solana moved up 3.1%', 39),
  ('market', 'Bitcoin moved lower today', 40),
  ('market', 'XRP gained 4.2%', 41),
  ('market', 'Ethereum is down 2.7%', 42),
  ('market', 'Solana pulled back slightly', 43),
  ('market', 'Bitcoin climbed 3.8%', 44),
  ('market', 'XRP moved down 1.9%', 45),
  ('market', 'Ethereum is gaining momentum', 46),
  ('market', 'Solana gained 2.3%', 47),
  ('market', 'Bitcoin is trading higher today', 48),
  ('account', 'Sky just activated account security', 49),
  ('account', '@jay.money just joined the platform', 50),
  ('investment', 'MONEYMAKER upgraded to Premium Plan', 51),
  ('account', 'Ayo completed account verification', 52);
