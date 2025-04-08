"use client";

import React, { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import MainLayout from "@/components/layout/MainLayout";
import { useAuthStore } from "@/lib/store/authStore";
import { useContentStore } from "@/lib/store/contentStore";
import { useTranscriptionStore } from "@/lib/store/transcriptionStore";
import { useAIGenerationStore } from "@/lib/store/aiGenerationStore";
import Link from "next/link";
import axios from "axios";

interface ContentDetailPageProps {
  params: {
    id: string;
  };
}

// Add type definitions for content
interface Content {
  id: string;
  title: string;
  content_type: string;
  content_url: string;
  created_at: string;
  updated_at: string;
  user_id: string;
  description?: string;
}

// Add type definitions for generated content
interface GeneratedContent {
  id: string;
  content_id: string;
  content_type: string;
  content: any;
  created_at: string;
}

const ContentDetailPage = ({ params }: ContentDetailPageProps) => {
  // FIXME: Direct access to params.id will be deprecated in future Next.js versions
  // We should use React.use(params).id, but it's causing TypeScript errors with the current setup
  const contentId = params.id;
  const router = useRouter();
  const { isAuthenticated, checkAuth } = useAuthStore();

  const {
    fetchContentDetails,
    isLoading: contentLoading,
    error: contentError,
  } = useContentStore();

  const {
    currentTranscription,
    startNewTranscription,
    fetchTranscription,
    pollTranscriptionStatus,
    isLoading: transcriptionLoading,
    error: transcriptionError,
  } = useTranscriptionStore();

  const {
    generatedContents,
    currentGeneration,
    startGeneration,
    fetchGeneratedContents,
    fetchSpecificGeneration,
    pollGenerationStatus,
    isLoading: generationLoading,
    error: generationError,
  } = useAIGenerationStore();

  const [content, setContent] = useState<Content | null>(null);
  const [activeTab, setActiveTab] = useState<string>("overview");
  const [generationType, setGenerationType] = useState<string>("summary");

  useEffect(() => {
    const initialize = async () => {
      // Check if user is authenticated, redirect to login if not
      await checkAuth();
      if (!useAuthStore.getState().isAuthenticated) {
        router.push("/login");
        return;
      }

      // Fetch content details
      const contentDetails = await fetchContentDetails(contentId);

      // Check if contentDetails is not null before using it
      if (contentDetails !== null && contentDetails !== undefined) {
        setContent(contentDetails as Content);

        // Fetch transcription if it's audio content
        if ((contentDetails as Content).content_type === "audio") {
          await fetchTranscription(contentId);
        }

        // Fetch generated content
        await fetchGeneratedContents(contentId);
      }
    };

    initialize();
  }, [
    checkAuth,
    router,
    contentId,
    fetchContentDetails,
    fetchTranscription,
    fetchGeneratedContents,
  ]);

  const handleStartTranscription = async () => {
    if (!content || content.content_type !== "audio") return;

    await startNewTranscription(contentId);
    // Start polling for status updates
    pollTranscriptionStatus(contentId);
  };

  const handleStartGeneration = async (type: string) => {
    if (!content) return;

    setGenerationType(type);
    await startGeneration(contentId, type);
    // Start polling for status updates
    pollGenerationStatus(contentId, type);

    // Switch to the AI tab to show generation progress
    setActiveTab("ai");
  };

  const handleViewGeneration = async (type: string) => {
    setGenerationType(type);
    await fetchSpecificGeneration(contentId, type);
    setActiveTab("ai");
  };

  // Utility functions
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const capitalizeFirstLetter = (string: string): string => {
    return string.charAt(0).toUpperCase() + string.slice(1);
  };

  const renderGenerationContent = (generation: any) => {
    switch (generation.type) {
      case "summary":
        return (
          <div className="mt-4 p-4 bg-gray-50 rounded-md">
            <h3 className="text-lg font-medium text-gray-900 mb-2">Summary</h3>
            <p className="text-gray-700 whitespace-pre-line">
              {generation.summary}
            </p>
          </div>
        );

      case "flashcards":
        return (
          <div className="mt-4 space-y-4">
            <h3 className="text-lg font-medium text-gray-900">Flashcards</h3>
            {generation.flashcards?.map((card: any, index: number) => (
              <div
                key={index}
                className="bg-white border border-gray-200 rounded-md shadow-sm overflow-hidden"
              >
                <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
                  <h4 className="text-sm font-medium text-gray-900">
                    Question
                  </h4>
                  <p className="mt-1">{card.question}</p>
                </div>
                <div className="px-4 py-3">
                  <h4 className="text-sm font-medium text-gray-900">Answer</h4>
                  <p className="mt-1">{card.answer}</p>
                </div>
              </div>
            ))}
          </div>
        );

      case "quiz":
        return (
          <div className="mt-4 space-y-6">
            <h3 className="text-lg font-medium text-gray-900">Quiz</h3>
            {generation.quiz?.map((question: any, index: number) => (
              <div
                key={index}
                className="bg-white border border-gray-200 rounded-md shadow-sm overflow-hidden"
              >
                <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
                  <h4 className="text-sm font-medium text-gray-900">
                    Question {index + 1}
                  </h4>
                  <p className="mt-1">{question.question}</p>
                </div>
                <div className="px-4 py-3 space-y-3">
                  <h4 className="text-sm font-medium text-gray-900">Options</h4>
                  {question.options.map(
                    (option: string, optionIndex: number) => (
                      <div key={optionIndex} className="flex items-start">
                        <div
                          className={`flex-shrink-0 h-5 w-5 ${
                            optionIndex === question.correct_option
                              ? "text-green-500"
                              : "text-gray-400"
                          }`}
                        >
                          {optionIndex === question.correct_option ? (
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              viewBox="0 0 20 20"
                              fill="currentColor"
                            >
                              <path
                                fillRule="evenodd"
                                d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                                clipRule="evenodd"
                              />
                            </svg>
                          ) : (
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              viewBox="0 0 20 20"
                              fill="currentColor"
                            >
                              <path
                                fillRule="evenodd"
                                d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z"
                                clipRule="evenodd"
                              />
                            </svg>
                          )}
                        </div>
                        <p
                          className={`ml-2 text-sm ${
                            optionIndex === question.correct_option
                              ? "text-green-700 font-medium"
                              : "text-gray-700"
                          }`}
                        >
                          {option}
                        </p>
                      </div>
                    ),
                  )}
                  {question.explanation && (
                    <div className="mt-2 pt-2 border-t border-gray-200">
                      <h4 className="text-sm font-medium text-gray-900">
                        Explanation
                      </h4>
                      <p className="mt-1 text-sm text-gray-600">
                        {question.explanation}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        );

      case "mindmap":
        // For a mind map, we would ideally use a visualization library
        // For now, we'll render a simplified text-based representation
        return (
          <div className="mt-4 p-4 bg-gray-50 rounded-md">
            <h3 className="text-lg font-medium text-gray-900 mb-2">Mind Map</h3>
            <p className="text-gray-500 mb-4">
              Mind map visualization is not available in this view. Below is a
              text representation of the mind map nodes:
            </p>
            {generation.mindmap &&
              Object.values(generation.mindmap).map((node: any) => (
                <div key={node.id} className="mb-3">
                  <h4 className="font-medium">{node.name}</h4>
                  {node.children && node.children.length > 0 && (
                    <ul className="pl-5 mt-1">
                      {node.children.map((child: any) => (
                        <li key={child.id} className="text-sm text-gray-700">
                          {child.name}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
          </div>
        );

      default:
        return (
          <div className="mt-4 p-4 bg-gray-50 rounded-md">
            <p className="text-gray-500">
              Content not available for this generation type.
            </p>
          </div>
        );
    }
  };

  if (!isAuthenticated) {
    return null; // Will redirect in useEffect
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Content Header */}
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <div className="p-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
              <div>
                {contentLoading ? (
                  <div className="h-7 bg-gray-200 rounded animate-pulse w-48"></div>
                ) : content ? (
                  <h1 className="text-2xl font-bold text-gray-900">
                    {content.title}
                  </h1>
                ) : (
                  <p className="text-red-500">Content not found</p>
                )}

                {content && (
                  <p className="mt-1 text-sm text-gray-600">
                    {new Date(content.created_at).toLocaleString()} •
                    <span
                      className={`ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        content.content_type === "audio"
                          ? "bg-red-100 text-red-800"
                          : "bg-blue-100 text-blue-800"
                      }`}
                    >
                      {content.content_type}
                    </span>
                  </p>
                )}
              </div>

              <div className="mt-3 sm:mt-0 flex gap-3">
                <Link
                  href="/content"
                  className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                >
                  Back to All Content
                </Link>
              </div>
            </div>
          </div>
        </div>

        {contentError && (
          <div className="bg-red-50 p-4 rounded-md">
            <p className="text-red-700">{contentError}</p>
          </div>
        )}

        {content && (
          <>
            {/* Tabs */}
            <div className="bg-white shadow rounded-lg overflow-hidden">
              <div className="border-b border-gray-200">
                <nav className="flex -mb-px">
                  <button
                    onClick={() => setActiveTab("overview")}
                    className={`w-1/3 py-4 px-1 text-center border-b-2 font-medium text-sm ${
                      activeTab === "overview"
                        ? "border-indigo-500 text-indigo-600"
                        : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                    }`}
                  >
                    Overview
                  </button>

                  {content.content_type === "audio" && (
                    <button
                      onClick={() => setActiveTab("transcription")}
                      className={`w-1/3 py-4 px-1 text-center border-b-2 font-medium text-sm ${
                        activeTab === "transcription"
                          ? "border-indigo-500 text-indigo-600"
                          : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                      }`}
                    >
                      Transcription
                    </button>
                  )}

                  <button
                    onClick={() => setActiveTab("ai")}
                    className={`w-1/3 py-4 px-1 text-center border-b-2 font-medium text-sm ${
                      activeTab === "ai"
                        ? "border-indigo-500 text-indigo-600"
                        : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                    }`}
                  >
                    AI Generations
                  </button>
                </nav>
              </div>

              {/* Tab Content */}
              <div className="p-6">
                {/* Overview Tab */}
                {activeTab === "overview" && (
                  <div className="space-y-4">
                    <div>
                      <h3 className="text-lg font-medium text-gray-900">
                        Description
                      </h3>
                      <p className="mt-2 text-gray-600">
                        {content.description || "No description available."}
                      </p>
                    </div>

                    <div>
                      <h3 className="text-lg font-medium text-gray-900">
                        Actions
                      </h3>
                      <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {content.content_type === "audio" &&
                          !currentTranscription && (
                            <button
                              onClick={handleStartTranscription}
                              disabled={transcriptionLoading}
                              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
                            >
                              {transcriptionLoading
                                ? "Starting..."
                                : "Start Transcription"}
                            </button>
                          )}

                        <button
                          onClick={() => handleStartGeneration("summary")}
                          disabled={generationLoading}
                          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50"
                        >
                          {generationLoading && generationType === "summary"
                            ? "Generating..."
                            : "Generate Summary"}
                        </button>

                        <button
                          onClick={() => handleStartGeneration("flashcards")}
                          disabled={generationLoading}
                          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                        >
                          {generationLoading && generationType === "flashcards"
                            ? "Generating..."
                            : "Generate Flashcards"}
                        </button>

                        <button
                          onClick={() => handleStartGeneration("quiz")}
                          disabled={generationLoading}
                          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 disabled:opacity-50"
                        >
                          {generationLoading && generationType === "quiz"
                            ? "Generating..."
                            : "Generate Quiz"}
                        </button>

                        <button
                          onClick={() => handleStartGeneration("mindmap")}
                          disabled={generationLoading}
                          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-yellow-600 hover:bg-yellow-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500 disabled:opacity-50"
                        >
                          {generationLoading && generationType === "mindmap"
                            ? "Generating..."
                            : "Generate Mind Map"}
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Transcription Tab */}
                {activeTab === "transcription" &&
                  content.content_type === "audio" && (
                    <div className="space-y-4">
                      {transcriptionError && (
                        <div className="bg-red-50 p-4 rounded-md">
                          <p className="text-red-700">{transcriptionError}</p>
                        </div>
                      )}

                      {transcriptionLoading && !currentTranscription && (
                        <div className="text-center py-8">
                          <p className="text-gray-500">
                            Loading transcription...
                          </p>
                        </div>
                      )}

                      {!currentTranscription && !transcriptionLoading && (
                        <div className="text-center py-8">
                          <p className="text-gray-500">
                            No transcription available yet.
                          </p>
                          <button
                            onClick={handleStartTranscription}
                            className="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                          >
                            Start Transcription
                          </button>
                        </div>
                      )}

                      {currentTranscription && (
                        <div>
                          <div className="flex justify-between items-center">
                            <h3 className="text-lg font-medium text-gray-900">
                              Transcription
                            </h3>
                            <span
                              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                currentTranscription.status === "completed"
                                  ? "bg-green-100 text-green-800"
                                  : currentTranscription.status === "failed"
                                    ? "bg-red-100 text-red-800"
                                    : "bg-yellow-100 text-yellow-800"
                              }`}
                            >
                              {currentTranscription.status}
                            </span>
                          </div>

                          {currentTranscription.status === "completed" ? (
                            <div className="mt-4 p-4 bg-gray-50 rounded-md">
                              {currentTranscription.segments ? (
                                <div className="space-y-2">
                                  {currentTranscription.segments.map(
                                    (segment: any, index: number) => (
                                      <p key={index} className="text-gray-700">
                                        <span className="text-xs text-gray-500 mr-2">
                                          {formatTime(segment.start)} -{" "}
                                          {formatTime(segment.end)}
                                        </span>
                                        {segment.text}
                                      </p>
                                    ),
                                  )}
                                </div>
                              ) : (
                                <p className="text-gray-700 whitespace-pre-line">
                                  {currentTranscription.text}
                                </p>
                              )}
                            </div>
                          ) : currentTranscription.status === "failed" ? (
                            <div className="mt-4 bg-red-50 p-4 rounded-md">
                              <p className="text-red-700">
                                Transcription failed:{" "}
                                {currentTranscription.error}
                              </p>
                            </div>
                          ) : (
                            <div className="mt-4 text-center py-8">
                              <div className="flex flex-col items-center">
                                <div className="animate-pulse flex space-x-4">
                                  <div className="h-3 bg-gray-200 rounded w-3"></div>
                                  <div className="h-3 bg-gray-200 rounded w-3"></div>
                                  <div className="h-3 bg-gray-200 rounded w-3"></div>
                                </div>
                                <p className="mt-4 text-gray-500">
                                  Transcription in progress...
                                </p>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                {/* AI Generations Tab */}
                {activeTab === "ai" && (
                  <div className="space-y-4">
                    {generationError && (
                      <div className="bg-red-50 p-4 rounded-md">
                        <p className="text-red-700">{generationError}</p>
                      </div>
                    )}

                    {/* Generation Type Selector */}
                    {generatedContents.length > 0 && (
                      <div>
                        <label
                          htmlFor="generation-type"
                          className="block text-sm font-medium text-gray-700"
                        >
                          Select Generation Type
                        </label>
                        <select
                          id="generation-type"
                          name="generation-type"
                          value={generationType}
                          onChange={(e) => handleViewGeneration(e.target.value)}
                          className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
                        >
                          {generatedContents.map((gen) => (
                            <option key={gen.type} value={gen.type}>
                              {capitalizeFirstLetter(gen.type)}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}

                    {generationLoading && !currentGeneration && (
                      <div className="text-center py-8">
                        <p className="text-gray-500">
                          Loading {generationType}...
                        </p>
                      </div>
                    )}

                    {!currentGeneration && !generationLoading && (
                      <div className="text-center py-8">
                        <p className="text-gray-500">
                          No {generationType} generation available yet.
                        </p>
                        <button
                          onClick={() => handleStartGeneration(generationType)}
                          className="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                        >
                          Generate {capitalizeFirstLetter(generationType)}
                        </button>
                      </div>
                    )}

                    {currentGeneration && (
                      <div>
                        <div className="flex justify-between items-center">
                          <h3 className="text-lg font-medium text-gray-900">
                            {capitalizeFirstLetter(currentGeneration.type)}
                          </h3>
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              currentGeneration.status === "completed"
                                ? "bg-green-100 text-green-800"
                                : currentGeneration.status === "failed"
                                  ? "bg-red-100 text-red-800"
                                  : "bg-yellow-100 text-yellow-800"
                            }`}
                          >
                            {currentGeneration.status}
                          </span>
                        </div>

                        {currentGeneration.status === "completed" ? (
                          <div className="mt-4">
                            {renderGenerationContent(currentGeneration)}
                          </div>
                        ) : currentGeneration.status === "failed" ? (
                          <div className="mt-4 bg-red-50 p-4 rounded-md">
                            <p className="text-red-700">
                              Generation failed: {currentGeneration.error}
                            </p>
                          </div>
                        ) : (
                          <div className="mt-4 text-center py-8">
                            <div className="flex flex-col items-center">
                              <div className="animate-pulse flex space-x-4">
                                <div className="h-3 bg-gray-200 rounded w-3"></div>
                                <div className="h-3 bg-gray-200 rounded w-3"></div>
                                <div className="h-3 bg-gray-200 rounded w-3"></div>
                              </div>
                              <p className="mt-4 text-gray-500">
                                Generation in progress...
                              </p>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </MainLayout>
  );
};

export default ContentDetailPage;
