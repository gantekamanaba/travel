import axios from "axios";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
export const API = `${BACKEND_URL}/api`;

// Satu instance untuk semua call (kontrak: lihat docs/08_FRONTEND_GUARDRAILS §1).
const apiClient = axios.create({ baseURL: API });

export function setAuthToken(token) {
  if (token) {
    apiClient.defaults.headers.common["Authorization"] = `Bearer ${token}`;
  } else {
    delete apiClient.defaults.headers.common["Authorization"];
  }
}

export default apiClient;
