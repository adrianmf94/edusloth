import { create } from 'zustand';
import {
  getReminders,
  getUpcomingReminders,
  createReminder,
  updateReminder,
  deleteReminder,
} from '../api';

interface Reminder {
  id: string;
  user_id: string;
  content_id?: string;
  description: string;
  due_date: string;
  priority: string;
  is_completed: boolean;
  created_at: string;
  updated_at?: string;
}

interface ReminderInput {
  description: string;
  due_date: string;
  priority: string;
}

interface ReminderState {
  reminders: Reminder[];
  upcomingReminders: Reminder[];
  isLoading: boolean;
  error: string | null;
  
  // Actions
  fetchReminders: (includeCompleted?: boolean) => Promise<Reminder[]>;
  fetchUpcomingReminders: () => Promise<Reminder[]>;
  createReminder: (reminderData: ReminderInput) => Promise<boolean>;
  completeReminder: (reminderId: string) => Promise<boolean>;
  updateReminder: (reminderId: string, reminderData: Partial<ReminderInput>) => Promise<boolean>;
  removeReminder: (reminderId: string) => Promise<boolean>;
}

export const useReminderStore = create<ReminderState>((set, get) => ({
  reminders: [],
  upcomingReminders: [],
  isLoading: false,
  error: null,
  
  fetchReminders: async (includeCompleted = false) => {
    set({ isLoading: true, error: null });
    try {
      const reminders = await getReminders({ include_completed: includeCompleted });
      set({ reminders, isLoading: false });
      return reminders;
    } catch (error: any) {
      set({
        isLoading: false,
        error: error.response?.data?.detail || 'Failed to fetch reminders',
      });
      return [];
    }
  },
  
  fetchUpcomingReminders: async () => {
    set({ isLoading: true, error: null });
    try {
      const upcomingReminders = await getUpcomingReminders();
      set({ upcomingReminders, isLoading: false });
      return upcomingReminders;
    } catch (error: any) {
      set({
        isLoading: false,
        error: error.response?.data?.detail || 'Failed to fetch upcoming reminders',
      });
      return [];
    }
  },
  
  createReminder: async (reminderData: ReminderInput) => {
    set({ isLoading: true, error: null });
    try {
      await createReminder(reminderData);
      // Refetch reminders to update the list
      await get().fetchReminders(false);
      await get().fetchUpcomingReminders();
      set({ isLoading: false });
      return true;
    } catch (error: any) {
      set({
        isLoading: false,
        error: error.response?.data?.detail || 'Failed to create reminder',
      });
      return false;
    }
  },
  
  completeReminder: async (reminderId: string) => {
    set({ isLoading: true, error: null });
    try {
      await updateReminder(reminderId, { is_completed: true });
      
      // Update local state
      set(state => ({
        reminders: state.reminders.map(reminder => 
          reminder.id === reminderId 
            ? { ...reminder, is_completed: true } 
            : reminder
        ),
        upcomingReminders: state.upcomingReminders.filter(
          reminder => reminder.id !== reminderId
        ),
        isLoading: false,
      }));
      
      return true;
    } catch (error: any) {
      set({
        isLoading: false,
        error: error.response?.data?.detail || 'Failed to complete reminder',
      });
      return false;
    }
  },
  
  updateReminder: async (reminderId: string, reminderData: Partial<ReminderInput>) => {
    set({ isLoading: true, error: null });
    try {
      await updateReminder(reminderId, reminderData);
      
      // Refetch reminders to get updated data
      await get().fetchReminders(get().reminders.some(r => r.is_completed));
      await get().fetchUpcomingReminders();
      
      set({ isLoading: false });
      return true;
    } catch (error: any) {
      set({
        isLoading: false,
        error: error.response?.data?.detail || 'Failed to update reminder',
      });
      return false;
    }
  },
  
  removeReminder: async (reminderId: string) => {
    set({ isLoading: true, error: null });
    try {
      await deleteReminder(reminderId);
      
      // Update local state
      set(state => ({
        reminders: state.reminders.filter(reminder => reminder.id !== reminderId),
        upcomingReminders: state.upcomingReminders.filter(
          reminder => reminder.id !== reminderId
        ),
        isLoading: false,
      }));
      
      return true;
    } catch (error: any) {
      set({
        isLoading: false,
        error: error.response?.data?.detail || 'Failed to delete reminder',
      });
      return false;
    }
  },
})); 