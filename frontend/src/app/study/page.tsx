"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import MainLayout from "@/components/layout/MainLayout";
import FlashcardSet from "@/components/FlashcardSet";
import StudyPlan from "@/components/StudyPlan";
import { useAuthStore } from "@/lib/store/authStore";
import { useContentStore } from "@/lib/store/contentStore";

const StudyPage = () => {
  const router = useRouter();
  const { user, isAuthenticated, checkAuth } = useAuthStore();
  const {
    contents,
    isLoading: contentLoading,
    fetchContents,
  } = useContentStore();
  const [activeTab, setActiveTab] = useState<"flashcards" | "study-plan">(
    "flashcards",
  );
  const [showLowConfidence, setShowLowConfidence] = useState(false);
  const [flashcardSets, setFlashcardSets] = useState<
    { id: string; title: string }[]
  >([{ id: "general", title: "General Knowledge" }]);

  // Check authentication and fetch user content
  useEffect(() => {
    const init = async () => {
      if (!isAuthenticated) {
        await checkAuth();
      }

      if (isAuthenticated) {
        fetchContents();
      } else {
        router.push("/login");
      }
    };

    init();
  }, [isAuthenticated, checkAuth, fetchContents, router]);

  // Add content-based flashcard sets
  useEffect(() => {
    if (contents?.length) {
      const contentSets = contents.map((content) => ({
        id: `content-${content.id}`,
        title: `${content.title} Flashcards`,
      }));

      setFlashcardSets([
        { id: "general", title: "General Knowledge" },
        ...contentSets,
      ]);
    }
  }, [contents]);

  return (
    <MainLayout>
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800">Study Center</h1>
        </div>

        <div className="flex border-b mb-8">
          <button
            className={`py-2 px-4 mr-4 ${
              activeTab === "flashcards"
                ? "border-b-2 border-blue-500 text-blue-500 font-medium"
                : "text-gray-500 hover:text-gray-700"
            }`}
            onClick={() => setActiveTab("flashcards")}
          >
            Flashcards
          </button>
          <button
            className={`py-2 px-4 ${
              activeTab === "study-plan"
                ? "border-b-2 border-blue-500 text-blue-500 font-medium"
                : "text-gray-500 hover:text-gray-700"
            }`}
            onClick={() => setActiveTab("study-plan")}
          >
            Study Plan
          </button>
        </div>

        {activeTab === "flashcards" && (
          <div className="space-y-12">
            {contentLoading ? (
              <div className="flex justify-center items-center py-12">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500"></div>
              </div>
            ) : (
              flashcardSets.map((set) => (
                <div key={set.id} className="mb-8">
                  <FlashcardSet
                    title={set.title}
                    storageKey={`edusloth-flashcards-${set.id}`}
                  />
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === "study-plan" && (
          <div>
            <StudyPlan storageKeyPrefix="edusloth-study-personal" />
          </div>
        )}
      </div>
    </MainLayout>
  );
};

export default StudyPage;
