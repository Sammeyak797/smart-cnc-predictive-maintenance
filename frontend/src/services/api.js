import axios from "axios";

// VITE_API_URL should be set WITHOUT /api suffix, e.g.:
//   Production: https://cnc-backend-ibzu.onrender.com
//   Local dev:  http://localhost:5000
// This file appends /api so there is never a double /api/api issue.
const API = axios.create({
  baseURL: `${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api`,
  timeout: 30000, // 30s — handles Render free tier cold start delay
});

// Attach JWT token to every request automatically
API.interceptors.request.use((req) => {
  const token = localStorage.getItem("token");
  if (token) {
    req.headers.Authorization = `Bearer ${token}`;
  }
  return req;
});

// Auto logout if server returns 401 (token expired or invalid)
API.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem("token");
      window.location.href = "/login";
    }
    return Promise.reject(error);
  },
);

export default API;
