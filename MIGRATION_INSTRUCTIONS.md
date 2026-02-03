# Migration Instructions

## Option 1: Manual Application via Supabase Dashboard (Easiest)

1. Go to your Supabase project dashboard: https://app.supabase.com/project/bbyrxqkoqeroymqlykcj

2. Click on **SQL Editor** in the left sidebar

3. Click **New Query**

4. Copy and paste the entire contents of:
   ```
   supabase/migrations/20260203115047_create_dse_market_data_schema.sql
   ```

5. Click **Run** button

6. You should see a success message confirming the schema and tables were created

## Option 2: Using Supabase CLI (Recommended for automation)

First, install the Supabase CLI:

```bash
# Via Homebrew (macOS)
brew install supabase/tap/supabase

# Via npm
npm install -g supabase
```

Then apply the migration:

```bash
cd "/Users/sharraf/Documents/UCB STOCK/dse-pulse-stream"
supabase db push
```

The CLI will:
- Auto-detect your project from `supabase/config.toml`
- Apply all pending migrations
- Track which migrations have been applied

## Option 3: Using Node.js Script

If you want to use the included `apply-migration.js` script:

1. Add your service role key to `.env`:
   ```
   SUPABASE_SERVICE_ROLE_KEY="your-service-role-key-here"
   ```

2. Run the script:
   ```bash
   node apply-migration.js
   ```

## What Gets Created

The migration creates a new schema called `dse_market_data` with:

### Tables:
- **dse_market_data.historical_prices** - Stock price history (OHLCV data)
- **dse_market_data.webhook_events** - Webhook event tracking

### Features:
- Row-level security enabled
- Automatic timestamp management
- Efficient indexes for querying
- Public read-only access for historical prices

## Verification

After applying the migration, verify it worked by running this in the SQL Editor:

```sql
-- List all schemas
SELECT schema_name FROM information_schema.schemata;

-- List tables in dse_market_data schema
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'dse_market_data';

-- Check historical_prices table structure
DESC dse_market_data.historical_prices;

-- Check webhook_events table structure
DESC dse_market_data.webhook_events;
```

## Troubleshooting

If you encounter issues:

1. **Schema already exists**: The migration uses `CREATE SCHEMA IF NOT EXISTS`, so it's safe to run multiple times
2. **Permission denied**: Make sure you're using a service role key with full database access
3. **Syntax errors**: Check that the SQL file wasn't corrupted during transfer

For help, contact Supabase support: https://supabase.com/docs/guides/database/migrations
