<div align="center">

# Hermyx

### A gamified platform for publishing services, finding help and completing paid work securely.

Hermyx is an academic prototype that connects people who need a task completed with collaborators who can complete it. It combines user profiles, service workflows, conversations, reviews, moderation and test payment flows in one application.

</div>

## Overview

Hermyx is built as an npm monorepo with three workspaces:

- **Client:** React 19 application powered by Vite, Tailwind CSS and React Router.
- **Server:** Express 5 API using PostgreSQL, Firebase Admin and Stripe.
- **Shared:** Common Zod validations, constants, enums, messages and regular expressions.

The application includes authentication, service discovery and publishing, user profiles, participation management, notifications, conversations, reviews, reports and dispute handling. Stripe is integrated for the prototype's payment and payout flows.

## Main features

- Create, search, edit and manage services.
- Join services, invite users and follow participation status.
- Authenticate with Firebase, including Google sign-in support.
- Manage personal profiles and view public profiles.
- Exchange messages through private and service conversations.
- Receive notifications for relevant service and participation events.
- Review users after completed work.
- Manage cards, service payments and Stripe Connect payouts.
- Report users, services or participation issues and resolve disputes through admin tools.
- Browse the application with responsive light and dark themes.

## Technology stack

| Area | Technologies |
| --- | --- |
| Frontend | React 19, Vite, React Router, TanStack Query, Tailwind CSS 4 |
| Backend | Node.js, Express 5, Socket.IO |
| Database | PostgreSQL with PostGIS and `unaccent` |
| Authentication | Firebase Authentication and Firebase Admin |
| Payments | Stripe, Stripe Elements and Stripe Connect |
| Validation | Zod through `@hermyx/shared` |
| Testing | Vitest, Supertest and Playwright |
| Storage | Local file storage in development or Azure Blob Storage when configured |

## Repository structure

```text
.
├── client/                 # React frontend
│   ├── src/
│   │   ├── actions/        # Form and workflow actions
│   │   ├── components/     # Reusable UI and domain components
│   │   ├── contexts/       # Authentication, theme and alerts
│   │   ├── pages/          # Application routes
│   │   ├── queries/        # TanStack Query options
│   │   └── services/       # API and Firebase client services
│   └── e2e/                # Playwright end-to-end tests
├── server/                 # Express API
│   ├── database/           # PostgreSQL schema and setup scripts
│   ├── src/
│   │   ├── controllers/    # HTTP request orchestration
│   │   ├── middlewares/     # Authentication and validation
│   │   ├── models/         # Database access
│   │   ├── providers/      # External and realtime providers
│   │   ├── routes/         # API routes
│   │   └── services/       # Domain and integration services
│   └── tests/              # Vitest and Supertest tests
├── shared/                 # Shared validation and domain definitions
├── docs/                   # API and Postman documentation
└── vercel.json             # SPA rewrite configuration
```

## Requirements

Before running Hermyx locally, install or configure:

- Node.js and npm.
- PostgreSQL with the PostGIS extension available.
- A Firebase project with a web application and Firebase Admin credentials.
- Stripe test credentials for payment-related flows.
- Azure Blob Storage credentials only if remote file storage is required.

## Local setup

### 1. Install dependencies

From the repository root:

```bash
npm install
```

### 2. Configure environment variables

Copy the provided examples and fill in the required values locally:

```bash
cp client/.env.development.example client/.env.development
cp server/.env.example server/.env
```

The client configuration contains the API URL, Firebase web configuration and Stripe publishable key. The server configuration contains the PostgreSQL, Firebase Admin, Stripe and optional Azure settings.

For real-account Playwright tests, create the E2E environment file from its example and provide only local test credentials:

```bash
cp client/.env.e2e.example client/.env.e2e
```

Never commit `.env` files, Firebase service-account files or private Stripe keys.

### 3. Prepare the database

After PostgreSQL is running and the server environment is configured, apply the schema with:

```bash
npm run db:push -w @hermyx/server
```

> **Warning:** this command drops and recreates the application tables. Use it only with a disposable or intentionally reset database.

The script also seeds the initial admin record using `ADMIN_FIREBASE_UID`.

### 4. Start the application

Run the API and frontend in separate terminals:

```bash
npm run dev -w @hermyx/server
```

```bash
npm run dev -w @hermyx/client
```

The default local URLs are:

- Frontend: `http://localhost:5173`
- API: `http://localhost:3000`

## Useful commands

Run these commands from the repository root:

| Command | Purpose |
| --- | --- |
| `npm run dev -w @hermyx/client` | Start the Vite development server |
| `npm run dev -w @hermyx/server` | Start the API with Nodemon |
| `npm run build -w @hermyx/client` | Build the frontend for production |
| `npm run test -w @hermyx/server` | Run backend tests |
| `npm run test:e2e -w @hermyx/client` | Run Playwright end-to-end tests |
| `npm run lint -w @hermyx/client` | Lint and auto-fix client files |
| `npm run lint -w @hermyx/server` | Lint and auto-fix server files |
| `npm run db:push -w @hermyx/server` | Recreate and seed the database schema |

The lint scripts currently include ESLint's `--fix` option, so review the working tree after running them.

## API documentation

The backend is mounted under `/api` and exposes resources for:

- Authentication and users.
- Services and participation.
- Stripe payments and payouts.
- Notifications.
- Reviews.
- Conversations and messages.
- Reports and disputes.

Detailed endpoint documentation is available in [`docs/api`](docs/api), and a Postman collection and environment are available in [`docs/postman`](docs/postman).

## Architecture notes

- Firebase ID tokens are attached to API requests by the client Axios interceptor.
- The server validates those tokens and attaches the corresponding Hermyx user to `req.user`.
- Protected routes use the authenticated user from the middleware instead of trusting user identifiers supplied by the client.
- Shared Zod schemas are used to keep client and server validation rules aligned.
- Payment, payout and refund flows use intermediate states and idempotency protections where required.
- Socket.IO is initialized by the server for realtime conversation updates.

## Project status

Hermyx is an academic prototype created to demonstrate a complete service marketplace workflow, including authentication, participation, communication, moderation and test payments. Production deployment requires additional operational, security and compliance configuration.

## Authors

Daniel Jiménez Caballero · Wenjie Huang

Repository: [github.com/daniji09/Hermyx](https://github.com/daniji09/Hermyx)
