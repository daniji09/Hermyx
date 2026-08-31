export const hermyxLoginFixture = {
  authToken: 'fake-custom-token',
  firebaseUid: 'firebase-e2e-uid',
  email: 'wenjie@hermyx.test',
  idToken: 'fake-id-token',
  claims: { admin: false },
  hermyxUser: {
    uid: 'user-e2e-1',
    username: 'wenjie-e2e',
    avatar: null,
  },
};

export const hermyxSignupFixture = {
  username: 'signup-e2e',
  email: 'signup-e2e@hermyx.test',
  password: 'Aa123456!',
};

const firebaseModuleSource = `
const listeners = new Set();

const notifyAuthListeners = () => {
  queueMicrotask(() => {
    for (const listener of listeners) {
      listener(auth.currentUser);
    }
  });
};

const createAuthUser = (overrides = {}) => ({
  uid: '${hermyxLoginFixture.firebaseUid}',
  email: '${hermyxLoginFixture.email}',
  providerData: [{ providerId: 'password' }],
  async getIdToken() {
    return overrides.idToken ?? '${hermyxLoginFixture.idToken}';
  },
  async getIdTokenResult() {
    return { claims: overrides.claims ?? ${JSON.stringify(hermyxLoginFixture.claims)} };
  },
  ...overrides,
});

export const app = { options: {} };
export const provider = { providerId: 'google.com' };
export const auth = {
  currentUser: null,
  onAuthStateChanged(callback) {
    listeners.add(callback);
    queueMicrotask(() => callback(this.currentUser));
    return () => listeners.delete(callback);
  },
  __setCurrentUser(overrides = {}) {
    this.currentUser = createAuthUser(overrides);
    notifyAuthListeners();
    return this.currentUser;
  },
  __clearCurrentUser() {
    this.currentUser = null;
    notifyAuthListeners();
  },
};
`;

const authServicesModuleSource = `
import { auth } from '../config/firebase.js';

const readJson = async (response) => {
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(data.message || 'Request failed');
    error.response = {
      status: response.status,
      data,
    };
    throw error;
  }
  return data;
};

export const createUser = async (user) => {
  const response = await fetch('/api/auth/signup', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(user),
  });

  return readJson(response);
};

export const login = async (user) => {
  const response = await fetch('/api/auth/login', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(user),
  });

  return readJson(response);
};

export const sendVerificationEmailWithCredentials = async () => true;
export const sendVerificationEmailToCurrentUser = async () => true;
export const applyVerificationActionCode = async () => true;
export const verifyPasswordResetActionCode = async () => '${hermyxLoginFixture.email}';
export const confirmPasswordResetActionCode = async () => true;
export const sendPasswordResetEmail = async () => true;

export const signInWithCustomToken = async (token) => {
  return {
    user: auth.__setCurrentUser({ idToken: token }),
  };
};

export const syncUserWithGoogleAccount = async () => ({
  user: ${JSON.stringify(hermyxLoginFixture.hermyxUser)},
});

export const signInWithGoogle = async () => ({
  user: auth.__setCurrentUser(),
});

export const updateUserPassword = async () => true;
export const linkGoogleAccount = async () => ({
  user: auth.currentUser,
});
export const unlinkGoogleAccount = async () => true;
`;

const socketServiceModuleSource = `
const createMockSocket = () => ({
  id: 'mock-socket-id',
  on() {},
  disconnect() {},
});

export const socketServerUrl = 'http://127.0.0.1/mock-socket';
export const createSocketConnection = () => createMockSocket();
`;

const notificationsPayload = {
  notifications: [],
  totalUnseen: 0,
  pagination: {
    currentPage: 1,
    totalPages: 1,
    totalItems: 0,
    hasMore: false,
  },
};

const moduleMocks = [
  {
    pattern: /\/src\/config\/firebase\.js(?:\?.*)?$/,
    body: firebaseModuleSource,
  },
  {
    pattern: /\/src\/services\/AuthServices\.jsx(?:\?.*)?$/,
    body: authServicesModuleSource,
  },
  {
    pattern: /\/src\/services\/SocketService\.jsx(?:\?.*)?$/,
    body: socketServiceModuleSource,
  },
];

export const installHermyxLoginMocks = async (page, { meDelayMs = 0 } = {}) => {
  for (const moduleMock of moduleMocks) {
    await page.route(moduleMock.pattern, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/javascript',
        body: moduleMock.body,
      });
    });
  }

  await page.route('**/api/auth/login', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ token: hermyxLoginFixture.authToken }),
    });
  });

  await page.route('**/api/auth/signup', async (route) => {
    await route.fulfill({
      status: 201,
      contentType: 'application/json',
      body: JSON.stringify({ success: true }),
    });
  });

  await page.route('**/api/users/me', async (route) => {
    if (meDelayMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, meDelayMs));
    }

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(hermyxLoginFixture.hermyxUser),
    });
  });

  await page.route('**/api/conversations/unread-count', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ unreadCount: 0 }),
    });
  });

  await page.route('**/api/disputes/unread-count', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ unreadCount: 0 }),
    });
  });

  await page.route('**/api/notifications/me**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(notificationsPayload),
    });
  });
};
