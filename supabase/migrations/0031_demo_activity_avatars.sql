-- Assigns the new illustrated avatar library to the demo activity ticker's
-- person-attributed rows, matched on simulated_name (unique per row, unlike
-- message — several rows share the same short activity text like
-- "completed a withdrawal"). Deliberately not every row: about a quarter
-- stay unassigned so the ticker still shows some initials-only cards too,
-- same mix a real user base would produce. The 12 'market' rows (no person
-- behind a price tick) are untouched — already null, already correct.

alter table social_proof_demo_activities
  add column avatar_key text
    check (avatar_key is null or avatar_key in (
      'fringe', 'suit', 'bowtie', 'earbuds', 'ponytail', 'curly', 'sidepart', 'bob', 'crop'
    ));

update social_proof_demo_activities set avatar_key = 'fringe' where simulated_name = 'Daniel A.';
update social_proof_demo_activities set avatar_key = 'bob' where simulated_name = 'Maya';
update social_proof_demo_activities set avatar_key = 'suit' where simulated_name = 'xoxo_finance';
update social_proof_demo_activities set avatar_key = 'ponytail' where simulated_name = 'Aisha K.';
update social_proof_demo_activities set avatar_key = 'earbuds' where simulated_name = 'Nina ✦';
update social_proof_demo_activities set avatar_key = 'crop' where simulated_name = 'thatguy_kev';
update social_proof_demo_activities set avatar_key = 'curly' where simulated_name = 'Fatima L.';
update social_proof_demo_activities set avatar_key = 'sidepart' where simulated_name = 'Tee';
update social_proof_demo_activities set avatar_key = 'bowtie' where simulated_name = 'digitalnomad';

update social_proof_demo_activities set avatar_key = 'bob' where simulated_name = 'Sarah M.';
update social_proof_demo_activities set avatar_key = 'fringe' where simulated_name = '@luna.builds';
update social_proof_demo_activities set avatar_key = 'suit' where simulated_name = 'Noah E.';
update social_proof_demo_activities set avatar_key = 'ponytail' where simulated_name = 'KweenB';
update social_proof_demo_activities set avatar_key = 'earbuds' where simulated_name = 'the.real.ami';
update social_proof_demo_activities set avatar_key = 'crop' where simulated_name = 'O.G. Sam';
update social_proof_demo_activities set avatar_key = 'curly' where simulated_name = 'Zee';
update social_proof_demo_activities set avatar_key = 'sidepart' where simulated_name = 'Riri';
update social_proof_demo_activities set avatar_key = 'bowtie' where simulated_name = 'QuietStorm';
update social_proof_demo_activities set avatar_key = 'bob' where simulated_name = 'MONEYMAKER';

update social_proof_demo_activities set avatar_key = 'fringe' where simulated_name = 'CryptoQueen';
update social_proof_demo_activities set avatar_key = 'suit' where simulated_name = 'Grace T.';
update social_proof_demo_activities set avatar_key = 'ponytail' where simulated_name = '@tobi.exe';
update social_proof_demo_activities set avatar_key = 'earbuds' where simulated_name = 'lowkeyrich';
update social_proof_demo_activities set avatar_key = 'crop' where simulated_name = 'Hannah C.';
update social_proof_demo_activities set avatar_key = 'curly' where simulated_name = 'Ace';
update social_proof_demo_activities set avatar_key = 'sidepart' where simulated_name = 'Zoe K.';
update social_proof_demo_activities set avatar_key = 'bowtie' where simulated_name = '@sundaymoney';
update social_proof_demo_activities set avatar_key = 'bob' where simulated_name = 'BobbyD';

update social_proof_demo_activities set avatar_key = 'fringe' where simulated_name = '@jay.money';
update social_proof_demo_activities set avatar_key = 'suit' where simulated_name = 'Ayo';

-- Left without an avatar_key (initials-only card): @cryptomike, BigMoneyJay,
-- moonchild, JayJay, Marcus G., @moneymoves, Michael O., Maya A., n0sleep, Sky.
