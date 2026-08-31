import type { AnyUseBaseQueryOptions, AnyUseMutationOptions } from "@tanstack/react-query";

type KeyFn = (...args: any[]) => any[];

type QueryOptions = (...args: any[]) => AnyUseBaseQueryOptions;
export type Query = {
  key: KeyFn;
  options: QueryOptions;
};

type MutationOptions = (...args: any[]) => AnyUseMutationOptions;
export type Mutation = {
  key: KeyFn;
  options: MutationOptions;
};
