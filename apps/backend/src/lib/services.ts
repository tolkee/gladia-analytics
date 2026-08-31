import { OrganisationService } from "#features/organisation";
import { TodoService } from "#features/todo";
import { TranscriptionImportService, type FileStorage } from "#features/transcription-import";
import { TranscriptionService } from "#features/transcription";
import type { Db } from "./db";

export type Services = {
  organisationService: OrganisationService;
  todoService: TodoService;
  transcriptionService: TranscriptionService;
  transcriptionImportService: TranscriptionImportService;
};

export function createServices(db: Db, fileStorage: FileStorage): Services {
  const organisationService = new OrganisationService(db);
  const transcriptionService = new TranscriptionService(db, organisationService);

  return {
    organisationService,
    todoService: new TodoService(db),
    transcriptionService,
    transcriptionImportService: new TranscriptionImportService(
      db,
      fileStorage,
      organisationService,
      transcriptionService,
    ),
  };
}
