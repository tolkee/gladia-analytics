import type {
  TranscriptionSortField,
  TranscriptionSorting,
  TranscriptionSummary,
} from "../api/list-transcriptions.query";
import {
  formatTranscriptionDate,
  formatTranscriptionDuration,
  formatTranscriptionLanguages,
  formatTranscriptionType,
} from "../transcription-formatters";
import { TranscriptionStatusBadge } from "./transcription-status-badge";
import { Badge } from "@gladia-analytics/ui/components/badge";
import { Button } from "@gladia-analytics/ui/components/button";
import { Spinner } from "@gladia-analytics/ui/components/spinner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@gladia-analytics/ui/components/table";
import { ArrowDown01Icon, ArrowUp01Icon, ChevronDoubleCloseIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
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

const sortFieldByColumnId = {
  status: "status",
  kind: "kind",
  model: "model",
  languages: "languages",
  fileAudioDuration: "duration",
  createdAt: "createdAt",
} as const satisfies Partial<Record<keyof TranscriptionSummary, TranscriptionSortField>>;

function createColumns(
  onTranscriptionOpen: (transcriptionId: string) => void,
  sorting: TranscriptionSorting,
  onSortingChange: (sorting: TranscriptionSorting) => void,
) {
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
        </button>
      ),
    }),
    columnHelper.accessor("status", {
      header: () => (
        <SortableColumnHeader
          label="Status"
          field="status"
          sorting={sorting}
          onSortingChange={onSortingChange}
        />
      ),
      size: 120,
      cell: ({ getValue }) => <TranscriptionStatusBadge status={getValue()} />,
    }),
    columnHelper.accessor("kind", {
      header: () => (
        <SortableColumnHeader
          label="Kind"
          field="kind"
          sorting={sorting}
          onSortingChange={onSortingChange}
        />
      ),
      size: 120,
      cell: ({ getValue }) => formatTranscriptionType(getValue()),
    }),
    columnHelper.accessor("model", {
      header: () => (
        <SortableColumnHeader
          label="Model"
          field="model"
          sorting={sorting}
          onSortingChange={onSortingChange}
        />
      ),
      size: 150,
      cell: ({ getValue }) => <span className="font-mono text-xs">{getValue()}</span>,
    }),
    columnHelper.accessor("languages", {
      header: () => (
        <SortableColumnHeader
          label="Languages"
          field="languages"
          sorting={sorting}
          onSortingChange={onSortingChange}
        />
      ),
      size: 180,
      cell: ({ getValue }) => {
        const languages = getValue();
        const formattedLanguages = formatTranscriptionLanguages(languages);

        return languages.length === 0 ? (
          <Badge variant="secondary">{formattedLanguages}</Badge>
        ) : (
          formattedLanguages
        );
      },
    }),
    columnHelper.accessor("fileAudioDuration", {
      header: () => (
        <SortableColumnHeader
          label="Duration"
          field="duration"
          sorting={sorting}
          onSortingChange={onSortingChange}
        />
      ),
      size: 110,
      cell: ({ row }) => formatTranscriptionDuration(row.original.fileAudioDuration),
    }),
    columnHelper.accessor("createdAt", {
      header: () => (
        <SortableColumnHeader
          label="Created"
          field="createdAt"
          sorting={sorting}
          onSortingChange={onSortingChange}
        />
      ),
      size: 190,
      cell: ({ getValue }) => formatTranscriptionDate(getValue()),
    }),
  ]);
}

type SortableColumnHeaderProps = {
  label: string;
  field: TranscriptionSortField;
  sorting: TranscriptionSorting;
  onSortingChange: (sorting: TranscriptionSorting) => void;
};

function SortableColumnHeader({
  label,
  field,
  sorting,
  onSortingChange,
}: SortableColumnHeaderProps) {
  const active = sorting.sort === field && sorting.order !== undefined;
  const initialOrder = field === "createdAt" ? "desc" : "asc";
  const nextSorting: TranscriptionSorting = !active
    ? { sort: field, order: initialOrder }
    : sorting.order === initialOrder
      ? { sort: field, order: initialOrder === "asc" ? "desc" : "asc" }
      : {};
  const icon = active
    ? sorting.order === "asc"
      ? ArrowUp01Icon
      : ArrowDown01Icon
    : ChevronDoubleCloseIcon;

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      className="-ml-2 text-xs"
      aria-label={
        active ? `${label}, sorted ${sorting.order}ending` : `${label}, not currently sorted`
      }
      onClick={() => onSortingChange(nextSorting)}
    >
      {label}
      <HugeiconsIcon
        icon={icon}
        data-icon="inline-end"
        strokeWidth={2}
        className={active ? undefined : "rotate-90 text-muted-foreground/60"}
      />
    </Button>
  );
}

type TranscriptionsDataTableProps = {
  transcriptions: TranscriptionSummary[];
  selectedTranscriptionId?: string;
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  fetchNextPage: () => Promise<unknown>;
  onTranscriptionOpen: (transcriptionId: string) => void;
  sorting: TranscriptionSorting;
  onSortingChange: (sorting: TranscriptionSorting) => void;
  hasActiveFilters: boolean;
};

export function TranscriptionsDataTable({
  transcriptions,
  selectedTranscriptionId,
  hasNextPage,
  isFetchingNextPage,
  fetchNextPage,
  onTranscriptionOpen,
  sorting,
  onSortingChange,
  hasActiveFilters,
}: TranscriptionsDataTableProps) {
  const tableContainerRef = useRef<HTMLDivElement>(null);
  const { order, sort } = sorting;
  const columns = useMemo(
    () => createColumns(onTranscriptionOpen, { order, sort }, onSortingChange),
    [onSortingChange, onTranscriptionOpen, order, sort],
  );
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
                  aria-sort={getAriaSort(header.column.id, sorting)}
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
                <span className="font-medium">
                  {hasActiveFilters
                    ? "No transcriptions match these filters"
                    : "No transcriptions in this period"}
                </span>
                <span className="text-xs text-muted-foreground">
                  {hasActiveFilters
                    ? "Remove a filter or select a longer period."
                    : "Try selecting a longer period to look further back."}
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

function getAriaSort(
  columnId: string,
  sorting: TranscriptionSorting,
): "ascending" | "descending" | undefined {
  const field = sortFieldByColumnId[columnId as keyof typeof sortFieldByColumnId];

  if (field !== sorting.sort || sorting.order === undefined) return undefined;

  return sorting.order === "asc" ? "ascending" : "descending";
}
