ALTER TABLE announcements
  ADD COLUMN external_url VARCHAR(2048) NULL AFTER message;
