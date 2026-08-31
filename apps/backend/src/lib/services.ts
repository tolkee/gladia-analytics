import { OrganisationService } from "#features/organisation";
import { TodoService } from "#features/todo";
import { TranscriptionService } from "#features/transcription";
import type { Db } from "./db";

export type Services = {
  organisationService: OrganisationService;
  todoService: TodoService;
  transcriptionService: TranscriptionService;
};

export function createServices(db: Db): Services {
  const organisationService = new OrganisationService(db);

  return {
    organisationService,
    todoService: new TodoService(db),
    transcriptionService: new TranscriptionService(db, organisationService),
  };
}
