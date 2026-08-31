import { TodoService } from "#features/todo";
import type { Db } from "./db";

export type Services = {
  todoService: TodoService;
};

export function createServices(db: Db): Services {
  return {
    todoService: new TodoService(db),
  };
}
