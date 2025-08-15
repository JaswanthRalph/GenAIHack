// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

// TODO: Add your own Firebase configuration from your Firebase project settings
const firebaseConfig = {
  apiKey: "AIzaSyDoQNGBHVrqNFlzx3nQdexRlt7WsU0rGN8",
  authDomain: "hackgg-df7ed.firebaseapp.com",
  projectId: "hackgg-df7ed",
  storageBucket: "hackgg-df7ed.appspot.com",
  messagingSenderId: "102289239586",
  appId: "1:102289239586:web:420615f307e0781f5fa47b"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase services
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

export { auth, db, storage };
