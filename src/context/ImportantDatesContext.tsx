import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { useAuth } from './AuthContext';

export type EventCategory =
  | 'Exams'
  | 'Assignments'
  | 'Project Deadlines'
  | 'Certificate Renewals'
  | 'Fees'
  | 'Birthdays'
  | 'Personal Events';

export const EVENT_CATEGORIES: EventCategory[] = [
  'Exams',
  'Assignments',
  'Project Deadlines',
  'Certificate Renewals',
  'Fees',
  'Birthdays',
  'Personal Events',
];

export type ReminderType = '7_days' | '3_days' | '1_day' | 'on_date' | 'custom';

export type ReminderStatus = 'Scheduled' | 'Sent' | 'Failed' | 'Cancelled';

export interface EventReminderItem {
  id: string;
  event_id: string;
  user_id: string;
  reminder_type: ReminderType;
  custom_hours_before?: number | null;
  remind_at: string;
  status: ReminderStatus;
  sent_at?: string | null;
  error_message?: string | null;
  retry_count: number;
  created_at: string;
}

export interface EventItem {
  id: string;
  user_id: string;
  title: string;
  description?: string;
  category: EventCategory;
  event_date: string; // YYYY-MM-DD
  event_time: string; // HH:mm:ss or HH:mm
  location?: string;
  timezone: string;
  is_completed: boolean;
  email_reminders_enabled: boolean;
  created_at: string;
  updated_at?: string;
  reminders?: EventReminderItem[];
}

export interface ReminderPreferences {
  email_notifications_enabled: boolean;
  default_reminder_types: ReminderType[];
  preferred_timezone: string;
}

interface ImportantDatesContextType {
  events: EventItem[];
  preferences: ReminderPreferences;
  loading: boolean;
  addEvent: (
    eventData: {
      title: string;
      description?: string;
      category: EventCategory;
      event_date: string;
      event_time: string;
      location?: string;
      timezone?: string;
      email_reminders_enabled?: boolean;
    },
    reminderTypes?: ReminderType[],
    customHours?: number
  ) => Promise<{ success: boolean; eventId?: string; error?: Error }>;
  updateEvent: (
    eventId: string,
    eventData: Partial<EventItem>,
    reminderTypes?: ReminderType[],
    customHours?: number
  ) => Promise<{ success: boolean; error?: Error }>;
  deleteEvent: (eventId: string) => Promise<{ success: boolean; error?: Error }>;
  toggleComplete: (eventId: string) => Promise<{ success: boolean; error?: Error }>;
  updatePreferences: (newPref: Partial<ReminderPreferences>) => Promise<{ success: boolean; error?: Error }>;
  refreshEvents: () => Promise<void>;
}

const DEFAULT_PREFERENCES: ReminderPreferences = {
  email_notifications_enabled: true,
  default_reminder_types: ['1_day', 'on_date'],
  preferred_timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
};

// Generate initial academic events relative to current date
const generateDemoEvents = (userId: string): EventItem[] => {
  const today = new Date();
  const formatYMD = (d: Date) => d.toISOString().split('T')[0];

  const inDays = (days: number) => {
    const d = new Date(today);
    d.setDate(d.getDate() + days);
    return formatYMD(d);
  };

  return [
    {
      id: 'evt-demo-1',
      user_id: userId,
      title: 'Final Semester Comprehensive Examinations',
      description: 'Main campus examination hall. Admit card & student vault ID mandatory.',
      category: 'Exams',
      event_date: inDays(3),
      event_time: '09:30:00',
      location: 'Central Exam Hall A',
      timezone: 'UTC',
      is_completed: false,
      email_reminders_enabled: true,
      created_at: new Date().toISOString(),
      reminders: [
        {
          id: 'rem-1-1',
          event_id: 'evt-demo-1',
          user_id: userId,
          reminder_type: '3_days',
          remind_at: new Date(Date.now() - 3600000).toISOString(),
          status: 'Sent',
          sent_at: new Date(Date.now() - 3600000).toISOString(),
          retry_count: 0,
          created_at: new Date().toISOString(),
        },
        {
          id: 'rem-1-2',
          event_id: 'evt-demo-1',
          user_id: userId,
          reminder_type: '1_day',
          remind_at: new Date(Date.now() + 2 * 24 * 3600000).toISOString(),
          status: 'Scheduled',
          retry_count: 0,
          created_at: new Date().toISOString(),
        },
      ],
    },
    {
      id: 'evt-demo-2',
      user_id: userId,
      title: 'Spring Semester Tuition & Locker Renewal Fee',
      description: 'University bursar clearance for next academic semester session.',
      category: 'Fees',
      event_date: inDays(7),
      event_time: '17:00:00',
      location: 'Finance & Administration Portal',
      timezone: 'UTC',
      is_completed: false,
      email_reminders_enabled: true,
      created_at: new Date().toISOString(),
      reminders: [
        {
          id: 'rem-2-1',
          event_id: 'evt-demo-2',
          user_id: userId,
          reminder_type: '7_days',
          remind_at: new Date(Date.now() + 3600000).toISOString(),
          status: 'Scheduled',
          retry_count: 0,
          created_at: new Date().toISOString(),
        },
      ],
    },
    {
      id: 'evt-demo-3',
      user_id: userId,
      title: 'International Student Merit Scholarship Application',
      description: 'Submit verified transcripts and faculty recommendations from vault.',
      category: 'Project Deadlines',
      event_date: inDays(14),
      event_time: '23:59:00',
      location: 'Online Scholarship Portal',
      timezone: 'UTC',
      is_completed: false,
      email_reminders_enabled: true,
      created_at: new Date().toISOString(),
    },
    {
      id: 'evt-demo-4',
      user_id: userId,
      title: 'Graduation Convocation Degree Gown Sizing',
      description: 'Online registration for annual convocation regalia.',
      category: 'Certificate Renewals',
      event_date: inDays(25),
      event_time: '14:00:00',
      location: 'Student Affairs Center, Room 204',
      timezone: 'UTC',
      is_completed: true,
      email_reminders_enabled: false,
      created_at: new Date().toISOString(),
    },
  ];
};

const ImportantDatesContext = createContext<ImportantDatesContextType | undefined>(undefined);

export const ImportantDatesProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const userId = user?.id || 'demo-student';

  const [events, setEvents] = useState<EventItem[]>([]);
  const [preferences, setPreferences] = useState<ReminderPreferences>(DEFAULT_PREFERENCES);
  const [loading, setLoading] = useState<boolean>(true);

  // Sync state to localStorage for offline / fallback stability
  const persistLocalEvents = useCallback((updated: EventItem[]) => {
    localStorage.setItem(`events_${userId}`, JSON.stringify(updated));
  }, [userId]);

  const persistLocalPreferences = useCallback((pref: ReminderPreferences) => {
    localStorage.setItem(`event_pref_${userId}`, JSON.stringify(pref));
  }, [userId]);

  // Load events and preferences
  const fetchEvents = useCallback(async () => {
    setLoading(true);

    // Load preferences from local storage or Supabase
    const savedPref = localStorage.getItem(`event_pref_${userId}`);
    if (savedPref) {
      try {
        setPreferences(JSON.parse(savedPref));
      } catch {
        // use default
      }
    }

    if (!isSupabaseConfigured || !user) {
      // Local fallback
      const savedEvents = localStorage.getItem(`events_${userId}`);
      if (savedEvents) {
        try {
          setEvents(JSON.parse(savedEvents));
        } catch {
          const initial = generateDemoEvents(userId);
          setEvents(initial);
          persistLocalEvents(initial);
        }
      } else {
        const initial = generateDemoEvents(userId);
        setEvents(initial);
        persistLocalEvents(initial);
      }
      setLoading(false);
      return;
    }

    try {
      // Fetch from Supabase
      const { data: eventData, error: eventErr } = await supabase
        .from('events')
        .select('*, event_reminders(*)')
        .eq('user_id', user.id)
        .order('event_date', { ascending: true });

      if (eventErr) {
        console.warn('Error fetching events from Supabase:', eventErr.message);
        const savedEvents = localStorage.getItem(`events_${userId}`);
        setEvents(savedEvents ? JSON.parse(savedEvents) : generateDemoEvents(userId));
      } else if (eventData) {
        const formatted: EventItem[] = eventData.map((e: any) => ({
          ...e,
          reminders: e.event_reminders || [],
        }));
        setEvents(formatted);
        persistLocalEvents(formatted);
      }

      // Fetch user preferences
      const { data: prefData } = await supabase
        .from('student_reminder_preferences')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (prefData) {
        const pref: ReminderPreferences = {
          email_notifications_enabled: prefData.email_notifications_enabled,
          default_reminder_types: prefData.default_reminder_types || ['1_day', 'on_date'],
          preferred_timezone: prefData.preferred_timezone || 'UTC',
        };
        setPreferences(pref);
        persistLocalPreferences(pref);
      }
    } catch (err) {
      console.error('Unexpected error loading events:', err);
      const savedEvents = localStorage.getItem(`events_${userId}`);
      setEvents(savedEvents ? JSON.parse(savedEvents) : generateDemoEvents(userId));
    } finally {
      setLoading(false);
    }
  }, [user, userId, persistLocalEvents, persistLocalPreferences]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  // Helper to calculate reminder timestamp
  const calculateRemindAt = (
    eventDate: string,
    eventTime: string,
    type: ReminderType,
    customHours?: number | null
  ): string => {
    const timeParts = eventTime.split(':');
    const hours = parseInt(timeParts[0] || '9', 10);
    const minutes = parseInt(timeParts[1] || '0', 10);

    const eventDateTime = new Date(`${eventDate}T00:00:00Z`);
    eventDateTime.setUTCHours(hours, minutes, 0, 0);

    let remindDate = new Date(eventDateTime);

    if (type === '7_days') {
      remindDate = new Date(eventDateTime.getTime() - 7 * 24 * 60 * 60 * 1000);
    } else if (type === '3_days') {
      remindDate = new Date(eventDateTime.getTime() - 3 * 24 * 60 * 60 * 1000);
    } else if (type === '1_day') {
      remindDate = new Date(eventDateTime.getTime() - 1 * 24 * 60 * 60 * 1000);
    } else if (type === 'on_date') {
      remindDate.setUTCHours(8, 0, 0, 0); // 8:00 AM on event day
    } else if (type === 'custom' && customHours) {
      remindDate = new Date(eventDateTime.getTime() - customHours * 60 * 60 * 1000);
    }

    return remindDate.toISOString();
  };

  // Add Event
  const addEvent = async (
    eventData: {
      title: string;
      description?: string;
      category: EventCategory;
      event_date: string;
      event_time: string;
      location?: string;
      timezone?: string;
      email_reminders_enabled?: boolean;
    },
    reminderTypes: ReminderType[] = ['1_day', 'on_date'],
    customHours?: number
  ): Promise<{ success: boolean; eventId?: string; error?: Error }> => {
    const tz = eventData.timezone || preferences.preferred_timezone || 'UTC';
    const cleanEvent = {
      title: eventData.title.trim(),
      description: eventData.description?.trim() || '',
      category: eventData.category,
      event_date: eventData.event_date,
      event_time: eventData.event_time || '09:00:00',
      location: eventData.location?.trim() || '',
      timezone: tz,
      is_completed: false,
      email_reminders_enabled: eventData.email_reminders_enabled ?? true,
    };

    const newId = `evt-${Date.now()}`;
    const generatedReminders: EventReminderItem[] = reminderTypes.map((type) => ({
      id: `rem-${Date.now()}-${type}`,
      event_id: newId,
      user_id: userId,
      reminder_type: type,
      custom_hours_before: type === 'custom' ? customHours : null,
      remind_at: calculateRemindAt(cleanEvent.event_date, cleanEvent.event_time, type, customHours),
      status: 'Scheduled',
      retry_count: 0,
      created_at: new Date().toISOString(),
    }));

    const newEventItem: EventItem = {
      id: newId,
      user_id: userId,
      ...cleanEvent,
      created_at: new Date().toISOString(),
      reminders: generatedReminders,
    };

    if (isSupabaseConfigured && user) {
      try {
        const { data, error } = await supabase
          .from('events')
          .insert({
            user_id: user.id,
            ...cleanEvent,
          })
          .select()
          .single();

        if (error) throw error;

        const createdId = data.id;

        // Schedule reminders using RPC or table insert
        if (cleanEvent.email_reminders_enabled && reminderTypes.length > 0) {
          try {
            await supabase.rpc('schedule_event_reminders', {
              p_event_id: createdId,
              p_reminder_types: reminderTypes,
              p_custom_hours: customHours || null,
            });
          } catch (rpcErr) {
            console.warn('RPC schedule_event_reminders fallback:', rpcErr);
            const dbReminders = reminderTypes.map((type) => ({
              event_id: createdId,
              user_id: user.id,
              reminder_type: type,
              custom_hours_before: type === 'custom' ? customHours : null,
              remind_at: calculateRemindAt(cleanEvent.event_date, cleanEvent.event_time, type, customHours),
              status: 'Scheduled',
            }));
            await supabase.from('event_reminders').insert(dbReminders);
          }
        }

        await fetchEvents();
        return { success: true, eventId: createdId };
      } catch (err: any) {
        console.warn('Supabase addEvent error, applying local fallback:', err);
      }
    }

    // Local state fallback
    const updated = [newEventItem, ...events].sort(
      (a, b) => new Date(a.event_date).getTime() - new Date(b.event_date).getTime()
    );
    setEvents(updated);
    persistLocalEvents(updated);
    return { success: true, eventId: newId };
  };

  // Update Event
  const updateEvent = async (
    eventId: string,
    eventData: Partial<EventItem>,
    reminderTypes?: ReminderType[],
    customHours?: number
  ): Promise<{ success: boolean; error?: Error }> => {
    if (isSupabaseConfigured && user) {
      try {
        const { error } = await supabase
          .from('events')
          .update({
            ...eventData,
            updated_at: new Date().toISOString(),
          })
          .eq('id', eventId);

        if (error) throw error;

        if (reminderTypes !== undefined) {
          await supabase.rpc('schedule_event_reminders', {
            p_event_id: eventId,
            p_reminder_types: reminderTypes,
            p_custom_hours: customHours || null,
          });
        }

        await fetchEvents();
        return { success: true };
      } catch (err: any) {
        console.warn('Supabase updateEvent error, updating local:', err);
      }
    }

    const updated = events.map((e) => {
      if (e.id !== eventId) return e;
      const merged = { ...e, ...eventData, updated_at: new Date().toISOString() };
      if (reminderTypes !== undefined) {
        merged.reminders = reminderTypes.map((type) => ({
          id: `rem-${Date.now()}-${type}`,
          event_id: eventId,
          user_id: userId,
          reminder_type: type,
          custom_hours_before: type === 'custom' ? customHours : null,
          remind_at: calculateRemindAt(merged.event_date, merged.event_time, type, customHours),
          status: 'Scheduled',
          retry_count: 0,
          created_at: new Date().toISOString(),
        }));
      }
      return merged;
    });

    setEvents(updated);
    persistLocalEvents(updated);
    return { success: true };
  };

  // Delete Event
  const deleteEvent = async (eventId: string): Promise<{ success: boolean; error?: Error }> => {
    if (isSupabaseConfigured && user) {
      try {
        const { error } = await supabase.from('events').delete().eq('id', eventId);
        if (error) throw error;
        await fetchEvents();
        return { success: true };
      } catch (err: any) {
        console.warn('Supabase deleteEvent error, deleting local:', err);
      }
    }

    const updated = events.filter((e) => e.id !== eventId);
    setEvents(updated);
    persistLocalEvents(updated);
    return { success: true };
  };

  // Toggle Event Completed
  const toggleComplete = async (eventId: string): Promise<{ success: boolean; error?: Error }> => {
    const target = events.find((e) => e.id === eventId);
    if (!target) return { success: false, error: new Error('Event not found') };
    const nextStatus = !target.is_completed;

    if (isSupabaseConfigured && user) {
      try {
        const { error } = await supabase
          .from('events')
          .update({ is_completed: nextStatus, updated_at: new Date().toISOString() })
          .eq('id', eventId);

        if (error) throw error;
        await fetchEvents();
        return { success: true };
      } catch (err: any) {
        console.warn('Supabase toggleComplete error, updating local:', err);
      }
    }

    const updated = events.map((e) => (e.id === eventId ? { ...e, is_completed: nextStatus } : e));
    setEvents(updated);
    persistLocalEvents(updated);
    return { success: true };
  };

  // Update Preferences
  const updatePreferences = async (
    newPref: Partial<ReminderPreferences>
  ): Promise<{ success: boolean; error?: Error }> => {
    const merged: ReminderPreferences = { ...preferences, ...newPref };
    setPreferences(merged);
    persistLocalPreferences(merged);

    if (isSupabaseConfigured && user) {
      try {
        const { error } = await supabase
          .from('student_reminder_preferences')
          .upsert({
            user_id: user.id,
            email_notifications_enabled: merged.email_notifications_enabled,
            default_reminder_types: merged.default_reminder_types,
            preferred_timezone: merged.preferred_timezone,
            updated_at: new Date().toISOString(),
          });

        if (error) throw error;
      } catch (err: any) {
        console.warn('Supabase updatePreferences error:', err);
      }
    }

    return { success: true };
  };

  const value = {
    events,
    preferences,
    loading,
    addEvent,
    updateEvent,
    deleteEvent,
    toggleComplete,
    updatePreferences,
    refreshEvents: fetchEvents,
  };

  return <ImportantDatesContext.Provider value={value}>{children}</ImportantDatesContext.Provider>;
};

export const useImportantDates = () => {
  const context = useContext(ImportantDatesContext);
  if (!context) {
    throw new Error('useImportantDates must be used within an ImportantDatesProvider');
  }
  return context;
};
