#!/usr/bin/env node

import { IngestionService } from '../services/ingestion';
import { sampleDeals, testUsers } from '../data/sample-data';
import { verifyDatabaseSetup } from '../utils/database-check';


async function main() {
  console.log('📥 Starting data ingestion...\n');

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

    await ingestionService.ingestDeals(sampleDeals);
    console.log('');

    await ingestionService.seedUsers(testUsers);

    console.log('\n✅ Ingestion complete!');
  } catch (error) {
    console.error('\n❌ Error:', error);
    process.exit(1);
  }
}

main();

