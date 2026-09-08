import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(process.cwd(), '.env') });

export default {
  env: process.env.NODE_ENV || 'development',
  port: process.env.PORT || 5000,
  database_url: process.env.DATABASE_URL,
  client_url: process.env.CLIENT_URL || 'http://localhost:5173',
  bcrypt_salt_rounds: Number(process.env.BCRYPT_SALT_ROUNDS) || 12,
  jwt: {
    access_secret: process.env.JWT_ACCESS_SECRET || 'dev_secret',
    access_expires_in: process.env.JWT_ACCESS_EXPIRES_IN || '1d',
    refresh_secret: process.env.JWT_REFRESH_SECRET || 'dev_refresh_secret',
    refresh_expires_in: process.env.JWT_REFRESH_EXPIRES_IN || '30d',
  },
};
