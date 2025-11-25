#!/usr/bin/env node

import { supabase } from '../config/database';

async function main() {
  const verifiedEmail = process.env.VERIFIED_EMAIL || '2006tuankhang@gmail.com';
  
  console.log(`🔄 Updating all user emails to: ${verifiedEmail}\n`);

  try {
    const { data: users, error: fetchError } = await supabase
      .from('users')
      .select('id, name, email');

    if (fetchError) {
      throw new Error(`Failed to fetch users: ${fetchError.message}`);
    }

    if (!users || users.length === 0) {
      console.log('⚠️  No users found in database.');
      return;
    }

    console.log(`Found ${users.length} users to update:\n`);

    for (const user of users) {
      const { error: updateError } = await supabase
        .from('users')
        .update({ email: verifiedEmail })
        .eq('id', user.id);

      if (updateError) {
        console.error(`❌ Failed to update ${user.name} (${user.email}):`, updateError.message);
      } else {
        console.log(`✓ Updated ${user.name}: ${user.email} → ${verifiedEmail}`);
      }
    }

    console.log(`\n✅ Email update complete! All users now use: ${verifiedEmail}`);
    console.log(`\n💡 You can now run: npm run send:weekly`);
  } catch (error: any) {
    console.error('\n❌ Error:', error.message || error);
    process.exit(1);
  }
}

main();

