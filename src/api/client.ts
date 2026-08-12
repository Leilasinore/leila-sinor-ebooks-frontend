import axios from "axios";

export const api = axios.create({
  baseURL:
    import.meta.env.VITE_API_BASE_URL ||
    "https://www.leilasinorebooksapi.online",
  timeout: 15000,
  headers: {
    "Content-Type": "application/json",
  },
});