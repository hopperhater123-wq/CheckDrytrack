-- Aufräumen (PO-Freigabe 18.07.): verwaistes englischsprachiges Alt-Schema
-- (frühes Experiment, nur Testdaten). Gehört weder zu Torrek noch zu Torrek Scan.
DROP TRIGGER IF EXISTS trg_on_auth_user_created ON auth.users;
DROP VIEW IF EXISTS v_deployments_detailed;
DROP TABLE IF EXISTS device_deployments CASCADE;
DROP TABLE IF EXISTS devices CASCADE;
DROP TABLE IF EXISTS projects CASCADE;
DROP TABLE IF EXISTS profiles CASCADE;
DROP TABLE IF EXISTS sync_queue CASCADE;
DROP FUNCTION IF EXISTS handle_new_user();
DROP FUNCTION IF EXISTS set_updated_at();
DROP FUNCTION IF EXISTS update_device_state_on_deployment();
DROP FUNCTION IF EXISTS current_user_role();

