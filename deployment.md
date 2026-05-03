# Kobo deployment guide

This document walks through pointing **Kobo-Mobile** at a **live API**, building an **Android APK** (via **Android Studio** after generating native projects), and running **Kobo-Backend** (Laravel) and **Kobo-Frontend** (Next.js) on an **Ubuntu** server.

**Repos in this workspace**

| Component        | Path           | Stack                          |
|----------------|----------------|--------------------------------|
| API            | `Kobo-Backend` | Laravel 12, PHP **8.2+**       |
| Admin web      | `Kobo-Frontend`| Next.js                        |
| Field worker app | `Kobo-Mobile`| Expo SDK 54 / React Native     |

The mobile app reads the API base URL from **`EXPO_PUBLIC_API_URL`** at **build time** (see `Kobo-Mobile/app.config.js`), which is exposed to the app as `expoConfig.extra.apiUrl` and used in `Kobo-Mobile/src/api/client.ts` (`getApiBase()`). Changing `.env` alone does not affect an already-installed APK until you rebuild.

---

## 1. Choose your production URLs

Decide stable URLs before you configure clients, for example:

- **API**: `https://api.example.com` (Laravel `public/` behind Nginx)
- **Admin frontend**: `https://app.example.com` (Next.js)

Use **HTTPS** for production. Android restricts cleartext HTTP; if you must use HTTP temporarily (lab only), you need extra Android manifest settings after prebuild (see section 6).

---

## 2. Ubuntu server: base setup

On a fresh **Ubuntu 22.04/24.04 LTS** server (as root or with `sudo`):

1. **Update and install tooling**

   ```bash
   sudo apt update && sudo apt upgrade -y
   sudo apt install -y git curl unzip nginx
   ```

2. **Install PHP 8.2+ and extensions** (adjust version if your distro’s packages differ)

   ```bash
   sudo apt install -y php8.2-fpm php8.2-cli php8.2-mbstring php8.2-xml php8.2-curl \
     php8.2-zip php8.2-sqlite3 php8.2-pgsql php8.2-mysql php8.2-bcmath
   ```

3. **Install Composer** (official installer from [getcomposer.org](https://getcomposer.org/download/))

4. **Install Node.js LTS** (e.g. via [NodeSource](https://github.com/nodesource/distributions) or `nvm`) for building/running the Next.js app

5. **Database**  
   - For production, prefer **PostgreSQL** or **MySQL** over SQLite.  
   - Create a database and user; you will put credentials in Laravel `.env`.

6. **Firewall** (example with UFW)

   ```bash
   sudo ufw allow OpenSSH
   sudo ufw allow 'Nginx Full'
   sudo ufw enable
   ```

---

## 3. Deploy Kobo-Backend (Laravel API)

1. **Clone the project** (or upload files) to e.g. `/var/www/kobo/Kobo-Backend`

2. **Install dependencies**

   ```bash
   cd /var/www/kobo/Kobo-Backend
   composer install --no-dev --optimize-autoloader
   ```

3. **Environment**

   ```bash
   cp .env.example .env
   php artisan key:generate
   ```

   Edit `.env` for production, including at minimum:

   - `APP_NAME`, `APP_ENV=production`, `APP_DEBUG=false`
   - `APP_URL=https://api.example.com` (your real API URL)
   - `DB_*` for your database (not SQLite if you use Postgres/MySQL)
   - `FRONTEND_URL=https://app.example.com` (your Next.js URL; used where the backend references the admin SPA)
   - Mail settings if you use password reset / notifications

   Run:

   ```bash
   php artisan migrate --force
   ```

4. **Storage and permissions**

   ```bash
   php artisan storage:link
   sudo chown -R www-data:www-data storage bootstrap/cache
   sudo chmod -R ug+rwx storage bootstrap/cache
   ```

5. **Optimize**

   ```bash
   php artisan config:cache
   php artisan route:cache
   php artisan view:cache
   ```

6. **Queue and scheduler** (your project uses `QUEUE_CONNECTION=database` in `.env.example`)

   - Run a **queue worker** under **systemd** or **Supervisor**, e.g. `php artisan queue:work --sleep=3 --tries=3`
   - Add a **cron** entry: `* * * * * cd /var/www/kobo/Kobo-Backend && php artisan schedule:run >> /dev/null 2>&1`

7. **Nginx site for the API** (example; replace paths and `server_name`)

   Point the site root to Laravel’s `public` directory and pass PHP to `php8.2-fpm`. Ensure large enough `client_max_body_size` if outlet photo uploads are big.

   After changing Nginx: `sudo nginx -t && sudo systemctl reload nginx`

8. **TLS**  
   Use **Let’s Encrypt** (`certbot` with the Nginx plugin) for `api.example.com`.

9. **Reverse proxy**  
   If Laravel sits behind Nginx/Cloudflare, ensure forwarded headers are trusted so `APP_URL`, redirects, and generated URLs stay correct. In Laravel 11+, configure **TrustProxies** in `bootstrap/app.php` if needed for your deployment (see Laravel docs for your version).

---

## 4. Deploy Kobo-Frontend (Next.js admin)

1. **Build on the server or in CI**, then run with **Node** (or ship a Docker image). Example on the server:

   ```bash
   cd /var/www/kobo/Kobo-Frontend
   npm ci
   ```

2. **Environment**  
   Create `.env.production` (or `.env`) with:

   ```bash
   NEXT_PUBLIC_API_URL=https://api.example.com
   ```

   This matches how the frontend expects the Laravel base URL (see `Kobo-Frontend/.env.example`).

3. **Build and run**

   ```bash
   npm run build
   ```

   Run in production with **PM2**, **systemd**, or `next start` behind Nginx:

   ```bash
   NODE_ENV=production npm run start
   ```

   Bind to a local port (e.g. `3000`) and **proxy** `https://app.example.com` to that port via Nginx. Obtain TLS for `app.example.com` with Certbot.

4. **Images**  
   If the API returns absolute image URLs from your domain, add those hostnames to `images.remotePatterns` in `Kobo-Frontend/next.config.ts` if Next/Image blocks them.

---

## 5. Mobile app: point the API to the live server

The mobile client uses `getApiBase()` in `src/api/client.ts`, which prefers `Constants.expoConfig?.extra?.apiUrl` from `app.config.js`.

1. On the machine where you **build** the release, set:

   ```bash
   export EXPO_PUBLIC_API_URL=https://api.example.com
   ```

   Or put the same line in `Kobo-Mobile/.env` and ensure your build process loads it (Expo loads `.env` for `EXPO_PUBLIC_*` during `expo start` / `eas build` / `expo prebuild` when using the standard Expo env flow).

2. **No trailing slash** on the URL (the client strips one trailing slash in code).

3. Rebuild the native app after any change to this variable; the URL is **baked into the release binary**.

---

## 6. Move from “Expo Go only” to Android Studio + APK

You do **not** have to remove Expo libraries to ship a store-ready app. The usual approach is **Expo prebuild**: generate an `android/` folder, open it in **Android Studio**, then build a signed **APK** or **AAB**.

### 6.1 Prerequisites (Windows or macOS — where you build Android)

- **Android Studio** (latest stable) with Android SDK, SDK Platform, and Build-Tools installed  
- **JDK 17** (Android Studio bundles one; use that for Gradle)  
- **Node.js** and npm

### 6.2 Configure the Android application id

Before the first prebuild, set a unique package name so the app can be published and updated, e.g. in `Kobo-Mobile/app.json` under `expo.android`:

```json
"package": "com.yourcompany.kobo"
```

Commit this; it should stay stable across releases.

### 6.3 Set production API URL and generate native project

From `Kobo-Mobile`:

```bash
cd Kobo-Mobile
npm install
set EXPO_PUBLIC_API_URL=https://api.example.com
npx expo prebuild --platform android --clean
```

On macOS/Linux use `export EXPO_PUBLIC_API_URL=...` instead of `set`.

This creates `Kobo-Mobile/android/`. You can add `android/` to **git** or regenerate with prebuild in CI; teams often commit it for reproducible Android Studio builds.

### 6.4 Open in Android Studio

1. Open **Android Studio** → **Open** → select `Kobo-Mobile/android`
2. Let Gradle sync finish
3. **Build** → **Generate Signed Bundle / APK** → choose **APK** (or **AAB** for Play Store)
4. Create or select a **keystore**; keep the keystore and passwords in a secure place; you need them for every update

### 6.5 Install the APK

- USB: enable **Developer options** and **USB debugging** on the device, then run/install from Android Studio, or `adb install app-release.apk`
- Or distribute the APK file for sideloading (internal testing)

### 6.6 HTTP (non-HTTPS) — lab only

If the API is only `http://` (e.g. IP on a LAN), Android may block cleartext traffic. Prefer fixing TLS on the server. If you must allow cleartext, after prebuild you can use the **`expo-build-properties`** config plugin or edit `AndroidManifest.xml` in the generated project—treat this as **temporary** and **insecure**.

### 6.7 Optional: EAS Build (cloud)

If you prefer not to maintain local Android Studio installs, **Expo Application Services (EAS Build)** can produce APK/AAB using the same `app.config.js` and env. Android Studio steps above are the path you asked for; EAS is an alternative.

---

## 7. End-to-end checklist

- [ ] DNS **A/AAAA** records for `api.example.com` and `app.example.com` point to the Ubuntu server  
- [ ] TLS certificates installed and auto-renewed  
- [ ] Laravel `.env` production values, migrations, `storage:link`, `config:cache`, queue worker, scheduler cron  
- [ ] Next.js `NEXT_PUBLIC_API_URL` matches the live API  
- [ ] Mobile `EXPO_PUBLIC_API_URL` set at **build** time to the same API base URL  
- [ ] Release APK signed with a **saved** keystore  
- [ ] Smoke test: login, dashboard, outlet submission with photos against the live API  

---

## 8. Troubleshooting (short)

| Symptom | Things to check |
|--------|------------------|
| Mobile: “Network request failed” | HTTPS certificate valid? Correct `EXPO_PUBLIC_API_URL` in **release** build? Firewall allows 443? |
| 419 / CSRF on web | Admin uses Next + API; ensure cookie/session domains and `FRONTEND_URL` / Sanctum stateful domains match your setup if you use cookie auth (mobile uses **Bearer** tokens to `/api/*`). |
| 413 on upload | Nginx `client_max_body_size`, PHP `upload_max_filesize` / `post_max_size` |
| Wrong URLs in JSON | `APP_URL`, trusted proxies behind Nginx |

---

## 9. Optional: environment summary

| App | Variable | Purpose |
|-----|----------|---------|
| Mobile | `EXPO_PUBLIC_API_URL` | Laravel API origin for all `fetch` calls (build-time) |
| Frontend | `NEXT_PUBLIC_API_URL` | Same API origin for the admin Next.js app |
| Backend | `APP_URL`, `FRONTEND_URL`, `DB_*` | Laravel app URL, SPA URL, database |

This is enough to run the **whole project** live on Ubuntu with a **production API**, **admin UI**, and a **signed Android APK** built through **Android Studio** after **Expo prebuild**.
