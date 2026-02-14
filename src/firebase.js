// src/firebase.js (CORRIGÉ)

// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBiutuTSbE3hn20d5C-G1pahJ09NV35hmk",
  authDomain: "jkl-mise-en-relation.firebaseapp.com",
  projectId: "jkl-mise-en-relation",
  storageBucket: "jkl-mise-en-relation.firebasestorage.app",
  messagingSenderId: "127014563314",
  appId: "1:127014563314:web:408681334a31327197cf6b"
};

// 1. INITIALISATION DE FIREBASE (DOIT ÊTRE FAIT EN PREMIER)
// La variable 'app' est définie ici.
const app = initializeApp(firebaseConfig);

// 2. INITIALISATION DES SERVICES (PEUT MAINTENANT UTILISER 'app')
// export const auth = getAuth(app); 
// export const db = getFirestore(app);

export const auth = getAuth(app);
export const db = getFirestore(app);

// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries