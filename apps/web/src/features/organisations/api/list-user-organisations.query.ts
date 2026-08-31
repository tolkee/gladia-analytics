import { apiClient } from "#lib/api";
import {
  jsErrorFromApiError,
  type InferErrorResponseType,
  type InferSuccessResponseType,
} from "#lib/errors";
import type { Query } from "#lib/query";
import { queryOptions } from "@tanstack/react-query";

const endpoint = apiClient.api.organisations.$get;

type ListUserOrganisationsSuccessResponse = InferSuccessResponseType<typeof endpoint>;
type ListUserOrganisationsErrorResponse = InferErrorResponseType<typeof endpoint>;
export type Organisation = ListUserOrganisationsSuccessResponse[number];

const key = (userId: string) => ["organisations", userId];
const options = (userId: string) =>
  queryOptions<ListUserOrganisationsSuccessResponse, ListUserOrganisationsErrorResponse>({
    queryKey: key(userId),
    queryFn: async () => {
      const response = await endpoint();

      if (!response.ok) {
        throw await jsErrorFromApiError(response);
      }

      return response.json();
    },
  });

export const listUserOrganisationsQuery = {
  key,
  options,
} satisfies Query;
