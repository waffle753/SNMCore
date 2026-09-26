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
  const [columns] = await connection.query(
    `SELECT COLUMN_NAME FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'announcements' AND COLUMN_NAME = 'external_url'`
  );
  if (columns.length) {
    console.log('Announcement external link column is already present.');
  } else {
    await connection.query('ALTER TABLE announcements ADD COLUMN external_url VARCHAR(2048) NULL AFTER message');
    console.log(`Announcement external link column added to ${process.env.DB_NAME || 'snmcore_db'}.`);
  }
} finally {
  await connection.end();
}
