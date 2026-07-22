-- Grundriss/Skizze je Geschoss (Backlog ⑤).
alter table grundriss
  add column if not exists geschoss text,
  add column if not exists raumhoehe_m double precision;

insert into grundriss (id, projekt_id, geschoss, raumhoehe_m, quelle, datei_referenz, erstellt_am) values
  ('gr-1','p-1','EG',    2.5,   'magicplan',  'magicplan://p-1/eg.pdf',        now() - interval '8 days'),
  ('gr-2','p-1','1. OG', 2.432, 'skizze_foto','storage://p-1/1og-skizze.jpg',  now() - interval '7 days')
on conflict (id) do nothing;

