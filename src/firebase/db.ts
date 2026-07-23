import { collection, addDoc, getDocs, query, where, updateDoc, doc, onSnapshot } from "firebase/firestore";
import { db } from "./config";
import type { Registration } from "../types";

export const generateToken = () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  const length = 12;
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

export const registerAttendee = async (responses: Record<string, string>, userId?: string): Promise<{ token: string, id: string }> => {
  const registrationsRef = collection(db, "registrations");
  
  if (responses.email) {
    const q = query(registrationsRef, where("responses.email", "==", responses.email));
    const querySnapshot = await getDocs(q);
    
    if (!querySnapshot.empty) {
      throw new Error("An attendee with this email is already registered.");
    }
  }
  
  const token = generateToken();
  const docRef = await addDoc(registrationsRef, {
    responses,
    token,
    userId: userId || null,
    present: false,
    createdAt: Date.now(),
    checkedInAt: null
  });
  
  return { token, id: docRef.id };
};

export const getRegistrationByUid = async (uid: string): Promise<Registration | null> => {
  const registrationsRef = collection(db, "registrations");
  const q = query(registrationsRef, where("userId", "==", uid));
  const querySnapshot = await getDocs(q);
  
  if (querySnapshot.empty) {
    return null;
  }
  
  const docData = querySnapshot.docs[0];
  return { id: docData.id, ...docData.data() } as Registration;
};

export const subscribeToRegistrationByUid = (uid: string, callback: (reg: Registration | null) => void) => {
  const q = query(collection(db, "registrations"), where("userId", "==", uid));
  return onSnapshot(q, (querySnapshot) => {
    if (querySnapshot.empty) {
      callback(null);
    } else {
      const docData = querySnapshot.docs[0];
      callback({ id: docData.id, ...docData.data() } as Registration);
    }
  });
};

export const updateRegistration = async (id: string, responses: Record<string, string>): Promise<void> => {
  const docRef = doc(db, "registrations", id);
  await updateDoc(docRef, {
    responses
  });
};

export const getRegistrations = async (): Promise<Registration[]> => {
  const registrationsRef = collection(db, "registrations");
  const querySnapshot = await getDocs(registrationsRef);
  return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Registration));
};

export const subscribeToRegistrations = (callback: (regs: Registration[]) => void) => {
  const registrationsRef = collection(db, "registrations");
  return onSnapshot(registrationsRef, (querySnapshot) => {
    const regs = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Registration));
    callback(regs);
  });
};

export const getRegistrationByToken = async (token: string): Promise<Registration | null> => {
  const registrationsRef = collection(db, "registrations");
  const q = query(registrationsRef, where("token", "==", token));
  const querySnapshot = await getDocs(q);
  
  if (querySnapshot.empty) {
    return null;
  }
  
  const docSnap = querySnapshot.docs[0];
  return { id: docSnap.id, ...docSnap.data() } as Registration;
};

export const subscribeToRegistrationByToken = (token: string, callback: (reg: Registration | null) => void) => {
  const q = query(collection(db, "registrations"), where("token", "==", token));
  return onSnapshot(q, (querySnapshot) => {
    if (querySnapshot.empty) {
      callback(null);
    } else {
      const docSnap = querySnapshot.docs[0];
      callback({ id: docSnap.id, ...docSnap.data() } as Registration);
    }
  });
};

export const markAttendance = async (id: string): Promise<void> => {
  const docRef = doc(db, "registrations", id);
  await updateDoc(docRef, {
    present: true,
    checkedInAt: Date.now()
  });
};
