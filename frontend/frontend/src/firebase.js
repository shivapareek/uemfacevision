import { initializeApp } from "firebase/app";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage"; 
import {
  getAuth,
  signInWithPopup,
  GoogleAuthProvider,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
  sendPasswordResetEmail
} from "firebase/auth";


const firebaseConfig = {
  apiKey: "AIzaSyCjHu3S8yyjTgy8OFk3yWHXhk6Wc9ilCr8",
  authDomain: "uem-facevision.firebaseapp.com",
  projectId: "uem-facevision",
  storageBucket: "uem-facevision.appspot.com",
  messagingSenderId: "344701367552",
  appId: "1:344701367552:web:dec95d58050f897721afe5",
  measurementId: "G-1E5CXR7QNB"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const storage = getStorage(app);
const provider = new GoogleAuthProvider();
const googleProvider = new GoogleAuthProvider();


const signInWithGoogle = async () => {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    const user = result.user;

    // Check if user already has a photoURL
    if (!user.photoURL) {
      // Set a default avatar using `updateProfile`
      await updateProfile(user, {
        photoURL: "https://i.pravatar.cc/150", // Default avatar
      });
    }

    // Return the user object with the photoURL (either Google avatar or default)
    return {
      email: user.email,
      name: user.displayName,
      avatar: user.photoURL || "https://i.pravatar.cc/150", // Ensure avatar fallback
    };
  } catch (error) {
    console.error("Google Sign-In Error:", error);
    return null;
  }
};


const registerWithEmailPassword = async (email, password) => {
  try {
    if (password.length < 6) {
      throw { code: "auth/weak-password", message: "Password must be at least 6 characters!" };
    }

    // 🔹 Step 1: Register User
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    console.log("User Registered:", userCredential.user);

    // 🔹 Step 2: Set Default Avatar and Display Name
    const extractedName = email.split("@")[0]; // Extract name from email
    await updateProfile(userCredential.user, {
      photoURL: "https://i.pravatar.cc/150", // Default Avatar
      displayName: extractedName || "User", // Default Name if extraction fails
    });

    return { success: true, user: userCredential.user, message: "Signup successful!" };
  } catch (error) {
    console.error("Registration Error:", error);

    let errorMessage = "Password must be at least 6 characters!";

    // ✅ Firebase-specific & Custom Error Handling
    if (error.code === "auth/email-already-in-use") {
      errorMessage = "Email already in use! Try logging in.";
    } else if (error.code === "auth/weak-password") {
      errorMessage = error.message; 
    } else if (error.code === "auth/invalid-email") {
      errorMessage = "Invalid email format! Please enter a valid email.";
    }

    return { success: false, message: errorMessage };
  }
};



const loginWithEmailPassword = async (email, password) => {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    // ✅ Get Firebase Authentication Token
    const token = await user.getIdToken();

    // ✅ Store Token in localStorage
    localStorage.setItem("authToken", token);

    // 🔹 Check Display Name and Set Default if Missing
    if (!user.displayName) {
      const defaultName = email.split("@")[0]; // Extract name from email
      await updateProfile(user, {
        displayName: defaultName || "User", // Set default name if missing
      });
    }

    return {
      success: true,
      user,
      token,
      message: `Welcome, ${user.displayName || "User"}!`, // Optional greeting
    };
  } catch (error) {
    console.error("Login Error:", error);
    return { success: false, message: error.message };
  }
};


const logout = async () => {
  try {
    await signOut(auth);
  } catch (error) {
    console.error("Logout Error:", error);
  }
};

export {app, auth,getAuth,provider,sendPasswordResetEmail,signInWithPopup, storage, ref,uploadBytes,getDownloadURL,signInWithGoogle, registerWithEmailPassword, loginWithEmailPassword, logout };
