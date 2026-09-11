const { createClient } = require('@supabase/supabase-js')
const supabaseUrl = 'https://ecbqhlfguzkwffqbtbqz.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVjYnFobGZndXprd2ZmcWJ0YnF6Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3OTk2MjU0NywiZXhwIjoyMDk1NTM4NTQ3fQ.JJP29jZrUhZK_Vnwfi6r-D5vlumjAdFaH_75Gl0Ik_Y'
const supabase = createClient(supabaseUrl, supabaseKey)

async function test() {
  const { error } = await supabase.from('profiles').update({ kyc_status: 'pending' }).eq('email', 'firegamingonly@gmail.com')
  console.log("Reset Darshan to pending:", error?.message || 'Success')
}
test()
