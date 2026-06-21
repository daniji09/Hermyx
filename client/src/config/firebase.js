import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';

// Hermyx Firebase configuration
const firebaseConfig = {
  apiKey: 'AIzaSyBcbw7qpjFnknWE6nb8dg1euKakirQt0tU',
  authDomain: 'hermyx-firebase.firebaseapp.com',
  projectId: 'hermyx-firebase',
  storageBucket: 'hermyx-firebase.firebasestorage.app',
  messagingSenderId: '867405017118',
  appId: '1:867405017118:web:bd66ddcca4cd4842bdfe0f',
  measurementId: 'G-XVHJ3XSF81',
};

// App is initialized
const app = initializeApp(firebaseConfig);

// Auth is got and exported
export const auth = getAuth(app);

// Google Provider is created and exported
export const provider = new GoogleAuthProvider();
