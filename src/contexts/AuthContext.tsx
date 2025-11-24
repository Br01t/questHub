import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { User, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged } from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { UserProfile } from "@/types/user";

interface AuthContextType {
  user: User | null;
  userProfile: (UserProfile & { id?: string }) | null;
  loading: boolean;
  isSuperAdmin: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<(UserProfile & { id?: string }) | null>(null);
  const [loading, setLoading] = useState(true);

  const loadUserProfile = async (uid: string) => {
    try {
      const docRef = doc(db, "userProfiles", uid);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        setUserProfile({ id: docSnap.id, ...(docSnap.data() as UserProfile) });
      } else {
        console.warn("Profilo utente non trovato");
        setUserProfile(null);
      }
    } catch (error) {
      console.error("Errore caricando il profilo utente:", error);
      setUserProfile(null);
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setLoading(true);
      setUserProfile(null);
      setUser(user);

      if (user) {
        await loadUserProfile(user.uid);
      }

      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const signup = async (email: string, password: string) => {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);

      await setDoc(doc(db, "userProfiles", userCredential.user.uid), {
        email,
        role: "user",
        companyIds: [],
        siteIds: [],
        createdAt: new Date(),
        displayName: email.split("@")[0],
      });

      await loadUserProfile(userCredential.user.uid);
    } catch (error) {
      console.error("Errore durante la registrazione:", error);
      throw error;
    }
  };

  const login = async (email: string, password: string) => {
    try {
      setUserProfile(null);
      setUser(null);
      setLoading(true);

      const userCredential = await signInWithEmailAndPassword(auth, email, password);

      await loadUserProfile(userCredential.user.uid);
      setUser(userCredential.user);
    } catch (error) {
      console.error("Errore durante il login:", error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      setUserProfile(null);
      setUser(null);
      await signOut(auth);
    } catch (error) {
      console.error("Errore durante il logout:", error);
      throw error;
    }
  };

  const isSuperAdmin = userProfile?.role === "super_admin";

  const value = {
    user,
    userProfile,
    loading,
    isSuperAdmin,
    login,
    signup,
    logout,
  };

  return <AuthContext.Provider value={value}>{!loading && children}</AuthContext.Provider>;
};