"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import MainLayout from "@/components/layout/MainLayout";
import { useAuthStore } from "@/lib/store/authStore";
import { uploadContent } from "@/lib/api";
import Link from "next/link";

const ContentUploadPage = () => {
  const router = useRouter();
  const { isAuthenticated, checkAuth } = useAuthStore();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);

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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setFile(selectedFile);

    // Create a preview for PDFs and images
    if (
      selectedFile.type === "application/pdf" ||
      selectedFile.type.startsWith("image/")
    ) {
      const fileUrl = URL.createObjectURL(selectedFile);
      setFilePreview(fileUrl);
    } else {
      setFilePreview(null);
    }

    // Auto-set title from filename if not already set
    if (!title) {
      const fileName = selectedFile.name.replace(/\.[^/.]+$/, ""); // Remove extension
      setTitle(fileName);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!file) {
      setError("Please select a file to upload");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Determine content type based on file type
      let content_type = "document";
      if (file.type.startsWith("audio/")) {
        content_type = "audio";
      }

      // Create form data
      const formData = new FormData();
      formData.append("file", file);
      formData.append("title", title);
      formData.append("description", description);
      formData.append("content_type", content_type);

      // Upload content
      const response = await uploadContent(formData);

      // Navigate to the content detail page
      router.push(`/content/${response.id}`);
    } catch (err: any) {
      setError(
        err.response?.data?.detail ||
          "Failed to upload content. Please try again.",
      );
      setIsLoading(false);
    }
  };

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
                Upload Content
              </h1>
              <div className="mt-3 sm:mt-0 flex gap-3">
                <Link
                  href="/content"
                  className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                >
                  Cancel
                </Link>
              </div>
            </div>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 p-4 rounded-md">
            <p className="text-red-700">{error}</p>
          </div>
        )}

        <div className="bg-white shadow rounded-lg overflow-hidden">
          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            <div>
              <label
                htmlFor="title"
                className="block text-sm font-medium text-gray-700"
              >
                Title
              </label>
              <input
                type="text"
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                placeholder="Enter a title for your content"
                required
              />
            </div>

            <div>
              <label
                htmlFor="description"
                className="block text-sm font-medium text-gray-700"
              >
                Description (Optional)
              </label>
              <textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                placeholder="Add a description of your content"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                File
              </label>
              <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md">
                <div className="space-y-1 text-center">
                  <svg
                    className="mx-auto h-12 w-12 text-gray-400"
                    stroke="currentColor"
                    fill="none"
                    viewBox="0 0 48 48"
                    aria-hidden="true"
                  >
                    <path
                      d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                      strokeWidth={2}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  <div className="flex text-sm text-gray-600">
                    <label
                      htmlFor="file-upload"
                      className="relative cursor-pointer bg-white rounded-md font-medium text-indigo-600 hover:text-indigo-500 focus-within:outline-none"
                    >
                      <span>Upload a file</span>
                      <input
                        id="file-upload"
                        name="file-upload"
                        type="file"
                        className="sr-only"
                        onChange={handleFileChange}
                        accept=".pdf,.doc,.docx,.txt,.mp3,.wav,.mp4,.jpg,.jpeg,.png"
                      />
                    </label>
                    <p className="pl-1">or drag and drop</p>
                  </div>
                  <p className="text-xs text-gray-500">
                    PDF, Word, Text, Audio, or Image files (max 50MB)
                  </p>
                  {file && (
                    <p className="text-sm text-gray-700 mt-2">
                      Selected: {file.name} ({formatFileSize(file.size)})
                    </p>
                  )}
                </div>
              </div>
            </div>

            {filePreview && file?.type.startsWith("image/") && (
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Preview
                </label>
                <div className="mt-1 bg-gray-100 rounded-md overflow-hidden">
                  <img
                    src={filePreview}
                    alt="Preview"
                    className="max-h-64 mx-auto object-contain"
                  />
                </div>
              </div>
            )}

            {filePreview && file?.type === "application/pdf" && (
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Preview
                </label>
                <div className="mt-1 bg-gray-100 rounded-md overflow-hidden h-64">
                  <iframe
                    src={filePreview}
                    title="PDF Preview"
                    className="w-full h-full"
                  />
                </div>
              </div>
            )}

            <div>
              <button
                type="submit"
                disabled={isLoading || !file}
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
              >
                {isLoading ? "Uploading..." : "Upload Content"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </MainLayout>
  );
};

// Utility function to format file size
const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return "0 Bytes";

  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
};

export default ContentUploadPage;
