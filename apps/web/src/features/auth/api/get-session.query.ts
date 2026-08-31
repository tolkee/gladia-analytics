import { authClient } from "#lib/auth";
import type { Query } from "#lib/query";
import { queryOptions } from "@tanstack/react-query";

const key = () => ["auth", "session"];
const options = () =>
  queryOptions({
    queryKey: key(),
    queryFn: async () => {
      const { data: session, error } = await authClient.getSession();

      if (error) {
        throw error;
      }

      return session;
    },
    gcTime: Infinity,
    staleTime: Infinity,
  });

export const getSessionQuery = {
  key,
  options,
} satisfies Query;
