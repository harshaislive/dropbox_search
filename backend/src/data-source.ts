import "reflect-metadata";
import { DataSource } from "typeorm";
import { User } from "./entities/User";
import { CreateUsersTable1701936163004 } from "./migrations/1701936163004-CreateUsersTable";
import * as dotenv from 'dotenv';

dotenv.config();

export const AppDataSource = new DataSource({
    type: "postgres",
    url: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : undefined,
    synchronize: false,
    logging: process.env.NODE_ENV !== 'production',
    entities: [User],
    migrations: [CreateUsersTable1701936163004],
    subscribers: [],
});
