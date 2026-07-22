-- Objektdaten am Projekt (Alt-System-Analyse 13.07.2026, Backlog ④).
alter table projekt
  add column if not exists baujahr integer,
  add column if not exists geschosse integer,
  add column if not exists bauweise text,
  add column if not exists aundv_unterschrieben boolean not null default false;

update projekt set baujahr=1998, geschosse=2, bauweise='Massiv',      aundv_unterschrieben=true  where id='p-1' and baujahr is null;
update projekt set baujahr=1965, geschosse=3, bauweise='Massiv',      aundv_unterschrieben=false where id='p-2' and baujahr is null;
update projekt set baujahr=2012, geschosse=2, bauweise='Holzständer', aundv_unterschrieben=true  where id='p-3' and baujahr is null;

