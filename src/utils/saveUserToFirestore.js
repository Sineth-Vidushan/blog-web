import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../firebase/firebaseConfig";

/**
 * Saves or updates the user profile in Firestore.
 * Does not throw: if Firestore rules block the write, we still allow sign-in to succeed.
 */
export const saveUserToFirestore = async (user) => {
  try {
    const userRef = doc(db, "users", user.uid);

    // Using setDoc with merge: true ensures the document exists and fields are initialized
    // without overwriting existing data if it's already there.
    await setDoc(userRef, {
      uid: user.uid,
      email: user.email,
      name: user.displayName || "Anonymous",
      provider: user.providerData[0]?.providerId || "email",
      // Only set these if the document is new or they are missing
      updatedAt: serverTimestamp(),
    }, { merge: true });

    // Ensure arrays exist by using a separate update or just rely on merge
    // but initialized arrays on first create is safer.
    const snapshot = await getDoc(userRef);
    if (!snapshot.exists() || !snapshot.data().followers) {
      await setDoc(userRef, {
        followers: [],
        following: [],
        createdAt: serverTimestamp(),
      }, { merge: true });
    }
  } catch (err) {
    console.warn("Could not save user profile to Firestore:", err.message);
  }
};
