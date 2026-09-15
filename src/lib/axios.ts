import axios, { AxiosError } from "axios";

import { API_BASE_URL, APP_URL } from "./constants";

// En servidor axios necesita una URL absoluta; en navegador la relativa evita
// romper si el host de despliegue difiere de NEXT_PUBLIC_APP_URL.
const baseURL =
  typeof window === "undefined" ? `${APP_URL}${API_BASE_URL}` : API_BASE_URL;

export const api = axios.create({
  baseURL,
  headers: { "Content-Type": "application/json" },
});

type ApiErrorBody = { message?: string };

api.interceptors.response.use(
  (response) => response,
  (error: AxiosError<ApiErrorBody>) => {
    const message =
      error.response?.data?.message ?? error.message ?? "Error de red";

    return Promise.reject(new Error(message, { cause: error }));
  },
);
