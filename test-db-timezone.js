/**
 * Test MySQL timezone configuration
 * Run: node test-db-timezone.js
 */

const mysql = require('mysql2/promise');
require('dotenv').config();

async function testTimezone() {
   console.log('🔍 Testing MySQL Timezone Configuration\n');
   console.log('='.repeat(60));

   try {
      // Create connection with timezone
      const connection = await mysql.createConnection({
         host: process.env.DB_HOST,
         port: Number(process.env.DB_PORT) || 3306,
         user: process.env.DB_USER,
         password: process.env.DB_PASSWORD,
         database: process.env.DB_NAME,
         timezone: '+07:00', // Vietnam timezone
      });

      console.log('✅ Connected to MySQL\n');

      // Set timezone for this connection
      await connection.query("SET time_zone = '+07:00'");
      console.log('🔧 Set time_zone = \'+07:00\' for this connection\n');

      // Test 1: Check current timezone
      console.log('1️⃣ TIMEZONE SETTINGS:');
      console.log('-'.repeat(60));
      const [tzResult] = await connection.query(
         "SELECT @@session.time_zone as session_tz, @@global.time_zone as global_tz"
      );
      console.log('Session timezone:', tzResult[0].session_tz);
      console.log('Global timezone:', tzResult[0].global_tz);      // Test 2: Check NOW() value
      console.log('\n2️⃣ NOW() FUNCTION TEST:');
      console.log('-'.repeat(60));
      const [nowResult] = await connection.query("SELECT NOW() as vn_time");
      console.log('NOW() MySQL:', nowResult[0].vn_time);

      const mysqlTime = new Date(nowResult[0].vn_time);
      const utcTime = new Date();
      const hoursDiff = Math.round((mysqlTime - utcTime) / (1000 * 60 * 60));

      console.log('NOW() JavaScript UTC:', utcTime.toISOString());
      console.log('Hours difference:', hoursDiff, '(should be 7)');

      if (hoursDiff === 7) {
         console.log('✅ CORRECT: GMT+7 timezone is working!');
      } else {
         console.log('❌ ERROR: Timezone not GMT+7!');
      }

      // Test 3: Check users table structure
      console.log('\n3️⃣ USERS TABLE STRUCTURE:');
      console.log('-'.repeat(60));
      const [columns] = await connection.query(
         `SELECT COLUMN_NAME, DATA_TYPE, COLUMN_TYPE, COLUMN_DEFAULT, EXTRA
       FROM INFORMATION_SCHEMA.COLUMNS
       WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'users' AND COLUMN_NAME LIKE '%created%'`,
         [process.env.DB_NAME]
      );

      if (columns.length > 0) {
         columns.forEach(col => {
            console.log(`Column: ${col.COLUMN_NAME}`);
            console.log(`  Type: ${col.COLUMN_TYPE}`);
            console.log(`  Default: ${col.COLUMN_DEFAULT}`);
            console.log(`  Extra: ${col.EXTRA}`);

            if (col.DATA_TYPE === 'datetime') {
               console.log('  ⚠️  WARNING: DATETIME columns do NOT respect connection timezone!');
               console.log('  💡 Recommendation: Change to TIMESTAMP for auto timezone conversion');
            } else if (col.DATA_TYPE === 'timestamp') {
               console.log('  ✅ TIMESTAMP columns respect connection timezone');
            }
         });
      } else {
         console.log('No created_at column found');
      }

      // Test 4: Simulate INSERT
      console.log('\n4️⃣ SIMULATE INSERT TEST:');
      console.log('-'.repeat(60));
      const [insertTest] = await connection.query("SELECT NOW() as would_insert");
      console.log('Value that would be inserted:', insertTest[0].would_insert);

      const insertDate = new Date(insertTest[0].would_insert);
      const utcDate = new Date();

      console.log('JavaScript UTC time:', utcDate.toISOString());
      console.log('MySQL NOW() time:', insertDate.toISOString());
      console.log('Difference:', hoursDiff.toFixed(1), 'hours');

      await connection.end();

      console.log('\n' + '='.repeat(60));
      console.log('🎯 SUMMARY:');
      console.log('-'.repeat(60));

      if (hoursDiff === 7) {
         console.log('✅ Timezone configuration is CORRECT (GMT+7)');
         console.log('✅ Server is ready to use Vietnam timezone');
      } else {
         console.log('❌ Timezone configuration has issues');
         console.log('💡 Connection timezone setting might not be applied correctly');
         console.log('💡 Check if MySQL server timezone is set to SYSTEM');
      }

      console.log('='.repeat(60));

   } catch (error) {
      console.error('❌ Error:', error.message);
      process.exit(1);
   }
}

testTimezone();
