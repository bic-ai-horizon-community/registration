import { doc, getDoc, setDoc, onSnapshot } from "firebase/firestore";
import { db } from "./config";
import type { EventSettings } from "../types";

const SETTINGS_DOC_ID = "config";

export const getSettings = async (): Promise<EventSettings> => {
  const docRef = doc(db, "eventSettings", SETTINGS_DOC_ID);
  const docSnap = await getDoc(docRef);

  if (docSnap.exists()) {
    return docSnap.data() as EventSettings;
  }

  const defaultSettings: EventSettings = {
    isRegistrationOpen: true,
    formFields: [
      { id: 'fullName', label: 'Full Name', type: 'text', required: true },
      { id: 'email', label: 'Email Address', type: 'email', required: true },
      { id: 'phone', label: 'Phone Number', type: 'tel', required: true },
      { id: 'college', label: 'College / Institution', type: 'text', required: true },
      { id: 'faculty', label: 'Faculty / Program', type: 'text', required: true },
      { id: 'semester', label: 'Semester / Year', type: 'text', required: true }
    ]
  };

  await setDoc(docRef, defaultSettings);
  return defaultSettings;
};

export const subscribeToSettings = (callback: (settings: EventSettings) => void) => {
  const docRef = doc(db, "eventSettings", SETTINGS_DOC_ID);
  return onSnapshot(docRef, (docSnap) => {
    if (docSnap.exists()) {
      callback(docSnap.data() as EventSettings);
    }
  });
};

export const updateSettings = async (settings: EventSettings): Promise<void> => {
  const docRef = doc(db, "eventSettings", SETTINGS_DOC_ID);
  await setDoc(docRef, settings);
};
