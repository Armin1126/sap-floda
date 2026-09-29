import { inspectSchema, executeQuery } from './db/hana.js';

console.log('Inspecting schema HACKFEST0238...');
try {
  const tables = await inspectSchema('HACKFEST0238');
  console.log(`Found ${tables.length} tables in HACKFEST0238:`);
  console.log(JSON.stringify(tables, null, 2));

  console.log('\nChecking all schemas accessible:');
  const schemas = await executeQuery(`SELECT SCHEMA_NAME FROM SYS.SCHEMAS WHERE SCHEMA_NAME LIKE '%HACKFEST%'`);
  console.log(JSON.stringify(schemas, null, 2));

  console.log('\nChecking user privileges / tables accessible by current user:');
  const userTables = await executeQuery(`SELECT TABLE_NAME, SCHEMA_NAME FROM SYS.M_TABLES WHERE SCHEMA_NAME = 'HACKFEST0238'`);
  console.log(`M_TABLES count: ${userTables.length}`);
  console.log(JSON.stringify(userTables, null, 2));
} catch (e) {
  console.error('Inspection error:', e.message);
}
