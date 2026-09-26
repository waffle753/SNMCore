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

const parseEventSchedule = ({ startDate, startTime, endDate, endTime }) => {
  const datePattern = /^\d{4}-\d{2}-\d{2}$/;
  const timePattern = /^([01]\d|2[0-3]):[0-5]\d$/;
  const validDate = (value) => {
    if (typeof value !== 'string' || !datePattern.test(value)) return false;
    const [year, month, day] = value.split('-').map(Number);
    const parsed = new Date(Date.UTC(year, month - 1, day));
    return parsed.getUTCFullYear() === year && parsed.getUTCMonth() === month - 1 && parsed.getUTCDate() === day;
  };
  if (![startDate, endDate].every(validDate) ||
      ![startTime, endTime].every((value) => typeof value === 'string' && timePattern.test(value))) {
    return { error: 'Enter valid start and end dates and times.' };
  }

  const start = `${startDate} ${startTime}:00`;
  const end = `${endDate} ${endTime}:00`;
  if (start >= end) {
    return { error: 'End date and time must be later than start date and time.' };
  }
  return { start, end };
};

const normalizeEventInput = (body) => {
  const eventName = typeof body.eventName === 'string' ? body.eventName.trim() : '';
  const locationType = typeof body.locationType === 'string' ? body.locationType.toLowerCase() : '';
  const spaceType = typeof body.spaceType === 'string' ? body.spaceType : '';
  const facilityId = body.facilityId == null || body.facilityId === '' ? null : Number(body.facilityId);
  const areaId = body.areaId == null || body.areaId === '' ? null : Number(body.areaId);
  const locationName = typeof body.locationName === 'string' ? body.locationName.trim() : '';
  const expectedAttendees = body.expectedAttendees == null || body.expectedAttendees === ''
    ? null
    : Number(body.expectedAttendees);

  if (!eventName) return { error: 'Event name is required.' };
  if (!['indoor', 'outdoor', 'off_campus'].includes(locationType)) {
    return { error: 'Select Indoor, Outdoor, or Off Campus as the location type.' };
  }
  if (locationType === 'indoor') {
    if (!Number.isInteger(facilityId) || facilityId < 1) return { error: 'Select a facility.' };
    if (!['specific_area', 'entire_facility'].includes(spaceType)) return { error: 'Select a booking type.' };
    if (spaceType === 'specific_area' && (!Number.isInteger(areaId) || areaId < 1)) {
      return { error: 'Select an area.' };
    }
  } else if (!locationName) {
    return { error: 'Enter a location name.' };
  }
  if (expectedAttendees !== null && (!Number.isInteger(expectedAttendees) || expectedAttendees < 0)) {
    return { error: 'Expected attendees must be a non-negative whole number.' };
  }
  return {
    eventName,
    purpose: typeof body.purpose === 'string' && body.purpose.trim() ? body.purpose.trim() : null,
    expectedAttendees,
    locationType,
    facilityId: locationType === 'indoor' ? facilityId : null,
    areaId: locationType === 'indoor' && spaceType === 'specific_area' ? areaId : null,
    spaceType: locationType === 'indoor' ? spaceType : null,
    locationName: locationType === 'indoor' ? null : locationName,
    startDate: body.startDate,
    startTime: body.startTime,
    endDate: body.endDate,
    endTime: body.endTime,
  };
};

const findEventConflict = async (connection, event, start, end, excludedEventId = null) => {
  const params = [end, start];
  let resourceClause;
  if (event.locationType === 'indoor') {
    resourceClause = `location_type = 'indoor' AND facility_id = ? AND
      (space_type = 'entire_facility' OR ? = 'entire_facility' OR area_id = ?)`;
    params.push(event.facilityId, event.spaceType, event.areaId);
  } else {
    resourceClause = `location_type IN ('outdoor', 'off_campus') AND LOWER(TRIM(location_name)) = LOWER(TRIM(?))`;
    params.push(event.locationName);
  }

  let excludeClause = '';
  if (excludedEventId !== null) {
    excludeClause = ' AND event_id <> ?';
    params.push(excludedEventId);
  }

  const [rows] = await connection.query(
    `SELECT event_id FROM events
     WHERE status IN ('scheduled', 'ongoing')
       AND start_datetime < ? AND end_datetime > ?
       AND ${resourceClause}${excludeClause}
     LIMIT 1 FOR UPDATE`,
    params
  );
  return rows[0] || null;
};

const withScheduleLock = async (connection) => {
  const [rows] = await connection.query("SELECT GET_LOCK('snmcore_event_schedule', 10) AS acquired");
  if (rows[0]?.acquired !== 1) throw new Error('Unable to lock the event schedule. Please try again.');
};

const releaseScheduleLock = async (connection) => {
  await connection.query("SELECT RELEASE_LOCK('snmcore_event_schedule')");
};

const loadAdminEvents = async (connection, search = '') => {
  const searchTerm = `%${search}%`;
  const [rows] = await connection.query(
    `SELECT e.event_id, e.request_id, COALESCE(e.event_name, e.title) AS event_name,
            e.description, e.purpose, e.expected_attendees, e.location_type,
            e.facility_id, f.facility_name, e.area_id, a.area_name, e.space_type,
            e.location_name, e.location, e.start_datetime, e.end_datetime,
            e.event_date, e.start_time, e.end_time, e.status, e.created_by,
            u.full_name AS created_by_name, e.created_at, e.updated_at
     FROM events e
     LEFT JOIN facilities f ON f.facility_id = e.facility_id
     LEFT JOIN areas a ON a.area_id = e.area_id
     LEFT JOIN users u ON u.user_id = e.created_by
    WHERE (? = '' OR COALESCE(e.event_name, e.title) LIKE ? OR e.location_name LIKE ? OR e.location LIKE ? OR f.facility_name LIKE ? OR a.area_name LIKE ?)
     ORDER BY COALESCE(e.start_datetime, TIMESTAMP(e.event_date, e.start_time)) DESC`,
      [search, searchTerm, searchTerm, searchTerm, searchTerm, searchTerm]
  );
  return rows;
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
      `SELECT event_id, COALESCE(event_name, title) AS event_name,
              COALESCE(start_datetime, TIMESTAMP(event_date, start_time)) AS start_datetime,
              COALESCE(end_datetime, TIMESTAMP(event_date, end_time)) AS end_datetime,
              e.location_type, e.facility_id, e.area_id, e.space_type,
              COALESCE(e.location_name, e.location) AS location_name,
              f.facility_name, a.area_name,
              e.status
            FROM events e
            LEFT JOIN facilities f ON f.facility_id = e.facility_id
            LEFT JOIN areas a ON a.area_id = e.area_id
      WHERE e.status IN ('scheduled', 'ongoing')
            ORDER BY e.start_datetime`
    );
    return res.json(events);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Unable to load events.' });
  }
});

app.get('/api/admin/facilities', requireAuth, requireRole('admin'), async (_req, res) => {
  try {
    const includeInactive = _req.query.includeInactive === 'true';
    const [facilities] = await pool.query(
      `SELECT facility_id, facility_name, description, status
       FROM facilities ${includeInactive ? '' : "WHERE status = 'active'"}
       ORDER BY facility_name`
    );
    return res.json(facilities);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Unable to load facilities.' });
  }
});

app.post('/api/admin/facilities', requireAuth, requireRole('admin'), async (req, res) => {
  const facilityName = typeof req.body.facilityName === 'string' ? req.body.facilityName.trim() : '';
  const description = typeof req.body.description === 'string' && req.body.description.trim()
    ? req.body.description.trim()
    : null;
  if (!facilityName) return res.status(400).json({ message: 'Facility name is required.' });
  if (facilityName.length > 150) return res.status(400).json({ message: 'Facility name must be 150 characters or fewer.' });

  try {
    const [existing] = await pool.query(
      'SELECT facility_id FROM facilities WHERE LOWER(TRIM(facility_name)) = LOWER(TRIM(?)) LIMIT 1',
      [facilityName]
    );
    if (existing.length) return res.status(409).json({ message: 'A facility with this name already exists.' });
    const [result] = await pool.query(
      "INSERT INTO facilities (facility_name, description, status) VALUES (?, ?, 'active')",
      [facilityName, description]
    );
    return res.status(201).json({ facilityId: result.insertId, facilityName, status: 'active' });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') return res.status(409).json({ message: 'A facility with this name already exists.' });
    console.error(error);
    return res.status(500).json({ message: 'Unable to create facility.' });
  }
});

app.patch('/api/admin/facilities/:facilityId', requireAuth, requireRole('admin'), async (req, res) => {
  const facilityId = Number(req.params.facilityId);
  if (!Number.isInteger(facilityId) || facilityId < 1) return res.status(400).json({ message: 'Invalid facility.' });
  const updates = [];
  const values = [];
  if (req.body.facilityName !== undefined) {
    const facilityName = typeof req.body.facilityName === 'string' ? req.body.facilityName.trim() : '';
    if (!facilityName) return res.status(400).json({ message: 'Facility name is required.' });
    if (facilityName.length > 150) return res.status(400).json({ message: 'Facility name must be 150 characters or fewer.' });
    updates.push('facility_name = ?');
    values.push(facilityName);
  }
  if (req.body.description !== undefined) {
    updates.push('description = ?');
    values.push(typeof req.body.description === 'string' && req.body.description.trim() ? req.body.description.trim() : null);
  }
  if (req.body.status !== undefined) {
    if (!['active', 'inactive'].includes(req.body.status)) return res.status(400).json({ message: 'Status must be active or inactive.' });
    updates.push('status = ?');
    values.push(req.body.status);
  }
  if (!updates.length) return res.status(400).json({ message: 'Provide a facility name, description, or status to update.' });

  try {
    values.push(facilityId);
    const [result] = await pool.query(`UPDATE facilities SET ${updates.join(', ')} WHERE facility_id = ?`, values);
    if (!result.affectedRows) return res.status(404).json({ message: 'Facility not found.' });
    return res.json({ facilityId, updated: true });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') return res.status(409).json({ message: 'A facility with this name already exists.' });
    console.error(error);
    return res.status(500).json({ message: 'Unable to update facility.' });
  }
});

app.get('/api/admin/facilities/:facilityId/areas', requireAuth, requireRole('admin'), async (req, res) => {
  const facilityId = Number(req.params.facilityId);
  if (!Number.isInteger(facilityId) || facilityId < 1) {
    return res.status(400).json({ message: 'Invalid facility.' });
  }
  try {
    const [areas] = await pool.query(
      `SELECT a.area_id, a.area_name
       FROM areas a JOIN facilities f ON f.facility_id = a.facility_id
       WHERE a.facility_id = ? AND a.status = 'active' AND f.status = 'active'
       ORDER BY a.area_name`,
      [facilityId]
    );
    return res.json(areas);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Unable to load facility areas.' });
  }
});

app.get('/api/admin/areas', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    const includeInactive = req.query.includeInactive === 'true';
    const [areas] = await pool.query(
      `SELECT a.area_id, a.facility_id, a.area_name, a.description, a.status, f.facility_name
       FROM areas a JOIN facilities f ON f.facility_id = a.facility_id
       ${includeInactive ? '' : "WHERE a.status = 'active' AND f.status = 'active'"}
       ORDER BY f.facility_name, a.area_name`
    );
    return res.json(areas);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Unable to load areas.' });
  }
});

app.post('/api/admin/areas', requireAuth, requireRole('admin'), async (req, res) => {
  const facilityId = Number(req.body.facilityId);
  const areaName = typeof req.body.areaName === 'string' ? req.body.areaName.trim() : '';
  const description = typeof req.body.description === 'string' && req.body.description.trim()
    ? req.body.description.trim()
    : null;
  if (!Number.isInteger(facilityId) || facilityId < 1) return res.status(400).json({ message: 'Select a facility.' });
  if (!areaName) return res.status(400).json({ message: 'Area name is required.' });
  if (areaName.length > 150) return res.status(400).json({ message: 'Area name must be 150 characters or fewer.' });

  try {
    const [facilities] = await pool.query("SELECT facility_id FROM facilities WHERE facility_id = ? AND status = 'active'", [facilityId]);
    if (!facilities.length) return res.status(400).json({ message: 'Select an active facility.' });
    const [existing] = await pool.query(
      'SELECT area_id FROM areas WHERE facility_id = ? AND LOWER(TRIM(area_name)) = LOWER(TRIM(?)) LIMIT 1',
      [facilityId, areaName]
    );
    if (existing.length) return res.status(409).json({ message: 'This area already exists in the selected facility.' });
    const [result] = await pool.query(
      "INSERT INTO areas (facility_id, area_name, description, status) VALUES (?, ?, ?, 'active')",
      [facilityId, areaName, description]
    );
    return res.status(201).json({ areaId: result.insertId, facilityId, areaName, status: 'active' });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Unable to create area.' });
  }
});

app.patch('/api/admin/areas/:areaId', requireAuth, requireRole('admin'), async (req, res) => {
  const areaId = Number(req.params.areaId);
  if (!Number.isInteger(areaId) || areaId < 1) return res.status(400).json({ message: 'Invalid area.' });
  const updates = [];
  const values = [];
  if (req.body.areaName !== undefined) {
    const areaName = typeof req.body.areaName === 'string' ? req.body.areaName.trim() : '';
    if (!areaName) return res.status(400).json({ message: 'Area name is required.' });
    if (areaName.length > 150) return res.status(400).json({ message: 'Area name must be 150 characters or fewer.' });
    updates.push('area_name = ?');
    values.push(areaName);
  }
  if (req.body.description !== undefined) {
    updates.push('description = ?');
    values.push(typeof req.body.description === 'string' && req.body.description.trim() ? req.body.description.trim() : null);
  }
  if (req.body.status !== undefined) {
    if (!['active', 'inactive'].includes(req.body.status)) return res.status(400).json({ message: 'Status must be active or inactive.' });
    updates.push('status = ?');
    values.push(req.body.status);
  }
  if (!updates.length) return res.status(400).json({ message: 'Provide an area name, description, or status to update.' });
  try {
    values.push(areaId);
    const [result] = await pool.query(`UPDATE areas SET ${updates.join(', ')} WHERE area_id = ?`, values);
    if (!result.affectedRows) return res.status(404).json({ message: 'Area not found.' });
    return res.json({ areaId, updated: true });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Unable to update area.' });
  }
});

app.get('/api/admin/events', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    const events = await loadAdminEvents(pool, typeof req.query.search === 'string' ? req.query.search.trim() : '');
    return res.json(events);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Unable to load events.' });
  }
});

app.get('/api/admin/events/:id', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    const events = await loadAdminEvents(pool);
    const event = events.find((item) => Number(item.event_id) === Number(req.params.id));
    if (!event) return res.status(404).json({ message: 'Event not found.' });
    return res.json(event);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Unable to load event details.' });
  }
});

const saveAdminEvent = async (req, res, eventId = null) => {
  const event = normalizeEventInput(req.body);
  if (event.error) return res.status(400).json({ message: event.error });
  const schedule = parseEventSchedule(event);
  if (schedule.error) return res.status(400).json({ message: schedule.error });

  const connection = await pool.getConnection();
  let lockAcquired = false;
  let savedStatus = 'scheduled';
  try {
    await connection.beginTransaction();
    await withScheduleLock(connection);
    lockAcquired = true;

    if (event.locationType === 'indoor') {
      const [facilities] = await connection.query(
        "SELECT facility_id FROM facilities WHERE facility_id = ? AND status = 'active' FOR UPDATE",
        [event.facilityId]
      );
      if (!facilities.length) {
        await connection.rollback();
        return res.status(400).json({ message: 'Select an active facility.' });
      }
      if (event.spaceType === 'specific_area') {
        const [areas] = await connection.query(
          "SELECT area_id FROM areas WHERE area_id = ? AND facility_id = ? AND status = 'active' FOR UPDATE",
          [event.areaId, event.facilityId]
        );
        if (!areas.length) {
          await connection.rollback();
          return res.status(400).json({ message: 'Select an active area belonging to this facility.' });
        }
      }
    }

    if (eventId !== null) {
      const [currentRows] = await connection.query(
        'SELECT event_id, status FROM events WHERE event_id = ? FOR UPDATE',
        [eventId]
      );
      if (!currentRows.length) {
        await connection.rollback();
        return res.status(404).json({ message: 'Event not found.' });
      }
      if (currentRows[0].status === 'cancelled') {
        await connection.rollback();
        return res.status(400).json({ message: 'Cancelled events cannot be edited.' });
      }
      savedStatus = currentRows[0].status;
    }

    const conflict = await findEventConflict(connection, event, schedule.start, schedule.end, eventId);
    if (conflict) {
      await connection.rollback();
      const message = event.locationType === 'indoor'
        ? 'This area is already booked during the selected time.'
        : 'This location is already booked during the selected time.';
      return res.status(409).json({ message });
    }

    const legacyLocation = event.locationType === 'indoor'
      ? (event.areaId ? null : 'Entire facility')
      : event.locationName;
    const values = [
      event.eventName,
      event.eventName,
      event.purpose,
      event.purpose,
      event.locationType,
      event.facilityId,
      event.areaId,
      event.spaceType,
      event.locationName,
      schedule.start,
      schedule.end,
      event.startDate,
      event.startTime,
      event.endTime,
      legacyLocation,
      event.expectedAttendees,
    ];

    if (eventId === null) {
      const [result] = await connection.query(
        `INSERT INTO events
          (request_id, event_name, title, description, purpose, location_type, facility_id,
           area_id, space_type, location_name, start_datetime, end_datetime, event_date,
           start_time, end_time, location, expected_attendees, created_by, status)
         VALUES (NULL, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'scheduled')`,
        [...values, req.user.userId]
      );
      await connection.commit();
      return res.status(201).json({ eventId: result.insertId, status: 'scheduled' });
    }

    await connection.query(
      `UPDATE events SET event_name = ?, title = ?, description = ?, purpose = ?,
        location_type = ?, facility_id = ?, area_id = ?, space_type = ?, location_name = ?,
        start_datetime = ?, end_datetime = ?, event_date = ?, start_time = ?, end_time = ?,
        location = ?, expected_attendees = ?
       WHERE event_id = ?`,
      [...values, eventId]
    );
    await connection.commit();
    return res.json({ eventId: Number(eventId), status: savedStatus });
  } catch (error) {
    await connection.rollback();
    console.error(error);
    return res.status(500).json({ message: 'Unable to save event.' });
  } finally {
    if (lockAcquired) {
      try { await releaseScheduleLock(connection); } catch (error) { console.error(error); }
    }
    connection.release();
  }
};

app.post('/api/admin/events', requireAuth, requireRole('admin'), (req, res) => saveAdminEvent(req, res));
app.put('/api/admin/events/:id', requireAuth, requireRole('admin'), (req, res) => {
  const eventId = Number(req.params.id);
  if (!Number.isInteger(eventId) || eventId < 1) return res.status(400).json({ message: 'Invalid event.' });
  return saveAdminEvent(req, res, eventId);
});

app.patch('/api/admin/events/:id/cancel', requireAuth, requireRole('admin'), async (req, res) => {
  const eventId = Number(req.params.id);
  if (!Number.isInteger(eventId) || eventId < 1) return res.status(400).json({ message: 'Invalid event.' });
  try {
    const [result] = await pool.query(
      "UPDATE events SET status = 'cancelled' WHERE event_id = ? AND status <> 'cancelled'",
      [eventId]
    );
    if (!result.affectedRows) return res.status(404).json({ message: 'Event not found or already cancelled.' });
    return res.json({ eventId, status: 'cancelled' });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Unable to cancel event.' });
  }
});

app.post('/api/events', requireAuth, (_req, res) => res.status(410).json({
  message: 'Use the admin event management endpoint to create scheduled events.',
}));

app.get('/api/announcements', requireAuth, async (req, res) => {
  try {
    const [announcements] = await pool.query(
      `SELECT announcement_id, title, message, external_url, audience, event_id, created_by, published_at
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

app.get('/api/admin/announcements', requireAuth, requireRole('admin'), async (_req, res) => {
  try {
    const [announcements] = await pool.query(
      `SELECT a.announcement_id, a.title, a.message, a.external_url, a.audience, a.event_id,
              a.created_by, u.full_name AS created_by_name, a.status,
              a.published_at, a.created_at, a.updated_at
       FROM announcements a LEFT JOIN users u ON u.user_id = a.created_by
       ORDER BY a.created_at DESC`
    );
    return res.json(announcements);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Unable to load announcements.' });
  }
});

app.patch('/api/admin/announcements/:id', requireAuth, requireRole('admin'), async (req, res) => {
  const announcementId = Number(req.params.id);
  if (!Number.isInteger(announcementId) || announcementId < 1) return res.status(400).json({ message: 'Invalid announcement.' });
  const updates = [];
  const values = [];
  if (req.body.title !== undefined) {
    const title = typeof req.body.title === 'string' ? req.body.title.trim() : '';
    if (!title) return res.status(400).json({ message: 'Announcement title is required.' });
    if (title.length > 200) return res.status(400).json({ message: 'Title must be 200 characters or fewer.' });
    updates.push('title = ?');
    values.push(title);
  }
  if (req.body.message !== undefined) {
    const message = typeof req.body.message === 'string' ? req.body.message.trim() : '';
    if (!message) return res.status(400).json({ message: 'Announcement message is required.' });
    updates.push('message = ?');
    values.push(message);
  }
  if (req.body.externalUrl !== undefined) {
    const externalUrl = typeof req.body.externalUrl === 'string' ? req.body.externalUrl.trim() : '';
    if (externalUrl) {
      let parsedUrl;
      try { parsedUrl = new URL(externalUrl); } catch { return res.status(400).json({ message: 'Enter a valid http or https link.' }); }
      if (!['http:', 'https:'].includes(parsedUrl.protocol)) return res.status(400).json({ message: 'Links must start with http:// or https://.' });
      updates.push('external_url = ?');
      values.push(parsedUrl.toString());
    } else {
      updates.push('external_url = NULL');
    }
  }
  if (req.body.audience !== undefined) {
    if (!['all', 'faculty', 'student'].includes(req.body.audience)) return res.status(400).json({ message: 'Audience must be all, faculty, or student.' });
    updates.push('audience = ?');
    values.push(req.body.audience);
  }
  if (req.body.status !== undefined) {
    if (!['draft', 'published', 'archived'].includes(req.body.status)) return res.status(400).json({ message: 'Status must be draft, published, or archived.' });
    updates.push('status = ?');
    values.push(req.body.status);
    if (req.body.status === 'published') updates.push('published_at = COALESCE(published_at, CURRENT_TIMESTAMP)');
  }
  if (!updates.length) return res.status(400).json({ message: 'Provide announcement fields to update.' });
  try {
    values.push(announcementId);
    const [result] = await pool.query(`UPDATE announcements SET ${updates.join(', ')} WHERE announcement_id = ?`, values);
    if (!result.affectedRows) return res.status(404).json({ message: 'Announcement not found.' });
    return res.json({ announcementId, updated: true });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Unable to update announcement.' });
  }
});

app.post('/api/announcements', requireAuth, requireRole('admin', 'faculty'), async (req, res) => {
  const { title, message, audience = 'all', eventId = null } = req.body;
  const externalUrl = typeof req.body.externalUrl === 'string' ? req.body.externalUrl.trim() : '';

  if (!title || !message) {
    return res.status(400).json({ message: 'Title and message are required.' });
  }
  if (externalUrl) {
    let parsedUrl;
    try { parsedUrl = new URL(externalUrl); } catch { return res.status(400).json({ message: 'Enter a valid http or https link.' }); }
    if (!['http:', 'https:'].includes(parsedUrl.protocol)) return res.status(400).json({ message: 'Links must start with http:// or https://.' });
  }

  try {
    const [result] = await pool.query(
      `INSERT INTO announcements (title, message, external_url, audience, event_id, created_by, published_at)
       VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
      [title, message, externalUrl || null, audience, eventId, req.user.userId]
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
