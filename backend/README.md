# Beforest Search Backend

Secure backend server for the Beforest Search application with user authentication and email verification.

## Features

- User authentication with JWT
- Email verification with OTP
- PostgreSQL database with TypeORM
- TypeScript support
- Railway-ready deployment

## Prerequisites

- Node.js >= 14
- PostgreSQL
- npm or yarn

## Environment Variables

Create a `.env` file in the root directory with the following variables:

```env
# Server Configuration
PORT=3001
NODE_ENV=development

# Database Configuration
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/dropbox_search

# JWT Configuration
JWT_SECRET=your_super_secret_key_here
JWT_EXPIRATION=24h
```

## Installation

1. Install dependencies:
```bash
npm install
```

2. Build the project:
```bash
npm run build
```

3. Start the server:
```bash
npm start
```

For development with hot reload:
```bash
npm run dev
```

## API Endpoints

### Authentication

- `POST /api/auth/register` - Register a new user
  - Body: `{ username, email, password }`
  - Email must be @beforest.co domain

- `POST /api/auth/login` - Login user
  - Body: `{ username, password }`

- `POST /api/auth/verify-email` - Verify email with OTP
  - Body: `{ email, otp }`

- `POST /api/auth/resend-otp` - Resend OTP
  - Body: `{ email }`

## Database Migrations

Generate a new migration:
```bash
npm run migration:generate -- -n MigrationName
```

Run migrations:
```bash
npm run migration:run
```

Revert last migration:
```bash
npm run migration:revert
```

## Deployment

This backend is configured for deployment on Railway. It will automatically:
- Use the provided PostgreSQL database URL
- Run migrations during deployment
- Handle SSL certificates
- Set up environment variables

## License

MIT
