#!/usr/bin/env node

import { IngestionService } from './services/ingestion';
import { DealsService } from './services/deals';
import { EmailService } from './services/email';
import { sampleDeals, testUsers } from './data/sample-data';
import { verifyDatabaseSetup } from './utils/database-check';

async function main() {
  console.log('🚀 Starting Weekly Deals Email Automation...\n');

  try {
    console.log('🔍 Verifying database setup...');
    try {
      await verifyDatabaseSetup();
      console.log('✓ Database tables verified\n');
    } catch (dbError: any) {
      console.error(dbError.message || dbError);
      process.exit(1);
    }

    const ingestionService = new IngestionService();
    const dealsService = new DealsService();
    const emailService = new EmailService();

    console.log('📥 Step 1: Ingesting deal data...');
    await ingestionService.ingestDeals(sampleDeals);
    console.log('');

    console.log('👥 Step 2: Seeding test users...');
    await ingestionService.seedUsers(testUsers);
    console.log('');

    console.log('📧 Step 3: Preparing personalized emails...');
    const users = await dealsService.getAllUsers();

    if (users.length === 0) {
      console.log('⚠️  No users found. Please seed users first.');
      return;
    }

    console.log(`\n📋 Users found in database:`);
    users.forEach((user, idx) => {
      console.log(`   ${idx + 1}. ${user.name} (${user.email}) - Preferred: ${user.preferred_retailers?.join(', ') || 'none'}`);
    });
    console.log('');

    console.log(`📨 Step 4: Sending emails to ${users.length} users...\n`);

    for (let i = 0; i < users.length; i++) {
      const user = users[i];
      try {
        const deals = await dealsService.getDealsForUser(
          user.preferred_retailers || [],
          6
        );

        if (deals.length > 0) {
          await emailService.sendWeeklyDealsEmail(
            user.email,
            user.name,
            deals
          );
          
          if (i < users.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 600));
          }
        } else {
          console.log(`⚠️  No deals found for ${user.email} (preferred retailers: ${user.preferred_retailers.join(', ')})`);
        }
      } catch (error: any) {
        if (error?.message?.includes('only send testing emails')) {
          console.error(`⚠️  Resend limitation: ${user.email} - Resend free tier only allows sending to your verified email address.`);
          console.error(`   To send to other recipients, verify a domain at resend.com/domains`);
        } else if (error?.message?.includes('Too many requests')) {
          console.error(`⚠️  Rate limit: ${user.email} - Waiting before retry...`);
          await new Promise(resolve => setTimeout(resolve, 2000));
        } else {
          console.error(`❌ Error processing user ${user.email}:`, error.message || error);
        }
      }
    }

    console.log('\n✅ Weekly deals email automation complete!');
  } catch (error) {
    console.error('\n❌ Error:', error);
    process.exit(1);
  }
}

main();

