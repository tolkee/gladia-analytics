import type { TranscriptionUpload } from "../api/get-transcription-upload.query";
import { formatFileSize } from "../utils";
import { Badge } from "@gladia-analytics/ui/components/badge";
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

const features = tableFeatures({ columnSizingFeature });
const columnHelper = createColumnHelper<typeof features, TranscriptionUpload>();

const dateFormatter = new Intl.DateTimeFormat(undefined, {
  dateStyle: "medium",
  timeStyle: "short",
});

const numberFormatter = new Intl.NumberFormat();

const columns = columnHelper.columns([
  columnHelper.accessor("originalFilename", {
    header: "File",
    size: 280,
    cell: ({ row, getValue }) => (
      <div className="min-w-0">
        <p className="truncate font-medium">{getValue()}</p>
        <p className="truncate font-mono text-xs text-muted-foreground">{row.original.id}</p>
      </div>
    ),
  }),
  columnHelper.accessor("status", {
    header: "Status",
    size: 130,
    cell: ({ getValue }) => <UploadStatusBadge status={getValue()} />,
  }),
  columnHelper.accessor("sizeBytes", {
    header: "Size",
    size: 110,
    cell: ({ getValue }) => formatFileSize(getValue()),
  }),
  columnHelper.accessor("processedItems", {
    header: "Processed items",
    size: 150,
    cell: ({ getValue }) => numberFormatter.format(getValue()),
  }),
  columnHelper.accessor("createdAt", {
    header: "Uploaded",
    size: 190,
    cell: ({ getValue }) => dateFormatter.format(new Date(getValue())),
  }),
  columnHelper.accessor("error", {
    header: "Info",
    size: 280,
    cell: ({ getValue }) => {
      const error = getValue();

      if (!error) {
        return <span className="text-muted-foreground">—</span>;
      }

      return (
        <div className="min-w-0" title={error.message}>
          <p className="truncate text-sm text-destructive">{error.message}</p>
          <p className="truncate font-mono text-xs text-muted-foreground">{error.code}</p>
        </div>
      );
    },
  }),
]);

type UploadsDataTableProps = {
  uploads: TranscriptionUpload[];
};

export function UploadsDataTable({ uploads }: UploadsDataTableProps) {
  const table = useTable({
    features,
    columns,
    data: uploads,
    getRowId: (upload) => upload.id,
  });
  const rows = table.getRowModel().rows;

  return (
    <div className="min-h-0 flex-1 overflow-hidden rounded-lg border">
      <Table
        aria-label="Transcription uploads"
        className="grid min-w-[1140px]"
        containerClassName="h-full overflow-auto"
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
          <TableBody className="grid">
            {rows.map((row) => (
              <TableRow key={row.id} className="flex min-h-14 w-full">
                {row.getAllCells().map((cell) => (
                  <TableCell
                    key={cell.id}
                    className="flex min-w-0 shrink-0 items-center px-4 py-2"
                    style={{ width: cell.column.getSize() }}
                  >
                    <table.FlexRender cell={cell} />
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        ) : (
          <TableBody className="grid">
            <TableRow className="flex h-48 w-full items-center justify-center hover:bg-transparent">
              <TableCell
                className="flex w-full flex-col items-center justify-center gap-1 text-center"
                colSpan={columns.length}
              >
                <span className="font-medium">No uploads yet</span>
                <span className="text-xs text-muted-foreground">
                  Uploaded transcription files will appear here.
                </span>
              </TableCell>
            </TableRow>
          </TableBody>
        )}
      </Table>
    </div>
  );
}

function UploadStatusBadge({ status }: { status: TranscriptionUpload["status"] }) {
  const isFailed = status === "failed";
  const isCompleted = status === "completed";

  return (
    <Badge variant={isFailed ? "destructive" : isCompleted ? "secondary" : "outline"}>
      <span
        aria-hidden="true"
        className={
          isFailed
            ? "size-1.5 rounded-full bg-destructive"
            : isCompleted
              ? "size-1.5 rounded-full bg-emerald-500"
              : "size-1.5 rounded-full bg-amber-500"
        }
      />
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </Badge>
  );
}
