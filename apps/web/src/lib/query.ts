import type {
  AnyUseBaseQueryOptions,
  AnyUseInfiniteQueryOptions,
  AnyUseMutationOptions,
} from "@tanstack/react-query";

type KeyFn = (...args: any[]) => any[];

type QueryOptions = (...args: any[]) => AnyUseBaseQueryOptions;
export type Query = {
  key: KeyFn;
  options: QueryOptions;
};

type InfiniteQueryOptions = (...args: any[]) => AnyUseInfiniteQueryOptions;
export type InfiniteQuery = {
  key: KeyFn;
  options: InfiniteQueryOptions;
};

type MutationOptions = (...args: any[]) => AnyUseMutationOptions;
export type Mutation = {
  key: KeyFn;
  options: MutationOptions;
};
