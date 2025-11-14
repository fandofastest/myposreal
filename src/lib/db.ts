import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { User } from '@/models/User';

const MONGODB_URI = process.env.MONGODB_URI as string;

if (!MONGODB_URI) {
  throw new Error('Missing MONGODB_URI in environment variables');
}

interface MongooseGlobal {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
}

const globalForMongoose = global as unknown as { _mongoose: MongooseGlobal };

if (!globalForMongoose._mongoose) {
  globalForMongoose._mongoose = { conn: null, promise: null };
}

export async function connectToDatabase() {
  const cache = globalForMongoose._mongoose;

  if (cache.conn) return cache.conn;

  if (!cache.promise) {
    cache.promise = mongoose.connect(MONGODB_URI, {
      dbName: process.env.MONGODB_DB || undefined,
    }).then(async (m) => {
      try {
        const superEmail = process.env.ADMIN_EMAIL || 'admin@pos.local';
        const superPass = process.env.ADMIN_PASSWORD || 'admin123';
        const existing = await User.findOne({ roles: { $in: ['superadmin'] } });
        if (!existing) {
          const passwordHash = await bcrypt.hash(superPass, 10);
          await User.create({
            name: 'Super Admin',
            email: superEmail,
            passwordHash,
            roles: ['superadmin'],
            status: 'active',
          });
          // eslint-disable-next-line no-console
          console.log(`[seed] Superadmin created: ${superEmail}`);
        }
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error('[seed] Superadmin seeding failed:', err);
      }
      return m;
    });
  }

  cache.conn = await cache.promise;
  return cache.conn;
}
