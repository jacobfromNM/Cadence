// src/lib/supabase.js
//
// Single Supabase client instance for the whole app.
// Reads credentials from environment variables set in .env.local
//
// To activate real Supabase:
//   1. Create a project at supabase.com
//   2. Copy your Project URL and anon key into .env.local
//   3. Set VITE_USE_MOCK_DATA=false in .env.local
//   4. Run the SQL in /supabase/schema.sql in your Supabase SQL editor

import { createClient } from '@supabase/supabase-js'

const supabaseUrl  = import.meta.env.VITE_SUPABASE_URL  || 'https://placeholder.supabase.co'
const supabaseKey  = import.meta.env.VITE_SUPABASE_ANON_KEY || 'placeholder-key'

export const supabase = createClient(supabaseUrl, supabaseKey)

// Whether to use local mock data instead of hitting Supabase.
// Controlled by VITE_USE_MOCK_DATA in .env.local
export const USE_MOCK = import.meta.env.VITE_USE_MOCK_DATA !== 'false'
