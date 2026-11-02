import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://fdtinjhomdpxzcvfmsev.supabase.co';
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.argv[2];

if (!SERVICE_ROLE_KEY) {
  console.error('\x1b[31mError: Supabase Service Role Key is required to delete accounts and bypass RLS.\x1b[0m');
  console.log('\nUsage:');
  console.log('  node scripts/reset-db.mjs <SUPABASE_SERVICE_ROLE_KEY>');
  console.log('or');
  console.log('  $env:SUPABASE_SERVICE_ROLE_KEY="your-key"; node scripts/reset-db.mjs\n');
  console.log('You can find your service_role secret key in:');
  console.log('  https://supabase.com/dashboard/project/fdtinjhomdpxzcvfmsev/settings/api');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function resetAllDataAndAccounts() {
  console.log('\x1b[33m[1/3] Fetching all user accounts from Supabase Auth...\x1b[0m');
  const { data: { users }, error: listError } = await supabase.auth.admin.listUsers({
    page: 1,
    perPage: 1000,
  });

  if (listError) {
    console.error('\x1b[31mFailed to retrieve users:\x1b[0m', listError.message);
    process.exit(1);
  }

  console.log(`Found ${users.length} user accounts.`);

  console.log('\x1b[33m[2/3] Deleting user accounts (triggers CASCADE deletion of profiles & financial data)...\x1b[0m');
  for (const user of users) {
    const { error: delError } = await supabase.auth.admin.deleteUser(user.id);
    if (delError) {
      console.error(`  - Failed to delete user ${user.id} (${user.email}):`, delError.message);
    } else {
      console.log(`  ✓ Deleted user: ${user.email || user.id}`);
    }
  }

  console.log('\x1b[33m[3/3] Purging any remaining custom user categories...\x1b[0m');
  const { error: catError } = await supabase
    .from('categories')
    .delete()
    .not('user_id', 'is', null);

  if (catError) {
    console.warn('  Warning purging custom categories:', catError.message);
  } else {
    console.log('  ✓ Cleaned up custom user categories.');
  }

  console.log('\n\x1b[32m✔ Reset complete! All user accounts and financial data have been permanently removed.\x1b[0m');
}

resetAllDataAndAccounts().catch((err) => {
  console.error('\x1b[31mUnexpected error:\x1b[0m', err);
  process.exit(1);
});
