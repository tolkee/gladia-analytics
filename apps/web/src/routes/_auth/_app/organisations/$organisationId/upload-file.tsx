import { createTranscriptionUploadMutation, FileDropzone } from "#features/uploads";
import { Button } from "@gladia-analytics/ui/components/button";
import { Spinner } from "@gladia-analytics/ui/components/spinner";
import { useMutation } from "@tanstack/react-query";
import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";

export const Route = createFileRoute("/_auth/_app/organisations/$organisationId/upload-file")({
  beforeLoad: ({ context, params }) => {
    if (context.organisation.role === "viewer") {
      throw redirect({
        to: "/organisations/$organisationId/uploads",
        params: { organisationId: params.organisationId },
      });
    }
  },
  component: UploadFilePage,
});

function UploadFilePage() {
  const { organisation, user } = Route.useRouteContext();
  const navigate = useNavigate();
  const [file, setFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const {
    mutateAsync: createUpload,
    error,
    isPending,
    reset,
  } = useMutation(createTranscriptionUploadMutation.options(user.id, organisation.id));
  const errorMessage = fileError ?? error?.response.message;
  const errorId = errorMessage ? "transcription-upload-error" : undefined;

  function changeFile(nextFile: File | null) {
    setFile(nextFile);
    setFileError(null);
    reset();
  }

  function rejectFile(message: string) {
    setFile(null);
    setFileError(message);
    reset();
  }

  async function submitUpload(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!file) {
      return;
    }

    try {
      await createUpload({ file });
      await navigate({
        to: "/organisations/$organisationId/uploads",
        params: { organisationId: organisation.id },
      });
    } catch {
      // The typed API error is displayed below the file selector.
    }
  }

  return (
    <main className="min-h-[calc(100svh-var(--header-height))] px-4 py-10 sm:px-6">
      <section className="mx-auto w-full max-w-3xl">
        <div className="mb-8">
          <p className="text-sm font-medium text-muted-foreground">New upload</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight">Upload transcription data</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
            Choose a JSON export containing an <code>items</code> array. The file is uploaded as a
            stream and processed in the background.
          </p>
        </div>

        <form onSubmit={submitUpload} noValidate>
          <FileDropzone
            file={file}
            disabled={isPending}
            errorId={errorId}
            onFileChange={changeFile}
            onInvalidFile={rejectFile}
          />

          {errorMessage ? (
            <p id={errorId} className="mt-3 text-sm text-destructive" role="alert">
              {errorMessage}
            </p>
          ) : null}

          <div className="mt-8 flex justify-end">
            <Button type="submit" size="lg" disabled={!file || isPending}>
              {isPending ? <Spinner data-icon="inline-start" /> : null}
              {isPending ? "Verifying…" : "Continue"}
            </Button>
          </div>
        </form>
      </section>
    </main>
  );
}
