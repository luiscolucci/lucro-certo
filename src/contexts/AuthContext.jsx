import { createContext, useState, useEffect, useContext } from "react";
import {
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  getAuth,
} from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { auth, db, getSecondaryApp } from "../firebase";

const AuthContext = createContext({});

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);

  function signIn(email, password) {
    return signInWithEmailAndPassword(auth, email, password);
  }

  function logout() {
    setUser(null);
    setUserData(null);
    return signOut(auth);
  }

  // --- NOVA FUNÇÃO: Auto-Cadastro (Driver) ---
  async function registerUser(email, password, name) {
    const userCredential = await createUserWithEmailAndPassword(
      auth,
      email,
      password,
    );
    const newUser = userCredential.user;

    // Cria o perfil no Firestore
    await setDoc(doc(db, "users", newUser.uid), {
      uid: newUser.uid,
      name: name,
      email: email,
      role: "user",
      subscriptionStatus: "active", // Ou 'trial'
      isWorking: false,
      createdAt: new Date(),
    });

    return newUser;
  }

  // Função do Admin (mantida igual)
  async function createDriverAccount(email, password, name) {
    let secondaryApp = null;
    try {
      secondaryApp = getSecondaryApp();
      const secondaryAuth = getAuth(secondaryApp);
      const userCredential = await createUserWithEmailAndPassword(
        secondaryAuth,
        email,
        password,
      );
      const newUser = userCredential.user;
      await setDoc(doc(db, "users", newUser.uid), {
        uid: newUser.uid,
        name: name,
        email: email,
        role: "user",
        subscriptionStatus: "active",
        isWorking: false,
        createdAt: new Date(),
      });
      await signOut(secondaryAuth);
      return { success: true };
    } catch (error) {
      console.error("Erro ao criar motorista:", error);
      return { success: false, error: error.message };
    }
  }

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        const docRef = doc(db, "users", currentUser.uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setUserData(docSnap.data());
        }
      } else {
        setUserData(null);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        userData,
        signIn,
        logout,
        createDriverAccount,
        registerUser,
        loading,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
