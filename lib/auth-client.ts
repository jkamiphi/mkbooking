import { createAuthClient } from "better-auth/react";

// Usar variable de entorno o detectar automáticamente en el navegador
const getBaseURL = () => {
  // En el cliente, usar la URL actual del navegador
  if (typeof window !== "undefined") {
    return window.location.origin;
  }
  // En el servidor (SSR), usar la variable de entorno
  return process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
};

export const authClient = createAuthClient({
  baseURL: getBaseURL(),
});

export const { signIn, signUp, signOut, useSession, getSession } = authClient;
