# Load Assignment Agent - Logistics AI Demo

A production-grade POC application demonstrating an intelligent load assignment system with real-time vehicle tracking, automated calling via Ringg.ai, and dynamic route simulation.

## 🎯 Features

- **Real-time Journey Simulation**: Animated truck movement along actual Mapbox routes with heading rotation and 10km geofence visualization
- **Live Stoppage Indicators**: Red pin cards appear on map during traffic stoppages with real-time countdown timers
- **Intelligent Load Assignment**: Automatically finds and assigns the nearest available load when entering 10km geofence
- **Automated Calling**: Real calls via Ringg.ai API when truck enters destination geofence (simulation pauses)
- **Webhook Integration**: Handles call outcomes (Accepted/Rejected/No Answer/Busy) with automatic retry logic
- **Smart Stoppage Simulation**: Random traffic stoppages with visual indicators
- **Rich Event Timeline**: Expandable events showing detailed payloads and coordinates
- **Multi-Route Simulation**: Continues to next load after delivery completion
- **Enterprise UI**: Clean, modern interface with Google Maps integration

## 🛠 Tech Stack

- **Framework**: Next.js 14 (App Router) with TypeScript
- **Database**: PostgreSQL via Prisma ORM (Vercel-compatible)
- **Maps**: Google Maps JavaScript API + Directions API
- **Geocoding**: Nominatim (OpenStreetMap) - no Google dependency
- **Calling**: Ringg.ai API integration
- **Styling**: Tailwind CSS
- **Hosting**: Optimized for Vercel deployment

## 📋 Prerequisites

- Node.js 18+ and npm
- PostgreSQL database (Neon/Supabase recommended for Vercel)
- Google Maps API key with Maps + Directions enabled
- Ringg.ai API account and credentials

## 🚀 Getting Started

### 1. Clone and Install

```bash
git clone <your-repo-url>
cd "Load Assignment"
npm install
```

### 2. Environment Configuration

Create `.env.local` file in the root directory:

```env
# Database (PostgreSQL)
# For Neon: postgresql://user:password@ep-xxx.region.aws.neon.tech/dbname?sslmode=require
# For Supabase: postgresql://postgres:password@db.xxx.supabase.co:5432/postgres
DATABASE_URL="postgresql://user:password@localhost:5432/load_assignment?schema=public"

# Mapbox
# Get from: https://account.mapbox.com/access-tokens/
MAPBOX_ACCESS_TOKEN="your_mapbox_access_token_here"
NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN="your_mapbox_access_token_here"

# Ringg.ai API
RINGG_API_KEY="your_ringg_api_key_here"
RINGG_CALL_ENDPOINT="https://api.ringg.ai/v1/calls"
RINGG_WEBHOOK_SECRET="your_webhook_secret_here"

# Optional: Custom geocoder (defaults to Nominatim)
# GEOCODER_BASE_URL="https://nominatim.openstreetmap.org"
```

### 3. Database Setup

Initialize the database with Prisma:

```bash
# Generate Prisma client
npx prisma generate

# Run migrations to create tables
npx prisma migrate dev --name init

# (Optional) Open Prisma Studio to view data
npx prisma studio
```

### 4. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## 🗄️ Database Configuration

### Using Neon (Recommended for Vercel)

1. Sign up at [neon.tech](https://neon.tech)
2. Create a new project
3. Copy the connection string from dashboard
4. Add to `DATABASE_URL` in `.env.local`

### Using Supabase

1. Sign up at [supabase.com](https://supabase.com)
2. Create a new project
3. Go to Project Settings → Database
4. Copy the connection string (URI mode)
5. Add to `DATABASE_URL` in `.env.local`

### Local PostgreSQL

```bash
# Install PostgreSQL (macOS)
brew install postgresql@14
brew services start postgresql@14

# Create database
createdb load_assignment

# Use connection string
DATABASE_URL="postgresql://localhost:5432/load_assignment?schema=public"
```

## 🗺️ Mapbox API Setup

1. Go to [Mapbox](https://account.mapbox.com/)
2. Sign up for free account (free tier includes 50,000 free monthly requests)
3. Go to [Access Tokens](https://account.mapbox.com/access-tokens/)
4. Copy your **Default public token** OR create a new token
5. Add to `.env.local`:
   ```
   MAPBOX_ACCESS_TOKEN="your_token_here"
   NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN="your_token_here"
   ```

**Note:** Mapbox tokens work across all domains by default, no restrictions needed!

## 📞 Ringg.ai Configuration

1. Sign up at [Ringg.ai](https://ringg.ai)
2. Create a new call campaign in dashboard
3. Configure your script (Ringg manages script, no need to send from code)
4. Get API credentials:
   - API Key
   - Call Endpoint URL
   - Webhook Secret (for signature verification)
5. Configure webhook URL in Ringg dashboard:
   - URL: `https://your-domain.vercel.app/api/ringg/webhook`
   - Method: POST
   - Add webhook secret for verification
6. Add credentials to `.env.local`

## 📁 Project Structure

```
├── app/
│   ├── api/
│   │   ├── journeys/          # Journey CRUD & simulation endpoints
│   │   ├── loads/             # Load CRUD endpoints
│   │   ├── ringg/             # Ringg webhook handler
│   │   └── directions/        # Google Directions wrapper
│   ├── journeys/              # Journey management page
│   ├── loads/                 # Load management page
│   ├── page.tsx               # Main simulation dashboard
│   ├── layout.tsx             # Root layout
│   └── globals.css            # Global styles
├── components/
│   ├── Map/                   # Google Maps components
│   ├── journeys/              # Journey selector & info cards
│   ├── simulation/            # Simulation controls
│   ├── calls/                 # Call status display
│   └── events/                # Event timeline
├── lib/
│   ├── prisma.ts              # Prisma client instance
│   ├── geocoding.ts           # Nominatim geocoding
│   ├── directions.ts          # Google Directions API
│   ├── ringgClient.ts         # Ringg.ai API client
│   └── simulation.ts          # Simulation utilities
├── prisma/
│   └── schema.prisma          # Database schema
├── types/
│   └── index.ts               # TypeScript types
└── README.md                  # This file
```

## 📖 Usage Guide

### Creating a Journey

1. Navigate to **Manage Journeys** (`/journeys`)
2. Click **+ Create Journey**
3. Fill in details:
   - Origin/Destination cities (will be geocoded automatically)
   - Driver name and phone
   - Vehicle number
   - Start time and planned ETA
   - Fleet type (own/attached)
   - Transporter name
4. Click **Create Journey**

### Creating Loads

1. Navigate to **Manage Loads** (`/loads`)
2. Click **+ Create Load**
3. Fill in details:
   - Pickup/Drop cities (will be geocoded)
   - Commodity and rate
   - Expected reporting/unloading times
   - Mode (FTL/PTL/LTL)
   - Vehicle type (32ft/24ft/20ft/14ft)
   - Special instructions (optional)
4. Click **Create Load**

### Running a Simulation

1. Go to **Dashboard** (`/`)
2. Use filters to find your journey in the selector
3. Click **Simulate Journey** on a journey card
4. Map will load with route from Google Directions API
5. Click **Start Simulation** to begin
6. Use controls:
   - **Pause/Resume**: Control simulation
   - **Reset**: Return to origin
   - **Jump Near Destination**: Skip to trigger point
   - **Speed**: Adjust 1x - 20x
7. Watch events in timeline as simulation progresses

### Simulation Flow

1. **Journey Starts**: Truck begins moving along route with visual progress indicator
2. **Stoppages**: 1-2 random traffic stops occur (10-20 seconds each)
   - Red error pin appears at truck location showing countdown timer
   - Pin updates in real-time: "Waiting for X seconds..."
   - Automatically disappears when stoppage ends
3. **Geofence Entry** (10km radius): 
   - **Simulation automatically pauses**
   - System finds nearest available load
   - Orange warning pin appears: "Load Assignment Call Initiated"
4. **Webhook Response**:
   - **Accepted**: Load assigned, shows dotted route to next pickup/drop, resume simulation
   - **Rejected/No Answer/Busy**: Automatically tries next nearest load
5. **Arrival**: 5-second unloading visualization
6. **Next Load** (if assigned): Routes to pickup → drop location with visual arc

## 🎨 Customization

### Simulation Parameters

Edit in `app/page.tsx`:

```typescript
const BASE_SPEED_KMH = 120                   // Base vehicle speed (faster simulation)
const SIMULATION_TICK_MS = 500               // Update interval (smoother updates)
const GEOFENCE_RADIUS_KM = 10                // Geofence radius for call trigger
const UNLOADING_DURATION_SECONDS = 5         // Unloading time
```

### Stoppage Generation

Edit in `lib/simulation.ts`:

```typescript
export function generateStoppages(count: number = 2): Stoppage[] {
  // count: Number of stoppages per journey
  // position: 0.2 to 0.8 (20% to 80% of route)
  // duration: 10 to 20 seconds
}
```

### Speed Options

Edit in `components/simulation/SimulationControls.tsx`:

```typescript
const SPEED_OPTIONS = [1, 2, 3, 5, 10, 20]
```

## 🚢 Deployment to Vercel

### 1. Push to GitHub

```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin <your-repo-url>
git push -u origin main
```

### 2. Deploy on Vercel

1. Go to [vercel.com](https://vercel.com)
2. Click **Add New Project**
3. Import your GitHub repository
4. Configure:
   - Framework Preset: **Next.js**
   - Root Directory: `./`
   - Build Command: `npm run build`
   - Output Directory: `.next`
5. Add environment variables (all from `.env.local`)
6. Click **Deploy**

### 3. Configure Ringg Webhook

After deployment:

1. Copy your Vercel URL: `https://your-app.vercel.app`
2. In Ringg.ai dashboard, set webhook URL to:
   ```
   https://your-app.vercel.app/api/ringg/webhook
   ```
3. Test with a sample journey!

## 🔍 API Endpoints

### Journeys

- `GET /api/journeys` - List journeys (with filters)
- `POST /api/journeys` - Create journey
- `GET /api/journeys/[id]` - Get journey details
- `PATCH /api/journeys/[id]` - Update journey
- `DELETE /api/journeys/[id]` - Delete journey
- `POST /api/journeys/[id]/trigger-call` - Manually trigger load call
- `GET /api/journeys/[id]/events` - Get journey events
- `POST /api/journeys/[id]/events` - Create event

### Loads

- `GET /api/loads` - List loads (with filters)
- `POST /api/loads` - Create load
- `GET /api/loads/[id]` - Get load details
- `PATCH /api/loads/[id]` - Update load
- `DELETE /api/loads/[id]` - Delete load

### Ringg Integration

- `POST /api/ringg/webhook` - Ringg.ai webhook receiver

### Utilities

- `POST /api/directions` - Get Google Directions

## 🧪 Testing

### Test Geocoding

Create a journey with cities like:
- Origin: "Mumbai, India"
- Destination: "Delhi, India"

Should geocode automatically via Nominatim.

### Test Simulation

1. Create journey (Mumbai → Delhi)
2. Create load (Delhi → Bangalore)
3. Run simulation
4. Use "Jump Near Destination" to trigger call quickly

### Test Webhook (Mock)

```bash
curl -X POST http://localhost:3000/api/ringg/webhook \
  -H "Content-Type: application/json" \
  -d '{
    "callId": "test-call-id",
    "outcome": "accepted",
    "metadata": {}
  }'
```

## 🐛 Troubleshooting

### Geocoding Fails

- **Issue**: Cannot geocode city
- **Solution**: Use more specific names ("Mumbai, India" vs "Mumbai")
- **Alternative**: Check Nominatim rate limits (1 req/sec)

### Map Not Loading

- **Issue**: Blank map area
- **Solution**: 
  - Check `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` is set
  - Verify API key has Maps JavaScript API enabled
  - Check browser console for errors

### Route Not Appearing

- **Issue**: Truck doesn't move
- **Solution**:
  - Check `GOOGLE_MAPS_API_KEY` (server-side) is set
  - Verify Directions API is enabled
  - Check console for API errors

### Webhook Not Working

- **Issue**: Call outcomes not processed
- **Solution**:
  - Verify webhook URL in Ringg dashboard
  - Check `RINGG_WEBHOOK_SECRET` matches
  - Use Vercel logs to debug webhook calls
  - Test with mock webhook call (see Testing section)

### Database Connection Issues

- **Issue**: Prisma errors
- **Solution**:
  - Run `npx prisma generate` after schema changes
  - Check `DATABASE_URL` format
  - Ensure database is accessible
  - For Neon/Supabase: Add `?sslmode=require` to connection string

## 📚 Additional Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [Prisma Documentation](https://www.prisma.io/docs)
- [Google Maps JavaScript API](https://developers.google.com/maps/documentation/javascript)
- [Google Directions API](https://developers.google.com/maps/documentation/directions)
- [Nominatim Usage Policy](https://operations.osmfoundation.org/policies/nominatim/)
- [Ringg.ai Documentation](https://ringg.ai/docs)

## 📄 License

MIT License - feel free to use for your projects!

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 💡 Future Enhancements

- [ ] Bulk load upload via CSV
- [ ] Multiple vehicles simulation simultaneously  
- [ ] Historical journey replay
- [ ] Advanced analytics dashboard
- [ ] Driver mobile app integration
- [ ] Real-time GPS integration
- [ ] Route optimization algorithms
- [ ] Multi-stop journey support
- [ ] Push notifications for events
- [ ] Export reports (PDF/Excel)

---

Built with ❤️ for logistics AI innovation

