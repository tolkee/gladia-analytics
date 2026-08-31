import { apiClient } from "#lib/api";
import {
  jsErrorFromApiError,
  type InferErrorResponseType,
  type InferSuccessResponseType,
} from "#lib/errors";
import type { Query } from "#lib/query";
import { queryOptions } from "@tanstack/react-query";

const endpoint = apiClient.api.organisations.$get;

type GetUserOrganisationsSuccessResponse = InferSuccessResponseType<typeof endpoint>;
type GetUserOrganisationsErrorResponse = InferErrorResponseType<typeof endpoint>;
export type Organisation = GetUserOrganisationsSuccessResponse[number];

const key = (userId: string) => ["organisations", userId];
const options = (userId: string) =>
  queryOptions<GetUserOrganisationsSuccessResponse, GetUserOrganisationsErrorResponse>({
    queryKey: key(userId),
    queryFn: async () => {
      const response = await endpoint();

      if (!response.ok) {
        throw await jsErrorFromApiError(response);
      }

      return response.json();
    },
  });

export const getUserOrganisationsQuery = {
  key,
  options,
} satisfies Query;
