// src/firebaseConfig.js
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyDk7rzLzv20wLSWDPTukLJS139zQmK3phX4",
  authDomain: "study-progress-tracker-5f263.firebaseapp.com",
  projectId: "study-progress-tracker-5f263",
  storageBucket: "study-progress-tracker-5f263.appspot.com",
  messagingSenderId: "669338036928",
  appId: "1:669338036928:web:680eb710a126563a9bb0c25",
  measurementId: "G-89CM7Q2E6L"
};

// 初始化 Firebase
const app = initializeApp(firebaseConfig);

// 初始化 Firestore
const db = getFirestore(app);

export { db };
