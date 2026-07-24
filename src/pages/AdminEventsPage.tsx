import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CalendarDays, Plus, CheckCircle2, Circle, Eye, Trash2, Edit2, X, Check } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { createEvent, setActiveEvent, deleteEvent, updateEvent, setEventInactive } from '../firebase/events';
import { useAdminEvent } from '../contexts/AdminEventContext';

export const AdminEventsPage: React.FC = () => {
  const { events, loading, selectedEventId, setSelectedEventId } = useAdminEvent();
  const [newEventName, setNewEventName] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState('');
  
  // States for renaming
  const [editingEventId, setEditingEventId] = useState<string | null>(null);
  const [editEventName, setEditEventName] = useState('');
  const [editEventDescription, setEditEventDescription] = useState('');
  const [isSavingName, setIsSavingName] = useState(false);

  const navigate = useNavigate();

  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEventName.trim()) return;

    setIsCreating(true);
    setCreateError('');
    try {
      const id = await createEvent(newEventName.trim());
      setSelectedEventId(id);
      setNewEventName('');
    } catch (err: any) {
      setCreateError(err.message || 'Failed to create event');
    } finally {
      setIsCreating(false);
    }
  };

  const handleSetActive = async (eventId: string) => {
    try {
      await setActiveEvent(eventId);
    } catch (err) {
      console.error('Failed to set active event:', err);
    }
  };

  const handleSetInactive = async (eventId: string) => {
    try {
      await setEventInactive(eventId);
    } catch (err) {
      console.error('Failed to set event inactive:', err);
    }
  };

  const handleDelete = async (eventId: string, eventName: string) => {
    if (window.confirm(`Are you sure you want to completely delete "${eventName}" and all its registrations? This action cannot be undone.`)) {
      try {
        await deleteEvent(eventId);
        if (selectedEventId === eventId) {
          setSelectedEventId(null);
        }
      } catch (err) {
        console.error('Failed to delete event:', err);
        alert('Failed to delete event. Make sure you have admin permissions.');
      }
    }
  };

  const startEditing = (eventId: string, currentName: string, currentDescription: string) => {
    setEditingEventId(eventId);
    setEditEventName(currentName);
    setEditEventDescription(currentDescription || '');
  };

  const cancelEditing = () => {
    setEditingEventId(null);
    setEditEventName('');
    setEditEventDescription('');
  };

  const saveEditing = async (eventId: string) => {
    if (!editEventName.trim()) return;
    setIsSavingName(true);
    try {
      await updateEvent(eventId, { 
        name: editEventName.trim(),
        description: editEventDescription.trim() 
      });
      setEditingEventId(null);
    } catch (err) {
      console.error('Failed to rename event:', err);
      alert('Failed to rename event.');
    } finally {
      setIsSavingName(false);
    }
  };

  const handleView = (eventId: string) => {
    setSelectedEventId(eventId);
    navigate('/admin/dashboard');
  };

  if (loading) {
    return <div className="flex h-32 items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600"></div></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-gray-50">Events</h1>
          <p className="text-gray-500 dark:text-gray-400">Manage all your registration events.</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Create New Event</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleCreateEvent} className="flex flex-col sm:flex-row gap-3">
            <Input 
              placeholder="e.g., AI Horizon 2026"
              value={newEventName}
              onChange={(e) => setNewEventName(e.target.value)}
              className="flex-1"
            />
            <Button type="submit" isLoading={isCreating} disabled={!newEventName.trim()}>
              <Plus className="w-4 h-4 mr-2" />
              Create Event
            </Button>
          </form>
          {createError && <p className="text-red-500 text-sm mt-2">{createError}</p>}
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {events.map((event) => (
          <Card key={event.id} className={`relative overflow-hidden ${event.isActive ? 'border-brand-500 ring-1 ring-brand-500' : ''}`}>
            {event.isActive && (
              <div className="absolute top-0 right-0 bg-brand-500 text-white text-xs font-bold px-2 py-1 rounded-bl-lg z-10">
                ACTIVE
              </div>
            )}
            
            <button 
              onClick={() => handleDelete(event.id, event.name)}
              className="absolute top-2 right-2 p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-md transition-colors z-20"
              title="Delete Event"
            >
              <Trash2 className="w-4 h-4" />
            </button>

            <CardContent className="p-6">
              <div className="flex items-center space-x-3 mb-4 pr-6">
                <div className={`p-2 rounded-lg ${event.isActive ? 'bg-brand-100 text-brand-600 dark:bg-brand-900/30' : 'bg-gray-100 text-gray-500 dark:bg-gray-800'}`}>
                  <CalendarDays className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  {editingEventId === event.id ? (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Input 
                          value={editEventName}
                          onChange={(e) => setEditEventName(e.target.value)}
                          className="h-8 text-sm px-2 py-1 flex-1"
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') saveEditing(event.id);
                            if (e.key === 'Escape') cancelEditing();
                          }}
                        />
                        <button 
                          onClick={() => saveEditing(event.id)}
                          disabled={isSavingName || !editEventName.trim()}
                          className="p-1 text-green-600 hover:bg-green-50 rounded disabled:opacity-50"
                        >
                          <Check className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={cancelEditing}
                          disabled={isSavingName}
                          className="p-1 text-gray-400 hover:bg-gray-100 rounded disabled:opacity-50"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                      <textarea
                        value={editEventDescription}
                        onChange={(e) => setEditEventDescription(e.target.value)}
                        placeholder="Event Description (optional)"
                        className="w-full text-sm border-gray-300 dark:border-gray-700 rounded-md shadow-sm focus:border-brand-500 focus:ring-brand-500 dark:bg-gray-900 dark:text-gray-100 p-2"
                        rows={2}
                      />
                    </div>
                  ) : (
                    <div className="group">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-lg text-gray-900 dark:text-gray-50 truncate" title={event.name}>
                          {event.name}
                        </h3>
                        <button 
                          onClick={() => startEditing(event.id, event.name, event.description || '')}
                          className="p-1 text-gray-400 opacity-0 group-hover:opacity-100 hover:text-brand-600 transition-all rounded-md"
                          title="Edit Event"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                      </div>
                      {event.description && (
                        <p className="text-xs text-gray-600 dark:text-gray-400 mt-1 line-clamp-2" title={event.description}>
                          {event.description}
                        </p>
                      )}
                    </div>
                  )}
                  <p className="text-xs text-gray-500">
                    Created {new Date(event.createdAt).toLocaleDateString()}
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Registrations</span>
                  <span className={`font-medium ${event.isRegistrationOpen ? 'text-green-600' : 'text-red-600'}`}>
                    {event.isRegistrationOpen ? 'Open' : 'Closed'}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Fields</span>
                  <span className="font-medium text-gray-700 dark:text-gray-300">{event.formFields.length}</span>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-gray-100 dark:border-gray-800 space-y-2">
                <Button 
                  variant="outline" 
                  className="w-full" 
                  onClick={() => handleView(event.id)}
                >
                  <Eye className="w-4 h-4 mr-2" />
                  View Dashboard
                </Button>
                
                {!event.isActive ? (
                  <Button 
                    variant="ghost" 
                    className="w-full text-brand-600 hover:text-brand-700 hover:bg-brand-50" 
                    onClick={() => handleSetActive(event.id)}
                  >
                    <Circle className="w-4 h-4 mr-2" />
                    Set as Active Event
                  </Button>
                ) : (
                  <Button 
                    variant="secondary" 
                    className="w-full text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20"
                    onClick={() => handleSetInactive(event.id)}
                  >
                    <CheckCircle2 className="w-4 h-4 mr-2 text-green-500" />
                    Active (Click to Deactivate)
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}

        {events.length === 0 && (
          <div className="col-span-full py-12 text-center text-gray-500 bg-gray-50 dark:bg-gray-900/50 rounded-lg border border-dashed border-gray-200 dark:border-gray-800">
            <CalendarDays className="w-12 h-12 mx-auto text-gray-300 dark:text-gray-600 mb-3" />
            <p className="text-lg font-medium text-gray-900 dark:text-gray-300">No events found</p>
            <p className="text-sm">Create your first event to get started.</p>
          </div>
        )}
      </div>
    </div>
  );
};
