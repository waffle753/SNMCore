import 'dotenv/config';
import cors from 'cors';
import express from 'express';
import jwt from 'jsonwebtoken';
import mysql from 'mysql2/promise';
import bcrypt from 'bcryptjs';

const app = express();
const port = Number(process.env.PORT || 4000);
const jwtSecret = process.env.JWT_SECRET || 'development-only-secret';

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'snmcore_db',
  waitForConnections: true,
  connectionLimit: 10,
});

app.use(cors());
app.use(express.json());

const createToken = (user) => jwt.sign(
  { userId: user.user_id, role: user.role, email: user.email },
  jwtSecret,
  { expiresIn: '8h' }
);

const requireAuth = (req, res, next) => {
  const header = req.headers.authorization;
  const token = header?.startsWith('Bearer ') ? header.slice(7) : null;

  if (!token) {
    return res.status(401).json({ message: 'Authentication required.' });
  }

  try {
    req.user = jwt.verify(token, jwtSecret);
    return next();
  } catch {
    return res.status(401).json({ message: 'Invalid or expired token.' });
  }
};

const requireRole = (...roles) => (req, res, next) => {
  if (!roles.includes(req.user.role)) {
    return res.status(403).json({ message: 'You do not have permission for this action.' });
  }
  return next();
};

app.get('/api/health', async (_req, res) => {
  try {
    await pool.query('SELECT 1');
    return res.json({ status: 'ok', database: 'connected' });
  } catch {
    return res.status(503).json({ status: 'error', database: 'unavailable' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password are required.' });
  }

  try {
    const [rows] = await pool.query(
      'SELECT user_id, full_name, email, password_hash, role, is_active FROM users WHERE email = ? LIMIT 1',
      [email.trim().toLowerCase()]
    );
    const user = rows[0];

    if (!user || !user.is_active || !(await bcrypt.compare(password, user.password_hash))) {
      return res.status(401).json({ message: 'Invalid email or password.' });
    }

    return res.json({
      token: createToken(user),
      user: {
        id: user.user_id,
        name: user.full_name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Unable to sign in right now.' });
  }
});

app.get('/api/events', requireAuth, async (req, res) => {
  try {
    const [events] = await pool.query(
      `SELECT event_id, title, description, event_date, start_time, end_time, location, created_by, status
       FROM events
       WHERE status = 'published'
       ORDER BY event_date, start_time`
    );
    return res.json(events);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Unable to load events.' });
  }
});

app.post('/api/events', requireAuth, requireRole('admin', 'faculty'), async (req, res) => {
  const { title, description, eventDate, startTime, endTime, location, announcementMessage } = req.body;

  if (!title || !eventDate) {
    return res.status(400).json({ message: 'Title and event date are required.' });
  }

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const [result] = await connection.query(
      `INSERT INTO events (title, description, event_date, start_time, end_time, location, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [title, description || null, eventDate, startTime || null, endTime || null, location || null, req.user.userId]
    );

    if (announcementMessage?.trim()) {
      await connection.query(
        `INSERT INTO announcements (title, message, audience, event_id, created_by, published_at)
         VALUES (?, ?, 'all', ?, ?, CURRENT_TIMESTAMP)`,
        [title, announcementMessage.trim(), result.insertId, req.user.userId]
      );
    }

    await connection.commit();
    return res.status(201).json({ eventId: result.insertId, announcementCreated: Boolean(announcementMessage?.trim()) });
  } catch (error) {
    await connection.rollback();
    console.error(error);
    return res.status(500).json({ message: 'Unable to create event.' });
  } finally {
    connection.release();
  }
});

app.get('/api/announcements', requireAuth, async (req, res) => {
  try {
    const [announcements] = await pool.query(
      `SELECT announcement_id, title, message, audience, event_id, created_by, published_at
       FROM announcements
       WHERE status = 'published' AND (audience = 'all' OR audience = ?)
       ORDER BY published_at DESC, created_at DESC`,
      [req.user.role]
    );
    return res.json(announcements);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Unable to load announcements.' });
  }
});

app.post('/api/announcements', requireAuth, requireRole('admin', 'faculty'), async (req, res) => {
  const { title, message, audience = 'all', eventId = null } = req.body;

  if (!title || !message) {
    return res.status(400).json({ message: 'Title and message are required.' });
  }

  try {
    const [result] = await pool.query(
      `INSERT INTO announcements (title, message, audience, event_id, created_by, published_at)
       VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
      [title, message, audience, eventId, req.user.userId]
    );
    return res.status(201).json({ announcementId: result.insertId });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Unable to create announcement.' });
  }
});

app.get('/api/admin/students', requireAuth, requireRole('admin'), async (_req, res) => {
  try {
    const [students] = await pool.query(
      `SELECT user_id, full_name, email, role, is_active, created_at
       FROM users WHERE role IN ('admin', 'faculty', 'student') ORDER BY full_name`
    );
    return res.json(students);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Unable to load students.' });
  }
});

app.post('/api/admin/students', requireAuth, requireRole('admin'), async (req, res) => {
  const { fullName, email, password, role = 'student' } = req.body;
  if (!fullName || !email || !password) {
    return res.status(400).json({ message: 'Name, email, and password are required.' });
  }
  if (!['admin', 'faculty', 'student'].includes(role)) {
    return res.status(400).json({ message: 'Role must be admin, faculty, or student.' });
  }

  try {
    const passwordHash = await bcrypt.hash(password, 10);
    const [result] = await pool.query(
      `INSERT INTO users (full_name, email, password_hash, role)
        VALUES (?, ?, ?, ?)`,
            [fullName.trim(), email.trim().toLowerCase(), passwordHash, role]
    );
    return res.status(201).json({
      studentId: result.insertId,
      role,
    });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ message: 'That email is already registered.' });
    }
    console.error(error);
    return res.status(500).json({ message: 'Unable to create student.' });
  }
});

app.patch('/api/admin/students/:id', requireAuth, requireRole('admin'), async (req, res) => {
  const { fullName, email, isActive, password, role } = req.body;
  const fields = [];
  const values = [];

  if (fullName !== undefined) { fields.push('full_name = ?'); values.push(fullName.trim()); }
  if (email !== undefined) { fields.push('email = ?'); values.push(email.trim().toLowerCase()); }
  if (isActive !== undefined) { fields.push('is_active = ?'); values.push(Boolean(isActive)); }
  if (password) { fields.push('password_hash = ?'); values.push(await bcrypt.hash(password, 10)); }
  if (role !== undefined) {
    if (!['admin', 'faculty', 'student'].includes(role)) {
      return res.status(400).json({ message: 'Role must be admin, faculty, or student.' });
    }
    fields.push('role = ?');
    values.push(role);
  }

  if (!fields.length) {
    return res.status(400).json({ message: 'No student changes were provided.' });
  }

  try {
    values.push(req.params.id);
    await pool.query(
      `UPDATE users SET ${fields.join(', ')} WHERE user_id = ? AND role IN ('admin', 'faculty', 'student')`,
      values
    );
    return res.json({ updated: true });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ message: 'That email is already registered.' });
    }
    console.error(error);
    return res.status(500).json({ message: 'Unable to update student.' });
  }
});

app.delete('/api/admin/students/:id', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    await pool.query("UPDATE users SET is_active = FALSE WHERE user_id = ? AND role IN ('admin', 'faculty', 'student')", [req.params.id]);
    return res.json({ deactivated: true });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Unable to remove student.' });
  }
});

app.get('/api/admin/requests', requireAuth, requireRole('admin'), async (_req, res) => {
  try {
    const [requests] = await pool.query(
      `SELECT r.request_id, r.user_id, r.request_type, r.subject, r.description, r.status,
              r.created_at, u.full_name AS requester_name, u.email AS requester_email
       FROM requests r JOIN users u ON u.user_id = r.user_id
       WHERE r.status = 'pending' ORDER BY r.created_at DESC`
    );
    return res.json(requests);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Unable to load requests.' });
  }
});

app.patch('/api/admin/requests/:id', requireAuth, requireRole('admin'), async (req, res) => {
  const { status } = req.body;
  if (!['approved', 'rejected'].includes(status)) {
    return res.status(400).json({ message: 'Status must be approved or rejected.' });
  }

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const [rows] = await connection.query(
      'SELECT request_id, request_type, subject, description, user_id FROM requests WHERE request_id = ? FOR UPDATE',
      [req.params.id]
    );
    const request = rows[0];
    if (!request) {
      await connection.rollback();
      return res.status(404).json({ message: 'Request not found.' });
    }

    await connection.query(
      `UPDATE requests SET status = ?, reviewed_by = ?, reviewed_at = CURRENT_TIMESTAMP WHERE request_id = ?`,
      [status, req.user.userId, req.params.id]
    );

    if (status === 'approved' && request.request_type === 'event') {
      await connection.query(
        `INSERT INTO events (title, description, event_date, created_by, status)
         VALUES (?, ?, CURDATE(), ?, 'published')`,
        [request.subject, request.description, req.user.userId]
      );
    }

    await connection.commit();
    return res.json({ status, eventCreated: status === 'approved' && request.request_type === 'event' });
  } catch (error) {
    await connection.rollback();
    console.error(error);
    return res.status(500).json({ message: 'Unable to review request.' });
  } finally {
    connection.release();
  }
});

app.listen(port, () => {
  console.log(`SNMCore backend listening on http://localhost:${port}`);
});
