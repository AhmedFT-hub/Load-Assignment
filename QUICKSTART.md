# Quick Start Guide

Get the Load Assignment Agent running in 5 minutes!

## Prerequisites
- Node.js 18+ installed
- PostgreSQL database (or Neon/Supabase account)
- Google Maps API key
- Ringg.ai account

## Step-by-Step Setup

### 1. Install Dependencies
```bash
npm install
```

### 2. Set Up Environment Variables
Create `.env.local` file (copy from `env.example.txt`):
```bash
cp env.example.txt .env.local
```

Then edit `.env.local` with your actual credentials:
- `DATABASE_URL`: Your PostgreSQL connection string
- `GOOGLE_MAPS_API_KEY` and `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`: Same Google Maps key
- `RINGG_API_KEY`, `RINGG_CALL_ENDPOINT`, `RINGG_WEBHOOK_SECRET`: From Ringg.ai

### 3. Initialize Database
```bash
# Generate Prisma client
npx prisma generate

# Run database migrations
npx prisma migrate dev --name init
```

### 4. Start Development Server
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Quick Test

### Create a Journey
1. Go to **Manage Journeys** (top right)
2. Click **+ Create Journey**
3. Fill in:
   - Origin: `Mumbai, India`
   - Destination: `Delhi, India`
   - Driver: `John Doe`
   - Phone: `+91-9876543210`
   - Vehicle: `MH12AB1234`
   - Transporter: `ABC Logistics`
   - Start Time: (now)
   - ETA: (2 hours from now)
   - Fleet: `own`
4. Click **Create Journey**

### Create a Load
1. Go to **Manage Loads**
2. Click **+ Create Load**
3. Fill in:
   - Pickup: `Delhi, India`
   - Drop: `Bangalore, India`
   - Commodity: `Electronics`
   - Rate: `25000`
   - Reporting Time: (2 hours from now)
   - Mode: `FTL`
   - Vehicle: `32ft`
4. Click **Create Load**

### Run Simulation
1. Go to **Dashboard** (home)
2. Find your journey in the selector
3. Click **Simulate Journey**
4. Click **Start Simulation**
5. Click **Jump Near Destination** to quickly trigger the call

Watch the magic happen! 🎉

## Troubleshooting

### Can't connect to database?
- For **Neon**: Get connection string from Neon dashboard
- For **Supabase**: Project Settings → Database → Connection string (URI mode)
- For **Local**: Make sure PostgreSQL is running (`brew services start postgresql@14`)

### Map not loading?
- Check both `GOOGLE_MAPS_API_KEY` and `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` are set
- Verify APIs are enabled: Maps JavaScript API + Directions API

### Geocoding fails?
- Be specific: "Mumbai, India" instead of just "Mumbai"
- Nominatim has rate limits (1 request/second)

## Need Help?
See the full [README.md](./README.md) for detailed documentation.

