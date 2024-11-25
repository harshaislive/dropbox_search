import { ConnectionOptions } from 'typeorm';
import { User } from './src/entities/User';

const config: ConnectionOptions = {
  type: 'postgres',
  url: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : undefined,
  synchronize: true, // This will automatically create tables
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
