

import { createClient } from '@supabase/supabase-js';
// FIX: Use the 'Database' type which is the standard for Supabase and fixes type resolution.
import type { Database } from '../types';

// IMPORTANT: Replace with your own Supabase project details.
// You can find these in your Supabase project settings under "API".
const supabaseUrl = 'https://ylosurokkjwfqnuwourj.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inlsb3N1cm9ra2p3ZnFudXdvdXJqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc2NjY4ODYsImV4cCI6MjA3MzI0Mjg4Nn0.PiNB7zZnei9C_6d9Wn2crGIRem_hPYsagZxY7iVX654';

// In a real production app, these would be environment variables.
// For this project, you can paste them directly here.

// FIX: Use the 'Database' type which is the standard for Supabase and fixes type resolution.
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);