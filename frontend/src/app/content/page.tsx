"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Listbox, Transition } from "@headlessui/react";
import { CheckIcon, ChevronUpDownIcon } from "@heroicons/react/20/solid";
import MainLayout from "@/components/layout/MainLayout";
import { useAuthStore } from "@/lib/store/authStore";
import { useContentStore } from "@/lib/store/contentStore";

// Define Sort Options
const sortOptions = [
  { name: "Date (Newest)", value: "created_at-desc" },
  { name: "Date (Oldest)", value: "created_at-asc" },
  { name: "Title (A-Z)", value: "title-asc" },
  { name: "Title (Z-A)", value: "title-desc" },
  { name: "Type", value: "content_type-asc" }, // Simple sort by type
  // Add more as needed (e.g., size, status)
];

const ContentPage = () => {
  const router = useRouter();
  const { isAuthenticated, checkAuth } = useAuthStore();
  const {
    contents,
    fetchContents,
    isLoading,
    error,
    searchTerm,
    sortBy,
    sortOrder,
    setSearchTerm,
    setSort,
  } = useContentStore();

  useEffect(() => {
    const initialize = async () => {
      await checkAuth();
      if (!useAuthStore.getState().isAuthenticated) {
        router.push("/login");
        return;
      }
      // Initial fetch uses store's default sort/search state
      await fetchContents();
    };

    initialize();
  }, [checkAuth, router, fetchContents]);

  // Handle search input change
  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const term = event.target.value;
    setSearchTerm(term);
  };

  // Handle sort change
  const handleSortChange = (value: string) => {
    const [newSortBy, newSortOrder] = value.split("-");
    setSort(newSortBy, newSortOrder as "asc" | "desc");
  };

  // Find the current sort option object for the Listbox
  const currentSortValue = `${sortBy}-${sortOrder}`;
  const selectedSortOption =
    sortOptions.find((option) => option.value === currentSortValue) ||
    sortOptions[0];

  if (!isAuthenticated) {
    return null;
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <div className="p-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
              <h1 className="text-2xl font-bold text-gray-900">My Content</h1>
              <div className="mt-3 sm:mt-0 flex gap-3">
                <Link
                  href="/content/upload"
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  Upload Content
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Search and Sort Controls */}
        <div className="bg-white shadow rounded-lg">
          <div className="p-4 flex flex-col sm:flex-row gap-4">
            {/* Search Input */}
            <div className="flex-grow">
              <label htmlFor="search-content" className="sr-only">
                Search content
              </label>
              <input
                type="search"
                name="search-content"
                id="search-content"
                className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"
                placeholder="Search by title or description..."
                value={searchTerm}
                onChange={handleSearchChange}
              />
            </div>

            {/* Sort Dropdown */}
            <div className="w-full sm:w-56 z-10">
              <Listbox value={currentSortValue} onChange={handleSortChange}>
                <div className="relative">
                  <Listbox.Button className="relative w-full cursor-default rounded-md bg-white py-2 pl-3 pr-10 text-left shadow-sm border border-gray-300 focus:outline-none focus-visible:border-indigo-500 focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-opacity-75 focus-visible:ring-offset-2 focus-visible:ring-offset-indigo-300 sm:text-sm">
                    <span className="block truncate">
                      {selectedSortOption.name}
                    </span>
                    <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
                      <ChevronUpDownIcon
                        className="h-5 w-5 text-gray-400"
                        aria-hidden="true"
                      />
                    </span>
                  </Listbox.Button>
                  <Transition
                    as={React.Fragment}
                    leave="transition ease-in duration-100"
                    leaveFrom="opacity-100"
                    leaveTo="opacity-0"
                  >
                    <Listbox.Options className="absolute mt-1 max-h-60 w-full overflow-auto rounded-md bg-white py-1 text-base shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm z-30">
                      {sortOptions.map((option) => (
                        <Listbox.Option
                          key={option.value}
                          className={({ active }) =>
                            `relative cursor-default select-none py-2 pl-10 pr-4 ${
                              active
                                ? "bg-indigo-100 text-indigo-900"
                                : "text-gray-900"
                            }`
                          }
                          value={option.value}
                        >
                          {({ selected }) => (
                            <>
                              <span
                                className={`block truncate ${selected ? "font-medium" : "font-normal"}`}
                              >
                                {option.name}
                              </span>
                              {selected ? (
                                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-indigo-600">
                                  <CheckIcon
                                    className="h-5 w-5"
                                    aria-hidden="true"
                                  />
                                </span>
                              ) : null}
                            </>
                          )}
                        </Listbox.Option>
                      ))}
                    </Listbox.Options>
                  </Transition>
                </div>
              </Listbox>
            </div>
          </div>
        </div>

        {/* Content List */}
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <div className="p-6">
            {isLoading ? (
              <div className="text-center py-6">
                <p className="text-gray-500">Loading content...</p>
              </div>
            ) : error ? (
              <div className="text-center py-6">
                <p className="text-red-500">{error}</p>
              </div>
            ) : contents.length === 0 ? (
              <div className="text-center py-6">
                <p className="text-gray-500">
                  {searchTerm
                    ? `No content found matching "${searchTerm}".`
                    : "No content found. Upload documents or record audio to get started."}
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {contents.map((content) => (
                  <Link
                    key={content.id}
                    href={`/content/${content.id}`}
                    className="block p-4 border border-gray-200 rounded-lg hover:bg-gray-50"
                  >
                    <div className="flex items-center">
                      <div className="flex-1 min-w-0">
                        <p className="text-md font-medium text-gray-900 truncate">
                          {content.title}
                        </p>
                        <p className="text-sm text-gray-500 mt-1">
                          {content.description || "No description"}
                        </p>
                        <p className="text-xs text-gray-400 mt-2">
                          Created:{" "}
                          {new Date(content.created_at).toLocaleString()}
                        </p>
                      </div>
                      <div className="ml-4 flex flex-col items-end">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            content.content_type === "audio"
                              ? "bg-red-100 text-red-800"
                              : "bg-blue-100 text-blue-800"
                          }`}
                        >
                          {content.content_type}
                        </span>
                        <span className="mt-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                          {content.processed ? "Processed" : "Processing"}
                        </span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </MainLayout>
  );
};

export default ContentPage;
