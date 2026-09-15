-- Splits the demo ticker's canned messages into a simulated name +
-- location (rendered bold, "Name from City, CC") and a short activity
-- line beneath it (regular weight) — matching the reference "purchase"
-- notification layout the popup redesign was built against. Only the
-- person-attributed event types get a name/location; 'market' rows have
-- no person behind them (a price tick, not an activity) and are left
-- alone — both columns stay null and the ticker renders just the message,
-- same as before this migration.

alter table social_proof_demo_activities
  add column simulated_name text,
  add column simulated_location text;

update social_proof_demo_activities set simulated_name = 'Daniel A.', simulated_location = 'Austin, US', message = 'just deposited $500' where message = 'Daniel A. just deposited $500';
update social_proof_demo_activities set simulated_name = '@cryptomike', simulated_location = 'Manila, PH', message = 'just funded their account' where message = '@cryptomike just funded their account';
update social_proof_demo_activities set simulated_name = 'Maya', simulated_location = 'Lagos, NG', message = 'added $750 to their balance' where message = 'Maya added $750 to their balance';
update social_proof_demo_activities set simulated_name = 'xoxo_finance', simulated_location = 'Toronto, CA', message = 'just made a deposit' where message = 'xoxo_finance just made a deposit';
update social_proof_demo_activities set simulated_name = 'Aisha K.', simulated_location = 'Nairobi, KE', message = 'funded their account with $3,500' where message = 'Aisha K. funded their account with $3,500';
update social_proof_demo_activities set simulated_name = 'BigMoneyJay', simulated_location = 'Houston, US', message = 'just added funds' where message = 'BigMoneyJay just added funds';
update social_proof_demo_activities set simulated_name = 'Nina ✦', simulated_location = 'Warsaw, PL', message = 'just deposited $600' where message = 'Nina ✦ just deposited $600';
update social_proof_demo_activities set simulated_name = 'thatguy_kev', simulated_location = 'Accra, GH', message = 'funded their account' where message = 'thatguy_kev funded their account';
update social_proof_demo_activities set simulated_name = 'Fatima L.', simulated_location = 'Karachi, PK', message = 'added $1,250 to their account' where message = 'Fatima L. added $1,250 to their account';
update social_proof_demo_activities set simulated_name = 'moonchild', simulated_location = 'Berlin, DE', message = 'just made a deposit' where message = 'moonchild just made a deposit';
update social_proof_demo_activities set simulated_name = 'Tee', simulated_location = 'Kingston, JM', message = 'deposited $3,000' where message = 'Tee deposited $3,000';
update social_proof_demo_activities set simulated_name = 'digitalnomad', simulated_location = 'Lisbon, PT', message = 'just funded their account' where message = 'digitalnomad just funded their account';

update social_proof_demo_activities set simulated_name = 'Sarah M.', simulated_location = 'Chicago, US', message = 'invested $1,200 in Growth Plan' where message = 'Sarah M. invested $1,200 in Growth Plan';
update social_proof_demo_activities set simulated_name = 'JayJay', simulated_location = 'Manchester, GB', message = 'activated the Balanced Plan' where message = 'JayJay activated the Balanced Plan';
update social_proof_demo_activities set simulated_name = '@luna.builds', simulated_location = 'Singapore, SG', message = 'started a $4,000 investment' where message = '@luna.builds started a $4,000 investment';
update social_proof_demo_activities set simulated_name = 'Noah E.', simulated_location = 'Sydney, AU', message = 'started a new investment' where message = 'Noah E. started a new investment';
update social_proof_demo_activities set simulated_name = 'KweenB', simulated_location = 'Lagos, NG', message = 'joined the Starter Plan' where message = 'KweenB joined the Starter Plan';
update social_proof_demo_activities set simulated_name = 'Marcus G.', simulated_location = 'Johannesburg, ZA', message = 'upgraded to Premium Plan' where message = 'Marcus G. upgraded to Premium Plan';
update social_proof_demo_activities set simulated_name = 'the.real.ami', simulated_location = 'Dubai, AE', message = 'invested $1,500' where message = 'the.real.ami invested $1,500';
update social_proof_demo_activities set simulated_name = 'O.G. Sam', simulated_location = 'Kingston, JM', message = 'activated a Premium Plan' where message = 'O.G. Sam activated a Premium Plan';
update social_proof_demo_activities set simulated_name = 'Zee', simulated_location = 'Amsterdam, NL', message = 'started a $950 investment' where message = 'Zee started a $950 investment';
update social_proof_demo_activities set simulated_name = '@moneymoves', simulated_location = 'Mumbai, IN', message = 'activated a new investment' where message = '@moneymoves activated a new investment';
update social_proof_demo_activities set simulated_name = 'Riri', simulated_location = 'Port of Spain, TT', message = 'invested $2,000' where message = 'Riri invested $2,000';
update social_proof_demo_activities set simulated_name = 'QuietStorm', simulated_location = 'Vancouver, CA', message = 'upgraded their investment' where message = 'QuietStorm upgraded their investment';
update social_proof_demo_activities set simulated_name = 'MONEYMAKER', simulated_location = 'Houston, US', message = 'upgraded to Premium Plan' where message = 'MONEYMAKER upgraded to Premium Plan';

update social_proof_demo_activities set simulated_name = 'Michael O.', simulated_location = 'Abuja, NG', message = 'just withdrew $850' where message = 'Michael O. just withdrew $850';
update social_proof_demo_activities set simulated_name = 'CryptoQueen', simulated_location = 'Miami, US', message = 'completed a withdrawal' where message = 'CryptoQueen completed a withdrawal';
update social_proof_demo_activities set simulated_name = 'Grace T.', simulated_location = 'Nairobi, KE', message = 'just withdrew $320' where message = 'Grace T. just withdrew $320';
update social_proof_demo_activities set simulated_name = '@tobi.exe', simulated_location = 'Lagos, NG', message = 'completed a $1,500 withdrawal' where message = '@tobi.exe completed a $1,500 withdrawal';
update social_proof_demo_activities set simulated_name = 'Maya A.', simulated_location = 'Manila, PH', message = 'completed a withdrawal' where message = 'Maya A. completed a withdrawal';
update social_proof_demo_activities set simulated_name = 'lowkeyrich', simulated_location = 'Accra, GH', message = 'just withdrew $900' where message = 'lowkeyrich just withdrew $900';
update social_proof_demo_activities set simulated_name = 'Hannah C.', simulated_location = 'Dublin, IE', message = 'completed a withdrawal' where message = 'Hannah C. completed a withdrawal';
update social_proof_demo_activities set simulated_name = 'Ace', simulated_location = 'Dubai, AE', message = 'just withdrew $5,000' where message = 'Ace just withdrew $5,000';
update social_proof_demo_activities set simulated_name = 'n0sleep', simulated_location = 'Berlin, DE', message = 'completed a $1,100 withdrawal' where message = 'n0sleep completed a $1,100 withdrawal';
update social_proof_demo_activities set simulated_name = 'Zoe K.', simulated_location = 'Auckland, NZ', message = 'just completed a withdrawal' where message = 'Zoe K. just completed a withdrawal';
update social_proof_demo_activities set simulated_name = '@sundaymoney', simulated_location = 'Kampala, UG', message = 'completed a $1,450 withdrawal' where message = '@sundaymoney completed a $1,450 withdrawal';
update social_proof_demo_activities set simulated_name = 'BobbyD', simulated_location = 'Kingston, JM', message = 'withdrew funds successfully' where message = 'BobbyD withdrew funds successfully';

update social_proof_demo_activities set simulated_name = 'Sky', simulated_location = 'Lagos, NG', message = 'just activated account security' where message = 'Sky just activated account security';
update social_proof_demo_activities set simulated_name = '@jay.money', simulated_location = 'Nairobi, KE', message = 'just joined the platform' where message = '@jay.money just joined the platform';
update social_proof_demo_activities set simulated_name = 'Ayo', simulated_location = 'Accra, GH', message = 'completed account verification' where message = 'Ayo completed account verification';
