import { apiClient } from "#lib/api";
import {
  ApiError,
  jsErrorFromApiError,
  type InferErrorResponseType,
  type InferSuccessResponseType,
} from "#lib/errors";
import type { Mutation } from "#lib/query";
import { mutationOptions } from "@tanstack/react-query";
import type { InferRequestType } from "hono";
import { listUserOrganisationsQuery } from "./list-user-organisations.query";

const endpoint = apiClient.api.organisations.$post;

type CreateOrganisationSuccessResponse = InferSuccessResponseType<typeof endpoint>;
type CreateOrganisationErrorResponse = InferErrorResponseType<typeof endpoint>;
type CreateOrganisationVariables = InferRequestType<typeof endpoint>["json"];

const key = (userId: string) => ["organisations", "create", userId];
const options = (userId: string) =>
  mutationOptions<
    CreateOrganisationSuccessResponse,
    ApiError<CreateOrganisationErrorResponse>,
    CreateOrganisationVariables
  >({
    mutationKey: key(userId),
    mutationFn: async (organisation) => {
      const response = await endpoint({ json: organisation });

      if (!response.ok) {
        throw await jsErrorFromApiError(response);
      }

      return response.json();
    },
    onSuccess: (_data, _variables, _onMutateResult, { client }) => {
      return client.invalidateQueries({
        queryKey: listUserOrganisationsQuery.key(userId),
      });
    },
  });

export const createOrganisationMutation = {
  key,
  options,
} satisfies Mutation;
