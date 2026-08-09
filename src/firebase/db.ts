import { collection, addDoc, getDocs, query, where, updateDoc, doc, onSnapshot } from "firebase/firestore";
import { db } from "./config";
import type { Registration } from "../types";

const EVENTS_COLLECTION = "events";

export const generateToken = () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  const length = 12;
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

const getRegistrationsRef = (eventId: string) =>
  collection(db, EVENTS_COLLECTION, eventId, "registrations");

const getRegistrationDocRef = (eventId: string, regId: string) =>
  doc(db, EVENTS_COLLECTION, eventId, "registrations", regId);


export const registerAttendee = async (eventId: string, responses: Record<string, string>, userId: string): Promise<{ token: string, id: string }> => {
  const registrationsRef = getRegistrationsRef(eventId);

  // Check if this user already has a registration (by userId)
  const existingQ = query(registrationsRef, where("userId", "==", userId));
  const existingSnapshot = await getDocs(existingQ);
  if (!existingSnapshot.empty) {
    throw new Error("You are already registered for this event.");
  }

  const token = generateToken();
  const newRegistration: Omit<Registration, 'id'> = {
    token,
    responses,
    present: false,
    createdAt: Date.now(),
    checkedInAt: null,
    userId
  };

  const docRef = await addDoc(registrationsRef, newRegistration);

  return { token, id: docRef.id };
};

/**
 * Register an attendee without Firebase auth (manual email flow).
 * Stores userId as null — the token acts as the auth mechanism for later access.
 */
export const registerAttendeeAnonymous = async (eventId: string, responses: Record<string, string>): Promise<{ token: string, id: string }> => {
  const registrationsRef = getRegistrationsRef(eventId);

  // Duplicate check: look for existing manual registration with the same email
  const email = responses['email'] || '';
  if (email) {
    const existingQ = query(registrationsRef, where("responses.email", "==", email), where("userId", "==", null));
    const existingSnapshot = await getDocs(existingQ);
    if (!existingSnapshot.empty) {
      throw new Error("A registration with this email already exists.");
    }
  }

  const token = generateToken();
  const newRegistration = {
    token,
    responses,
    present: false,
    createdAt: Date.now(),
    checkedInAt: null,
    userId: null
  };

  const docRef = await addDoc(registrationsRef, newRegistration);
  return { token, id: docRef.id };
};

export const getRegistrationByEmail = async (eventId: string, email: string): Promise<Registration | null> => {
  const registrationsRef = getRegistrationsRef(eventId);
  const q = query(registrationsRef, where("responses.email", "==", email), where("userId", "==", null));
  const querySnapshot = await getDocs(q);
  if (querySnapshot.empty) return null;
  const docData = querySnapshot.docs[0];
  return { id: docData.id, ...docData.data() } as Registration;
};

export const getRegistrationByUid = async (eventId: string, uid: string): Promise<Registration | null> => {
  const registrationsRef = getRegistrationsRef(eventId);
  const q = query(registrationsRef, where("userId", "==", uid));
  const querySnapshot = await getDocs(q);
  if (querySnapshot.empty) return null;
  const docData = querySnapshot.docs[0];
  return { id: docData.id, ...docData.data() } as Registration;
};

export const subscribeToRegistrationByUid = (eventId: string, uid: string, callback: (reg: Registration | null) => void) => {
  const q = query(getRegistrationsRef(eventId), where("userId", "==", uid));
  return onSnapshot(q, (querySnapshot) => {
    if (querySnapshot.empty) {
      callback(null);
    } else {
      const docData = querySnapshot.docs[0];
      callback({ id: docData.id, ...docData.data() } as Registration);
    }
  });
};

export const updateRegistration = async (eventId: string, id: string, responses: Record<string, string>): Promise<void> => {
  const docRef = getRegistrationDocRef(eventId, id);
  await updateDoc(docRef, { responses });
};

export const getRegistrations = async (eventId: string): Promise<Registration[]> => {
  const registrationsRef = getRegistrationsRef(eventId);
  const querySnapshot = await getDocs(registrationsRef);
  return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Registration));
};

export const subscribeToRegistrations = (eventId: string, callback: (regs: Registration[]) => void) => {
  const registrationsRef = getRegistrationsRef(eventId);
  return onSnapshot(registrationsRef, (querySnapshot) => {
    const regs = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Registration));
    callback(regs);
  });
};

export const getRegistrationByToken = async (eventId: string, token: string): Promise<Registration | null> => {
  const registrationsRef = getRegistrationsRef(eventId);
  const q = query(registrationsRef, where("token", "==", token));
  const querySnapshot = await getDocs(q);
  if (querySnapshot.empty) return null;
  const docSnap = querySnapshot.docs[0];
  return { id: docSnap.id, ...docSnap.data() } as Registration;
};

export const subscribeToRegistrationByToken = (eventId: string, token: string, callback: (reg: Registration | null) => void) => {
  const q = query(getRegistrationsRef(eventId), where("token", "==", token));
  return onSnapshot(q, (querySnapshot) => {
    if (querySnapshot.empty) {
      callback(null);
    } else {
      const docSnap = querySnapshot.docs[0];
      callback({ id: docSnap.id, ...docSnap.data() } as Registration);
    }
  });
};

// Secure version: queries by both token AND userId so Firestore rules allow it for regular users
export const subscribeToRegistrationByTokenAndUser = (eventId: string, token: string, userId: string, callback: (reg: Registration | null) => void) => {
  const q = query(
    getRegistrationsRef(eventId), 
    where("token", "==", token),
    where("userId", "==", userId)
  );
  return onSnapshot(q, (querySnapshot) => {
    if (querySnapshot.empty) {
      callback(null);
    } else {
      const docSnap = querySnapshot.docs[0];
      callback({ id: docSnap.id, ...docSnap.data() } as Registration);
    }
  });
};

export const markAttendance = async (eventId: string, id: string): Promise<void> => {
  const docRef = getRegistrationDocRef(eventId, id);
  await updateDoc(docRef, {
    present: true,
    checkedInAt: Date.now()
  });
};

export const updateAttendanceStatus = async (eventId: string, id: string, present: boolean): Promise<void> => {
  const docRef = getRegistrationDocRef(eventId, id);
  await updateDoc(docRef, {
    present,
    checkedInAt: present ? Date.now() : null
  });
};
