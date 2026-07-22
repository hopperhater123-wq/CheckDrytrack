-- Gerätetyp für automatisch beim Scannen angelegte Geräte
insert into geraetetyp (id, bezeichnung, ist_freitext, leistungswert_kw, luftleistung_m3h)
values ('gt-unbekannt', 'Unbekannt (automatisch erfasst)', true, null, null)
on conflict (id) do nothing;

-- Stub-Zeilen als solche erkennbar machen, damit Dispo sie nacharbeiten kann
alter table geraet
  add column if not exists automatisch_erfasst boolean not null default false,
  add column if not exists erfasst_am timestamptz;

comment on column geraet.automatisch_erfasst is
  'true = Zeile entstand beim Scannen (Interims-Scan-App), Stammdaten unvollständig, von Dispo nachzupflegen';

-- Fotos als Beleg am Einsatz
alter table einsatz
  add column if not exists foto_start_ref text,
  add column if not exists foto_ende_ref text,
  add column if not exists quelle text;

comment on column einsatz.quelle is
  'Herkunft des Datensatzes, z. B. interim-scan';

-- Pro Gerät darf nur ein Einsatz gleichzeitig offen sein (Abbau fehlt noch)
create unique index if not exists einsatz_offen_je_geraet
  on einsatz (geraet_inventarnummer)
  where abbau_datum is null;

-- Zugangscode für die Interims-App (kein Login, aber auch keine offene Tür)
insert into firmen_einstellung (schluessel, wert)
values ('interim_app_code', 'TROCKNUNG-2026')
on conflict (schluessel) do nothing;

