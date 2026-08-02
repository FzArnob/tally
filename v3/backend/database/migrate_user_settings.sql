-- ---------------------------------------------------------------------------
-- Per-user display preferences: theme and language.
--
-- Run once against an existing tally_v3 database. schema.sql already carries
-- these columns, so a database created from it needs nothing here.
--
--   mysql -u root -p tally_v3 < migrate_user_settings.sql
--
-- Both columns take the defaults the app already used before it had anywhere to
-- store them ('system' theme, English), so every existing user keeps exactly
-- what they were seeing until they change it.
-- ---------------------------------------------------------------------------

ALTER TABLE users
    ADD COLUMN theme    ENUM('system','light','dark') NOT NULL DEFAULT 'system' AFTER picture,
    ADD COLUMN language ENUM('en','bn')               NOT NULL DEFAULT 'en'     AFTER theme;
