import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, onAuthStateChanged, createUserWithEmailAndPassword, signInWithEmailAndPassword, updateProfile, signOut as firebaseSignOut } from 'firebase/auth';
import { auth, db } from '../firebase';
import { doc, setDoc, onSnapshot, collection, getDocs } from 'firebase/firestore';
import { UserProfile, Streak, XP_PER_DAY, START_BONUS, BADGES } from '../types';
import { differenceInCalendarDays } from 'date-fns';

interface AuthContextType {
  user: User | null;
  userProfile: UserProfile | null;
  loading: boolean;
  error: string | null;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, name: string) => Promise<void>;
  signOut: () => Promise<void>;
  updateName: (name: string) => Promise<void>;
  setError: (error: string | null) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Bump this when XP formula changes to trigger recalculation for all users
const CURRENT_XP_VERSION = 2;

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let unsubscribeProfile: (() => void) | null = null;

    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
      // Clean up previous profile listener if it exists
      if (unsubscribeProfile) {
        unsubscribeProfile();
        unsubscribeProfile = null;
      }

      setUser(currentUser);

      if (currentUser) {
        // Subscribe to user profile changes
        const userRef = doc(db, 'users', currentUser.uid);
        unsubscribeProfile = onSnapshot(userRef, (docSnap) => {
          if (docSnap.exists()) {
            setUserProfile(docSnap.data() as UserProfile);
          } else {
            // Document might be created after signup, wait for it or handle in signup
          }
          setLoading(false);
        }, (err) => {
          console.error("Profile sync error:", err);
          setLoading(false);
        });
      } else {
        setUserProfile(null);
        setLoading(false);
      }
    });

    return () => {
        unsubscribeAuth();
        if (unsubscribeProfile) unsubscribeProfile();
    };
  }, []);

  // Migration to recalculate XP with new values
  useEffect(() => {
    const runMigration = async () => {
        if (user && userProfile && (userProfile.xpVersion === undefined || userProfile.xpVersion < CURRENT_XP_VERSION)) {
            console.log(`Migrating XP to version ${CURRENT_XP_VERSION}...`);
            try {
                const streaksRef = collection(db, 'users', user.uid, 'streaks');
                const snapshot = await getDocs(streaksRef);
                let newTotalXP = 0;

                snapshot.docs.forEach(docSnap => {
                    const data = docSnap.data() as Streak;
                    if (!data.startDate) return;

                    // 1. Add Start Bonus for every streak
                    newTotalXP += START_BONUS;

                    // 2. Add Daily XP & Badge XP for completed streaks only
                    if (data.endDate) {
                        const start = data.startDate.toDate();
                        const end = data.endDate.toDate();
                        const days = Math.max(0, differenceInCalendarDays(end, start));

                        // Daily XP
                        newTotalXP += (days * XP_PER_DAY);

                        // Badge XP
                        BADGES.forEach(badge => {
                            if (badge.requiredDays > 0 && days >= badge.requiredDays) {
                                newTotalXP += badge.xpReward;
                            }
                        });
                    }
                });

                await setDoc(doc(db, 'users', user.uid), {
                    totalXP: newTotalXP,
                    xpVersion: CURRENT_XP_VERSION
                }, { merge: true });
                
                console.log("XP Migration Complete. New Total:", newTotalXP);

            } catch (e) {
                console.error("Migration failed:", e);
            }
        }
    };

    runMigration();
  }, [user, userProfile]);

  const signUp = async (email: string, password: string, name: string) => {
    setError(null);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const newUser = userCredential.user;

      await updateProfile(newUser, {
        displayName: name
      });

      // Create initial profile
      const initialProfile: UserProfile = {
        uid: newUser.uid,
        displayName: name,
        email: newUser.email,
        photoURL: null,
        totalXP: 0,
        level: 1,
        targetStreak: 0,
        xpVersion: CURRENT_XP_VERSION
      };
      
      await setDoc(doc(db, 'users', newUser.uid), initialProfile);
      
      // Update local state immediately to avoid race conditions
      setUser(newUser);
      setUserProfile(initialProfile);

    } catch (err: any) {
      console.error("SignUp Error:", err);
      setError(err.message || 'Failed to sign up.');
    }
  };

  const signIn = async (email: string, password: string) => {
    setError(null);
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (err: any) {
      console.error("SignIn Error:", err);
      if (err.code === 'auth/wrong-password' || err.code === 'auth/user-not-found' || err.code === 'auth/invalid-credential') {
        setError('Invalid email or password.');
      } else {
        setError(err.message || 'Failed to sign in.');
      }
    }
  };

  const signOut = async () => {
    setError(null);
    try {
        await firebaseSignOut(auth);
    } catch (e) {
        console.error(e);
    }
  };

  const updateName = async (name: string) => {
    setError(null);
    if (!user) return;
    try {
        // Update Auth Profile
        await updateProfile(user, { displayName: name });
        
        // Update Firestore Profile
        await setDoc(doc(db, 'users', user.uid), { displayName: name }, { merge: true });
        
        // Optimistic update
        setUserProfile(prev => prev ? { ...prev, displayName: name } : null);
    } catch (err: any) {
        console.error("Update Name Error:", err);
        setError("Failed to update name.");
        throw err;
    }
  };

  return (
    <AuthContext.Provider value={{ user, userProfile, loading, error, signIn, signUp, signOut, updateName, setError }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};