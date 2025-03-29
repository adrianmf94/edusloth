'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import MainLayout from '@/components/layout/MainLayout';
import { useAuthStore } from '@/lib/store/authStore';
import { useContentStore } from '@/lib/store/contentStore';

const ContentPage = () => {
  const router = useRouter();
  const { isAuthenticated, checkAuth } = useAuthStore();
  const { contents, fetchContents, isLoading, error } = useContentStore();
  const [filterType, setFilterType] = useState<string | null>(null);

  useEffect(() => {
    const initialize = async () => {
      // Check if user is authenticated, redirect to login if not
      await checkAuth();
      if (!useAuthStore.getState().isAuthenticated) {
        router.push('/login');
        return;
      }
      
      // Fetch content
      await fetchContents();
    };
    
    initialize();
  }, [checkAuth, router, fetchContents]);

  const filteredContents = filterType 
    ? contents.filter(content => content.content_type === filterType) 
    : contents;

  if (!isAuthenticated) {
    return null; // Will redirect in useEffect
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

        {/* Filters */}
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <div className="p-4 border-b">
            <h2 className="text-lg font-medium text-gray-900">Filters</h2>
          </div>
          <div className="p-4 flex flex-wrap gap-2">
            <button
              onClick={() => setFilterType(null)}
              className={`px-3 py-1 rounded-full text-sm font-medium ${
                filterType === null
                  ? 'bg-indigo-100 text-indigo-800'
                  : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setFilterType('document')}
              className={`px-3 py-1 rounded-full text-sm font-medium ${
                filterType === 'document'
                  ? 'bg-blue-100 text-blue-800'
                  : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
              }`}
            >
              Documents
            </button>
            <button
              onClick={() => setFilterType('audio')}
              className={`px-3 py-1 rounded-full text-sm font-medium ${
                filterType === 'audio'
                  ? 'bg-red-100 text-red-800'
                  : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
              }`}
            >
              Audio
            </button>
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
            ) : filteredContents.length === 0 ? (
              <div className="text-center py-6">
                <p className="text-gray-500">
                  {filterType 
                    ? `No ${filterType} content found.` 
                    : 'No content found. Upload documents or record audio to get started.'}
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredContents.map((content) => (
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
                          {content.description || 'No description'}
                        </p>
                        <p className="text-xs text-gray-400 mt-2">
                          Created: {new Date(content.created_at).toLocaleString()}
                        </p>
                      </div>
                      <div className="ml-4 flex flex-col items-end">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          content.content_type === 'audio' 
                            ? 'bg-red-100 text-red-800' 
                            : 'bg-blue-100 text-blue-800'
                        }`}>
                          {content.content_type}
                        </span>
                        <span className="mt-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                          {content.processed ? 'Processed' : 'Processing'}
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