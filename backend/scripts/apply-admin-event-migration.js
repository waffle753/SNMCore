import 'dotenv/config';
import { readFile } from 'node:fs/promises';
import mysql from 'mysql2/promise';

const migrationPath = new URL('../migrations/20260926_admin_event_management.sql', import.meta.url);
const connection = await mysql.createConnection({
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'snmcore_db',
});

try {
  const [columns] = await connection.query(
    `SELECT COLUMN_NAME FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'events'`
  );
  const existing = new Set(columns.map((column) => column.COLUMN_NAME));
  const migrationColumns = [
    'request_id', 'event_name', 'location_type', 'facility_id', 'area_id',
    'space_type', 'location_name', 'start_datetime', 'end_datetime',
    'purpose', 'expected_attendees',
  ];
  const appliedCount = migrationColumns.filter((column) => existing.has(column)).length;
  if (appliedCount === migrationColumns.length) {
    console.log('Admin event migration is already applied.');
  } else if (appliedCount > 0) {
    throw new Error('The events schema is partially migrated. Inspect it before applying the SQL migration.');
  } else {
    const sql = await readFile(migrationPath, 'utf8');
    for (const statement of sql.split(';').map((part) => part.trim()).filter(Boolean)) {
      await connection.query(statement);
    }
    console.log(`Admin event migration applied to ${process.env.DB_NAME || 'snmcore_db'}.`);
  }
} finally {
  await connection.end();
}