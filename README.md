<div align="center">

# HERMYX, A SYSTEM FOR THE DEMAND OF PAID SERVICES

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
Hermyx/
├── client/                     # React frontend
│   ├── e2e/                    # End-to-end tests
│   ├── public/
│   │   └── images/             # Static application images
│   └── src/
│       ├── actions/            # React Actions
│       ├── App.jsx             # Root component and routing orchestration
│       ├── components/         # Reusable components
│       │   ├── custom/         # Hermyx-specific components
│       │   └── ui/             # Base shadcn/ui components
│       ├── config/             # Third-party configuration (Axios, Firebase)
│       ├── consts/             # Frontend constants
│       ├── contexts/           # Global state providers
│       ├── hooks/              # Extracted component logic
│       ├── lib/                # UI library helpers
│       ├── main.jsx            # Application entry point that mounts React
│       ├── messages/           # Frontend messages
│       ├── pages/              # Full screens associated with routes
│       ├── queries/            # React Query rules
│       ├── services/           # Backend API and external service calls
│       └── utils/              # Frontend utilities
├── server/                     # Express backend
│   ├── database/               # DDL scripts
│   ├── public/                 # Media content for development
│   ├── scripts/                # CLI utilities for data seeding and administration
│   ├── src/
│   │   ├── app.js              # Main Express configuration
│   │   ├── config/             # Database and Firebase Authentication configuration
│   │   ├── controllers/        # API endpoint handlers
│   │   ├── jobs/               # Scheduled tasks (cron)
│   │   ├── middlewares/        # Request interceptors
│   │   ├── models/             # Data persistence access
│   │   ├── providers/          # External service capabilities
│   │   ├── routes/             # REST API routes and endpoints
│   │   ├── server.js           # HTTP server startup and network connections
│   │   ├── services/           # Business logic
│   │   └── utils/              # Shared backend utilities
│   └── tests/                  # Backend tests
├── shared/                     # Common validations and domain definitions
└── docs/                       # API and Postman documentation
```

## Requirements

Before running Hermyx locally, install or configure:

- Node.js 24.x or later and npm.
- PostgreSQL installed and running, with PostGIS available.
- A Stripe developer account with test API keys.
- A Firebase Authentication project with web application configuration and Firebase Admin credentials.

## Local setup

### 1. Clone the repository and install dependencies

```bash
git clone https://github.com/daniji09/Hermyx.git
cd Hermyx
npm install
```

NPM Workspaces installs and links the dependencies for `client`, `server` and `shared` with this single command.

### 2. Configure environment variables

Copy the environment templates in their respective directories and complete their values locally:

```bash
cp server/.env.example server/.env
cp client/.env.development.example client/.env.development
cp client/.env.production.example client/.env.production
```

The frontend has separate development and production files so each environment can use its own Firebase and Stripe accounts. Use `http://localhost:3000/api` for the local `VITE_API_URL` and Stripe test keys for local payment flows.

The templates document the configuration fields:

- [`server/.env.example`](server/.env.example): server URLs and port, PostgreSQL connection, Firebase Admin, `ADMIN_FIREBASE_UID`, Stripe, scheduled jobs and optional Azure Blob Storage. Leave `AZURE_CONN_STRING` empty to use local file storage.
- [`client/.env.development.example`](client/.env.development.example) and [`client/.env.production.example`](client/.env.production.example): API URL, Firebase web application configuration and Stripe publishable key.

Download the Firebase Admin private key JSON file and place it at `server/src/config/firebase-service-account.json`. Leave `FIREBASE_JSON` empty when using this local file.

For real-account Playwright tests, also copy the E2E template and fill in local test credentials:

```bash
cp client/.env.e2e.example client/.env.e2e
```

Never commit environment files containing credentials or Firebase service-account private keys.

### 3. Initialize the database

Create an empty PostgreSQL database matching the connection settings in `server/.env`, and make sure PostgreSQL is reachable at the configured host and port. From the repository root, run:

```bash
npm run db:push -w @hermyx/server
```

This command enables `unaccent` and `postgis`, builds the relational schema (tables, indexes and constraints), and inserts the system user and initial administrator record. Set `ADMIN_FIREBASE_UID` to the UID of an existing Firebase account before running it.

If the database user cannot enable the extensions, enable them first using the PostgreSQL administrator account:

```sql
CREATE EXTENSION IF NOT EXISTS unaccent;
CREATE EXTENSION IF NOT EXISTS postgis;
```

> **Warning:** `db:push` drops and recreates the application tables. Use it only with a disposable or intentionally reset database.

### 4. Start the application

Run the backend and frontend in separate terminals from the repository root:

```bash
npm run dev -w @hermyx/server
```

```bash
npm run dev -w @hermyx/client
```

The backend listens for HTTP requests and WebSocket connections. Open the frontend URL printed by Vite, typically `http://localhost:5173`. The default backend URL is `http://localhost:3000`.

### 5. Configure administrator access

To grant the Firebase administrator claim, set `ADMIN_FIREBASE_UID` in `server/.env` to the target account and run:

```bash
npm run firebase:admin -w @hermyx/server
```

The account must already exist in Firebase. This script grants the Firebase `admin` claim; the initial database administrator role is created separately during database initialization.

## Production deployment

The deployment setup described in the project report uses continuous integration and deployment with:

- Azure Database for PostgreSQL with PostGIS enabled.
- A Vercel frontend project linked to the GitHub repository for automatic deployments.
- Azure App Service configured with a Node.js runtime for the backend.
- The GitHub repository secrets `FIREBASE_JSON` and `AZURE_WEBAPP_PUBLISH_PROFILE`.

Configure the production environment variables for the deployed services, including the production API URL and the corresponding Firebase and Stripe accounts.
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
