<div align="center">

# HERMYX, A SYSTEM FOR THE DEMAND OF PAID SERVICES

Hermyx is an academic prototype that connects people who need a task completed with collaborators who can complete it. It combines user profiles, service workflows, conversations, reviews, moderation and test payment flows in one application.

</div>

## Demo
[![Watch Hermyx demo](https://img.youtube.com/vi/TU_VIDEO_ID/maxresdefault.jpg)](https://youtu.be/TU_VIDEO_ID)

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

| Area             | Technologies                                                            |
| ---------------- | ----------------------------------------------------------------------- |
| Frontend         | React 19, Vite, React Router, TanStack Query, Tailwind CSS 4            |
| Backend          | Node.js, Express 5, Socket.IO                                           |
| Database         | PostgreSQL with PostGIS and `unaccent`                                  |
| Authentication   | Firebase Authentication and Firebase Admin                              |
| Payments         | Stripe, Stripe Elements and Stripe Connect                              |
| Validation       | Zod through `@hermyx/shared`                                            |
| Testing          | Vitest, Supertest and Playwright                                        |
| Storage          | Local file storage in development or Azure Blob Storage when configured |
| Containerization | Docker, Docker Compose                                                  |

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
├── docs/                       # API and Postman documentation
├── Dockerfile                  # Unified container image for client and server
├── compose.yml                 # Local multi-container orchestration (PostGIS, server, client)
└── .dockerignore               # Build context exclusions
```

## Requirements

Before running Hermyx locally, you will need:

- **External services (required for all setups):**
  - A Stripe developer account with test API keys.
  - A Firebase Authentication project with web application configuration and Firebase Admin credentials.
- **Runtime (choose one):**
  - **Docker setup (recommended):** Docker Desktop (or Docker Engine with Compose v2) and npm to run the convenience scripts. No local PostgreSQL or PostGIS installation required.
  - **Manual setup:** Node.js 24.x or later, npm, and PostgreSQL with PostGIS installed and running.

## Local setup

### 1. Clone the repository

```bash
git clone https://github.com/daniji09/Hermyx.git
cd Hermyx
```

### 2. Configure environment variables

Copy the environment templates in their respective directories and complete their values locally:

```bash
cp server/.env.example server/.env
cp client/.env.development.example client/.env.development
cp client/.env.production.example client/.env.production
```

The frontend has separate development and production files so each environment can use its own Firebase and Stripe accounts. Use `http://localhost:3000/api` for the local `VITE_API_URL` and Stripe test keys for local payment flows.

The templates document the configuration fields:

- [`server/.env.example`](server/.env.example): server URLs and port, PostgreSQL connection (`DB_NAME`, `DB_USER`, `DB_PASSWORD`), Firebase Admin, `ADMIN_FIREBASE_UID`, Stripe, scheduled jobs and optional Azure Blob Storage. Leave `AZURE_CONN_STRING` empty to use local file storage.
- [`client/.env.development.example`](client/.env.development.example) and [`client/.env.production.example`](client/.env.production.example): API URL, Firebase web application configuration and Stripe publishable key.

Download the Firebase Admin private key JSON file and place it at `server/src/config/firebase-service-account.json` **before starting the application**. Leave `FIREBASE_JSON` empty when using this local file.

For real-account Playwright tests, also copy the E2E template and fill in local test credentials:

```bash
cp client/.env.e2e.example client/.env.e2e
```

Never commit environment files containing credentials or Firebase service-account private keys.

---

### Option A: Quick start with Docker (Recommended)

Docker Compose starts three containers, PostgreSQL with PostGIS (`db`), the Express API (`server`) and the Vite frontend (`client`), reusing the `server/.env` and `client/.env.development` files automatically.

1. **Build and start the containers:**

   ```bash
   npm run docker:up
   ```

   _(Equivalent to `docker compose --env-file ./server/.env up --build -d`.)_

2. **Initialize the database (first time only):**

   ```bash
   npm run docker:db:push
   ```

   > **Warning:** `db:push` drops and recreates the application tables. Use it only with a fresh or intentionally reset database.

3. **Grant administrator access (optional):**

   Set `ADMIN_FIREBASE_UID` in `server/.env` to an existing Firebase account UID and run:

   ```bash
   docker compose --env-file ./server/.env exec server npm run firebase:admin -w @hermyx/server
   ```

4. **Open the application:**

   Visit `http://localhost:5173`. The backend API and Socket.IO server listen on `http://localhost:3000`, and PostgreSQL is exposed on port `5432`.

5. **Stop the containers:**

   ```bash
   npm run docker:down
   ```

   Database data and uploaded files are persisted in named Docker volumes (`pgdata` and `uploads_data`). To wipe them completely, run `docker compose --env-file ./server/.env down -v`.

---

### Option B: Manual local setup (without Docker)

1. **Install dependencies:**

   ```bash
   npm install
   ```

   NPM Workspaces installs and links the dependencies for `client`, `server` and `shared` with this single command.

2. **Initialize the database:**

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

3. **Start the application:**

   Run the backend and frontend in separate terminals from the repository root:

   ```bash
   npm run dev -w @hermyx/server
   ```

   ```bash
   npm run dev -w @hermyx/client
   ```

   Open the frontend URL printed by Vite, typically `http://localhost:5173`. The default backend URL is `

## Cloud deployment (archived)

> **Note:** The live cloud environment was active during the academic evaluation and has since been decommissioned. To explore the application today, watch the [demo videos](#demo) or run it locally using the [Docker setup](#option-a-quick-start-with-docker-recommended).

During the project's active phase, Hermyx was deployed with continuous integration and delivery using:

- **Azure Database for PostgreSQL** with PostGIS enabled.
- **Vercel** linked to the GitHub repository for automatic frontend deployments.
- **Azure App Service** configured with a Node.js runtime for the backend API.
- **GitHub Actions** using the `FIREBASE_JSON` and `AZURE_WEBAPP_PUBLISH_PROFILE` repository secrets.

The deployment workflows and production configuration remain in the repository for reference.

## Useful commands

To speed up the development lifecycle, standardize code checks and facilitate local execution, a series of automated npm scripts has been configured across the root, backend and frontend workspaces.

### Root (Docker)

- **`npm run docker:up`**: builds the application image and starts the `db`, `server` and `client` containers in detached mode using `server/.env`.
- **`npm run docker:down`**: stops and removes the running containers while preserving database and upload volumes.
- **`npm run docker:db:push`**: runs the database initialization script (`db:push`) inside the running `server` container.
- **`npm run docker:firebase:admin`**: grants administration access to the user specified on environment variables.

### Backend

The server commands use npm and `cross-env` to ensure environment variable compatibility across operating systems:

- **`npm run dev`**: starts the backend server in development mode using nodemon. It watches `src` and `../shared`, automatically restarting the server when files change.
- **`npm run dev:test`**: launches the server in development mode with `NODE_ENV=test`, connecting exclusively to the test database.
- **`npm test`**: runs the unit and integration test suite using Vitest in the isolated test environment.
- **`npm run format`**: runs Prettier with `--write` to format the codebase according to the project style rules.
- **`npm run lint`**: runs ESLint with `--fix` on all `.js` and `.jsx` files to detect and fix code quality issues.
- **`npm run db:push`**: runs `scripts/init_db.js` to initialize or reset the development database schema.
- **`npm run db:push:test`**: initializes or resets the test database schema (`NODE_ENV=test`).
- **`npm run firebase:admin`**: runs `scripts/set_firebase_admin.js` to promote a user to administrator in Firebase and the database.

### Frontend

The client commands focus on Vite bundling and interface testing:

- **`npm run dev`**: starts the Vite development server with hot module replacement.
- **`npm run build`**: compiles and optimizes the frontend into static production assets.
- **`npm run test` and `npm run test:ui`**: run the client-side unit and component test suite using Vitest.
- **`npm run format` and `npm run lint`**: run Prettier and ESLint on the frontend codebase.
- **`npm run test:e2e:[variant]`**: runs Playwright end-to-end test suites split by feature variant for focused debugging.

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

Hermyx is a completed academic prototype created to demonstrate a full-stack service marketplace workflow, including authentication, participation, real-time communication, moderation and test payments. The hosted cloud environment has been retired, so local execution via Docker is the recommended way to run and inspect the application.

## Authors

Daniel Jiménez Caballero · Wenjie Huang

Repository: [github.com/daniji09/Hermyx](https://github.com/daniji09/Hermyx)
