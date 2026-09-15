-- Swaps the illustrated avatar library from abstract geometric icons
-- (compass/peak/wave/...) to real flat-illustrated character faces —
-- the icons read as generic and didn't "bring life" the way an actual
-- illustrated person does. No profile has picked an old key yet (the
-- picker only just shipped), so this is a straight constraint swap, no
-- data migration needed.

alter table profiles drop constraint if exists profiles_avatar_key_check;
alter table profiles
  add constraint profiles_avatar_key_check
    check (avatar_key is null or avatar_key in (
      'fringe', 'suit', 'bowtie', 'earbuds', 'ponytail', 'curly', 'sidepart', 'bob', 'crop'
    ));
