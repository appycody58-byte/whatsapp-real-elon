import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyATFQE9vknKALk6YZbwOBXY435hhuQVuSI",
  authDomain: "whatsapp-clone-a0ae2.firebaseapp.com",
  projectId: "whatsapp-clone-a0ae2",
  storageBucket: "whatsapp-clone-a0ae2.firebasestorage.app",
  messagingSenderId: "682843818360",
  appId: "1:682843818360:web:4f0e3c5ee32ce2e498e08d",
  measurementId: "G-8WX9XWSNSB"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
