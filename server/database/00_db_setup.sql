-- ==========================================
-- LOCAL DEVELOPMENT CONFIGURATION
-- Default password for DEV environment.
-- ==========================================

DROP DATABASE IF EXISTS hermyx;
DROP USER IF EXISTS hermyx_admin;
CREATE USER hermyx_admin WITH PASSWORD 'mYx289hEr_';
ALTER USER hermyx_admin WITH SUPERUSER;
CREATE DATABASE hermyx OWNER hermyx_admin;
GRANT ALL PRIVILEGES ON DATABASE hermyx TO hermyx_admin;