import { OrganisationService } from "#features/organisation";
import { TodoService } from "#features/todo";
import { TranscriptionUploadService, type FileStorage } from "#features/transcription-upload";
import { TranscriptionService } from "#features/transcription";
import type { Db } from "./db";

export type Services = {
  organisationService: OrganisationService;
  todoService: TodoService;
  transcriptionService: TranscriptionService;
  transcriptionUploadService: TranscriptionUploadService;
};

export function createServices(db: Db, fileStorage: FileStorage): Services {
  const organisationService = new OrganisationService(db);
  const transcriptionService = new TranscriptionService(db, organisationService);

  return {
    organisationService,
    todoService: new TodoService(db),
    transcriptionService,
    transcriptionUploadService: new TranscriptionUploadService(
      db,
      fileStorage,
      organisationService,
      transcriptionService,
    ),
  };
}
