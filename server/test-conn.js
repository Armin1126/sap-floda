import hana from '@sap/hana-client';
import dotenv from 'dotenv';
dotenv.config();

const host = process.env.HANA_HOST;
const port = process.env.HANA_PORT || '443';
const user = process.env.HANA_USER;
const password = process.env.HANA_PASSWORD;

const testConfigs = [
  {
    label: 'Standard encrypt=true',
    params: {
      serverNode: `${host}:${port}`,
      uid: user,
      pwd: password,
      encrypt: true
    }
  },
  {
    label: 'encrypt=true, sslValidateCertificate=false',
    params: {
      serverNode: `${host}:${port}`,
      uid: user,
      pwd: password,
      encrypt: true,
      sslValidateCertificate: false
    }
  },
  {
    label: 'encrypt=true, sslCryptoProvider=openssl',
    params: {
      serverNode: `${host}:${port}`,
      uid: user,
      pwd: password,
      encrypt: true,
      sslCryptoProvider: 'openssl'
    }
  },
  {
    label: 'encrypt=true, sslHostNameInCertificate',
    params: {
      serverNode: `${host}:${port}`,
      uid: user,
      pwd: password,
      encrypt: true,
      sslHostNameInCertificate: host
    }
  },
  {
    label: 'Minimal connection string',
    params: `SERVERNODE=${host}:${port};UID=${user};PWD=${password};ENCRYPT=TRUE;`
  },
  {
    label: 'Connection string with sslValidateCertificate=false',
    params: `SERVERNODE=${host}:${port};UID=${user};PWD=${password};ENCRYPT=TRUE;sslValidateCertificate=false;`
  }
];

for (const config of testConfigs) {
  console.log(`\n--- Testing [${config.label}] ---`);
  const conn = hana.createConnection();
  try {
    await new Promise((resolve, reject) => {
      conn.connect(config.params, (err) => {
        if (err) return reject(err);
        resolve();
      });
    });

    console.log('CONNECTED SUCCESSFULLY to SAP HANA Cloud!');
    const rows = await new Promise((resolve, reject) => {
      conn.exec('SELECT CURRENT_USER, CURRENT_TIMESTAMP FROM DUMMY;', (err, res) => {
        if (err) return reject(err);
        resolve(res);
      });
    });
    console.log('Query result:', rows);

    conn.disconnect();
    console.log('Done!');
    process.exit(0);
  } catch (err) {
    console.error('Failed:', err.message);
  }
}
