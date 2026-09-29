import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { executeQuery } from './db/hana.js';

const JWT_SECRET = process.env.JWT_SECRET || 'floda-sap-hackfest-2026-secret-key-prod';
const DEMO_PASSWORD = process.env.DEMO_USER_PASSWORD || 'FlodaDemo2026!';

export function hashPassword(password, salt) {
  if (!salt) {
    salt = crypto.randomBytes(16).toString('hex');
  }
  const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
  return { hash, salt };
}

export function verifyPassword(password, hash, salt) {
  const check = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
  return check === hash;
}

export function generateToken(user) {
  return jwt.sign(
    {
      userId: user.user_id,
      email: user.email,
      role: user.role,
      fullName: user.full_name,
      organization: user.organization
    },
    JWT_SECRET,
    { expiresIn: '24h' }
  );
}

export function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch {
    return null;
  }
}

// Predefined demo accounts with employee IDs
export const DEMO_USERS = [
  {
    userId: 'USR-AUTH-001',
    employeeId: 'EMP-AUTH-101',
    email: 'authority@floda.local',
    role: 'AUTHORITY',
    fullName: 'Srivatsan Venkat',
    organization: 'Nepal National Highway & Corridor Authority'
  },
  {
    userId: 'USR-TRN-002',
    employeeId: 'EMP-TRN-202',
    email: 'transport@floda.local',
    role: 'TRANSPORT',
    fullName: 'Rajesh Shrestha',
    organization: 'Himalayan Heavy Haul & Transport Alliance'
  },
  {
    userId: 'USR-LOG-003',
    employeeId: 'EMP-LOG-303',
    email: 'logistics@floda.local',
    role: 'LOGISTICS',
    fullName: 'Pooja Thapa',
    organization: 'Nepal Essential Supply Chain Consortium'
  },
  {
    userId: 'USR-INV-004',
    employeeId: 'EMP-INV-404',
    email: 'inventory@floda.local',
    role: 'INVENTORY',
    fullName: 'Bikram Adhikari',
    organization: 'Kathmandu Valley Strategic Depots'
  },
  {
    userId: 'USR-CMP-005',
    employeeId: 'EMP-CMP-505',
    email: 'compliance@floda.local',
    role: 'COMPLIANCE',
    fullName: 'Anita Sharma',
    organization: 'Department of Drug Admin & Hazardous Transit'
  }
];

export async function seedUsers() {
  console.log('Seeding demo users into SAP HANA Cloud FLODA_USERS table...');
  for (const u of DEMO_USERS) {
    const { hash, salt } = hashPassword(DEMO_PASSWORD);
    try {
      // Check if user exists
      const existing = await executeQuery(
        `SELECT user_id FROM FLODA_USERS WHERE email = ?`,
        [u.email]
      );
      if (existing.length === 0) {
        await executeQuery(
          `INSERT INTO FLODA_USERS (user_id, employee_id, email, password_hash, salt, role, full_name, organization, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
          [u.userId, u.employeeId, u.email, hash, salt, u.role, u.fullName, u.organization]
        );
      } else {
        // Update password hash and employee_id if already present
        await executeQuery(
          `UPDATE FLODA_USERS SET employee_id = ?, password_hash = ?, salt = ?, role = ?, full_name = ?, organization = ? WHERE email = ?`,
          [u.employeeId, hash, salt, u.role, u.fullName, u.organization, u.email]
        );
      }
    } catch (err) {
      console.error(`Error seeding user ${u.email}:`, err.message);
    }
  }
  console.log('Demo users seeded successfully in SAP HANA Cloud.');
}

export async function registerUser({ employeeId, fullName, email, password, role, organization }) {
  if (!employeeId || !fullName || !email || !password || !role) {
    throw new Error('Employee ID, full name, email, password, and department are required');
  }

  const existingEmail = await executeQuery(
    `SELECT user_id FROM FLODA_USERS WHERE email = ?`,
    [email.toLowerCase().trim()]
  );
  if (existingEmail.length > 0) {
    throw new Error('An account with this email address already exists');
  }

  const existingEmp = await executeQuery(
    `SELECT user_id FROM FLODA_USERS WHERE employee_id = ?`,
    [employeeId.toUpperCase().trim()]
  );
  if (existingEmp.length > 0) {
    throw new Error('An account with this Employee ID is already registered');
  }

  const userId = `USR-${role.substring(0, 3)}-${Date.now()}`;
  const { hash, salt } = hashPassword(password);
  const normalizedEmail = email.toLowerCase().trim();
  const normalizedEmpId = employeeId.toUpperCase().trim();
  const org = organization || `${role} Department Agency`;

  await executeQuery(
    `INSERT INTO FLODA_USERS (user_id, employee_id, email, password_hash, salt, role, full_name, organization, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
    [userId, normalizedEmpId, normalizedEmail, hash, salt, role, fullName.trim(), org]
  );

  return {
    userId,
    employeeId: normalizedEmpId,
    email: normalizedEmail,
    role,
    fullName: fullName.trim(),
    organization: org
  };
}

// Authentication middleware
export function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    req.user = null;
    return next();
  }
  const token = authHeader.substring(7);
  const decoded = verifyToken(token);
  req.user = decoded;
  next();
}

export function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    if (allowedRoles.length > 0 && !allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ error: `Access denied. Requires role: ${allowedRoles.join(' or ')}` });
    }
    next();
  };
}
