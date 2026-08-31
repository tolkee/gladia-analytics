const fileSizeFormatter = new Intl.NumberFormat(undefined, { maximumFractionDigits: 1 });

export function formatFileSize(sizeBytes: number) {
  if (sizeBytes < 1_000) {
    return `${sizeBytes} B`;
  }

  const units = ["KB", "MB", "GB", "TB"];
  let value = sizeBytes / 1_000;
  let unitIndex = 0;

  while (value >= 1_000 && unitIndex < units.length - 1) {
    value /= 1_000;
    unitIndex += 1;
  }

  return `${fileSizeFormatter.format(value)} ${units[unitIndex]}`;
}
