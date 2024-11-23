module.exports = {
  type: "postgres",
  url: process.env.DATABASE_URL,
  synchronize: true, // Be careful with this in production
  logging: process.env.NODE_ENV === 'development',
  entities: ["dist/entities/**/*.js"],
  migrations: ["dist/migrations/**/*.js"],
  subscribers: ["dist/subscribers/**/*.js"],
  cli: {
    entitiesDir: "src/entities",
    migrationsDir: "src/migrations",
    subscribersDir: "src/subscribers"
  },
  ssl: process.env.NODE_ENV === 'production' ? {
    rejectUnauthorized: false
  } : false
};
