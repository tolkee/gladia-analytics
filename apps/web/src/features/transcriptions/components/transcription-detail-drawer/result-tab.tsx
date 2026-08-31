import type { TranscriptionDetail } from "../../api/get-transcription.query";
import { formatTranscriptionDuration } from "../../transcription-formatters";
import { DetailGrid, DetailItem, DetailTab } from "./detail-components";

export function ResultTab({ transcription }: { transcription: TranscriptionDetail }) {
  return (
    <DetailTab value="result">
      {transcription.errorCode ? (
        <p className="font-mono text-sm text-destructive">{transcription.errorCode}</p>
      ) : (
        <DetailGrid>
          <DetailItem
            label="Audio duration"
            value={formatTranscriptionDuration(transcription.resultAudioDuration)}
          />
          <DetailItem
            label="Distinct channels"
            value={formatCount(transcription.resultNumberOfDistinctChannels, "channel")}
          />
          <DetailItem
            label="Billing time"
            value={formatTranscriptionDuration(transcription.resultBillingTime)}
          />
          <DetailItem
            label="Transcription time"
            value={formatTranscriptionDuration(transcription.resultTranscriptionTime)}
          />
        </DetailGrid>
      )}
    </DetailTab>
  );
}

function formatCount(value: number | null, singular: string) {
  if (value === null) return "—";
  return `${value} ${value === 1 ? singular : `${singular}s`}`;
}
