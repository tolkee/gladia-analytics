import { createAuthClient } from "better-auth/react";
import { publicEnv } from "./env";

export const authClient = createAuthClient({
  baseURL: publicEnv.VITE_API_URL,
});
