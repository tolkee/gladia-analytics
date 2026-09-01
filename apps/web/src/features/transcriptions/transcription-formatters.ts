const dateTimeFormatter = new Intl.DateTimeFormat(undefined, {
  dateStyle: "medium",
  timeStyle: "medium",
});

export function formatTranscriptionDate(value: string | Date | null) {
  return value ? dateTimeFormatter.format(new Date(value)) : "—";
}

export function formatTranscriptionDuration(seconds: number | null) {
  if (seconds === null) return "—";

  const roundedSeconds = Math.round(seconds);
  const hours = Math.floor(roundedSeconds / 3_600);
  const minutes = Math.floor((roundedSeconds % 3_600) / 60);
  const remainingSeconds = roundedSeconds % 60;

  if (hours > 0) return `${hours}h ${minutes}m ${remainingSeconds}s`;
  if (minutes > 0) return `${minutes}m ${remainingSeconds}s`;
  return `${remainingSeconds}s`;
}

export function formatTranscriptionLabel(value: string) {
  return value.replaceAll(/[_-]+/g, " ").replace(/\b\w/g, (character) => character.toUpperCase());
}

export function formatTranscriptionType(kind: "live" | "pre-recorded") {
  return kind === "live" ? "Realtime" : "Pre-recorded";
}

export function formatTranscriptionLanguages(languages: string[]) {
  return languages.length > 0
    ? languages.map((language) => language.toUpperCase()).join(", ")
    : "Auto-detect";
}
