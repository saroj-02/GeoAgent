# GeoAgent - AI-Powered Real-Time Satellite & Geospatial Intelligence Platform

A production-grade application combining authorized real-time device location tracking, satellite imagery analysis, geospatial intelligence, and an AI-powered geospatial agent.

## 🎯 Overview

GeoAgent provides a **premium, professional satellite intelligence console** for:

- 📍 Real-time device location tracking (with explicit permission)
- 🛰️ Satellite imagery integration (Sentinel-2, Landsat)
- 📊 Geospatial analysis (NDVI, NDWI, NDBI, land-cover, change detection)
- 🤖 AI geospatial agent with natural-language queries
- 🚨 Geofencing and anomaly detection
- 🔒 Enterprise-grade security and privacy controls

## ⚠️ CRITICAL: Consent-Based Tracking

**This system will NEVER:**
- Secretly track people
- Derive location from only email/phone
- Bypass device permissions
- Fabricate analysis results

**Location data is ONLY available when:**
1. User explicitly grants permission
2. Permission hasn't expired
3. Request comes from authorized user
4. Permission is for the correct scope (current/history/trail)

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Frontend (Next.js/React)             │
│  Login │ Dashboard │ Map │ Telemetry │ AI Chat          │
└────────────────────┬────────────────────────────────────┘
                     │ WebSocket & HTTP
┌────────────────────▼────────────────────────────────────┐
│                 FastAPI Backend (Python)                │
│  ┌────────────────────────────────────────────────────┐ │
│  │ Authentication │ Devices │ Locations │ Permissions │ │
│  └────────────────────────────────────────────────────┘ │
│  ┌────────────────────────────────────────────────────┐ │
│  │ Satellite │ Analysis │ Geofence │ AI Agent       │ │
│  └────────────────────────────────────────────────────┘ │
└────────────────────┬────────────────────────────────────┘
                     │
         ┌───────────┼───────────┐
         ▼           ▼           ▼
    PostgreSQL    Redis       S3/Blob
    (PostGIS)    (Cache)     (Storage)
```

## 🛠️ Technology Stack

### Frontend
- **Next.js 14** - React framework with SSR
- **TypeScript** - Type safety
- **Tailwind CSS** - Dark, professional styling
- **MapLibre GL JS** - Interactive satellite maps
- **Framer Motion** - Smooth animations
- **WebSocket** - Real-time updates

### Backend
- **FastAPI** - Modern async Python framework
- **SQLAlchemy 2.0** - ORM with async support
- **PostgreSQL + PostGIS** - Geospatial database
- **Redis** - Real-time state and caching
- **Pydantic** - Data validation
- **PyTorch + Transformers** - ML/AI models
- **LangGraph** - AI agent orchestration

### Deployment
- **Docker** - Containerization
- **Azure** - Cloud infrastructure
- **AWS S3 / Azure Blob** - Storage

## 📋 Phase 1: Authentication & Core Infrastructure ✅

### Completed
- [x] Database schema with 11 tables
- [x] User authentication (JWT, password hashing)
- [x] Email verification flow
- [x] Device management system
- [x] Location permission system (consent-based)
- [x] Location tracking with validation
- [x] Demo mode simulator
- [x] Complete API documentation

### API Endpoints

#### Authentication
```
POST   /auth/register          - Register new user
POST   /auth/login             - Login with credentials
POST   /auth/refresh           - Refresh access token
```

#### Devices
```
POST   /devices                - Create device
GET    /devices                - List user's devices
GET    /devices/{id}           - Get device details
PATCH  /devices/{id}           - Update device
DELETE /devices/{id}           - Delete device
```

#### Locations
```
POST   /locations?device_id=   - Submit location update
GET    /locations/current/{id} - Get current location
GET    /locations/history/{id} - Get location history
```

#### Permissions
```
POST   /permissions/location   - Grant permission
DELETE /permissions/location/{id} - Revoke permission
GET    /permissions            - List user's permissions
```

## 🚀 Getting Started

### Prerequisites
- Python 3.10+
- Node.js 18+
- PostgreSQL 14+ with PostGIS
- Redis 7+

### Backend Setup

```bash
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Copy environment file
cp .env.example .env

# Edit .env with your settings
# DATABASE_URL=postgresql+asyncpg://user:pass@localhost/geoagent
# JWT_SECRET=your-secret-key
# OPENAI_API_KEY=your-api-key (optional)

# Start backend
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Backend will be available at `http://localhost:8000`
API docs at `http://localhost:8000/docs`

### Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Copy environment file
cp .env.example .env.local

# Edit .env.local
# NEXT_PUBLIC_API_URL=http://localhost:8000

# Start frontend
npm run dev
```

Frontend will be available at `http://localhost:3000`

## 📊 Database Schema

### Users
- Email verification
- Phone OTP
- Privacy settings
- Account status

### Devices
- Device type (mobile, tablet, web, iot)
- Last seen timestamp
- Owner relationship

### Locations
- PostGIS POINT geometry
- GPS accuracy/altitude/speed/heading
- Validation status
- Source tracking (gps, wifi, cellular, simulated)
- Automatic expiration based on retention policy

### Permissions
- Granular access control (current, history, trail)
- Permission levels (viewer, admin, owner)
- Automatic expiration enforcement
- Status tracking (pending, active, revoked, expired)

### Audit Logs
- All location access attempts
- Permission grants/revokes
- User actions
- IP address tracking

## 🔐 Security Features

### Authentication
- JWT tokens (access + refresh)
- Bcrypt password hashing
- Email verification
- Phone OTP support
- Session management

### Authorization
- Role-based access control (RBAC)
- Device ownership verification
- Permission expiration enforcement
- Scope-based access (current/history/trail)

### Data Protection
- Consent-based location sharing only
- No location derivation from email/phone
- Automatic permission expiration
- Audit logging for compliance
- Secure WebSocket connections
- CORS protection
- SQL injection prevention

### Validation
- GPS range validation (-90° to 90° lat, -180° to 180° lng)
- Impossible jump detection (>500m)
- Accuracy threshold checks
- Timestamp validation

## 📍 Location Tracking

### Real-time Updates
- Target: ~5-second update interval
- Async WebSocket streaming
- Smooth marker interpolation
- Battery-optimized
- Offline handling

### Location Data
- Latitude, Longitude (WGS84)
- Accuracy (meters)
- Altitude (meters)
- Speed (m/s)
- Heading (degrees)
- Timestamp (device time)
- Source (gps/wifi/cellular/simulated)

### Movement Trail
- Individual yellow breadcrumb dots (NO continuous lines)
- Historical track playback
- Date range filtering
- 5/30/60-minute, day, or custom ranges

## 🛰️ Satellite Integration

### Supported Providers
- Sentinel-2 (Copernicus)
- Landsat (USGS)
- Microsoft Planetary Computer (STAC)

### Analysis Capabilities
- NDVI (Vegetation Health)
- NDWI (Water Detection)
- NDBI (Urbanization)
- Land-cover classification
- Change detection
- Building/Road segmentation

## 🤖 AI Geospatial Agent

Query examples:
```
"Analyze vegetation changes along this device's route"
"Is the current location near a flood-risk area?"
"How much urban growth since 2021?"
"Detect anomalies in movement patterns"
```

Agent uses tools for:
- Location retrieval
- Satellite scene search
- NDVI/NDWI/NDBI calculation
- Change detection
- Environmental data
- Report generation

## 🎨 UI/UX Design

### Dark Intelligence Console
- Background: #070A0F (near-black)
- Panels: #0D121A (deep navy)
- Borders: #1D2935 (subtle gray)
- Live Marker: #FF3B4E (vibrant red)
- Trail: #FFD84D (tracking yellow)
- Text: #E8EDF2 (light gray)

### Key Components
- Satellite map as hero element
- Pulsing red live marker with radar effect
- Yellow breadcrumb trail
- Telemetry bar (speed, accuracy, distance)
- AI chat panel
- Event feed
- Permission controls

### Professional Cyber Details
- System status indicators
- GPS lock visualization
- Satellite link indicator
- Live timestamp
- Encrypted connection label
- No fake "hacking" elements

## 📈 Performance Metrics

Target benchmarks:
- Location update latency: < 1s
- WebSocket latency: < 500ms
- Marker rendering: 60 FPS
- Satellite processing: < 5s
- API response time: < 200ms
- Database query time: < 100ms

## 🧪 Testing

```bash
# Backend tests
cd backend
pytest

# Frontend tests
cd frontend
npm run test

# Integration tests
pytest tests/integration/
```

## 📝 Demo Mode

For testing without real GPS:

```bash
# Enable in .env
DEMO_MODE_ENABLED=True
DEMO_DEVICE_ID=DEMO-01

# Predefined route (Cuttack, Odisha):
# Point 1: 20.4625°N, 85.8830°E
# Point 2: 20.4627°N, 85.8833°E
# Point 3: 20.4631°N, 85.8840°E
# ... (5 total points)

# Each point gets realistic GPS noise (~5m accuracy)
# Updates simulate 0-20 m/s speeds
# Clearly labeled as SIMULATED DATA
```

## 📚 Documentation

- **API Docs**: `/docs` (Swagger UI)
- **ReDoc**: `/redoc` (ReDoc alternative)
- **Database Design**: `/docs/database.md`
- **API Architecture**: `/docs/architecture.md`
- **Deployment Guide**: `/docs/deployment.md`
- **Security Model**: `/docs/security.md`

## 🚀 Deployment

### Docker
```bash
docker build -t geoagent-backend -f docker/Dockerfile.backend .
docker build -t geoagent-frontend -f docker/Dockerfile.frontend .
docker compose up -d
```

### Azure
```bash
# Using Azure Container Apps
az containerapp create --resource-group rg-geoagent --name geoagent-backend ...
```

## 🗺️ Roadmap

### Phase 2: Real-time Location (In Progress)
- WebSocket streaming
- ~5-second update intervals
- Smooth marker animation
- Breadcrumb trail rendering

### Phase 3: Visual Intelligence
- Red pulsing marker
- Live location animation
- Historical playback
- Trail visualization

### Phase 4-5: Satellite Integration
- STAC provider integration
- Sentinel-2/Landsat imagery
- NDVI/NDWI/NDBI analysis
- Change detection

### Phase 6-7: AI & Computer Vision
- Segmentation models (U-Net, SegFormer)
- Building/water/burned-area detection
- GeoAgent AI implementation
- LangGraph agent orchestration

### Phase 8-10: Polish & Deploy
- Geofencing
- Environmental intelligence
- Reports & exports
- Testing & hardening
- Docker deployment
- Azure infrastructure

## 📄 License

Proprietary - GeoAgent Intelligence Platform

## 📞 Support

- Email: support@geoagent.dev
- Docs: https://docs.geoagent.dev
- Issues: https://github.com/geoagent/issues

---

**Built with ❤️ for intelligent geospatial operations**
