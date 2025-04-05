"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import MainLayout from "@/components/layout/MainLayout";
import { useAuthStore } from "@/lib/store/authStore";
import Todo from "@/components/Todo";

const ProfilePage = () => {
  const router = useRouter();
  const { user, isAuthenticated, checkAuth, updateUserProfile, logout } =
    useAuthStore();

  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    bio: "",
    password: "",
    confirmPassword: "",
  });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // Check authentication
  useEffect(() => {
    const init = async () => {
      if (!isAuthenticated) {
        await checkAuth();
      }

      if (!isAuthenticated) {
        router.push("/login");
      } else if (user) {
        // Pre-fill form data with user info
        setFormData({
          name: user.name || "",
          email: user.email || "",
          bio: user.bio || "",
          password: "",
          confirmPassword: "",
        });
      }
    };

    init();
  }, [isAuthenticated, checkAuth, router, user]);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setIsLoading(true);

    // Simple validation
    if (formData.password && formData.password !== formData.confirmPassword) {
      setError("Passwords do not match");
      setIsLoading(false);
      return;
    }

    try {
      // Only include password if it's provided
      const dataToUpdate = {
        name: formData.name,
        email: formData.email,
        bio: formData.bio,
        ...(formData.password ? { password: formData.password } : {}),
      };

      // Call API to update profile
      await updateUserProfile(dataToUpdate);

      setSuccess("Profile updated successfully");
      setIsEditing(false);

      // Clear password fields
      setFormData((prev) => ({
        ...prev,
        password: "",
        confirmPassword: "",
      }));
    } catch (err: any) {
      setError(err.message || "Failed to update profile");
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
    router.push("/login");
  };

  if (!user) {
    return (
      <MainLayout>
        <div className="container mx-auto px-4 py-8">
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500"></div>
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row gap-8">
          <div className="md:w-2/3">
            <div className="bg-white shadow-md rounded px-8 pt-6 pb-8 mb-4">
              <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold text-gray-800">
                  Profile Settings
                </h1>

                {!isEditing ? (
                  <button
                    onClick={() => setIsEditing(true)}
                    className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
                  >
                    Edit Profile
                  </button>
                ) : (
                  <button
                    onClick={() => {
                      setIsEditing(false);
                      // Reset form data to user data
                      if (user) {
                        setFormData({
                          name: user.name || "",
                          email: user.email || "",
                          bio: user.bio || "",
                          password: "",
                          confirmPassword: "",
                        });
                      }
                      setError("");
                      setSuccess("");
                    }}
                    className="bg-gray-500 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
                  >
                    Cancel
                  </button>
                )}
              </div>

              {error && (
                <div
                  className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4"
                  role="alert"
                >
                  <span className="block sm:inline">{error}</span>
                </div>
              )}

              {success && (
                <div
                  className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded relative mb-4"
                  role="alert"
                >
                  <span className="block sm:inline">{success}</span>
                </div>
              )}

              {isEditing ? (
                <form onSubmit={handleSubmit}>
                  <div className="mb-4">
                    <label
                      className="block text-gray-700 text-sm font-bold mb-2"
                      htmlFor="name"
                    >
                      Name
                    </label>
                    <input
                      className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                      id="name"
                      type="text"
                      name="name"
                      placeholder="Your Name"
                      value={formData.name}
                      onChange={handleInputChange}
                      required
                    />
                  </div>

                  <div className="mb-4">
                    <label
                      className="block text-gray-700 text-sm font-bold mb-2"
                      htmlFor="email"
                    >
                      Email
                    </label>
                    <input
                      className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                      id="email"
                      type="email"
                      name="email"
                      placeholder="your.email@example.com"
                      value={formData.email}
                      onChange={handleInputChange}
                      required
                    />
                  </div>

                  <div className="mb-4">
                    <label
                      className="block text-gray-700 text-sm font-bold mb-2"
                      htmlFor="bio"
                    >
                      Bio
                    </label>
                    <textarea
                      className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                      id="bio"
                      name="bio"
                      placeholder="Tell us about yourself"
                      value={formData.bio}
                      onChange={handleInputChange}
                      rows={3}
                    />
                  </div>

                  <div className="mb-4">
                    <label
                      className="block text-gray-700 text-sm font-bold mb-2"
                      htmlFor="password"
                    >
                      New Password (leave blank to keep current)
                    </label>
                    <input
                      className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                      id="password"
                      type="password"
                      name="password"
                      placeholder="••••••••"
                      value={formData.password}
                      onChange={handleInputChange}
                    />
                  </div>

                  <div className="mb-6">
                    <label
                      className="block text-gray-700 text-sm font-bold mb-2"
                      htmlFor="confirmPassword"
                    >
                      Confirm New Password
                    </label>
                    <input
                      className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                      id="confirmPassword"
                      type="password"
                      name="confirmPassword"
                      placeholder="••••••••"
                      value={formData.confirmPassword}
                      onChange={handleInputChange}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <button
                      className={`bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline ${
                        isLoading ? "opacity-50 cursor-not-allowed" : ""
                      }`}
                      type="submit"
                      disabled={isLoading}
                    >
                      {isLoading ? "Saving..." : "Save Changes"}
                    </button>
                  </div>
                </form>
              ) : (
                <div>
                  <div className="mb-4">
                    <h2 className="text-sm font-bold text-gray-700">Name</h2>
                    <p className="text-gray-900">{user.name}</p>
                  </div>

                  <div className="mb-4">
                    <h2 className="text-sm font-bold text-gray-700">Email</h2>
                    <p className="text-gray-900">{user.email}</p>
                  </div>

                  <div className="mb-4">
                    <h2 className="text-sm font-bold text-gray-700">Bio</h2>
                    <p className="text-gray-900">
                      {user.bio || "No bio provided"}
                    </p>
                  </div>

                  <div className="mb-4">
                    <h2 className="text-sm font-bold text-gray-700">
                      Member Since
                    </h2>
                    <p className="text-gray-900">
                      {user.created_at
                        ? new Date(user.created_at).toLocaleDateString(
                            "en-US",
                            {
                              year: "numeric",
                              month: "long",
                              day: "numeric",
                            },
                          )
                        : "N/A"}
                    </p>
                  </div>

                  <div className="mt-8 pt-8 border-t border-gray-200">
                    <button
                      onClick={handleLogout}
                      className="bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
                    >
                      Log Out
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="md:w-1/3">
            <div className="mb-6">
              <Todo title="Quick Tasks" storageKey="edusloth-profile-todos" />
            </div>

            <div className="bg-white shadow-md rounded px-8 pt-6 pb-8">
              <h2 className="text-xl font-bold text-gray-700 mb-4">
                Activity Stats
              </h2>

              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-bold text-gray-700">
                    Study Sessions
                  </h3>
                  <p className="text-2xl font-bold text-blue-600">0</p>
                </div>

                <div>
                  <h3 className="text-sm font-bold text-gray-700">
                    Content Items
                  </h3>
                  <p className="text-2xl font-bold text-blue-600">0</p>
                </div>

                <div>
                  <h3 className="text-sm font-bold text-gray-700">Reminders</h3>
                  <p className="text-2xl font-bold text-blue-600">0</p>
                </div>

                <div>
                  <h3 className="text-sm font-bold text-gray-700">
                    Flashcards Created
                  </h3>
                  <p className="text-2xl font-bold text-blue-600">0</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
};

export default ProfilePage;
