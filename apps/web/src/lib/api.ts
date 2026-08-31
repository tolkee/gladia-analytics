import type { ApiType } from "@gladia-analytics/backend/api-type";
import { hc } from "hono/client";
import { publicEnv } from "./env";

export const apiClient = hc<ApiType>(publicEnv.VITE_API_URL, {
  init: {
    credentials: "include",
  },
});
