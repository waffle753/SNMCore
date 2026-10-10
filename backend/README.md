# SNMCore backend

## Setup

1. Run the MySQL schema from the previous setup in MySQL Workbench. The backend expects `users`, `events`, and `announcements` tables.
2. Copy `.env.example` to `.env` and set the MySQL password and a strong `JWT_SECRET`.
3. Apply the admin event-management migration once:

```powershell
cd backend
npm run migrate:admin-events
```

This adds scheduling and facility/area fields to the existing `events` table; it does not replace the existing `facilities` or `areas` tables.
4. Apply the faculty event-request migration once:

```powershell
cd backend
npm run migrate:faculty-event-requests
```

This adds structured schedule and location fields to existing event requests so that approved faculty requests become fully scheduled events.
5. Link student information records to student accounts:

```powershell
cd backend
npm run migrate:student-information
```

New student accounts created by an admin require personal and academic information. Students can view and update these fields under Profile > Personal Information.
6. Start the API:

```powershell
cd backend
npm start
```

The API runs on `http://localhost:4000` by default.

Set the Expo app API URL when the backend is not running on the same device:

```powershell
$env:EXPO_PUBLIC_API_URL="http://YOUR-COMPUTER-IP:4000"
npm start
```

## Accounts

The login screen sends the email and password to `/api/auth/login`. The returned role routes the user to:

- `admin`: `/admin`
- `faculty`: `/faculty`
- `student`: `/student`

Admins create and manage official events; faculty can submit event requests and view their own request statuses. Admins can review all requests, and approving a scheduled faculty event request adds the requested event to the official calendar. Faculty and students cannot create or edit official events. All roles can update their own name, email, and password. Student accounts also have linked personal, address, and academic information; admins enter it when creating a student account, and students can update it from Personal Information.

## API summary

- `POST /api/auth/login`
- `GET /api/health`
- `GET /api/events` (authenticated)
- `GET /api/profile` and `PATCH /api/profile` (authenticated)
- `GET /api/event-requests/mine` and `POST /api/event-requests` (faculty)
- `GET /api/facilities` and `GET /api/facilities/:facilityId/areas` (admin/faculty; areas are scoped to the selected facility)
- `GET /api/announcements` (authenticated and filtered by audience)
- `POST /api/announcements` (admin/faculty)
