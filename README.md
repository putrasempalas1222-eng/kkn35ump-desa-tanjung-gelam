# KKN Kelompok 35 UMP — Desa Gelam

Website dashboard KKN Kelompok 35 Universitas Muhammadiyah Palembang.

**Live URL:** [https://kkn35ump-desa-gelam.vercel.app](https://kkn35ump-desa-gelam.vercel.app)

---

## Arsitektur Project

```
kkn/
├── frontend/          # React + Vite (deploy ke Vercel)
├── backend/           # Express.js (deploy ke Firebase Functions + Vercel Serverless)
├── firebase.json      # Konfigurasi Firebase (Functions & Database Rules)
├── .firebaserc        # Project Firebase aktif
├── database.rules.json# Aturan keamanan Firebase Realtime Database
├── vercel.json        # Konfigurasi Vercel (rewrites, cron, build)
└── package.json       # Root workspace (menjalankan frontend + backend)
```

| Komponen | Teknologi | Platform Deploy |
|----------|-----------|-----------------|
| Frontend | React + Vite + TypeScript | **Vercel** |
| Backend API | Express.js + Firebase Admin SDK | **Firebase Functions (Gen 2)** & **Vercel Serverless** |
| Database | Firebase Realtime Database | **Firebase** |
| Auth | Firebase Authentication | **Firebase** |
| Email OTP | Nodemailer (SMTP Gmail) | — |

---

## Prasyarat

Pastikan sudah terinstall di komputer:

1. **Node.js v22+** — [Download](https://nodejs.org/)
2. **npm** (sudah termasuk saat install Node.js)
3. **Firebase CLI** — Install global:
   ```bash
   npm install -g firebase-tools
   ```
4. **Vercel CLI** (opsional, untuk deploy manual):
   ```bash
   npm install -g vercel
   ```
5. **Akun Firebase** dengan akses ke project `project-3dfa8c97-bc93-4195-a5a`
6. **Akun Vercel** yang terhubung ke repository

---

## Setup Lokal (Development)

### 1. Clone & Install Dependencies

```bash
git clone <repository-url>
cd kkn
npm install
```

Workspace akan otomatis install dependencies `frontend/` dan `backend/`.

### 2. Konfigurasi Environment

#### Backend (`backend/.env.local`)

Buat atau edit file `backend/.env.local`:

```env
# Server
API_BACKEND_HOST=127.0.0.1
API_BACKEND_PORT=5000
API_PAYLOAD_MAX_SIZE=7mb

# Google Cloud (untuk Vertex AI proxy)
GOOGLE_CLOUD_LOCATION=global
GOOGLE_CLOUD_PROJECT=project-3dfa8c97-bc93-4195-a5a

# Proxy header (keamanan internal)
PROXY_HEADER=3-OZ_Z1HrFPLPURAPsfrCkj491O6hplF

# Putra AI
PUTRA_AI_V1_API_URL=https://us-central1-project-3dfa8c97-bc93-4195-a5a.cloudfunctions.net/api
PUTRA_AI_CHAT_API_URL=https://us-central1-project-3dfa8c97-bc93-4195-a5a.cloudfunctions.net/api/api/chat
PUTRA_MODEL=PutraAi-V1

# Firebase Admin SDK
FIREBASE_PROJECT_ID=project-3dfa8c97-bc93-4195-a5a
FIREBASE_DATABASE_URL=https://project-3dfa8c97-bc93-4195-a5a-default-rtdb.firebaseio.com
# Untuk production/Vercel, isi dengan JSON Service Account:
# FIREBASE_SERVICE_ACCOUNT_JSON={"type":"service_account",...}

# SMTP Gmail (untuk OTP email)
SMTP_FROM=mputraramadhaniid@gmail.com
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=mputraramadhaniid@gmail.com
SMTP_PASS=<GMAIL_APP_PASSWORD>
SMTP_SECURITY_MODE=TLS
```

> **⚠️ PENTING:**
> - `SMTP_PASS` harus menggunakan **Gmail App Password**, bukan password Gmail biasa.
> - Untuk generate App Password: Google Account → Security → 2-Step Verification → App passwords.
> - `FIREBASE_SERVICE_ACCOUNT_JSON` diperlukan untuk deploy production (Vercel/Firebase). Di lokal bisa kosong jika sudah login `gcloud auth application-default login`.

### 3. Jalankan Development Server

```bash
npm run dev
```

Perintah ini menjalankan **frontend** (port `5173`) dan **backend** (port `5000`) secara bersamaan.

- Frontend: [http://localhost:5173](http://localhost:5173)
- Backend: [http://localhost:5000](http://localhost:5000)

Vite sudah dikonfigurasi proxy otomatis sehingga request `/auth/*`, `/admin/*`, `/money-collections/*`, dll dari frontend akan di-forward ke backend.

---

## Deploy

### A. Deploy Backend ke Firebase Functions

Firebase Functions digunakan sebagai backend API production. Function bernama `apiDataKkn35` dan di-deploy ke region `asia-southeast2`.

#### Langkah-langkah:

```bash
# 1. Login Firebase (sekali saja)
firebase login

# 2. Pilih project Firebase
firebase use project-3dfa8c97-bc93-4195-a5a

# 3. Install dependencies backend
cd backend
npm install
cd ..

# 4. Deploy Functions
firebase deploy --only functions
```

#### Hasil deploy yang diharapkan:

```
✔ functions[apiDataKkn35(asia-southeast2)] Successful update operation.
Function URL: https://apidatakkn35-mzmdqh3n6a-et.a.run.app
```

> **📝 Catatan:**
> - File `backend/.env` akan otomatis dimuat oleh Firebase Functions saat deploy.
> - `backend/.env.local` TIDAK di-deploy ke Firebase (hanya untuk lokal).
> - `firebase.json` mengatur source functions ada di folder `backend/`.

---

### B. Deploy Database Rules ke Firebase

Untuk mengupdate aturan keamanan Firebase Realtime Database:

```bash
firebase deploy --only database
```

File rules yang digunakan: `database.rules.json`

---

### C. Deploy Frontend + Backend ke Vercel

Vercel digunakan untuk hosting frontend (static) dan backend sebagai serverless functions.

#### Setup Vercel (Pertama Kali):

1. Hubungkan repository ke Vercel
2. Set **Root Directory** ke `.` (root project)
3. Vercel akan otomatis mendeteksi konfigurasi dari `vercel.json`

#### Environment Variables di Vercel:

Tambahkan environment variables berikut di **Vercel Dashboard → Settings → Environment Variables**:

| Variable | Nilai | Keterangan |
|----------|-------|------------|
| `FIREBASE_SERVICE_ACCOUNT_JSON` | `{"type":"service_account",...}` | JSON lengkap Service Account Firebase |
| `FB_PROJECT_ID` | `project-3dfa8c97-bc93-4195-a5a` | Project ID Firebase |
| `FB_DATABASE_URL` | `https://project-3dfa8c97-bc93-4195-a5a-default-rtdb.firebaseio.com` | URL Realtime Database |
| `SMTP_FROM` | `mputraramadhaniid@gmail.com` | Email pengirim OTP |
| `SMTP_HOST` | `smtp.gmail.com` | SMTP server |
| `SMTP_PORT` | `587` | SMTP port |
| `SMTP_USER` | `mputraramadhaniid@gmail.com` | SMTP username |
| `SMTP_PASS` | `<GMAIL_APP_PASSWORD>` | Gmail App Password |
| `SMTP_SECURITY_MODE` | `TLS` | Mode keamanan SMTP |
| `PROXY_HEADER` | `3-OZ_Z1HrFPLPURAPsfrCkj491O6hplF` | Header keamanan proxy |
| `GOOGLE_CLOUD_PROJECT` | `project-3dfa8c97-bc93-4195-a5a` | Google Cloud project |
| `GOOGLE_CLOUD_LOCATION` | `global` | Google Cloud location |

#### Deploy Manual via CLI:

```bash
# Install Vercel CLI (jika belum)
npm install -g vercel

# Login Vercel
vercel login

# Deploy preview
vercel

# Deploy production
vercel --prod
```

#### Deploy via Git Push:

Jika repository sudah terhubung ke Vercel, cukup push ke branch `main`:

```bash
git add .
git commit -m "update"
git push origin main
```

Vercel akan otomatis build dan deploy.

---

### D. Deploy Semua Sekaligus (Firebase + Vercel)

```bash
# 1. Deploy Firebase (Functions + Database Rules)
firebase deploy

# 2. Deploy Vercel (Frontend + Serverless Backend)
vercel --prod
```

---

## Konfigurasi Firebase

### Project Firebase

| Konfigurasi | Nilai |
|-------------|-------|
| Firebase Project (Hosting/Functions) | `project-3dfa8c97-bc93-4195-a5a` |
| Firebase Project (Auth/Database) | `project-3dfa8c97-bc93-4195-a5a` |
| Region Functions | `asia-southeast2` (Jakarta) |
| Runtime | Node.js 22 |
| Memory | 512 MiB |
| Timeout | 120 detik |
| Max Instances | 10 |

### Firebase Functions Detail

| Function | Endpoint |
|----------|----------|
| `apiDataKkn35` | `https://asia-southeast2-project-3dfa8c97-bc93-4195-a5a.cloudfunctions.net/apiDataKkn35` |

### Mendapatkan Service Account JSON

1. Buka [Firebase Console](https://console.firebase.google.com/project/project-3dfa8c97-bc93-4195-a5a/settings/serviceaccounts/adminsdk)
2. Klik **"Generate new private key"**
3. Simpan file JSON yang diunduh
4. Copy isi JSON tersebut (minified) ke environment variable `FIREBASE_SERVICE_ACCOUNT_JSON`

---

## Ringkasan Perintah Deploy

```bash
# ============================
# FIREBASE FUNCTIONS
# ============================
firebase login                       # Login (sekali saja)
firebase use project-3dfa8c97-bc93-4195-a5a   # Pilih project
cd backend && npm install && cd ..   # Install deps
firebase deploy --only functions     # Deploy functions saja
firebase deploy --only database      # Deploy database rules saja
firebase deploy                      # Deploy semua (functions + database)

# ============================
# VERCEL (FRONTEND + BACKEND)
# ============================
vercel login                         # Login (sekali saja)
vercel                               # Deploy preview
vercel --prod                        # Deploy production

# ============================
# DEVELOPMENT LOKAL
# ============================
npm install                          # Install semua dependencies
npm run dev                          # Jalankan frontend + backend
npm run dev-frontend                 # Jalankan frontend saja
npm run dev-backend                  # Jalankan backend saja
```

---

## Troubleshooting

### ❌ Firebase ID token `aud` mismatch

**Error:** `Firebase ID token has incorrect "aud" (audience) claim`

**Penyebab:** Project ID di backend `.env` tidak sama dengan project Firebase yang digunakan frontend.

**Solusi:** Pastikan `FB_PROJECT_ID` di `backend/.env` sama dengan `VITE_FIREBASE_PROJECT_ID` di frontend:
```env
FB_PROJECT_ID=project-3dfa8c97-bc93-4195-a5a
```

### ❌ `cd functions` — folder tidak ditemukan

**Penyebab:** Folder backend bernama `backend`, bukan `functions`.

**Solusi:** Gunakan `cd backend` atau langsung deploy dari root (firebase.json sudah mengatur source ke `backend`).

### ❌ SMTP timeout saat kirim OTP

**Penyebab:** Gmail App Password salah atau 2-Step Verification belum aktif.

**Solusi:**
1. Aktifkan 2-Step Verification di Google Account
2. Buat App Password baru di: [https://myaccount.google.com/apppasswords](https://myaccount.google.com/apppasswords)
3. Gunakan App Password tersebut di `SMTP_PASS`

### ❌ `Not in a Firebase app directory`

**Penyebab:** Menjalankan `firebase deploy` dari folder yang salah.

**Solusi:** Jalankan dari root project (`d:\3D POSTER\kkn`) dimana file `firebase.json` berada.

---

## Struktur API Backend

| Method | Endpoint | Keterangan |
|--------|----------|------------|
| POST | `/auth/request-otp` | Kirim kode OTP ke email divisi |
| POST | `/auth/verify-otp` | Verifikasi kode OTP |
| GET | `/auth/totp/status` | Cek status Google Authenticator |
| POST | `/auth/totp/start` | Mulai setup Authenticator |
| POST | `/auth/totp/confirm` | Konfirmasi setup Authenticator |
| POST | `/auth/totp/verify` | Verifikasi kode Authenticator |
| POST | `/admin/delete-user` | Hapus user (admin only) |
| POST | `/api-proxy` | Proxy ke Vertex AI |
| POST | `/putra-ai-proxy` | Proxy ke Putra AI |
| POST | `/money-collections/notify` | Kirim notifikasi pengumpulan uang |
| POST | `/money-collections/remind-due` | Kirim reminder otomatis (cron) |
| WS | `/division-chat` | WebSocket chat antar divisi |
