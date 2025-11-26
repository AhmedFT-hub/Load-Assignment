# Deployment Checklist

## Pre-Deployment

### ✅ Database Setup
- [ ] Create PostgreSQL database (Neon/Supabase recommended)
- [ ] Copy connection string
- [ ] Test connection with `npx prisma db pull`

### ✅ Google Maps Setup
- [ ] Enable Maps JavaScript API
- [ ] Enable Directions API
- [ ] Create API key
- [ ] (Optional) Restrict API key to your domain

### ✅ Ringg.ai Setup
- [ ] Create Ringg.ai account
- [ ] Set up call campaign
- [ ] Get API key
- [ ] Note webhook secret

### ✅ Local Testing
- [ ] Run `npm install`
- [ ] Create `.env.local` with all credentials
- [ ] Run `npx prisma generate`
- [ ] Run `npx prisma migrate dev`
- [ ] Test with `npm run dev`
- [ ] Create test journey and load
- [ ] Verify simulation works
- [ ] Verify geocoding works

## Vercel Deployment

### 1. Push to GitHub
```bash
git init
git add .
git commit -m "Initial commit: Load Assignment Agent"
git branch -M main
git remote add origin <your-repo-url>
git push -u origin main
```

### 2. Import to Vercel
1. Go to [vercel.com](https://vercel.com)
2. Click **Add New Project**
3. Import your GitHub repository
4. Configure project:
   - Framework: **Next.js**
   - Root Directory: `./`
   - Build Command: `npm run build`
   - Install Command: `npm install`
   - Output Directory: `.next`

### 3. Environment Variables
Add all variables from `.env.local`:

**Required:**
- `DATABASE_URL`
- `GOOGLE_MAPS_API_KEY`
- `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`
- `RINGG_API_KEY`
- `RINGG_CALL_ENDPOINT`
- `RINGG_WEBHOOK_SECRET`

**Optional:**
- `GEOCODER_BASE_URL`

### 4. Deploy
- Click **Deploy**
- Wait for build to complete
- Copy deployment URL

### 5. Post-Deployment Setup

#### Configure Ringg Webhook
1. Go to Ringg.ai dashboard
2. Navigate to webhook settings
3. Set webhook URL:
   ```
   https://your-app-name.vercel.app/api/ringg/webhook
   ```
4. Set method to **POST**
5. Add webhook secret
6. Save configuration

#### Test Deployment
1. Visit your Vercel URL
2. Create a test journey
3. Create a test load
4. Run simulation
5. Verify all features work:
   - Map loads correctly
   - Route displays
   - Simulation runs smoothly
   - Events log properly
   - Call trigger works (check Ringg dashboard)

## Production Database Migration

If you already have data locally and want to migrate:

### Option 1: Manual Data Entry
- Recreate journeys and loads in production UI

### Option 2: Database Dump (Advanced)
```bash
# Export from local
pg_dump load_assignment > backup.sql

# Import to production (example for Neon)
psql $PRODUCTION_DATABASE_URL < backup.sql
```

### Option 3: Seed Script
Create `prisma/seed.ts` with sample data and run:
```bash
npx prisma db seed
```

## Monitoring

### Vercel Dashboard
- Monitor deployments
- Check function logs
- View analytics
- Review error reports

### Database
- Neon: Use Neon dashboard for monitoring
- Supabase: Use Supabase dashboard + logs

### Google Maps
- Monitor API usage in Google Cloud Console
- Set up billing alerts
- Check for quota issues

### Ringg.ai
- Monitor call logs in Ringg dashboard
- Check webhook delivery status
- Review call outcomes

## Security Checklist

- [ ] All API keys in environment variables (not in code)
- [ ] `.env.local` in `.gitignore`
- [ ] Google Maps API key restricted (optional but recommended)
- [ ] Database connection uses SSL (`?sslmode=require`)
- [ ] Ringg webhook signature verification enabled
- [ ] Vercel environment variables marked as sensitive
- [ ] CORS configured if needed
- [ ] Rate limiting considered for public endpoints

## Performance Optimization

### Database
- [ ] Add indexes for frequently queried fields (already in schema)
- [ ] Monitor query performance with Prisma logging
- [ ] Consider connection pooling for high traffic

### Frontend
- [ ] Images optimized (none currently, but for future)
- [ ] Lazy loading implemented (Google Maps already lazy)
- [ ] Bundle size checked with `npm run build`

### API
- [ ] Response caching where appropriate
- [ ] Pagination for large lists (implement if needed)
- [ ] Rate limiting for webhook endpoint

## Rollback Plan

If deployment fails:

1. **Vercel**: Use "Redeploy" on previous successful deployment
2. **Database**: Don't run destructive migrations in production
3. **Code**: Revert to last working commit:
   ```bash
   git revert HEAD
   git push
   ```

## Custom Domain (Optional)

1. Go to Vercel project settings
2. Navigate to **Domains**
3. Add your custom domain
4. Update DNS records as instructed
5. Update Ringg webhook URL to new domain
6. Update Google Maps API key restrictions (if using)

## Scaling Considerations

When your app grows:

- **Database**: Upgrade Neon/Supabase plan for more connections
- **Vercel**: Monitor function execution time (10s limit on hobby plan)
- **Google Maps**: Monitor API costs, consider implementing caching
- **Ringg**: Review call volume and pricing tier

## Support

- **Vercel Issues**: [Vercel Support](https://vercel.com/support)
- **Database Issues**: Check Neon/Supabase docs
- **Code Issues**: See [README.md](./README.md) troubleshooting section

---

🚀 **Ready to deploy?** Follow this checklist step-by-step for a smooth deployment!

