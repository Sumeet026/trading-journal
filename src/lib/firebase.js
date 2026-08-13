import { initializeApp } from "firebase/app";

import {
  getFirestore,
  collection,
  doc,
  setDoc,
  addDoc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  writeBatch
} from "firebase/firestore";

import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile,
  sendPasswordResetEmail,
  sendEmailVerification,
  GoogleAuthProvider,
  signInWithPopup
} from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyDLUCzea_-pcna13QvObtZo8MqB5CmK2Tc",
  authDomain: "trading-j-c9922.firebaseapp.com",
  projectId: "trading-j-c9922",
  storageBucket: "trading-j-c9922.appspot.com"
};

let app;
let db;
let auth;
let isFirebaseEnabled = false;

try {
  app = initializeApp(firebaseConfig);
  db = getFirestore(app);
  auth = getAuth(app);
  isFirebaseEnabled = true;
  console.log("Firebase initialized successfully.");
} catch (error) {
  console.error("Firebase initialization failed. Application will fall back to LocalStorage.", error);
}

export {
  app,
  db,
  auth,
  isFirebaseEnabled,
  collection,
  doc,
  setDoc,
  addDoc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  writeBatch,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile,
  sendPasswordResetEmail,
  sendEmailVerification,
  GoogleAuthProvider,
  signInWithPopup
};
