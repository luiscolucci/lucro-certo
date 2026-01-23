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
  const [userData, setUserData] = useState(null); // Guarda se é admin ou user
  const [loading, setLoading] = useState(true);

  // Login
  function signIn(email, password) {
    return signInWithEmailAndPassword(auth, email, password);
  }

  // Logout
  function logout() {
    setUser(null);
    setUserData(null);
    return signOut(auth);
  }

  // Função Especial do Admin: Criar Motorista
  async function createDriverAccount(email, password, name) {
    let secondaryApp = null;
    try {
      // Usa uma instância secundária para não deslogar você (Admin)
      secondaryApp = getSecondaryApp();
      const secondaryAuth = getAuth(secondaryApp);

      const userCredential = await createUserWithEmailAndPassword(
        secondaryAuth,
        email,
        password,
      );
      const newUser = userCredential.user;

      // Cria o perfil no Firestore
      await setDoc(doc(db, "users", newUser.uid), {
        uid: newUser.uid,
        name: name,
        email: email,
        role: "user", // Motorista comum
        subscriptionStatus: "active",
        createdAt: new Date(),
      });

      await signOut(secondaryAuth); // Limpa a sessão secundária
      return { success: true };
    } catch (error) {
      console.error("Erro ao criar motorista:", error);
      return { success: false, error: error.message };
    }
  }

  // Monitora se o usuário está logado
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);

      if (currentUser) {
        // Busca os dados extras (role) no Firestore
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
