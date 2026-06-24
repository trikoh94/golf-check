import { createClient } from '@supabase/supabase-js'

const SB_URL = 'https://wecsemcnuzsvwocmfqhi.supabase.co'
const SB_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndlY3NlbWNudXpzdndvY21mcWhpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEzNzg0MTMsImV4cCI6MjA5Njk1NDQxM30.FWIJOB4OxjvC28eboBRXR0WJdr66YWYIt4ajEL6w5fU'

export const supabase = createClient(SB_URL, SB_KEY)
