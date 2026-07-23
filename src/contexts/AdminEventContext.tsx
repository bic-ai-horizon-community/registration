import React, { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { subscribeToEvents } from '../firebase/events';
import type { Event } from '../types';

interface AdminEventContextType {
  events: Event[];
  selectedEventId: string | null;
  setSelectedEventId: (id: string | null) => void;
  selectedEvent: Event | null;
  activeEvent: Event | null;
  loading: boolean;
}

const AdminEventContext = createContext<AdminEventContextType | undefined>(undefined);

export const AdminEventProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [events, setEvents] = useState<Event[]>([]);
  const [selectedEventIdState, setSelectedEventIdState] = useState<string | null>(localStorage.getItem('adminSelectedEventId'));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = subscribeToEvents((data) => {
      setEvents(data);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const activeEvent = events.find(e => e.isActive) || null;
  
  // If no selected event ID, or the selected one was deleted, default to active event
  const selectedEvent = events.find(e => e.id === selectedEventIdState) || activeEvent || (events.length > 0 ? events[0] : null);

  // Sync selectedEventId back to state if it was defaulted
  useEffect(() => {
    if (selectedEvent && selectedEvent.id !== selectedEventIdState) {
      setSelectedEventIdState(selectedEvent.id);
    }
  }, [selectedEvent, selectedEventIdState]);

  const setSelectedEventId = (id: string | null) => {
    setSelectedEventIdState(id);
    if (id) {
      localStorage.setItem('adminSelectedEventId', id);
    } else {
      localStorage.removeItem('adminSelectedEventId');
    }
  };

  return (
    <AdminEventContext.Provider value={{
      events,
      selectedEventId: selectedEvent?.id || null,
      setSelectedEventId,
      selectedEvent,
      activeEvent,
      loading
    }}>
      {children}
    </AdminEventContext.Provider>
  );
};

export const useAdminEvent = () => {
  const context = useContext(AdminEventContext);
  if (context === undefined) {
    throw new Error('useAdminEvent must be used within an AdminEventProvider');
  }
  return context;
};
