import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://kmpczpeltybcyaidmbsy.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImttcGN6cGVsdHliY3lhaWRtYnN5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODk3NDMxODUsImV4cCI6MjEwNTMxOTE4NX0.il531PW6Y0mPjSqgmgyelpZiqnolv49885lIFHiidOU';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);