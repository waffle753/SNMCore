ALTER TABLE events
  ADD COLUMN request_id BIGINT NULL AFTER event_id,
  ADD COLUMN event_name VARCHAR(255) NULL AFTER request_id,
  ADD COLUMN location_type ENUM('indoor', 'outdoor', 'off_campus') NULL AFTER description,
  ADD COLUMN facility_id INT NULL AFTER location_type,
  ADD COLUMN area_id INT NULL AFTER facility_id,
  ADD COLUMN space_type ENUM('specific_area', 'entire_facility') NULL AFTER area_id,
  ADD COLUMN location_name VARCHAR(255) NULL AFTER space_type,
  ADD COLUMN start_datetime DATETIME NULL AFTER location_name,
  ADD COLUMN end_datetime DATETIME NULL AFTER start_datetime,
  ADD COLUMN purpose TEXT NULL AFTER end_datetime,
  ADD COLUMN expected_attendees INT NULL AFTER purpose;

UPDATE events
SET event_name = title,
    purpose = description,
    location_type = 'outdoor',
    location_name = location,
    start_datetime = CASE
      WHEN start_time IS NULL THEN TIMESTAMP(event_date, '00:00:00')
      ELSE TIMESTAMP(event_date, start_time)
    END,
    end_datetime = CASE
      WHEN end_time IS NULL THEN TIMESTAMP(event_date, '23:59:00')
      ELSE TIMESTAMP(event_date, end_time)
    END;

ALTER TABLE events
  MODIFY COLUMN status VARCHAR(20) NOT NULL DEFAULT 'scheduled',
  ADD INDEX idx_events_schedule (status, start_datetime, end_datetime),
  ADD INDEX idx_events_facility_area (facility_id, area_id, space_type, status),
  ADD INDEX idx_events_location (location_type, location_name, status);

UPDATE events SET status = 'scheduled' WHERE status = 'published';
