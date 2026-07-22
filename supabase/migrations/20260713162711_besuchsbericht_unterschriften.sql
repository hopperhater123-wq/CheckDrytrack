-- Unterschriften auf dem Gerät (Backlog ②): PNG-Data-URLs im Besuchsbericht.
alter table besuchsbericht
  add column if not exists unterschrift_kunde text,
  add column if not exists unterschrift_kunde_name text,
  add column if not exists unterschrift_mitarbeiter text;

