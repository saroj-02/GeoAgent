# Quick Reference Card - GeoAgent Login/Register

## 🚀 Start Both Servers (Required)

### Terminal 1: Backend
```bash
cd backend
source venv/bin/activate
uvicorn app.main:app --reload
```
✅ Should say: `INFO: Application startup complete`

### Terminal 2: Frontend
```bash
cd frontend
npm run dev
```
✅ Should say: `- Local: http://localhost:3000`

---

## 🔍 Quick Diagnostics

### Is Backend Running?
```bash
curl http://localhost:8000/health
```
✅ Response: `{"status":"healthy"}`

### Does Frontend .env.local exist?
```bash
cat frontend/.env.local
```
✅ Should contain: `NEXT_PUBLIC_API_URL=http://localhost:8000`

### Test API Endpoint
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
✅ Response: Should return user object with status 201

---

## 📋 Password Requirements

Must have **ALL THREE**:
- [ ] 8+ characters
- [ ] 1 UPPERCASE letter (A-Z)
- [ ] 1 digit (0-9)

✅ Good: `TestPassword123`
❌ Bad: `testpassword123` (no uppercase)

---

## 🐛 Common Issues & Quick Fixes

| Issue | Fix |
|-------|-----|
| "Load Failed" on register | Check backend is running: `curl localhost:8000/health` |
| "Cannot connect to backend" | Wrong .env.local - should be `localhost:8000` not `127.0.0.1:8000` |
| "Invalid credentials" | Wrong password. Test in Swagger UI first: `http://localhost:8000/docs` |
| "User already exists" | Use different email or delete user from database |
| Password validation fails | Missing uppercase or digit. See requirements above. |
| CORS Error | Backend not on localhost:8000 - check .env.local URL matches exactly |

---

## ✅ Test Flow (Copy & Paste)

### 1. Register User
```bash
curl -X POST http://localhost:8000/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "testuser123@example.com",
    "username": "testuser123",
    "password": "TestPass123",
    "full_name": "Test User"
  }'
```

### 2. Login User
```bash
curl -X POST http://localhost:8000/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "testuser123@example.com",
    "password": "TestPass123"
  }'
```

### 3. Use Token
Copy `access_token` from response, then:
```bash
curl http://localhost:8000/devices \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN_HERE"
```

---

## 📱 Frontend URLs

| Page | URL | Status |
|------|-----|--------|
| Register | `http://localhost:3000/register` | ✅ Working |
| Login | `http://localhost:3000/login` | ✅ Working |
| Diagnostics | `http://localhost:3000/diagnostics` | ✅ New! |
| Dashboard | `http://localhost:3000/dashboard` | ⏳ Next phase |

---

## 🛠️ Backend URLs

| Resource | URL | Status |
|----------|-----|--------|
| Swagger Docs | `http://localhost:8000/docs` | ✅ Test endpoints here |
| ReDoc | `http://localhost:8000/redoc` | ✅ Alt docs |
| Health | `http://localhost:8000/health` | ✅ Connectivity check |

---

## 📁 Key Files

### Backend
- `backend/app/api/routes/auth.py` - Register/Login endpoints
- `backend/app/services/auth.py` - Auth logic
- `backend/.env` - Database URL, JWT secret

### Frontend
- `frontend/lib/auth.ts` - Auth functions (register, login)
- `frontend/app/register/page.tsx` - Registration form
- `frontend/app/login/page.tsx` - Login form
- `frontend/.env.local` - API URL config

---

## 🆘 Can't Find the Issue?

1. **Check Backend Logs**
   - Look at the terminal running `uvicorn`
   - Look for error messages
   - Check database connection errors

2. **Check Frontend Logs**
   - Open `http://localhost:3000`
   - Press F12 → Console tab
   - Try action again
   - Look for error message

3. **Run Diagnostics**
   - Go to `http://localhost:3000/diagnostics`
   - Check all items are ✅ green
   - Follow suggestions for any ❌ red items

4. **Test with Swagger**
   - Go to `http://localhost:8000/docs`
   - Try API directly
   - If it works here, issue is frontend-specific
   - If it fails here, issue is backend-specific

---

## 📝 Environment Files

### backend/.env (Minimum)
```bash
DATABASE_URL=postgresql+asyncpg://postgres:password@localhost:5432/geoagent
JWT_SECRET=your-secret-key-change-in-production
DEBUG=True
```

### frontend/.env.local (Minimum)
```bash
NEXT_PUBLIC_API_URL=http://localhost:8000
```

---

## ✨ Success Checklist

- [ ] Both servers running
- [ ] Backend health check returns healthy
- [ ] .env.local has correct API URL
- [ ] Can access `http://localhost:3000/register`
- [ ] Can fill and submit registration form
- [ ] Redirects to login with success message
- [ ] Can fill and submit login form
- [ ] Redirects to dashboard
- [ ] Swagger UI works at `http://localhost:8000/docs`

---

## 🎯 Next After Login Works

1. Create dashboard layout
2. Add map component
3. Implement WebSocket for real-time location
4. Build device management UI
5. Add permission management UI

---

**Last Updated**: Phase 1 - Login/Register Fixes Complete ✅
**Need Help?** Check `LOGIN_REGISTER_FIXES.md` for detailed guide or `SETUP_AND_TROUBLESHOOTING.md` for complete setup steps.
