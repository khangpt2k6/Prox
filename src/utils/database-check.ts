import { supabase } from '../config/database';

export async function verifyDatabaseSetup(): Promise<void> {
  const requiredTables = ['retailers', 'products', 'deals', 'users'];
  const missingTables: string[] = [];

  for (const table of requiredTables) {
    try {
      const { error } = await supabase.from(table).select('*').limit(1);
      
      if (error) {
        if (error.message.includes('does not exist') || 
            error.message.includes('schema cache') ||
            error.code === '42P01') {
          missingTables.push(table);
        }
      }
    } catch (err: any) {
      if (err.message?.includes('does not exist') || 
          err.message?.includes('schema cache')) {
        missingTables.push(table);
      }
    }
  }

  if (missingTables.length > 0) {
    const errorMessage = `
❌ Database tables not found!

The following tables are missing: ${missingTables.join(', ')}

📋 Setup Instructions:
1. Go to your Supabase project dashboard
2. Navigate to SQL Editor → New Query
3. Copy and paste the contents of supabase/schema.sql
4. Click "Run" to execute the schema
5. Verify tables exist in Table Editor

For detailed setup instructions, see SETUP.md

Error details: Tables ${missingTables.join(', ')} do not exist in the database.
    `.trim();

    throw new Error(errorMessage);
  }
}

