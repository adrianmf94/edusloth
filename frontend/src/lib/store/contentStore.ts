import { create } from "zustand";
import { getUserContent, getContentDetails, uploadContent } from "../api";

interface Content {
  id: string;
  title: string;
  description?: string;
  content_type: string;
  created_at: string;
  processed: boolean;
}

interface ContentDetail extends Content {
  transcription?: {
    id: string;
    status: string;
    text?: string;
    segments?: { start: number; end: number; text: string }[];
  };
  generated_contents?: {
    id: string;
    type: string;
    status: string;
    summary?: string;
    flashcards?: { question: string; answer: string }[];
    quiz?: any[];
    mindmap?: any;
  }[];
}

interface ContentState {
  contents: Content[];
  currentContent: ContentDetail | null;
  isLoading: boolean;
  error: string | null;

  // Actions
  fetchContents: () => Promise<void>;
  fetchContentDetails: (contentId: string) => Promise<void>;
  uploadNewContent: (formData: FormData) => Promise<Content | null>;
}

export const useContentStore = create<ContentState>((set, get) => ({
  contents: [],
  currentContent: null,
  isLoading: false,
  error: null,

  fetchContents: async () => {
    set({ isLoading: true, error: null });
    try {
      const contents = await getUserContent();
      set({ contents, isLoading: false });
    } catch (error: any) {
      set({
        isLoading: false,
        error: error.response?.data?.detail || "Failed to fetch contents",
      });
    }
  },

  fetchContentDetails: async (contentId: string) => {
    set({ isLoading: true, error: null });
    try {
      const contentDetail = await getContentDetails(contentId);
      set({ currentContent: contentDetail, isLoading: false });
      return contentDetail;
    } catch (error: any) {
      set({
        isLoading: false,
        error:
          error.response?.data?.detail || "Failed to fetch content details",
      });
      return null;
    }
  },

  uploadNewContent: async (formData: FormData) => {
    set({ isLoading: true, error: null });
    try {
      const newContent = await uploadContent(formData);

      // Update the content list with the new content
      set((state) => ({
        contents: [newContent, ...state.contents],
        isLoading: false,
      }));

      return newContent;
    } catch (error: any) {
      set({
        isLoading: false,
        error: error.response?.data?.detail || "Failed to upload content",
      });
      return null;
    }
  },
}));
