import axios from "axios";

// Create an Axios instance with default config
const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1",
  headers: {
    "Content-Type": "application/json",
  },
});

// Request interceptor for adding auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error),
);

// Response interceptor for handling errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Handle 401 Unauthorized
    if (error.response && error.response.status === 401) {
      localStorage.removeItem("token");
      window.location.href = "/login";
    }
    return Promise.reject(error);
  },
);

// Authentication
export const login = async (email: string, password: string) => {
  const formData = new FormData();
  formData.append("username", email); // OAuth2 uses 'username' field even for email
  formData.append("password", password);

  const response = await api.post("/auth/login", formData, {
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
  });

  return response.data;
};

export const register = async (userData: {
  email: string;
  password: string;
  full_name?: string;
}) => {
  const response = await api.post("/auth/register", userData, {
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
  });
  return response.data;
};

// User
export const getCurrentUser = async () => {
  const response = await api.get("/users/me");
  return response.data;
};

// Content
export const uploadContent = async (data: FormData) => {
  const response = await api.post("/content/upload", data, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });
  return response.data;
};

export const getUserContent = async (params?: {
  search?: string;
  sort_by?: string;
  sort_order?: "asc" | "desc";
  skip?: number;
  limit?: number;
}) => {
  console.log("API Call - getUserContent with params:", params);
  const response = await api.get("/content", { params });
  return response.data;
};

export const getContentDetails = async (contentId: string) => {
  const response = await api.get(`/content/${contentId}`);
  return response.data;
};

// Transcription
export const startTranscription = async (contentId: string) => {
  const response = await api.post(`/transcription/${contentId}/start`);
  return response.data;
};

export const getTranscription = async (contentId: string) => {
  const response = await api.get(`/transcription/${contentId}`);
  return response.data;
};

// AI Generation
export const startGeneration = async (
  contentId: string,
  generationType: string,
) => {
  const response = await api.post(
    `/ai/generate/${contentId}/${generationType}`,
  );
  return response.data;
};

export const getGeneratedContent = async (contentId: string) => {
  const response = await api.get(`/ai/generated/${contentId}`);
  return response.data;
};

export const getSpecificGeneratedContent = async (
  contentId: string,
  generationType: string,
) => {
  const response = await api.get(
    `/ai/generated/${contentId}/${generationType}`,
  );
  return response.data;
};

// Reminders
export const getReminders = async (params?: {
  skip?: number;
  limit?: number;
  include_completed?: boolean;
}) => {
  const response = await api.get("/reminders", { params });
  return response.data;
};

export const getUpcomingReminders = async (days: number = 7) => {
  const response = await api.get("/reminders/upcoming", { params: { days } });
  return response.data;
};

export const createReminder = async (reminderData: {
  description: string;
  due_date: string; // ISO date string
  priority?: string;
  content_id?: string;
}) => {
  const response = await api.post("/reminders", reminderData);
  return response.data;
};

export const updateReminder = async (
  reminderId: string,
  data: {
    description?: string;
    due_date?: string;
    priority?: string;
    is_completed?: boolean;
  },
) => {
  const response = await api.put(`/reminders/${reminderId}`, data);
  return response.data;
};

export const deleteReminder = async (reminderId: string) => {
  const response = await api.delete(`/reminders/${reminderId}`);
  return response.data;
};

export default api;
