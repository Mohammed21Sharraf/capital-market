import { readFileSync } from 'fs';
import { createClient } from '@supabase/supabase-js';

// Read .env file manually
const envFile = readFileSync('.env', 'utf-8');
const env = {};
envFile.split('\n').forEach(line => {
  const match = line.match(/^(\w+)="?([^"]*)"?$/);
  if (match) env[match[1]] = match[2];
});

const SUPABASE_URL = env.VITE_SUPABASE_URL;
const SUPABASE_KEY = env.VITE_SUPABASE_PUBLISHABLE_KEY;

console.log('--- Supabase Connection Test ---\n');
console.log(`URL:  ${SUPABASE_URL}`);
console.log(`Key:  ${SUPABASE_KEY?.substring(0, 20)}...`);

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('\n❌ Missing SUPABASE_URL or SUPABASE_KEY in .env');
  process.exit(1);
}

// Use dse_market_data as the default schema (matches client.ts)
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  db: { schema: 'dse_market_data' },
});

async function testConnection() {
  // Test 1: historical_prices table
  console.log('\n[1] Testing dse_market_data.historical_prices...');
  try {
    const { data, error } = await supabase.from('historical_prices').select('id').limit(1);
    if (error) {
      console.log(`    ⚠️  ${error.message}`);
    } else {
      console.log(`    ✅ Connected (${data.length} row(s) returned)`);
    }
  } catch (e) {
    console.log(`    ❌ Connection failed: ${e.message}`);
  }

  // Test 2: webhook_events table
  console.log('\n[2] Testing dse_market_data.webhook_events...');
  try {
    const { data, error } = await supabase.from('webhook_events').select('id').limit(1);
    if (error) {
      console.log(`    ⚠️  ${error.message}`);
    } else {
      console.log(`    ✅ Connected (${data.length} row(s) returned)`);
    }
  } catch (e) {
    console.log(`    ❌ Connection failed: ${e.message}`);
  }

  // Test 3: Auth health check
  console.log('\n[3] Testing auth service...');
  try {
    const { data, error } = await supabase.auth.getSession();
    if (error) {
      console.log(`    ⚠️  Auth: ${error.message}`);
    } else {
      console.log(`    ✅ Auth service: Reachable`);
    }
  } catch (e) {
    console.log(`    ❌ Auth: ${e.message}`);
  }

  console.log('\n--- Test Complete ---\n');
}

testConnection();
