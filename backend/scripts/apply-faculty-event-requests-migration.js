import 'dotenv/config';
import mysql from 'mysql2/promise';

const connection = await mysql.createConnection({
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'snmcore_db',
});

try {
  const [columnRows] = await connection.query(
    `SELECT COLUMN_NAME FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'requests'`
  );
  const existing = new Set(columnRows.map((column) => column.COLUMN_NAME));
  if (!existing.size) throw new Error('The requests table does not exist in the configured database.');

  const columnsToAdd = {
    request_type: "VARCHAR(50) NOT NULL DEFAULT 'event'",
    subject: 'VARCHAR(255) NULL',
    description: 'TEXT NULL',
    event_start_datetime: 'DATETIME NULL',
    event_end_datetime: 'DATETIME NULL',
    event_location_type: "ENUM('indoor', 'outdoor', 'off_campus') NULL",
    event_facility_id: 'INT NULL',
    event_area_id: 'INT NULL',
    event_space_type: "ENUM('specific_area', 'entire_facility') NULL",
    event_location_name: 'VARCHAR(255) NULL',
    event_expected_attendees: 'INT NULL',
    event_name: 'VARCHAR(255) NULL',
    location_type: "ENUM('indoor', 'outdoor', 'off_campus') NULL",
    facility_id: 'INT NULL',
    area_id: 'INT NULL',
    space_type: "ENUM('specific_area', 'entire_facility') NULL",
    location_name: 'VARCHAR(255) NULL',
    start_datetime: 'DATETIME NULL',
    end_datetime: 'DATETIME NULL',
    purpose: 'TEXT NULL',
    expected_attendees: 'INT NULL',
  };

  for (const [name, definition] of Object.entries(columnsToAdd)) {
    if (!existing.has(name)) {
      await connection.query(`ALTER TABLE requests ADD COLUMN \`${name}\` ${definition}`);
      existing.add(name);
    }
  }

  const [indexes] = await connection.query(
    `SELECT INDEX_NAME FROM information_schema.STATISTICS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'requests'
       AND INDEX_NAME = 'idx_requests_user_type_created'`
  );
  if (!indexes.length) {
    await connection.query(
      'ALTER TABLE requests ADD INDEX idx_requests_user_type_created (user_id, request_type, created_at)'
    );
  }

  await connection.query(
    `UPDATE requests
     SET subject = COALESCE(subject, event_name),
         description = COALESCE(description, purpose),
         event_start_datetime = COALESCE(event_start_datetime, start_datetime),
         event_end_datetime = COALESCE(event_end_datetime, end_datetime),
         event_location_type = COALESCE(event_location_type, location_type),
         event_facility_id = COALESCE(event_facility_id, facility_id),
         event_area_id = COALESCE(event_area_id, area_id),
         event_space_type = COALESCE(event_space_type, space_type),
         event_location_name = COALESCE(event_location_name, location_name),
         event_expected_attendees = COALESCE(event_expected_attendees, expected_attendees)
     WHERE request_type = 'event'`
  );

  console.log(`Faculty event requests schema is ready in ${process.env.DB_NAME || 'snmcore_db'}.`);
} finally {
  await connection.end();
}
