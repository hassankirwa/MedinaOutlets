# Kobo Scrapper — Outlet Census Platform

A full-stack field data collection platform for running **outlet census campaigns** across Kenya. Distributors and pharma companies use it to plan census projects, assign field collectors to geographic areas, capture outlet records in the field (with GPS and photos), review submissions, and build an authoritative outlet master database.

The workspace name **Kobo Scrapper** reflects the project's origins in Kobo Toolbox data workflows. The live product is a first-party platform — **Kobo-Backend**, **Kobo-Frontend**, and **Kobo-Mobile** — that replaces external form tools with a tailored census workflow.

---

## What the platform does

1. **Admins** create census campaigns (projects), define coverage by county/ward, assign field workers, and publish questionnaires.
2. **Field collectors** use the mobile app to capture outlet details offline — classification, contact info, GPS coordinates, and facility photos.
3. **Supervisors and QA officers** review submissions in the admin dashboard — approve, reject, or request corrections.
4. **Approved outlets** become the official outlet master database, with maps, analytics, and exportable reports.

---

## Architecture

```
                    ┌───────────────────────────┐
                    │   Kobo-Frontend           │
                    │   Next.js Admin Dashboard │
                    │   (Admin + Supervisor UI) │
                    └─────────────┬─────────────┘
                                  │
                                  │  HTTPS / JSON API
                                  │
┌─────────────────────────────────▼─────────────────────────────────┐
│                         Kobo-Backend                               │
│                    Laravel 12 REST API                             │
│                                                                    │
│  Auth · Projects · Branches · Questionnaires · Outlets · Reports  │
│  Validation · Notifications · Spreadsheet Import/Export            │
└─────────────────────────────────┬─────────────────────────────────┘
                                  │
          ┌───────────────────────┼────────────────────────┐
          │                       │                        │
          ▼                       ▼                        ▼
   SQLite / PostgreSQL      Local / S3 Storage          Database Queues
   counties, wards,         facility photos,           notifications,
   outlets, projects        avatars                    background jobs

                                  ▲
                                  │  HTTPS / JSON API
                                  │
                    ┌─────────────┴─────────────┐
                    │   Kobo-Mobile             │
                    │   Expo / React Native     │
                    │   Field Collector App     │
                    │   Offline-first capture   │
                    └───────────────────────────┘
```

| Component | Path | Stack | Purpose |
|-----------|------|-------|---------|
| **API** | `Kobo-Backend/` | Laravel 12, PHP 8.2+, Sanctum | REST API, business logic, data storage |
| **Admin web** | `Kobo-Frontend/` | Next.js 16, React 19, TypeScript, Tailwind 4 | Dashboard for admins, supervisors, and QA |
| **Field app** | `Kobo-Mobile/` | Expo SDK 54, React Native 0.81 | Offline-first outlet data collection |

---

## Kobo-Backend

The Laravel API is the central hub for authentication, multi-tenant workspaces, geographic data, project management, outlet submissions, reporting, and mobile sync.

### Tech stack

- **Laravel 12** with **PHP 8.2+**
- **Laravel Sanctum** for Bearer token authentication (SPA + mobile)
- **SQLite** for local development; **PostgreSQL** (+ PostGIS-ready) for production
- **OpenSpout** for CSV/XLSX import and export
- **Vite + Tailwind CSS** for the default Laravel welcome assets

### Core modules

| Module | Description |
|--------|-------------|
| **Auth & Users** | Login, password reset, role-based access, profile management |
| **Companies** | Multi-tenant workspaces for distributors |
| **Geography** | Kenya counties, sub-counties, and wards |
| **Branches** | Organizational units with geographic coverage |
| **Projects** | Census campaigns with assignments, coverage, and publish workflow |
| **Questionnaires** | Dynamic form schemas (`schema_json`) for outlet data |
| **Outlets** | Primary submission entity — facility data, GPS, photos, approval status |
| **Reports** | Eight report types with CSV/XLSX export |
| **Notifications** | In-app, email, and Expo push notifications |
| **Mobile Sync** | Bootstrap endpoint, ward assignments, idempotent submissions |

### User roles

| Role | Slug | Typical use |
|------|------|-------------|
| Super Admin | `super_admin` | Platform-wide administration |
| Company Admin | `company_admin` | Workspace and org management |
| Campaign Manager | `campaign_manager` | Project planning and publishing |
| Supervisor | `supervisor` | Team oversight |
| QA Officer | `qa_officer` | Submission review and approval |
| Field Collector | `field_collector` | Mobile data capture |
| Viewer | `viewer` | Read-only access |

### Key API areas

All routes are prefixed with `/api`. Protected routes require a Sanctum Bearer token.

- **Auth:** `POST /api/auth/login`, `GET /api/auth/me`, `POST /api/auth/logout`
- **Dashboard:** `GET /api/dashboard/stats`
- **Geography:** `GET /api/counties`
- **Projects:** CRUD, assignments, coverage, analytics, publish
- **Outlets:** Create, list, review, bulk operations, photo streaming, spreadsheet import/export
- **Mobile:** `GET /api/mobile/bootstrap`, `GET /api/my/outlets`, `GET /api/my/ward-assignments`
- **Geocoding:** `GET /api/geocode/reverse` (OpenStreetMap Nominatim)
- **Reports:** `GET /api/reports`, generate and export endpoints
- **Settings:** Profile, company, security, notification preferences

### Getting started

```bash
cd Kobo-Backend
composer install
cp .env.example .env
php artisan key:generate
touch database/database.sqlite   # if using SQLite
php artisan migrate --force
php artisan db:seed              # optional demo data
php artisan storage:link         # required for photos and avatars
```

**Development server:**

```bash
composer run dev    # API + queue worker + logs + Vite concurrently
# OR for mobile LAN access:
php artisan serve --host=0.0.0.0
php artisan queue:listen
```

**Demo credentials** (after `php artisan migrate:fresh --seed`):

| Email | Password | Role |
|-------|----------|------|
| `demo@outlet.com` | `password123` | Company Admin |
| `collector@outlet.com` | `password123` | Field Collector |
| `jane@outlet.com` | `password123` | Field Collector |

---

## Kobo-Frontend

The **Outlet Census** admin dashboard is a Next.js single-page application for managing projects, reviewing submissions, viewing maps, and generating reports.

### Tech stack

- **Next.js 16** (App Router) with **React 19** and **TypeScript 5**
- **Tailwind CSS 4** for styling
- **Recharts** for dashboard analytics
- **Leaflet + react-leaflet** for outlet distribution maps
- **lucide-react** for icons

### Pages and features

| Area | Routes | Features |
|------|--------|----------|
| **Auth** | `/`, `/reset-password/[token]` | Login, password reset, role-based redirect |
| **Dashboard** | `/admin/dashboard` | KPI cards, charts, mini-map, recent submissions |
| **Projects** | `/admin/projects`, `/admin/projects/new`, `/admin/projects/[id]` | List, 5-step creation wizard, workspace tabs (overview, workers, questionnaire, submissions, map, reports, settings) |
| **Submissions** | `/admin/submissions`, `/admin/submissions/[id]` | Global outlet table, bulk actions, spreadsheet import/export |
| **Branches** | `/admin/branches` | Branch CRUD with geographic coverage |
| **Field Workers** | `/admin/field-workers` | Collector management and assignment |
| **Map View** | `/admin/map-view` | Full-screen outlet map with filters |
| **Reports** | `/admin/reports`, `/admin/reports/[type]` | Report catalog, filters, CSV/XLSX export |
| **Settings** | `/admin/settings` | Profile, security, notifications, org config, workflow rules |

Authentication is client-side: Bearer tokens and user profile are stored in `localStorage`. The app calls the Laravel API directly (no Next.js API routes).

### Getting started

```bash
cd Kobo-Frontend
npm install
cp .env.example .env.local
```

Set the API URL in `.env.local`:

```env
NEXT_PUBLIC_API_URL=http://127.0.0.1:8000
```

Start the backend first, then the frontend:

```bash
# Terminal 1 — backend
cd Kobo-Backend && php artisan serve

# Terminal 2 — frontend
cd Kobo-Frontend && npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Log in with `demo@outlet.com` / `password123`.

**Production:**

```bash
npm run build
npm run start
```

---

## Kobo-Mobile

**My Outlets** is the Expo/React Native field collector app. It is built for offline-first outlet data capture in the field, with automatic sync when connectivity returns.

### Tech stack

- **Expo SDK 54** + **React Native 0.81** + **React 19**
- **TypeScript** with manual state-based navigation in `App.tsx`
- **expo-secure-store** for auth tokens
- **expo-file-system** for offline submission queue and drafts
- **expo-location** for GPS capture
- **expo-image-picker** + **expo-image-manipulator** for photos
- **@react-native-community/netinfo** for connectivity monitoring
- **react-native-webview** with Leaflet for map preview
- **EAS Build** for Android/iOS distribution

### Screens

| Screen | Purpose |
|--------|---------|
| **Onboarding** | First-run introduction slides |
| **Login / Forgot Password** | Authentication |
| **Dashboard** | Stats, recent activity, quick actions, sync status |
| **Projects** | Assigned ward projects from bootstrap API |
| **My Submissions** | Searchable list with sync and review status |
| **Submission Details** | Read-only view of a submitted outlet |
| **My Drafts** | Resume or delete incomplete outlet drafts |
| **New Outlet (5 steps)** | Classification → Identity → Location (GPS) → Photos → Review & Submit |
| **Profile** | Avatar, password, notification preferences |
| **Notifications** | In-app notification feed with deep links |

### Key features

- **Offline-first:** Submissions are queued locally when offline and flushed automatically on reconnect.
- **GPS & geocoding:** High-accuracy location capture with server-side reverse geocoding (county/ward derived from coordinates).
- **Photos:** Camera and gallery capture with compression before upload.
- **Drafts:** Incomplete outlet forms can be saved and resumed later.
- **Idempotent sync:** `client_submission_key` prevents duplicate submissions on retry.
- **Push notifications:** Expo push token registration and local sync reminders.

### Getting started

```bash
cd Kobo-Mobile
npm install
npm start          # expo start
npm run android    # Android emulator or device
npm run ios        # iOS simulator or device
```

**Point at a local backend** (physical device or emulator on the same network):

```bash
EXPO_PUBLIC_API_URL=http://<your-lan-ip>:8000 npm start
```

Run Laravel with LAN access:

```bash
cd Kobo-Backend && php artisan serve --host=0.0.0.0
```

> **Note:** The API runs on port **8000**, not 8081 (Metro bundler). `EXPO_PUBLIC_API_URL` is baked in at build time — changing `.env` alone does not affect an already-installed APK until you rebuild.

**Production builds** (EAS):

```bash
eas build --profile development   # dev client
eas build --profile preview       # internal distribution
eas build --profile production    # store release
```

Default production API: `https://outlets.dotcreative.co.ke`

---

## Kobo data utilities

The repository root also contains tooling for working with legacy **Kobo Toolbox** exports.

### `kobo.py`

A Python script that downloads facility photos from Kobo Toolbox export spreadsheets. It uses **Playwright** to authenticate against `kf.kobotoolbox.org`, reads image URLs from an Excel column, and saves files locally.

```bash
# Requires Python venv and dependencies (pandas, playwright, python-dotenv)
source venv/bin/activate   # or venv\Scripts\activate on Windows
pip install pandas playwright python-dotenv openpyxl
playwright install

# Set credentials in .env:
# KOBO_USERNAME=...
# KOBO_PASSWORD=...

python kobo.py
```

### `KoboDocs/`

Sample Kobo Toolbox export spreadsheets used as input for the scraper and for reference during development.

---

## Repository structure

```
Kobo Scrapper/
├── Kobo-Backend/          # Laravel 12 REST API
├── Kobo-Frontend/         # Next.js 16 admin dashboard
├── Kobo-Mobile/           # Expo / React Native field app
├── KoboDocs/              # Kobo Toolbox export samples
├── kobo.py                # Kobo photo download utility
├── brainstorm.md          # Product design and architecture notes
├── deployment.md          # Production deployment guide (Ubuntu)
├── venv/                  # Python virtual environment (kobo.py)
└── README.md              # This file
```

---

## Environment variables

| Component | Variable | Default | Purpose |
|-----------|----------|---------|---------|
| **Backend** | `APP_URL` | `http://localhost` | API origin |
| **Backend** | `FRONTEND_URL` | — | Password reset links for the admin SPA |
| **Backend** | `DB_CONNECTION` | `sqlite` | Database driver (`sqlite` or `pgsql`) |
| **Backend** | `QUEUE_CONNECTION` | `database` | Background jobs (run `queue:listen`) |
| **Frontend** | `NEXT_PUBLIC_API_URL` | `http://127.0.0.1:8000` | Laravel API base URL |
| **Mobile** | `EXPO_PUBLIC_API_URL` | `https://outlets.dotcreative.co.ke` | API URL (build-time) |
| **kobo.py** | `KOBO_USERNAME` | — | Kobo Toolbox login |
| **kobo.py** | `KOBO_PASSWORD` | — | Kobo Toolbox password |

---

## Deployment

See [`deployment.md`](deployment.md) for a full production guide covering:

- Ubuntu server setup (PHP 8.2+, Nginx, Node.js, PostgreSQL)
- Laravel backend deployment and migrations
- Next.js frontend build and serve
- Android APK builds via EAS / Android Studio
- HTTPS configuration and environment wiring

**Recommended production URLs:**

- API: `https://api.example.com`
- Admin: `https://app.example.com`
- Mobile: set `EXPO_PUBLIC_API_URL` to the API URL before building

---

## Development workflow

A typical local development setup uses three terminals:

```bash
# 1. Backend API + queue worker
cd Kobo-Backend
composer run dev

# 2. Admin dashboard
cd Kobo-Frontend
npm run dev

# 3. Mobile app (optional)
cd Kobo-Mobile
EXPO_PUBLIC_API_URL=http://<lan-ip>:8000 npm start
```

1. Seed the database (`php artisan db:seed`) for demo users and sample data.
2. Log into the admin dashboard at `http://localhost:3000` with `demo@outlet.com`.
3. Log into the mobile app with `collector@outlet.com` to test field submission.
4. Review submitted outlets in the admin **Submissions** or **Project** tabs.

---

## External services

| Service | Used by | Purpose |
|---------|---------|---------|
| **OpenStreetMap Nominatim** | Backend | Reverse geocoding (GPS → county/ward) |
| **Expo Push API** | Backend → Mobile | Push notifications to field collectors |
| **Kobo Toolbox** | `kobo.py` only | Legacy data export and photo download |

---

## License

This project is private. See individual component directories for framework licenses (Laravel, Next.js, Expo).
