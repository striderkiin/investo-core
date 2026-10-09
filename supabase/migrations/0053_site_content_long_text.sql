-- Legal pages (Terms, Privacy, Risk Disclosure, Refund Policy) are stored in
-- site_content too and can be long, so allow up to 20,000 characters.
alter table site_content drop constraint if exists site_content_value_check;
alter table site_content add constraint site_content_value_check check (length(value) <= 20000);
