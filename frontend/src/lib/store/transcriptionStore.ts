import { create } from "zustand";
import { startTranscription, getTranscription } from "../api";

interface TranscriptionSegment {
  start: number;
  end: number;
  text: string;
}

interface Transcription {
  id: string;
  content_id: string;
  status: "pending" | "processing" | "completed" | "failed";
  text?: string;
  segments?: TranscriptionSegment[];
  created_at: string;
  updated_at?: string;
  error?: string;
}

interface TranscriptionState {
  currentTranscription: Transcription | null;
  isLoading: boolean;
  error: string | null;

  // Actions
  startNewTranscription: (contentId: string) => Promise<boolean>;
  fetchTranscription: (contentId: string) => Promise<Transcription | null>;
  pollTranscriptionStatus: (
    contentId: string,
    intervalMs?: number,
  ) => Promise<void>;
  clearTranscription: () => void;
}

export const useTranscriptionStore = create<TranscriptionState>((set, get) => ({
  currentTranscription: null,
  isLoading: false,
  error: null,

  startNewTranscription: async (contentId: string) => {
    set({ isLoading: true, error: null });
    try {
      await startTranscription(contentId);

      // After starting, fetch the initial status
      const transcription = await getTranscription(contentId);
      set({ currentTranscription: transcription, isLoading: false });

      return true;
    } catch (error: any) {
      set({
        isLoading: false,
        error: error.response?.data?.detail || "Failed to start transcription",
      });
      return false;
    }
  },

  fetchTranscription: async (contentId: string) => {
    set({ isLoading: true, error: null });
    try {
      const transcription = await getTranscription(contentId);
      set({ currentTranscription: transcription, isLoading: false });
      return transcription;
    } catch (error: any) {
      // Don't set error if it's just not found - this is a normal case for new content
      if (error.response?.status === 404) {
        set({ isLoading: false, currentTranscription: null });
        return null;
      }

      set({
        isLoading: false,
        error: error.response?.data?.detail || "Failed to fetch transcription",
      });
      return null;
    }
  },

  pollTranscriptionStatus: async (contentId: string, intervalMs = 5000) => {
    const checkStatus = async () => {
      const transcription = await get().fetchTranscription(contentId);

      if (!transcription) return false;

      // If still processing, continue polling
      if (
        transcription.status === "processing" ||
        transcription.status === "pending"
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

  clearTranscription: () => {
    set({ currentTranscription: null });
  },
}));
