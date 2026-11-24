"use client";

import { useEffect, useMemo, useState, useTransition } from "react";

import { Download, FileUp, Loader2 } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { bulkImportAction } from "@/lib/bulk-import/actions";
import { stringifyCsv } from "@/lib/bulk-import/csv";
import { downloadBulkImportTemplate, downloadGeneratedFile } from "@/lib/bulk-import/templates";
import {
  BULK_IMPORT_MAX_FILE_SIZE,
  type BulkImportEntity,
  type BulkImportResponse,
  type BulkImportResultRow,
} from "@/lib/bulk-import/types";

interface BulkImportDialogProps {
  entity: BulkImportEntity;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const copy: Record<BulkImportEntity, { title: string; description: string }> = {
  location: {
    title: "批次匯入地點",
    description: "上傳地點或空間檔案；XLSX 可同時包含 Buildings 與 Spaces 工作表。",
  },
  equipment: {
    title: "批次匯入設備",
    description: "設備會以地點代碼、空間名稱與樓層對應既有空間。",
  },
  users: {
    title: "批次匯入使用者",
    description: "系統會以 Email 作為預設密碼，並要求首次登入變更密碼。",
  },
};

export function BulkImportDialog({ entity, open, onOpenChange }: BulkImportDialogProps) {
  const [importFile, setImportFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<BulkImportResponse | null>(null);
  const [isPending, startTransition] = useTransition();

  const summary = useMemo(() => {
    const rows = result?.rows ?? [];
    return {
      created: rows.filter((row) => row.status === "created").length,
      skipped: rows.filter((row) => row.status === "skipped").length,
      failed: rows.filter((row) => row.status === "failed").length,
    };
  }, [result]);

  const isLocation = entity === "location";
  const canSubmit = Boolean(importFile);

  useEffect(() => {
    if (!open) {
      setImportFile(null);
      setError(null);
      setResult(null);
    }
  }, [open]);

  const handleSubmit = () => {
    if (!canSubmit || isPending) return;

    const formData = new FormData();
    formData.set("entity", entity);
    if (importFile) {
      formData.set("file", importFile);
    }

    startTransition(async () => {
      setError(null);
      const response = await bulkImportAction(formData);
      if (!response.success) {
        setError(response.error ?? "匯入失敗，請稍後再試");
        return;
      }
      setResult(response);
    });
  };

  const downloadResult = () => {
    if (!result?.rows?.length) return;
    const csv = stringifyCsv(["source", "row", "status", "reason", "email", "password"], result.rows);
    const file = new File([`\uFEFF${csv}`], `${entity}-import-result.csv`, { type: "text/csv;charset=utf-8;" });
    downloadGeneratedFile(file);
  };

  const renderFileField = (
    id: string,
    label: string,
    accept: string,
    file: File | null,
    onChange: (file: File | null) => void,
  ) => (
    <Field>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <Input
        id={id}
        type="file"
        accept={accept}
        onChange={(event) => {
          const selected = event.target.files?.[0] ?? null;
          if (selected && selected.size > BULK_IMPORT_MAX_FILE_SIZE) {
            setError("檔案大小不可超過 5MB");
            event.target.value = "";
            onChange(null);
            return;
          }
          setError(null);
          onChange(selected);
        }}
      />
      <FieldDescription>{file ? file.name : "尚未選擇檔案"}</FieldDescription>
    </Field>
  );

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next);
      }}
    >
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{copy[entity].title}</DialogTitle>
          <DialogDescription>{copy[entity].description}</DialogDescription>
        </DialogHeader>

        {result ? (
          <div className="flex min-h-0 flex-col gap-4">
            <div className="flex flex-wrap gap-2">
              <Badge>{`新增 ${summary.created}`}</Badge>
              <Badge variant="secondary">{`略過 ${summary.skipped}`}</Badge>
              <Badge variant="destructive">{`失敗 ${summary.failed}`}</Badge>
            </div>

            <div className="max-h-72 overflow-auto rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>來源</TableHead>
                    <TableHead className="w-16">列</TableHead>
                    <TableHead className="w-20">狀態</TableHead>
                    <TableHead>說明</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {result.rows?.map((row) => (
                    <ResultRow key={`${row.source}-${row.row}-${row.status}`} row={row} />
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        ) : (
          <FieldGroup className="gap-4">
            {renderFileField("bulk-import-file", "匯入檔案", ".xlsx,.csv", importFile, setImportFile)}

            <Field>
              <FieldLabel>範本</FieldLabel>
              <div className="flex flex-wrap gap-2">
                {isLocation ? (
                  <>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => downloadBulkImportTemplate("buildings", "xlsx")}
                    >
                      <Download data-icon="inline-start" />
                      地點 XLSX
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => downloadBulkImportTemplate("buildings", "csv")}
                    >
                      <Download data-icon="inline-start" />
                      地點 CSV
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => downloadBulkImportTemplate("spaces", "xlsx")}
                    >
                      <Download data-icon="inline-start" />
                      空間 XLSX
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => downloadBulkImportTemplate("spaces", "csv")}
                    >
                      <Download data-icon="inline-start" />
                      空間 CSV
                    </Button>
                  </>
                ) : (
                  <>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => downloadBulkImportTemplate(entity, "xlsx")}
                    >
                      <Download data-icon="inline-start" />
                      XLSX
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => downloadBulkImportTemplate(entity, "csv")}
                    >
                      <Download data-icon="inline-start" />
                      CSV
                    </Button>
                  </>
                )}
              </div>
            </Field>

            {error && (
              <Alert variant="destructive">
                <AlertTitle>匯入失敗</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
          </FieldGroup>
        )}

        <DialogFooter>
          {result ? (
            <>
              <Button type="button" variant="outline" onClick={downloadResult} disabled={!result.rows?.length}>
                <Download data-icon="inline-start" />
                下載結果
              </Button>
              <Button type="button" onClick={() => onOpenChange(false)}>
                關閉
              </Button>
            </>
          ) : (
            <>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
                取消
              </Button>
              <Button type="button" onClick={handleSubmit} disabled={!canSubmit || isPending}>
                {isPending ? (
                  <Loader2 data-icon="inline-start" className="animate-spin" />
                ) : (
                  <FileUp data-icon="inline-start" />
                )}
                開始匯入
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ResultRow({ row }: { row: BulkImportResultRow }) {
  return (
    <TableRow>
      <TableCell className="font-medium">{row.source}</TableCell>
      <TableCell className="font-mono text-xs">{row.row}</TableCell>
      <TableCell>
        {row.status === "created" && <Badge>新增</Badge>}
        {row.status === "skipped" && <Badge variant="secondary">略過</Badge>}
        {row.status === "failed" && <Badge variant="destructive">失敗</Badge>}
      </TableCell>
      <TableCell className="text-muted-foreground text-xs">
        {[row.reason, row.email, row.password].filter(Boolean).join(" / ") || "—"}
      </TableCell>
    </TableRow>
  );
}
