# GeoAgent Setup & Troubleshooting Guide

## Quick Start

### 1. Backend Setup (Required First)

```bash
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Create .env file
cp .env.example .env

# Edit .env with your settings (at minimum):
# DATABASE_URL=postgresql+asyncpg://user:password@localhost:5432/geoagent
# JWT_SECRET=your-secret-key-here-change-in-production
# DEMO_MODE_ENABLED=True
# API_VERSION=v1

# Start backend (this creates tables automatically on first run)
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Backend will be available at:
- **API**: `http://localhost:8000`
- **Docs**: `http://localhost:8000/docs` (Swagger UI - test endpoints here)
- **Health**: `http://localhost:8000/health`

### 2. Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Create .env.local file
cp .env.example .env.local

# Edit .env.local
# NEXT_PUBLIC_API_URL=http://localhost:8000

# Start frontend
npm run dev
```

Frontend will be available at:
- **App**: `http://localhost:3000`
- **Login**: `http://localhost:3000/login`
- **Register**: `http://localhost:3000/register`

---

## "Load Failed" Error - Troubleshooting

### Step 1: Verify Backend is Running

Open `http://localhost:8000/docs` in your browser.

**If you see Swagger UI**: ✅ Backend is running

**If you get "Connection refused"**: ❌ Backend is not running
- Make sure you ran `uvicorn app.main:app --reload` in the backend directory
- Check that you're using port 8000

### Step 2: Check Backend Logs

When backend is running, you should see:
```
INFO:     Application startup complete
```

**If you see database errors**: Make sure `DATABASE_URL` is set correctly in `.env`

**If you see connection errors**: Check that PostgreSQL is running

### Step 3: Verify Frontend Environment

Check `frontend/.env.local` contains:
```
NEXT_PUBLIC_API_URL=http://localhost:8000
```

For the deployed frontend, set `NEXT_PUBLIC_API_URL` to
`https://geoagent-s6z2.onrender.com`. The frontend adds the `/api/v1` prefix
automatically. If `CORS_ORIGINS` is explicitly set on the backend deployment,
include `https://geoagent-1.onrender.com` in that JSON array as well.

The dashboard map uses Google Maps for its map styles, Street View and 45°
imagery. Set `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` in the frontend deployment and
enable the Maps JavaScript API with billing. Restrict the key to your frontend
domains using HTTP referrer restrictions. The key is used by the browser, so
do not use an unrestricted key. Street View and 45° imagery depend on Google
coverage for the selected location.

**If this file doesn't exist**: 
```bash
cd frontend
cp .env.example .env.local
```

### Step 4: Test API Endpoints Manually

**Test Registration via Swagger UI:**
1. Go to `http://localhost:8000/docs`
2. Find "POST /api/v1/auth/register"
3. Click "Try it out"
4. Enter this JSON:
```json
{
  "email": "test@example.com",
  "username": "testuser",
  "password": "TestPassword123",
  "full_name": "Test User"
}
```
5. Click "Execute"

**Expected response** (Status 201):
```json
{
  "id": "uuid-here",
  "email": "test@example.com",
  "username": "testuser",
  "full_name": "Test User",
  "email_verified": false,
  "is_active": true,
  "created_at": "2026-09-10T..."
}
```

**If registration fails**:
- Check error message in Swagger UI
- Look at backend logs for details
- Verify password meets requirements: at least 8 chars, 1 uppercase, 1 digit

### Step 5: Test Login via Swagger UI

**After successful registration, test login:**
1. Go to `http://localhost:8000/docs`
2. Find "POST /api/v1/auth/login"
3. Click "Try it out"
4. Enter:
```json
{
  "email": "test@example.com",
  "password": "TestPassword123"
}
```
5. Click "Execute"

**Expected response** (Status 200):
```json
{
  "access_token": "eyJ0eXAiOiJKV1QiLC...",
  "refresh_token": "eyJ0eXAiOiJKV1QiLC...",
  "token_type": "bearer",
  "expires_in": 1800
}
```

### Step 6: Check Browser Console

1. Open `http://localhost:3000/register` in your browser
2. Open Developer Tools (F12)
3. Go to "Console" tab
4. Try to register
5. Look for error messages

**Common errors:**

**CORS Error**: 
```
Access to XMLHttpRequest has been blocked by CORS policy
```
**Solution**: Make sure backend is running on `http://localhost:8000` (not localhost:8001 or 127.0.0.1)

**Network Error**:
```
Failed to fetch / NetworkError
```
**Solution**: Backend not running. Start it with `uvicorn app.main:app --reload`

**401 Unauthorized after login**:
```
{"detail":"Invalid credentials"}
```
**Solution**: Wrong email/password. Double-check credentials in Swagger UI first.

### Step 7: Test Frontend Login/Register

1. Go to `http://localhost:3000/register`
2. Fill in form:
   - Full name: `Test User`
   - Email: `test123@example.com`
   - Password: `TestPassword123`
   - Confirm Password: `TestPassword123`
3. Click "Create account"

**Expected**: Redirect to login page with success message

**If you see "Load Failed"**:
- Check browser console (F12 → Console)
- Copy the error message
- See "Common Errors" section below

---

## Common Issues & Solutions

### Issue: "Load Failed" on Register Page

**Possible causes:**

1. **Backend not running**
   - Solution: Run `uvicorn app.main:app --reload` in backend directory
   
2. **Wrong API URL in .env.local**
   - Check: `NEXT_PUBLIC_API_URL=http://localhost:8000`
   - NOT `http://127.0.0.1:8000` (use localhost)
   - NOT `http://localhost:3000` (wrong port)
   
3. **Network connectivity**
   - Run: `curl http://localhost:8000/health`
   - Should return: `{"status":"healthy"}`
   
4. **Password validation failing silently**
   - Password must: 8+ chars, 1 uppercase, 1 digit
   - Example: `TestPassword123` ✅

### Issue: "Invalid credentials" on Login

**Solutions:**
- Make sure you registered first (registration → login)
- Check email and password are exactly correct
- Test in Swagger UI first to verify credentials work
- Password is case-sensitive

### Issue: "User already exists"

**Solutions:**
- Try with a different email address
- Or delete the user from database (if using test database)
- Reset database: `drop database geoagent; create database geoagent;`

### Issue: "CORS error"

**Solution:**
- Make sure backend is running on `localhost:8000` (not 127.0.0.1)
- Check `NEXT_PUBLIC_API_URL` is set to exact same URL
- Restart both backend and frontend after changing URLs

### Issue: Frontend can't connect to backend

**Debug:**
```bash
# Test backend health
curl http://localhost:8000/health

# Test registration endpoint
curl -X POST http://localhost:8000/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "username": "testuser",
    "password": "TestPassword123",
    "full_name": "Test User"
  }'
```

---

## Testing Workflow

### Complete Test Flow

1. **Start Backend**
   ```bash
   cd backend
   source venv/bin/activate
   uvicorn app.main:app --reload
   ```
   
2. **Start Frontend** (new terminal)
   ```bash
   cd frontend
   npm run dev
   ```
   
3. **Test Registration** (new terminal)
   ```bash
   curl -X POST http://localhost:8000/auth/register \
     -H "Content-Type: application/json" \
     -d '{
       "email": "test@example.com",
       "username": "testuser",
       "password": "TestPassword123",
       "full_name": "Test User"
     }'
   ```
   
4. **Test Login**
   ```bash
   curl -X POST http://localhost:8000/auth/login \
     -H "Content-Type: application/json" \
     -d '{
       "email": "test@example.com",
       "password": "TestPassword123"
     }'
   ```
   
5. **Open Frontend**
   - Go to `http://localhost:3000/register`
   - Fill form and register
   - Should redirect to login page
   - Login with same credentials
   - Should redirect to dashboard

---

## Database Setup

### If using PostgreSQL

```bash
# Create database
createdb geoagent

# Create database with PostGIS extension
psql -U postgres -d geoagent -c "CREATE EXTENSION IF NOT EXISTS postgis;"

# Set DATABASE_URL in .env
DATABASE_URL=postgresql+asyncpg://postgres:password@localhost:5432/geoagent
```

### First Run

On first run, backend automatically:
- Creates all tables
- Creates indexes
- Sets up relationships

No migration commands needed!

---

## Using Swagger UI to Test API

**Access**: `http://localhost:8000/docs`

**Steps:**
1. Scroll to "POST /api/v1/auth/register"
2. Click "Try it out"
3. Modify example JSON
4. Click "Execute"
5. Check response

**Key endpoints to test:**
- POST /api/v1/auth/register - Create account
- POST /api/v1/auth/login - Get tokens
- POST /auth/refresh - Refresh token
- GET /devices - List devices (needs Bearer token)
- POST /devices - Create device

**To use Bearer token in Swagger:**
1. Login and copy `access_token`
2. Click "Authorize" button at top
3. Paste token in format: `Bearer <token>`
4. Click "Authorize"
5. All subsequent requests will use token

---

## Environment Variables Reference

### Backend (.env)

```bash
# Server
APP_NAME=GeoAgent
ENV=development
DEBUG=True
HOST=0.0.0.0
PORT=8000

# Database
DATABASE_URL=postgresql+asyncpg://user:password@localhost:5432/geoagent

# JWT
JWT_SECRET=your-secret-key-here-change-in-production
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
REFRESH_TOKEN_EXPIRE_DAYS=7

# Security
PASSWORD_MIN_LENGTH=8
PASSWORD_REQUIRE_UPPERCASE=True
PASSWORD_REQUIRE_DIGIT=True
PASSWORD_REQUIRE_SPECIAL=False

# Location Tracking
LOCATION_UPDATE_INTERVAL_SECONDS=5
LOCATION_RETENTION_DAYS=30

# Demo Mode
DEMO_MODE_ENABLED=True
DEMO_DEVICE_ID=DEMO-01

# CORS
CORS_ORIGINS=["http://localhost:3000", "http://localhost:8000"]
```

### Frontend (.env.local)

```bash
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_MAP_API_KEY=
NEXT_PUBLIC_LLM_ENABLED=false
NEXT_PUBLIC_APP_ENV=development
```

---

## Still Not Working?

1. **Check backend logs** - Look for specific error messages
2. **Check frontend console** - Open DevTools (F12) and look at Console tab
3. **Test with Swagger** - Confirm API works before testing frontend
4. **Verify environment files** - Make sure `.env` and `.env.local` exist
5. **Restart both servers** - Sometimes cached state causes issues

If still stuck:
- Check backend logs for database errors
- Verify PostgreSQL is running
- Verify Redis is running (if using)
- Check that ports 3000 and 8000 are available
- Try fresh clone and reinstall

---

## Success Checklist

- [ ] Backend running on `http://localhost:8000`
- [ ] Frontend running on `http://localhost:3000`
- [ ] `.env` exists in backend with DATABASE_URL
- [ ] `.env.local` exists in frontend with NEXT_PUBLIC_API_URL
- [ ] Can access `http://localhost:8000/docs`
- [ ] Can register user via Swagger UI
- [ ] Can login user via Swagger UI
- [ ] Can access `http://localhost:3000/register`
- [ ] Can complete registration in frontend
- [ ] Can complete login in frontend
- [ ] Redirected to dashboard after login

If all checkboxes are ✅, you're ready to go!
