import { create } from "zustand";
import { getUserContent, getContentDetails, uploadContent } from "../api";

// Define SortOrder type
type SortOrder = "asc" | "desc";

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

  // Search and Sort state
  searchTerm: string;
  sortBy: string;
  sortOrder: SortOrder;

  // Actions
  fetchContents: (params?: {
    searchTerm?: string;
    sortBy?: string;
    sortOrder?: SortOrder;
  }) => Promise<void>;
  fetchContentDetails: (contentId: string) => Promise<ContentDetail | null>;
  uploadNewContent: (formData: FormData) => Promise<Content | null>;
  setSearchTerm: (term: string) => void;
  setSort: (sortBy: string, sortOrder: SortOrder) => void;
}

export const useContentStore = create<ContentState>((set, get) => ({
  contents: [],
  currentContent: null,
  isLoading: false,
  error: null,

  // Initialize search/sort state
  searchTerm: "",
  sortBy: "created_at",
  sortOrder: "desc",

  fetchContents: async (params = {}) => {
    const { searchTerm, sortBy, sortOrder } = get();

    const currentSearchTerm = params.searchTerm ?? searchTerm;
    const currentSortBy = params.sortBy ?? sortBy;
    const currentSortOrder = params.sortOrder ?? sortOrder;

    set({ isLoading: true, error: null });
    try {
      // Construct query parameters object for the API call
      const apiParams: { [key: string]: any } = {};
      if (currentSearchTerm) {
        apiParams["search"] = currentSearchTerm;
      }
      apiParams["sort_by"] = currentSortBy;
      apiParams["sort_order"] = currentSortOrder;

      console.log("Store - fetchContents - Params sent:", apiParams);

      const contents = await getUserContent(apiParams); // Pass params object
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

  setSearchTerm: (term: string) => {
    console.log("Store - setSearchTerm - New term:", term);
    set({ searchTerm: term });
    get().fetchContents();
  },

  setSort: (sortBy: string, sortOrder: SortOrder) => {
    console.log("Store - setSort - New sort:", { sortBy, sortOrder });
    set({ sortBy, sortOrder });
    get().fetchContents();
  },
}));
