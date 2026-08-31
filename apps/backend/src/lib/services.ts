import { OrganisationService } from "#features/organisation";
import { TodoService } from "#features/todo";
import type { Db } from "./db";

export type Services = {
  organisationService: OrganisationService;
  todoService: TodoService;
};

export function createServices(db: Db): Services {
  return {
    organisationService: new OrganisationService(db),
    todoService: new TodoService(db),
  };
}
