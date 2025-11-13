// Run this script to fix orders.updated_at timezone issue
// Usage: node run_fix_updated_at.js

require('dotenv').config();
const mysql = require('mysql2/promise');

async function fixUpdatedAt() {
   console.log('🔧 Starting to fix orders.updated_at column...');

   const connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'test',
   });

   try {
      // Check current table definition
      console.log('📋 Current table definition:');
      const [createResult] = await connection.query('SHOW CREATE TABLE orders');
      console.log(createResult[0]['Create Table']);
      console.log('\n');

      // Remove ON UPDATE CURRENT_TIMESTAMP
      console.log('🔄 Modifying updated_at column...');
      await connection.query(`
			ALTER TABLE orders 
			MODIFY COLUMN updated_at DATETIME DEFAULT NULL
		`);

      console.log('✅ Column modified successfully!');
      console.log('\n');

      // Verify change
      console.log('📋 New table definition:');
      const [newCreateResult] = await connection.query('SHOW CREATE TABLE orders');
      console.log(newCreateResult[0]['Create Table']);

      console.log('\n✅ Fix completed! MySQL will no longer auto-update updated_at with UTC time.');
      console.log('ℹ️  Application will now set updated_at manually with Vietnam timezone.');

   } catch (error) {
      console.error('❌ Error:', error.message);
      throw error;
   } finally {
      await connection.end();
   }
}

fixUpdatedAt()
   .then(() => {
      console.log('\n🎉 Done!');
      process.exit(0);
   })
   .catch((error) => {
      console.error('\n💥 Failed:', error);
      process.exit(1);
   });
