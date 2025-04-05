"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import MainLayout from "@/components/layout/MainLayout";
import { useAuthStore } from "@/lib/store/authStore";
import { useReminderStore } from "@/lib/store/reminderStore";
import Link from "next/link";

const NewReminderPage = () => {
  const router = useRouter();
  const { isAuthenticated, checkAuth } = useAuthStore();
  const { createReminder, isLoading, error } = useReminderStore();

  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [priority, setPriority] = useState<string>("medium");
  const [localError, setLocalError] = useState<string | null>(null);

  useEffect(() => {
    const initialize = async () => {
      // Check if user is authenticated, redirect to login if not
      await checkAuth();
      if (!useAuthStore.getState().isAuthenticated) {
        router.push("/login");
        return;
      }
    };

    initialize();
  }, [checkAuth, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate inputs
    if (!description.trim()) {
      setLocalError("Description is required");
      return;
    }

    if (!dueDate) {
      setLocalError("Due date is required");
      return;
    }

    // Clear previous errors
    setLocalError(null);

    // Create reminder
    const success = await createReminder({
      description,
      due_date: dueDate,
      priority,
    });

    if (success) {
      router.push("/reminders");
    }
  };

  // Set default due date to tomorrow
  useEffect(() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    setDueDate(tomorrow.toISOString().split("T")[0]);
  }, []);

  if (!isAuthenticated) {
    return null; // Will redirect in useEffect
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <div className="p-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
              <h1 className="text-2xl font-bold text-gray-900">
                Create Reminder
              </h1>
              <div className="mt-3 sm:mt-0 flex gap-3">
                <Link
                  href="/reminders"
                  className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                >
                  Cancel
                </Link>
              </div>
            </div>
          </div>
        </div>

        {(error || localError) && (
          <div className="bg-red-50 p-4 rounded-md">
            <p className="text-red-700">{error || localError}</p>
          </div>
        )}

        <div className="bg-white shadow rounded-lg overflow-hidden">
          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            <div>
              <label
                htmlFor="description"
                className="block text-sm font-medium text-gray-700"
              >
                Description
              </label>
              <textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                placeholder="What do you need to remember?"
                required
              />
            </div>

            <div>
              <label
                htmlFor="due-date"
                className="block text-sm font-medium text-gray-700"
              >
                Due Date
              </label>
              <input
                type="date"
                id="due-date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                required
              />
            </div>

            <div>
              <label
                htmlFor="priority"
                className="block text-sm font-medium text-gray-700"
              >
                Priority
              </label>
              <select
                id="priority"
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>

            <div className="flex flex-col space-y-2">
              <button
                type="submit"
                disabled={isLoading}
                className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
              >
                {isLoading ? "Creating..." : "Create Reminder"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </MainLayout>
  );
};

export default NewReminderPage;
