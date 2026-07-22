-- Demo-Stammdaten, gespiegelt aus src/domain/seed.ts (feste Text-IDs, keine generierten).
insert into benutzer (id, name, microsoft_account_id, rolle) values
  ('u-monteur','Kevin Berg','kevin@firma.de','monteur'),
  ('u-dispo','Sandra Roth','sandra@firma.de','disposition'),
  ('u-pl','Markus Feld','markus@firma.de','projektleiter'),
  ('u-admin','Anna Weiss','anna@firma.de','admin_gf')
on conflict (id) do nothing;

insert into geraetetyp (id, bezeichnung, ist_freitext, leistungswert_kw, luftleistung_m3h) values
  ('gt-kondens','Kondenstrockner',false,0.9,300),
  ('gt-adsorp','Adsorptionstrockner',false,1.4,250),
  ('gt-ventil','Ventilator / Radialgebläse',false,0.25,900),
  ('gt-turbine','Seitenkanalturbine',false,1.1,210),
  ('gt-heizer','Heizgebläse',false,2.0,400)
on conflict (id) do nothing;

insert into versicherung (id, name) values
  ('v-allianz','Allianz'), ('v-provinzial','Provinzial')
on conflict (id) do nothing;

insert into projekt (id, projektnummer, status, storniert, ist_erstmassnahme, bezeichnung, adresse, geo_lat, geo_lng, kontamination_art, gefaehrdungsbeurteilung_abgeschlossen, versicherung_id, angelegt_von, angelegt_am) values
  ('p-1','2026-0042','trocknung_laeuft',false,false,'Wasserschaden Küche — Fam. Müller','Lindenstraße 12, 40477 Düsseldorf',51.2412,6.7841,'sauber',true,'v-allianz','u-dispo',now()-interval '9 days'),
  ('p-2','2026-0043','schadenaufnahme',false,true,'Rohrbruch Keller — Bäckerei Kern','Marktplatz 3, 50667 Köln',50.9375,6.9603,'faekalien',false,'v-provinzial','u-pl',now()-interval '2 days'),
  ('p-3','2026-0039','abgeschlossen',false,false,'Leitungswasser Bad — Fam. Schulz','Am Hang 7, 42117 Wuppertal',51.2562,7.1508,'sauber',true,'v-allianz','u-dispo',now()-interval '40 days')
on conflict (id) do nothing;

insert into raum (id, projekt_id, bezeichnung, daemmstoff_status, daemmstoff_material_id) values
  ('r-1','p-1','Küche','verdacht','mat-kmf'),
  ('r-2','p-1','Flur EG','unbekannt',null),
  ('r-3','p-2','Heizungskeller','unbekannt',null),
  ('r-4','p-3','Badezimmer OG','bestaetigt','mat-eps')
on conflict (id) do nothing;

insert into geraet (inventarnummer, geraetetyp_id, status, eigentum, e_check_datum, aktuelles_projekt_id) values
  ('KT-1001','gt-kondens','baustelle','eigen',current_date+120,'p-1'),
  ('KT-1002','gt-kondens','baustelle','eigen',current_date+200,'p-1'),
  ('KT-1003','gt-kondens','lager','eigen',current_date-10,null),
  ('AD-2001','gt-adsorp','baustelle','gemietet',current_date+45,'p-2'),
  ('VE-3001','gt-ventil','lager','eigen',current_date+310,null),
  ('VE-3002','gt-ventil','werkstatt','eigen',current_date+15,null),
  ('TU-4001','gt-turbine','baustelle','eigen',current_date+90,'p-1'),
  ('HZ-5001','gt-heizer','lager','eigen',current_date+150,null)
on conflict (inventarnummer) do nothing;

insert into einsatz (id, projekt_id, geraet_inventarnummer, raum_id, aufbau_datum, abbau_datum, zaehlerstand_start, zaehlerstand_ende, verbrauch_geschaetzt) values
  ('e-1','p-1','KT-1001','r-1',now()-interval '8 days',null,1240.5,null,false),
  ('e-2','p-1','KT-1002','r-2',now()-interval '8 days',null,980.0,null,false),
  ('e-3','p-1','TU-4001','r-1',now()-interval '6 days',null,55.2,null,false),
  ('e-4','p-2','AD-2001','r-3',now()-interval '2 days',null,300.0,null,false),
  ('e-5','p-3','KT-1003','r-4',now()-interval '38 days',now()-interval '24 days',400.0,702.5,false),
  ('e-6','p-3','VE-3001','r-4',now()-interval '38 days',now()-interval '24 days',0,null,true)
on conflict (id) do nothing;

insert into feed_eintrag (id, projekt_id, geraet_inventarnummer, ursprung, kategorie, inhalt, autor_id, erstellt_am) values
  ('f-1','p-1','KT-1001','scan',null,'Gerät KT-1001 in Küche aufgebaut, Startzählerstand 1240,5 kWh.','u-monteur',now()-interval '8 days'),
  ('f-2','p-1',null,'manuell','hinweis','Kunde ist werktags erst ab 15 Uhr erreichbar.','u-dispo',now()-interval '7 days'),
  ('f-3','p-1',null,'manuell','problem','Unter dem Estrich Verdacht auf Perlite-Dämmung — Bohrloch geplant.','u-monteur',now()-interval '5 days'),
  ('f-4','p-2',null,'manuell','problem','Fäkalienkontamination — Gefährdungsbeurteilung noch offen!','u-pl',now()-interval '2 days')
on conflict (id) do nothing;

insert into feed_kommentar (id, feed_eintrag_id, autor_id, inhalt, erstellt_am) values
  ('fk-1','f-3','u-pl','Bohrloch am Donnerstag, ich bringe das Endoskop mit.',now()-interval '4 days')
on conflict (id) do nothing;

insert into dokument (id, projekt_id, typ, speicher_referenz, erstellt_von, erstellt_am) values
  ('d-1','p-3','strombrief','storage://p-3/strombrief.pdf','u-dispo',now()-interval '23 days'),
  ('d-2','p-3','abschlussbericht','storage://p-3/abschluss.pdf','u-pl',now()-interval '23 days'),
  ('d-3','p-1','schadensaufnahme_doku','storage://p-1/aufnahme.pdf','u-monteur',now()-interval '8 days')
on conflict (id) do nothing;

insert into materialdatenbank (id, bezeichnung, kategorie, trocknungsfaehig, austauschpflichtig, bewertungsmodell, praxisgrenzwert_digit, schicht_typ) values
  ('mat-fliese','Fliese','Oberbelag',false,false,'vergleichsmessung',null,'oberbelag'),
  ('mat-parkett','Parkett','Oberbelag',true,true,'digit_grenzwert',40,'oberbelag'),
  ('mat-pvc','PVC / Vinyl','Oberbelag',false,true,'vergleichsmessung',null,'oberbelag'),
  ('mat-teppich','Teppich','Oberbelag',false,true,'status_checkliste',null,'oberbelag'),
  ('mat-schwimm','Schwimmender Estrich','Estrich',true,false,'digit_grenzwert',50,'estrich'),
  ('mat-zement','Zementestrich','Estrich',true,false,'digit_grenzwert',50,'estrich'),
  ('mat-anhydrit','Anhydritestrich','Estrich',true,false,'digit_grenzwert',50,'estrich'),
  ('mat-trocken','Trockenestrich','Estrich',false,true,'status_checkliste',null,'estrich'),
  ('mat-kmf','KMF (Mineralwolle)','Dämmstoff',false,true,'status_checkliste',null,'daemmung'),
  ('mat-perlite','Perlite','Dämmstoff',true,false,'status_checkliste',null,'daemmung'),
  ('mat-eps','Styropor (EPS)','Dämmstoff',false,true,'status_checkliste',null,'daemmung'),
  ('mat-styrodur','Styrodur (XPS)','Dämmstoff',true,false,'status_checkliste',null,'daemmung'),
  ('mat-randfuge','Randfuge / Dämmschicht','Bauteil',true,false,'digit_grenzwert',20,null),
  ('mat-beton','Beton','Bauteil',true,false,'digit_grenzwert',50,null),
  ('mat-putz','Putz','Bauteil',true,false,'digit_grenzwert',50,null),
  ('mat-gipskarton','Gipskarton','Bauteil',true,false,'digit_grenzwert',20,null),
  ('mat-mauerwerk','Mauerwerk (Kalksandstein)','Mauerwerk',true,false,'vergleichsmessung',null,null)
on conflict (id) do nothing;

insert into bodenaufbau_schicht (id, raum_id, reihenfolge, schicht_typ, material_id) values
  ('bs-1','r-1',0,'oberbelag','mat-fliese'),
  ('bs-2','r-1',1,'estrich','mat-schwimm'),
  ('bs-3','r-1',2,'daemmung','mat-kmf')
on conflict (id) do nothing;

insert into messung (id, raum_id, material_id, messverfahren, anzeige_digit, referenz_digit, status_checkliste, absolute_feuchte_g_kg, temperatur_c, rel_luftfeuchte_prozent, anlass, gemessen_von, gemessen_am) values
  ('me-1','r-1','mat-schwimm','widerstand',78,null,null,11.9,21,62,'eingangsmessung','u-monteur',now()-interval '8 days'),
  ('me-2','r-1','mat-schwimm','widerstand',54,null,null,8.9,22,51,'eingangsmessung','u-monteur',now()-interval '3 days'),
  ('me-3','r-1','mat-kmf','widerstand',null,null,'{"trocken":false,"feucht":true,"kontaminiert":false,"austausch_erforderlich":true}'::jsonb,null,null,null,'eingangsmessung','u-monteur',now()-interval '5 days'),
  ('me-4','r-4','mat-zement','widerstand',44,null,null,7.1,23,45,'freimessung','u-monteur',now()-interval '24 days')
on conflict (id) do nothing;

insert into firmen_einstellung (schluessel, wert) values ('freigabegrenze_eur','1500')
on conflict (schluessel) do nothing;

