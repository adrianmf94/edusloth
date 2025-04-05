import { create } from "zustand";
import {
  startGeneration,
  getGeneratedContent,
  getSpecificGeneratedContent,
} from "../api";

interface FlashCard {
  question: string;
  answer: string;
}

interface QuizQuestion {
  question: string;
  options: string[];
  correct_option: number;
  explanation?: string;
}

interface MindMapNode {
  id: string;
  label: string;
  children: string[];
}

interface GeneratedContent {
  id: string;
  content_id: string;
  type: "summary" | "flashcards" | "quiz" | "mindmap";
  status: "pending" | "processing" | "completed" | "failed";
  created_at: string;
  updated_at?: string;
  summary?: string;
  flashcards?: FlashCard[];
  quiz?: QuizQuestion[];
  mindmap?: Record<string, MindMapNode>;
  error?: string;
}

interface AIGenerationState {
  generatedContents: GeneratedContent[];
  currentGeneration: GeneratedContent | null;
  isLoading: boolean;
  error: string | null;

  // Actions
  startGeneration: (
    contentId: string,
    generationType: string,
  ) => Promise<boolean>;
  fetchGeneratedContents: (contentId: string) => Promise<GeneratedContent[]>;
  fetchSpecificGeneration: (
    contentId: string,
    generationType: string,
  ) => Promise<GeneratedContent | null>;
  pollGenerationStatus: (
    contentId: string,
    generationType: string,
    intervalMs?: number,
  ) => Promise<void>;
  clearGeneratedContents: () => void;
}

export const useAIGenerationStore = create<AIGenerationState>((set, get) => ({
  generatedContents: [],
  currentGeneration: null,
  isLoading: false,
  error: null,

  startGeneration: async (contentId: string, generationType: string) => {
    set({ isLoading: true, error: null });
    try {
      await startGeneration(contentId, generationType);
      return true;
    } catch (error: any) {
      set({
        isLoading: false,
        error: error.response?.data?.detail || "Failed to start generation",
      });
      return false;
    }
  },

  fetchGeneratedContents: async (contentId: string) => {
    set({ isLoading: true, error: null });
    try {
      const generatedContents = await getGeneratedContent(contentId);
      set({ generatedContents, isLoading: false });
      return generatedContents;
    } catch (error: any) {
      set({
        isLoading: false,
        error:
          error.response?.data?.detail || "Failed to fetch generated contents",
      });
      return [];
    }
  },

  fetchSpecificGeneration: async (
    contentId: string,
    generationType: string,
  ) => {
    set({ isLoading: true, error: null });
    try {
      const generatedContent = await getSpecificGeneratedContent(
        contentId,
        generationType,
      );
      set({ currentGeneration: generatedContent, isLoading: false });
      return generatedContent;
    } catch (error: any) {
      // Don't set error if it's just not found - this is a normal case
      if (error.response?.status === 404) {
        set({ isLoading: false, currentGeneration: null });
        return null;
      }

      set({
        isLoading: false,
        error: error.response?.data?.detail || "Failed to fetch generation",
      });
      return null;
    }
  },

  pollGenerationStatus: async (
    contentId: string,
    generationType: string,
    intervalMs = 5000,
  ) => {
    const checkStatus = async () => {
      const generation = await get().fetchSpecificGeneration(
        contentId,
        generationType,
      );

      if (!generation) return false;

      // If still processing, continue polling
      if (
        generation.status === "processing" ||
        generation.status === "pending"
      ) {
        return true;
      }

      // If completed or failed, stop polling
      return false;
    };

    // Initial check
    const shouldContinue = await checkStatus();

    if (shouldContinue) {
      // Set up interval
      const intervalId = setInterval(async () => {
        const shouldContinuePolling = await checkStatus();
        if (!shouldContinuePolling) {
          clearInterval(intervalId);
        }
      }, intervalMs);

      // Clean up interval after 10 minutes max (safety)
      setTimeout(() => clearInterval(intervalId), 10 * 60 * 1000);
    }
  },

  clearGeneratedContents: () => {
    set({ generatedContents: [], currentGeneration: null });
  },
}));
