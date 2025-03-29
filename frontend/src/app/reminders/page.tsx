'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import MainLayout from '@/components/layout/MainLayout';
import { useAuthStore } from '@/lib/store/authStore';
import { useReminderStore } from '@/lib/store/reminderStore';

const ReminderPage = () => {
  const router = useRouter();
  const { isAuthenticated, checkAuth } = useAuthStore();
  const { reminders, fetchReminders, completeReminder, removeReminder, isLoading, error } = useReminderStore();
  const [showCompleted, setShowCompleted] = useState(false);

  useEffect(() => {
    const initialize = async () => {
      // Check if user is authenticated, redirect to login if not
      await checkAuth();
      if (!useAuthStore.getState().isAuthenticated) {
        router.push('/login');
        return;
      }
      
      // Fetch reminders including completed if showCompleted is true
      await fetchReminders(showCompleted);
    };
    
    initialize();
  }, [checkAuth, router, fetchReminders, showCompleted]);

  const handleCompleteReminder = async (reminderId: string) => {
    await completeReminder(reminderId);
    // If not showing completed, refetch to remove the completed reminder from the list
    if (!showCompleted) {
      await fetchReminders(false);
    }
  };

  const handleDeleteReminder = async (reminderId: string) => {
    if (window.confirm('Are you sure you want to delete this reminder?')) {
      await removeReminder(reminderId);
    }
  };

  const sortedReminders = [...reminders].sort((a, b) => {
    // Sort by due date (ascending)
    const dateA = new Date(a.due_date).getTime();
    const dateB = new Date(b.due_date).getTime();
    return dateA - dateB;
  });

  if (!isAuthenticated) {
    return null; // Will redirect in useEffect
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <div className="p-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
              <h1 className="text-2xl font-bold text-gray-900">My Reminders</h1>
              <div className="mt-3 sm:mt-0 flex gap-3">
                <Link
                  href="/reminders/new"
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  Add Reminder
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <div className="p-4 border-b">
            <h2 className="text-lg font-medium text-gray-900">Filters</h2>
          </div>
          <div className="p-4 flex items-center">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={showCompleted}
                onChange={(e) => setShowCompleted(e.target.checked)}
                className="rounded border-gray-300 text-indigo-600 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
              />
              <span className="ml-2 text-gray-700">Show completed reminders</span>
            </label>
          </div>
        </div>

        {/* Reminders List */}
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <div className="p-6">
            {isLoading ? (
              <div className="text-center py-6">
                <p className="text-gray-500">Loading reminders...</p>
              </div>
            ) : error ? (
              <div className="text-center py-6">
                <p className="text-red-500">{error}</p>
              </div>
            ) : sortedReminders.length === 0 ? (
              <div className="text-center py-6">
                <p className="text-gray-500">
                  {showCompleted 
                    ? 'No reminders found.'
                    : 'No active reminders. Add a reminder to get started.'}
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {sortedReminders.map((reminder) => (
                  <div
                    key={reminder.id}
                    className={`p-4 border rounded-lg ${
                      reminder.is_completed 
                        ? 'bg-gray-50 border-gray-200' 
                        : 'border-indigo-200 bg-white'
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center">
                      <div className="flex-1 min-w-0">
                        <p className={`text-md font-medium ${
                          reminder.is_completed ? 'text-gray-500 line-through' : 'text-gray-900'
                        }`}>
                          {reminder.description}
                        </p>
                        <div className="mt-2 flex flex-wrap gap-2">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            reminder.is_completed
                              ? 'bg-gray-100 text-gray-800'
                              : getPriorityStyle(reminder.priority)
                          }`}>
                            {reminder.priority}
                          </span>
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            Due: {new Date(reminder.due_date).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                      
                      <div className="mt-3 sm:mt-0 sm:ml-4 flex space-x-2">
                        {!reminder.is_completed && (
                          <button
                            onClick={() => handleCompleteReminder(reminder.id)}
                            className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md text-green-700 bg-green-100 hover:bg-green-200"
                          >
                            Complete
                          </button>
                        )}
                        <button
                          onClick={() => handleDeleteReminder(reminder.id)}
                          className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md text-red-700 bg-red-100 hover:bg-red-200"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </MainLayout>
  );
};

// Utility function to get the appropriate style for priority
const getPriorityStyle = (priority: string) => {
  switch (priority.toLowerCase()) {
    case 'high':
      return 'bg-red-100 text-red-800';
    case 'medium':
      return 'bg-yellow-100 text-yellow-800';
    case 'low':
      return 'bg-green-100 text-green-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
};

export default ReminderPage; 