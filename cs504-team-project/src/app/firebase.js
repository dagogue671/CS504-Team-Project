// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyD49aM0QYwN19oA1gR0fz2byQxNbWpiLPQ",
  authDomain: "cs504-team-project-498803.firebaseapp.com",
  projectId: "cs504-team-project-498803",
  storageBucket: "cs504-team-project-498803.firebasestorage.app",
  messagingSenderId: "585222404578",
  appId: "1:585222404578:web:25b4ee1f3ef5deb866e1bb"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);