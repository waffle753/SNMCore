# SNMCore backend

## Setup

1. Run the MySQL schema from the previous setup in MySQL Workbench. The backend expects `users`, `events`, and `announcements` tables.
2. Copy `.env.example` to `.env` and set the MySQL password and a strong `JWT_SECRET`.
3. Start the API:

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

Admin and faculty can create events and announcements through the protected API. Student accounts are read-only. Creating an event can also create its announcement in the same database transaction by including `announcementMessage` in the event request.

## API summary

- `POST /api/auth/login`
- `GET /api/health`
- `GET /api/events` (authenticated)
- `POST /api/events` (admin/faculty)
- `GET /api/announcements` (authenticated and filtered by audience)
- `POST /api/announcements` (admin/faculty)
