// Firebase configuration and initialization
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// Main project (for auth, user data, saving transactions)
const mainConfig = {
  apiKey: "AIzaSyAnPSNGm4pZjP_UqVxgBFZEVXaD-MAhLqs",
  authDomain: "surebodaaccounts.firebaseapp.com",
  projectId: "surebodaaccounts",
  storageBucket: "surebodaaccounts.firebasestorage.app",
  messagingSenderId: "717095188530",
  appId: "1:717095188530:web:f216a027071e83a6c5e42b",
  measurementId: "G-2CW597B1XG"
};
const app = initializeApp(mainConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

// Astute Empire project (for reading payments)
const astuteConfig = {
  apiKey: "AIzaSyCuH_Z70ozC41Dhuzz0tKb5Hx3VoiBFLTY",
  authDomain: "astute-empire.firebaseapp.com",
  projectId: "astute-empire",
  storageBucket: "astute-empire.firebasestorage.app",
  messagingSenderId: "829066508421",
  appId: "1:829066508421:web:c1757761ad50f2515a51ec",
  measurementId: "G-8TV87WQFD3"
};
const astuteApp = initializeApp(astuteConfig, 'astute');
export const astuteDb = getFirestore(astuteApp);