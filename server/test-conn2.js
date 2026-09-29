import hana from '@sap/hana-client';
import dotenv from 'dotenv';
dotenv.config();

const conn = hana.createConnection();
await new Promise((res, rej) => conn.connect({
  serverNode: `${process.env.HANA_HOST}:${process.env.HANA_PORT}`,
  uid: process.env.HANA_USER,
  pwd: process.env.HANA_PASSWORD,
  encrypt: true,
  sslValidateCertificate: false
}, err => err ? rej(err) : res()));

console.log('Connected! Testing exec with callback as 2nd arg:');
const rows = await new Promise((res, rej) => {
  conn.exec('SELECT CURRENT_USER, CURRENT_TIMESTAMP FROM DUMMY;', (err, r) => {
    if (err) return rej(err);
    res(r);
  });
});
console.log('Result:', rows);

console.log('Testing exec with params:');
const rows2 = await new Promise((res, rej) => {
  conn.exec('SELECT * FROM SYS.TABLES WHERE SCHEMA_NAME = ?', ['HACKFEST0238'], (err, r) => {
    if (err) return rej(err);
    res(r);
  });
});
console.log('Tables found:', rows2.map(t => t.TABLE_NAME));

conn.disconnect();
console.log('SUCCESS!');
