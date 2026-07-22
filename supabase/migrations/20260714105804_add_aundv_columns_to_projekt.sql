alter table public.projekt
  add column if not exists aundv_unterschrift text,
  add column if not exists aundv_unterschrift_name text,
  add column if not exists aundv_datum date;

