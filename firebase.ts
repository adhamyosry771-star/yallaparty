
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyALR1fiWx6gEBfQMEddvMK_u2dX2awrAYs",
  authDomain: "yalla-games-64128.firebaseapp.com",
  projectId: "yalla-games-64128",
  storageBucket: "yalla-games-64128.firebasestorage.app",
  messagingSenderId: "226116545826",
  appId: "1:226116545826:web:66c58519af559e8066c97b"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Export services
export const auth = getAuth(app);
export const db = getFirestore(app);
export default app;
