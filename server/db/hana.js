import hana from '@sap/hana-client';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../.env') });

let sharedConnection = null;

export function getConnectionParams() {
  const host = process.env.HANA_HOST;
  const port = process.env.HANA_PORT || '443';
  const user = process.env.HANA_USER;
  const password = process.env.HANA_PASSWORD;
  const schema = process.env.HANA_SCHEMA || 'HACKFEST0238';

  if (!host || !user || !password) {
    throw new Error('HANA connection parameters missing: HANA_HOST, HANA_USER, or HANA_PASSWORD');
  }

  return {
    serverNode: `${host}:${port}`,
    uid: user,
    pwd: password,
    encrypt: true,
    sslValidateCertificate: false,
    currentSchema: schema
  };
}

/**
 * Get or create an active SAP HANA Cloud connection
 */
export async function getClient() {
  if (sharedConnection) {
    try {
      if (sharedConnection.state() === 'connected') {
        return sharedConnection;
      }
    } catch (_) {
      sharedConnection = null;
    }
  }

  const conn = hana.createConnection();
  await new Promise((resolve, reject) => {
    conn.connect(getConnectionParams(), (err) => {
      if (err) return reject(new Error(`HANA Connection Failed: ${err.message}`));
      resolve();
    });
  });

  sharedConnection = conn;
  return sharedConnection;
}

/**
 * Execute an SQL query against SAP HANA Cloud
 * @param {string} sql 
 * @param {Array} [params] 
 * @returns {Promise<any[]>}
 */
export async function executeQuery(sql, params) {
  const client = await getClient();
  return new Promise((resolve, reject) => {
    const callback = (err, rows) => {
      if (err) {
        return reject(new Error(`HANA Query Execution Error: ${err.message}`));
      }
      resolve(rows || []);
    };

    if (Array.isArray(params) && params.length > 0) {
      client.exec(sql, params, callback);
    } else {
      client.exec(sql, callback);
    }
  });
}

/**
 * Test real connection and execute:
 * SELECT CURRENT_USER, CURRENT_TIMESTAMP FROM DUMMY;
 */
export async function testHanaConnection() {
  const sql = 'SELECT CURRENT_USER, CURRENT_TIMESTAMP FROM DUMMY;';
  const results = await executeQuery(sql);
  if (!results || results.length === 0) {
    throw new Error('DUMMY query returned no rows');
  }
  return results[0];
}

/**
 * Inspect schema objects in HACKFEST0238
 */
export async function inspectSchema(targetSchema = process.env.HANA_SCHEMA || 'HACKFEST0238') {
  const sql = `
    SELECT TABLE_NAME, COMMENTS 
    FROM SYS.TABLES 
    WHERE SCHEMA_NAME = ?
    ORDER BY TABLE_NAME
  `;
  try {
    return await executeQuery(sql, [targetSchema.toUpperCase()]);
  } catch (error) {
    const fallbackSql = `SELECT TABLE_NAME FROM PUBLIC.TABLES WHERE SCHEMA_NAME = ?`;
    return await executeQuery(fallbackSql, [targetSchema.toUpperCase()]);
  }
}

export default {
  getClient,
  getConnectionParams,
  executeQuery,
  testHanaConnection,
  inspectSchema
};
