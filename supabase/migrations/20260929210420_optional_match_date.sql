-- A match's date is optional: games logged after the fact (e.g. imported from
-- old score pads) often have none. Undated matches sort after dated ones.
alter table public.matches alter column played_on drop not null;
