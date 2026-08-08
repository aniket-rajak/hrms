"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { Download, Trash2, Search, CheckCircle2, Loader2, FileDown } from "lucide-react";
import {
  useAllPayrollRecords,
  useGeneratePayroll,
  useMarkPaid,
  useDeletePayrollRecord,
} from "@/hooks/use-query-hooks";
import { PageHeader } from "@/components/shared/page-header";
import { Pagination } from "@/components/shared/pagination";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { EmptyState, ErrorState } from "@/components/shared/states";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { formatMoney, fullName, initials } from "@/lib/format";
import { downloadPdf, apiErrorMessage } from "@/lib/api";
import { slipDownloadUrl } from "@/services/hr.service";
import { toast } from "sonner";

function GenerateDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const generatePayroll = useGeneratePayroll();
  const now = new Date();

  const {
    register,
    handleSubmit,
    setValue,
    formState: { isSubmitting },
  } = useForm({
    defaultValues: { month: now.getMonth() + 1, year: now.getFullYear() },
  });

  const onSubmit = async (values: { month: number; year: number }) => {
    try {
      const result = await generatePayroll.mutateAsync(values);
      toast.success(`Payroll generated for ${result.created} employee(s)`);
      onOpenChange(false);
    } catch (err) {
      toast.error(apiErrorMessage(err));
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Generate monthly payroll</DialogTitle>
          <DialogDescription>
            Creates salary records for all active employees for the selected period. Existing records for a period
            block regeneration.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="month">Month</Label>
              <Select
                defaultValue={String(now.getMonth() + 1)}
                onValueChange={(v) => setValue("month", Number(v))}
              >
                <SelectTrigger id="month">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                    <SelectItem key={m} value={String(m)}>
                      {new Date(now.getFullYear(), m - 1, 1).toLocaleString("en-US", { month: "long" })}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="year">Year</Label>
              <Input id="year" type="number" min={2000} max={2100} {...register("year", { valueAsNumber: true })} />
            </div>
          </div>
          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            <FileDown className="mr-2 h-4 w-4" />
            Generate payroll
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function PayrollManagePage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<string>("all");
  const [generateOpen, setGenerateOpen] = useState(false);
  const now = new Date();

  const { data, isLoading, isError, refetch } = useAllPayrollRecords({
    page,
    pageSize: 10,
    search: search || undefined,
    status: status === "all" ? undefined : (status as never),
    month: now.getMonth() + 1,
    year: now.getFullYear(),
  });

  const markPaid = useMarkPaid();
  const deleteRecord = useDeletePayrollRecord();

  const handleMarkPaid = async (id: string) => {
    try {
      await markPaid.mutateAsync(id);
      toast.success("Record marked as paid");
    } catch (err) {
      toast.error(apiErrorMessage(err));
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteRecord.mutateAsync(id);
      toast.success("Payroll record deleted");
    } catch (err) {
      toast.error(apiErrorMessage(err));
    }
  };

  const handleDownload = async (id: string) => {
    try {
      await downloadPdf(slipDownloadUrl(id));
    } catch (err) {
      toast.error(apiErrorMessage(err));
    }
  };

  return (
    <div>
      <PageHeader
        title="Payroll"
        description={`Salary records for ${new Date(now.getFullYear(), now.getMonth(), 1).toLocaleString("en-US", { month: "long", year: "numeric" })}.`}
        actions={
          <Button onClick={() => setGenerateOpen(true)}>
            <FileDown className="mr-2 h-4 w-4" /> Generate payroll
          </Button>
        }
      />

      <div className="mb-4 flex flex-col gap-3 sm:flex-row">
        <div className="relative sm:max-w-xs">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search employee…"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="pl-9"
          />
        </div>
        <Select value={status} onValueChange={(v) => { setStatus(v); setPage(1); }}>
          <SelectTrigger className="sm:w-40">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="DRAFT">Draft</SelectItem>
            <SelectItem value="PAID">Paid</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Employee</TableHead>
              <TableHead>Period</TableHead>
              <TableHead>Earnings</TableHead>
              <TableHead>Net salary</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading &&
              Array.from({ length: 8 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell colSpan={6}>
                    <Skeleton className="h-10" />
                  </TableCell>
                </TableRow>
              ))}
            {!isLoading && isError && (
              <TableRow>
                <TableCell colSpan={6}>
                  <ErrorState message="Failed to load payroll records" onRetry={() => refetch()} />
                </TableCell>
              </TableRow>
            )}
            {!isLoading && !isError && data?.items.length === 0 && (
              <TableRow>
                <TableCell colSpan={6}>
                  <EmptyState
                    title="No payroll records"
                    description="Generate payroll for the current month to create salary records."
                  />
                </TableCell>
              </TableRow>
            )}
            {!isLoading &&
              !isError &&
              data?.items.map((record) => (
                <TableRow key={record.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={record.employee?.profileImageUrl ?? undefined} />
                        <AvatarFallback>{initials(record.employee?.firstName, record.employee?.lastName)}</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-sm font-medium">
                          {fullName(record.employee?.firstName, record.employee?.lastName)}
                        </p>
                        <p className="text-xs text-muted-foreground">{record.employee?.employeeCode}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    {new Date(record.year, record.month - 1, 1).toLocaleString("en-US", { month: "short", year: "numeric" })}
                  </TableCell>
                  <TableCell>{formatMoney(record.earnings.basic + record.earnings.housing + record.earnings.transport + record.earnings.medical + record.earnings.otherAllowances)}</TableCell>
                  <TableCell className="font-semibold">{formatMoney(record.netSalary)}</TableCell>
                  <TableCell>
                    <StatusBadge value={record.status} />
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button variant="ghost" size="icon" onClick={() => void handleDownload(record.id)} title="Download slip">
                        <Download className="h-4 w-4" />
                      </Button>
                      {record.status === "DRAFT" && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-emerald-600"
                          onClick={() => void handleMarkPaid(record.id)}
                          title="Mark as paid"
                        >
                          <CheckCircle2 className="h-4 w-4" />
                        </Button>
                      )}
                      <ConfirmDialog
                        title="Delete payroll record?"
                        description="This salary record will be permanently deleted."
                        onConfirm={() => handleDelete(record.id)}
                      >
                        <Button variant="ghost" size="icon" className="text-destructive" title="Delete record">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </ConfirmDialog>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
          </TableBody>
        </Table>
      </div>

      {data && data.totalPages > 1 && (
        <Pagination className="mt-4" page={page} totalPages={data.totalPages} total={data.total} onPageChange={setPage} />
      )}

      <GenerateDialog open={generateOpen} onOpenChange={setGenerateOpen} />
    </div>
  );
}
