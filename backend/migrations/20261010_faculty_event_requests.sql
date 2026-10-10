ALTER TABLE requests
  ADD COLUMN request_type VARCHAR(50) NOT NULL DEFAULT 'event',
  ADD COLUMN subject VARCHAR(255) NULL,
  ADD COLUMN description TEXT NULL,
  ADD COLUMN event_start_datetime DATETIME NULL,
  ADD COLUMN event_end_datetime DATETIME NULL,
  ADD COLUMN event_location_type ENUM('indoor', 'outdoor', 'off_campus') NULL,
  ADD COLUMN event_facility_id INT NULL,
  ADD COLUMN event_area_id INT NULL,
  ADD COLUMN event_space_type ENUM('specific_area', 'entire_facility') NULL,
  ADD COLUMN event_location_name VARCHAR(255) NULL,
  ADD COLUMN event_expected_attendees INT NULL,
  ADD INDEX idx_requests_user_type_created (user_id, request_type, created_at);
