import dotenv from 'dotenv';
dotenv.config();

export const PORT = process.env.PORT || 3000;
export const DB_USER = process.env.DB_USER;
export const DB_PASSWORD = process.env.DB_PASSWORD;
export const DB_HOST = process.env.DB_HOST;
export const DB_PORT = process.env.DB_PORT;
export const DB_NAME = process.env.DB_NAME;
export const DB_TEST_NAME = process.env.DB_TEST_NAME;
export const DB_SSL = process.env.DB_SSL;
export const FIREBASE_JSON = process.env.FIREBASE_JSON;
export const FIREBASE_PROJECT_ID = process.env.FIREBASE_PROJECT_ID;
export const ADMIN_FIREBASE_UID = process.env.ADMIN_FIREBASE_UID;
export const FIREBASE_API_KEY = process.env.FIREBASE_API_KEY;
export const FRONTEND_URL = process.env.FRONTEND_URL;
export const BACKEND_URL = process.env.BACKEND_URL;
export const CRON_SECRET_TOKEN = process.env.CRON_SECRET_TOKEN;
