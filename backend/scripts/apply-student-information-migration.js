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
  const [[table]] = await connection.query(
    `SELECT TABLE_NAME FROM information_schema.TABLES
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'student_information'`
  );
  if (!table) throw new Error('The student_information table does not exist in the configured database.');

  const [columns] = await connection.query(
    `SELECT COLUMN_NAME FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'student_information'`
  );
  const hasUserId = columns.some((column) => column.COLUMN_NAME === 'user_id');
  if (!hasUserId) {
    await connection.query('ALTER TABLE student_information ADD COLUMN user_id BIGINT UNSIGNED NULL AFTER id');
  }

  const [indexes] = await connection.query(
    `SELECT INDEX_NAME FROM information_schema.STATISTICS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'student_information'
       AND INDEX_NAME = 'uq_student_information_user_id'`
  );
  if (!indexes.length) {
    await connection.query(
      'ALTER TABLE student_information ADD UNIQUE KEY uq_student_information_user_id (user_id)'
    );
  }

  const [constraints] = await connection.query(
    `SELECT CONSTRAINT_NAME FROM information_schema.TABLE_CONSTRAINTS
     WHERE CONSTRAINT_SCHEMA = DATABASE() AND TABLE_NAME = 'student_information'
       AND CONSTRAINT_NAME = 'fk_student_information_user'`
  );
  if (!constraints.length) {
    await connection.query(
      `ALTER TABLE student_information
       ADD CONSTRAINT fk_student_information_user
       FOREIGN KEY (user_id) REFERENCES users (user_id) ON DELETE SET NULL`
    );
  }

  console.log(`Student information account link is ready in ${process.env.DB_NAME || 'snmcore_db'}.`);
} finally {
  await connection.end();
}
