import { ConnectionOptions } from 'typeorm';
import { User } from './src/entities/User';

const config: ConnectionOptions = {
  type: 'postgres',
  url: process.env.DATABASE_URL, // This will be automatically set by Railway
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  synchronize: process.env.NODE_ENV !== 'production',
  logging: process.env.NODE_ENV !== 'production',
  entities: [User],
  migrations: ['src/migrations/**/*.ts'],
  subscribers: ['src/subscribers/**/*.ts'],
  cli: {
    entitiesDir: 'src/entities',
    migrationsDir: 'src/migrations',
    subscribersDir: 'src/subscribers',
  },
};

export default config;
