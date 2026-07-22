alter table public.projekt
  add column if not exists vollmacht_unterschrift text,
  add column if not exists vollmacht_unterschrift_name text,
  add column if not exists vollmacht_datum date;

