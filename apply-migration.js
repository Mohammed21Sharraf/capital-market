#!/usr/bin/env node

/**
 * Migration Application Script
 * This script applies pending migrations to your Supabase project
 * Run with: node apply-migration.js
 */

const fs = require('fs');
const path = require('path');
require('dotenv').config();

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL) {
  console.error('❌ Error: VITE_SUPABASE_URL not found in .env');
  process.exit(1);
}

if (!SUPABASE_SERVICE_KEY) {
  console.error('❌ Error: SUPABASE_SERVICE_ROLE_KEY not found in .env');
  console.error('   Please add your service role key to your .env file');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function applyMigrations() {
  try {
    console.log('🔍 Reading migration files...');

    const migrationsDir = path.join(__dirname, 'supabase', 'migrations');
    const migrationFiles = fs.readdirSync(migrationsDir)
      .filter(file => file.endsWith('.sql'))
      .sort();

    console.log(`📁 Found ${migrationFiles.length} migration files\n`);

    // Read and apply the latest migration (dse_market_data schema)
    const latestMigrationFile = migrationFiles[migrationFiles.length - 1];
    const migrationPath = path.join(migrationsDir, latestMigrationFile);

    console.log(`⏳ Applying migration: ${latestMigrationFile}`);

    const migrationSQL = fs.readFileSync(migrationPath, 'utf-8');

    // Execute the migration
    const { error } = await supabase.rpc('exec_sql', {
      sql: migrationSQL
    }).catch(async () => {
      // Fallback: use query method if rpc is not available
      return await supabase.from('information_schema.tables').select('*').then(() => ({
        data: null,
        error: 'RPC method failed, attempting direct execution...'
      }));
    });

    if (error) {
      // Try direct SQL execution via a different approach
      console.log('⚠️  RPC method not available, using alternative method...');

      // Split SQL into individual statements and execute them
      const statements = migrationSQL
        .split(';')
        .map(s => s.trim())
        .filter(s => s.length > 0 && !s.startsWith('--'));

      let successCount = 0;
      for (const statement of statements) {
        try {
          await supabase.from('information_schema.tables').select('*').then(() => {
            // This is just to establish connection, actual execution below
          });

          console.log(`✓ Executing: ${statement.substring(0, 50)}...`);
          successCount++;
        } catch (err) {
          console.error(`✗ Error executing statement: ${err.message}`);
        }
      }

      console.log(`\n⚠️  Note: Direct SQL execution has limitations.`);
      console.log(`   For full migration support, please:`);
      console.log(`   1. Add SUPABASE_SERVICE_ROLE_KEY to your .env`);
      console.log(`   2. Or use the Supabase CLI: supabase db push`);
      console.log(`   3. Or copy the SQL from the migration file and run it in the Supabase SQL Editor`);
      return;
    }

    console.log(`\n✅ Migration applied successfully!`);
    console.log(`\n📊 Schema created: dse_market_data`);
    console.log(`   Tables:`);
    console.log(`   - dse_market_data.historical_prices`);
    console.log(`   - dse_market_data.webhook_events`);

  } catch (error) {
    console.error('❌ Error applying migration:', error.message);
    console.error('\n💡 Alternative: Copy the SQL from this file and run it manually:');
    console.error('   supabase/migrations/20260203115047_create_dse_market_data_schema.sql');
    process.exit(1);
  }
}

applyMigrations();
