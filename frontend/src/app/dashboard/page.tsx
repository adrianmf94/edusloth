"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import MainLayout from "@/components/layout/MainLayout";
import { useAuthStore } from "@/lib/store/authStore";
import { useContentStore } from "@/lib/store/contentStore";
import { useReminderStore } from "@/lib/store/reminderStore";
import Link from "next/link";
import AudioRecorder from "@/components/audio/AudioRecorder";

const DashboardPage = () => {
  const router = useRouter();
  const { user, isAuthenticated, checkAuth } = useAuthStore();
  const {
    contents,
    fetchContents,
    isLoading: contentsLoading,
  } = useContentStore();
  const {
    upcomingReminders,
    fetchUpcomingReminders,
    completeReminder,
    isLoading: remindersLoading,
  } = useReminderStore();
  const [recordingMode, setRecordingMode] = useState(false);

  useEffect(() => {
    const initialize = async () => {
      // Check if user is authenticated, redirect to login if not
      await checkAuth();
      if (!useAuthStore.getState().isAuthenticated) {
        router.push("/login");
        return;
      }

      // Fetch necessary data
      await fetchContents();
      await fetchUpcomingReminders();
    };

    initialize();
  }, [checkAuth, router, fetchContents, fetchUpcomingReminders]);

  const handleCompleteReminder = async (reminderId: string) => {
    await completeReminder(reminderId);
  };

  const handleRecordingComplete = (contentId: string) => {
    setRecordingMode(false);
    // Optionally navigate to the content detail
    router.push(`/content/${contentId}`);
  };

  if (!isAuthenticated) {
    return null; // Will redirect in useEffect
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <div className="p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Welcome back, {user?.name || user?.email}!
            </h2>
            <p className="text-gray-600">
              Track your learning, manage your study materials, and create
              reminders all in one place.
            </p>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <div className="p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Quick Actions
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <button
                onClick={() => setRecordingMode(true)}
                className="p-4 border border-gray-200 rounded-lg bg-indigo-50 hover:bg-indigo-100 flex items-center justify-center"
              >
                <span className="text-indigo-600 font-medium">
                  Record Audio
                </span>
              </button>
              <Link
                href="/content/upload"
                className="p-4 border border-gray-200 rounded-lg bg-green-50 hover:bg-green-100 flex items-center justify-center"
              >
                <span className="text-green-600 font-medium">
                  Upload Document
                </span>
              </Link>
              <Link
                href="/reminders/new"
                className="p-4 border border-gray-200 rounded-lg bg-blue-50 hover:bg-blue-100 flex items-center justify-center"
              >
                <span className="text-blue-600 font-medium">Add Reminder</span>
              </Link>
            </div>
          </div>
        </div>

        {/* Audio Recorder (Conditional) */}
        {recordingMode && (
          <div className="bg-white shadow rounded-lg overflow-hidden">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium text-gray-900">
                  Record Audio
                </h3>
                <button
                  onClick={() => setRecordingMode(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  Cancel
                </button>
              </div>
              <AudioRecorder onRecordingComplete={handleRecordingComplete} />
            </div>
          </div>
        )}

        {/* Recent Content */}
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <div className="p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-gray-900">
                Recent Content
              </h3>
              <Link
                href="/content"
                className="text-sm text-indigo-600 hover:text-indigo-500"
              >
                View all
              </Link>
            </div>

            {contentsLoading ? (
              <p className="text-gray-500">Loading content...</p>
            ) : contents.length === 0 ? (
              <p className="text-gray-500">
                No content yet. Upload a document or record audio to get
                started.
              </p>
            ) : (
              <div className="space-y-3">
                {contents.slice(0, 3).map((content) => (
                  <Link
                    key={content.id}
                    href={`/content/${content.id}`}
                    className="block p-3 border border-gray-200 rounded-lg hover:bg-gray-50"
                  >
                    <div className="flex items-center">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {content.title}
                        </p>
                        <p className="text-sm text-gray-500 truncate">
                          {new Date(content.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="ml-4">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            content.content_type === "audio"
                              ? "bg-red-100 text-red-800"
                              : "bg-blue-100 text-blue-800"
                          }`}
                        >
                          {content.content_type}
                        </span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Upcoming Reminders */}
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <div className="p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-gray-900">
                Upcoming Reminders
              </h3>
              <Link
                href="/reminders"
                className="text-sm text-indigo-600 hover:text-indigo-500"
              >
                View all
              </Link>
            </div>

            {remindersLoading ? (
              <p className="text-gray-500">Loading reminders...</p>
            ) : upcomingReminders.length === 0 ? (
              <p className="text-gray-500">No upcoming reminders.</p>
            ) : (
              <div className="space-y-3">
                {upcomingReminders.slice(0, 3).map((reminder) => (
                  <div
                    key={reminder.id}
                    className="flex items-center p-3 border border-gray-200 rounded-lg"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900">
                        {reminder.description}
                      </p>
                      <p className="text-sm text-gray-500">
                        Due: {new Date(reminder.due_date).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="ml-4">
                      <button
                        onClick={() => handleCompleteReminder(reminder.id)}
                        className="inline-flex items-center px-2.5 py-1.5 border border-transparent text-xs font-medium rounded text-green-700 bg-green-100 hover:bg-green-200"
                      >
                        Complete
                      </button>
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

export default DashboardPage;
