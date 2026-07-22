-- Entscheidung Product Owner 15.07.2026: Zählerstände werden ohne Nachkommastellen erfasst.
-- Die Regel gehört in die Datenbank, nicht nur in die App — sonst hält sie nur,
-- solange niemand einen anderen Client baut.
alter table scan_erfassung drop constraint if exists scan_erfassung_kwh_check;
alter table scan_erfassung add constraint scan_erfassung_kwh_check
  check (kwh >= 0 and kwh = trunc(kwh));

comment on column scan_erfassung.kwh is
  'Zählerstand in kWh, ganzzahlig. Nachkommastellen werden bewusst nicht erfasst (Entscheidung 15.07.2026): die Differenz verschiebt sich um höchstens 1 kWh, dafür entfällt die Uneinheitlichkeit zwischen mechanischen Rollenzählwerken (SDM120A, rote Nachkommastelle) und digitalen Displays.';

