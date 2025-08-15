// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// TODO: Add your own Firebase configuration from your Firebase project settings
const firebaseConfig = {
  apiKey: "AIzaSyCiFfBoPOX9e6Ca8xy2SVK01mu1Zt3CEmk",
  authDomain: "genaihack-2390f.firebaseapp.com",
  projectId: "genaihack-2390f",
  storageBucket: "genaihack-2390f.firebasestorage.app",
  messagingSenderId: "400748560093",
  appId: "1:400748560093:web:35f39a92ca11402168a534"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase services
const auth = getAuth(app);
const db = getFirestore(app);

export { auth, db };
