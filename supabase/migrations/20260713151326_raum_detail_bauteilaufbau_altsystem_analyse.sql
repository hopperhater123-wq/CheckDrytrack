-- Raum-Detail + Bauteilaufbau — aus der Alt-System-Analyse 13.07.2026
-- (Notion: "Analyse Alt-System · Mobiler Trocknungsassistent").

alter table raum
  add column if not exists raumtyp text,
  add column if not exists geschoss text,
  add column if not exists wohneinheit text,
  add column if not exists trocknung_konstruktion boolean,
  add column if not exists trocknung_raum boolean,
  add column if not exists trocknung_schacht boolean,
  add column if not exists faekalschaden boolean,
  add column if not exists freies_wasser boolean,
  add column if not exists sichtbarer_schimmel boolean,
  add column if not exists betroffene_flaeche_m2 double precision;

alter table bodenaufbau_schicht
  add column if not exists fussbodenheizung boolean,
  add column if not exists bauart text check (bauart in ('schwimmend','verbund','trennlage'));

-- Schichttypen erweitern (Putz, Mauerwerk, Decke, Schüttung, Dielung)
alter table bodenaufbau_schicht drop constraint if exists bodenaufbau_schicht_schicht_typ_check;
alter table bodenaufbau_schicht add constraint bodenaufbau_schicht_schicht_typ_check
  check (schicht_typ in ('oberbelag','estrich','daemmung','putz','mauerwerk','decke_massiv','decke_abgehaengt','schuettung','dielung'));
alter table materialdatenbank drop constraint if exists materialdatenbank_schicht_typ_check;
alter table materialdatenbank add constraint materialdatenbank_schicht_typ_check
  check (schicht_typ in ('oberbelag','estrich','daemmung','putz','mauerwerk','decke_massiv','decke_abgehaengt','schuettung','dielung'));

-- Seed-Raum Küche (r-1) mit den Beispielwerten angleichen; Estrich-Schicht als schwimmend markieren
update raum set raumtyp='Küche', geschoss='EG', wohneinheit='EG',
  trocknung_konstruktion=true, trocknung_raum=true, trocknung_schacht=false,
  faekalschaden=false, freies_wasser=false, sichtbarer_schimmel=false, betroffene_flaeche_m2=12
  where id='r-1' and raumtyp is null;
update raum set raumtyp='Flur', geschoss='EG', wohneinheit='EG' where id='r-2' and raumtyp is null;
update raum set raumtyp='Heizungskeller', geschoss='Keller' where id='r-3' and raumtyp is null;
update raum set raumtyp='Bad', geschoss='DG', wohneinheit='OG' where id='r-4' and raumtyp is null;
update bodenaufbau_schicht set bauart='schwimmend', fussbodenheizung=false where id='bs-2' and bauart is null;

