import { collection, doc, getDocs, onSnapshot, query, setDoc, updateDoc, writeBatch } from 'firebase/firestore';
import { db } from './config';
import type { Event, FormField } from '../types';

const EVENTS_COLLECTION = 'events';

const defaultFormFields: FormField[] = [
  { id: 'fullName', label: 'Full Name', type: 'text', required: true },
  { id: 'email', label: 'Email Address', type: 'email', required: true },
];

export const createEvent = async (name: string): Promise<string> => {
  const newEventRef = doc(collection(db, EVENTS_COLLECTION));
  
  const newEvent: Event = {
    id: newEventRef.id,
    name,
    isActive: false,
    isRegistrationOpen: false,
    formFields: defaultFormFields,
    createdAt: Date.now()
  };

  await setDoc(newEventRef, newEvent);
  return newEventRef.id;
};

export const subscribeToEvents = (callback: (events: Event[]) => void) => {
  const q = query(collection(db, EVENTS_COLLECTION));
  return onSnapshot(q, (snapshot) => {
    const events = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Event));
    // Sort by createdAt descending
    events.sort((a, b) => b.createdAt - a.createdAt);
    callback(events);
  });
};

export const subscribeToActiveEvent = (callback: (event: Event | null) => void) => {
  const q = query(collection(db, EVENTS_COLLECTION));
  return onSnapshot(q, (snapshot) => {
    const events = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Event));
    const active = events.find(e => e.isActive) || null;
    callback(active);
  });
};

export const setActiveEvent = async (eventId: string): Promise<void> => {
  const batch = writeBatch(db);
  const snapshot = await getDocs(collection(db, EVENTS_COLLECTION));
  
  snapshot.docs.forEach((docSnap) => {
    const isActive = docSnap.id === eventId;
    batch.update(docSnap.ref, { isActive });
  });

  await batch.commit();
};

export const setEventInactive = async (eventId: string): Promise<void> => {
  const docRef = doc(db, EVENTS_COLLECTION, eventId);
  await updateDoc(docRef, { isActive: false });
};

export const updateEvent = async (eventId: string, data: Partial<Event>): Promise<void> => {
  const docRef = doc(db, EVENTS_COLLECTION, eventId);
  const { id, ...updateData } = data as any;
  await updateDoc(docRef, updateData);
};

export const deleteEvent = async (eventId: string): Promise<void> => {
  const batch = writeBatch(db);
  
  // Delete all registrations in the subcollection
  const regsRef = collection(db, EVENTS_COLLECTION, eventId, 'registrations');
  const regsSnap = await getDocs(regsRef);
  regsSnap.forEach(docSnap => {
    batch.delete(docSnap.ref);
  });
  
  // Delete the event document
  const eventRef = doc(db, EVENTS_COLLECTION, eventId);
  batch.delete(eventRef);
  
  await batch.commit();
};
