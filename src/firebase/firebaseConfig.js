import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyD5j5BELwDvKecfnWGAELj_EPXTFXH0XRg",
  authDomain: "blog-app-3651d.firebaseapp.com",
  projectId: "blog-app-3651d",
  storageBucket: "blog-app-3651d.firebasestorage.app",
  messagingSenderId: "936205923944",
  appId: "1:936205923944:web:d343449dd65640a6fc6ddd"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
