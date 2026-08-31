import type { TranscriptionSummary } from "../api/list-transcriptions.query";
import {
  formatTranscriptionDate,
  formatTranscriptionDuration,
  formatTranscriptionLanguages,
  formatTranscriptionType,
} from "../transcription-formatters";
import { TranscriptionStatusBadge } from "./transcription-status-badge";
import { Spinner } from "@gladia-analytics/ui/components/spinner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@gladia-analytics/ui/components/table";
import {
  columnSizingFeature,
  createColumnHelper,
  tableFeatures,
  useTable,
} from "@tanstack/react-table";
import { useVirtualizer } from "@tanstack/react-virtual";
import { useEffect, useMemo, useRef } from "react";

const features = tableFeatures({ columnSizingFeature });
const columnHelper = createColumnHelper<typeof features, TranscriptionSummary>();

function createColumns(onTranscriptionOpen: (transcriptionId: string) => void) {
  return columnHelper.columns([
    columnHelper.accessor("fileName", {
      header: "Transcription",
      size: 280,
      cell: ({ row }) => (
        <button
          type="button"
          className="block min-w-0 max-w-full text-left focus-visible:rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2"
          aria-label={`Open ${row.original.fileName ?? "transcription"}`}
          onClick={(event) => {
            event.stopPropagation();
            onTranscriptionOpen(row.original.id);
          }}
        >
          <p className="truncate font-medium">
            {row.original.fileName ??
              (row.original.kind === "live" ? "Live transcription" : "Untitled audio")}
          </p>
          <p className="truncate font-mono text-xs text-muted-foreground">{row.original.id}</p>
        </button>
      ),
    }),
    columnHelper.accessor("status", {
      header: "Status",
      size: 120,
      cell: ({ getValue }) => <TranscriptionStatusBadge status={getValue()} />,
    }),
    columnHelper.accessor("kind", {
      header: "Type",
      size: 120,
      cell: ({ getValue }) => formatTranscriptionType(getValue()),
    }),
    columnHelper.accessor("model", {
      header: "Model",
      size: 150,
      cell: ({ getValue }) => <span className="font-mono text-xs">{getValue()}</span>,
    }),
    columnHelper.accessor("languages", {
      header: "Languages",
      size: 180,
      cell: ({ getValue }) => {
        return formatTranscriptionLanguages(getValue());
      },
    }),
    columnHelper.accessor("fileAudioDuration", {
      header: "Duration",
      size: 110,
      cell: ({ row }) => formatTranscriptionDuration(row.original.fileAudioDuration),
    }),
    columnHelper.accessor("createdAt", {
      header: "Created",
      size: 190,
      cell: ({ getValue }) => formatTranscriptionDate(getValue()),
    }),
  ]);
}

type TranscriptionsDataTableProps = {
  transcriptions: TranscriptionSummary[];
  selectedTranscriptionId?: string;
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  fetchNextPage: () => Promise<unknown>;
  onTranscriptionOpen: (transcriptionId: string) => void;
};

export function TranscriptionsDataTable({
  transcriptions,
  selectedTranscriptionId,
  hasNextPage,
  isFetchingNextPage,
  fetchNextPage,
  onTranscriptionOpen,
}: TranscriptionsDataTableProps) {
  const tableContainerRef = useRef<HTMLDivElement>(null);
  const columns = useMemo(() => createColumns(onTranscriptionOpen), [onTranscriptionOpen]);
  const table = useTable({
    features,
    columns,
    data: transcriptions,
    getRowId: (transcription) => transcription.id,
  });
  const rows = table.getRowModel().rows;
  const rowVirtualizer = useVirtualizer<HTMLDivElement, HTMLTableRowElement>({
    count: rows.length,
    estimateSize: () => 56,
    getScrollElement: () => tableContainerRef.current,
    getItemKey: (index) => rows[index]?.id ?? index,
    overscan: 8,
  });
  const virtualRows = rowVirtualizer.getVirtualItems();
  const lastVirtualRowIndex = virtualRows.at(-1)?.index;

  useEffect(() => {
    if (
      lastVirtualRowIndex !== undefined &&
      lastVirtualRowIndex >= rows.length - 5 &&
      hasNextPage &&
      !isFetchingNextPage
    ) {
      void fetchNextPage();
    }
  }, [fetchNextPage, hasNextPage, isFetchingNextPage, lastVirtualRowIndex, rows.length]);

  return (
    <div className="relative min-h-0 flex-1 overflow-hidden rounded-lg border">
      <Table
        aria-busy={isFetchingNextPage}
        aria-label="Transcriptions"
        className="grid min-w-[1150px]"
        containerClassName="h-full overflow-auto"
        containerRef={tableContainerRef}
      >
        <TableHeader className="sticky top-0 z-10 grid bg-background shadow-[0_1px_0_var(--border)]">
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id} className="flex w-full border-0 hover:bg-background">
              {headerGroup.headers.map((header) => (
                <TableHead
                  key={header.id}
                  className="flex shrink-0 items-center px-4"
                  scope="col"
                  style={{ width: header.getSize() }}
                >
                  {header.isPlaceholder ? null : <table.FlexRender header={header} />}
                </TableHead>
              ))}
            </TableRow>
          ))}
        </TableHeader>

        {rows.length > 0 ? (
          <TableBody
            className="relative grid"
            style={{ height: `${rowVirtualizer.getTotalSize()}px` }}
          >
            {virtualRows.map((virtualRow) => {
              const row = rows[virtualRow.index];

              if (!row) return null;

              return (
                <TableRow
                  key={row.id}
                  className="absolute flex h-14 w-full cursor-pointer data-[state=selected]:bg-muted"
                  data-index={virtualRow.index}
                  data-state={selectedTranscriptionId === row.original.id ? "selected" : undefined}
                  onClick={() => onTranscriptionOpen(row.original.id)}
                  style={{ transform: `translateY(${virtualRow.start}px)` }}
                >
                  {row.getAllCells().map((cell) => (
                    <TableCell
                      key={cell.id}
                      className="flex min-w-0 shrink-0 items-center px-4"
                      style={{ width: cell.column.getSize() }}
                    >
                      <table.FlexRender cell={cell} />
                    </TableCell>
                  ))}
                </TableRow>
              );
            })}
          </TableBody>
        ) : (
          <TableBody className="grid">
            <TableRow className="flex h-48 w-full items-center justify-center hover:bg-transparent">
              <TableCell
                className="flex w-full flex-col items-center justify-center gap-1 text-center"
                colSpan={columns.length}
              >
                <span className="font-medium">No transcriptions in this period</span>
                <span className="text-xs text-muted-foreground">
                  Try selecting a longer period to look further back.
                </span>
              </TableCell>
            </TableRow>
          </TableBody>
        )}
      </Table>

      {isFetchingNextPage ? (
        <div
          aria-live="polite"
          className="absolute inset-x-0 bottom-3 flex justify-center pointer-events-none"
        >
          <span className="flex items-center gap-2 rounded-full border bg-background/95 px-3 py-1.5 text-xs text-muted-foreground shadow-sm backdrop-blur">
            <Spinner className="size-3" />
            Loading more transcriptions
          </span>
        </div>
      ) : null}
    </div>
  );
}
