// Migration script that handles baseline and new migrations
const { execSync } = require('child_process');
const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

async function runMigrations() {
  const prisma = new PrismaClient();
  
  try {
    // First, check if Zone table exists
    try {
      await prisma.$queryRaw`SELECT 1 FROM "Zone" LIMIT 1`;
      console.log('✓ Zone table already exists. Skipping migration.');
      await prisma.$disconnect();
      return;
    } catch (checkError) {
      // Zone table doesn't exist, we need to create it
      console.log('Zone table does not exist. Creating it...');
    }

    // Try normal migration first
    try {
      console.log('Running Prisma migrations...');
      const output = execSync('npx prisma migrate deploy', { encoding: 'utf8', stdio: 'pipe' });
      console.log(output);
      console.log('✓ Migrations completed successfully.');
      await prisma.$disconnect();
      return;
    } catch (migrateError) {
      // execSync throws an error object, check stderr, stdout, and message
      const stderr = migrateError.stderr?.toString() || '';
      const stdout = migrateError.stdout?.toString() || '';
      const errorOutput = stderr + stdout + (migrateError.message || '');
      
      console.log('Migration error detected. Checking for baseline issue...');
      console.log('Error output:', errorOutput.substring(0, 300));
      
      // If migration fails due to baseline issue (P3005), run SQL directly
      // P3005 means database schema is not empty
      if (errorOutput.includes('P3005') || errorOutput.includes('not empty') || errorOutput.includes('schema is not empty') || errorOutput.includes('baseline')) {
        console.log('Database has existing schema. Running migration SQL directly...');
        
        // Read and execute the migration SQL
        const sqlPath = path.join(__dirname, '../prisma/migrations/20241127000000_add_zones/migration.sql');
        
        if (!fs.existsSync(sqlPath)) {
          throw new Error(`Migration SQL file not found: ${sqlPath}`);
        }
        
        const sql = fs.readFileSync(sqlPath, 'utf8');
        
        // Split SQL into individual statements
        const statements = sql
          .split(';')
          .map(s => s.trim())
          .filter(s => s.length > 0 && !s.startsWith('--'));
        
        for (const statement of statements) {
          if (statement.trim()) {
            try {
              await prisma.$executeRawUnsafe(statement);
              console.log('✓ Executed SQL statement');
            } catch (sqlError) {
              // Ignore errors for things that already exist
              const errorMsg = sqlError.message || '';
              if (errorMsg.includes('already exists') || errorMsg.includes('duplicate')) {
                console.log('⚠ Skipping (already exists):', statement.substring(0, 50) + '...');
              } else {
                console.error('✗ SQL Error:', sqlError.message);
                throw sqlError;
              }
            }
          }
        }
        
        console.log('✓ Zone table created successfully.');
        await prisma.$disconnect();
        return;
      } else {
        // Some other error occurred
        throw migrateError;
      }
    }
  } catch (error) {
    console.error('✗ Migration failed:', error.message);
    await prisma.$disconnect();
    process.exit(1);
  }
}

runMigrations();

