"use client";

import { useEffect, useState } from "react";
import { Download, Pencil, Loader2 } from "lucide-react";
import { useForm } from "react-hook-form";
import {
  useMyPayrollRecords,
  useMySalaryStructure,
  useUpdateMySalaryStructure,
} from "@/hooks/use-query-hooks";
import { useAuth } from "@/providers/auth-provider";
import { useRouter } from "next/navigation";

import { PageHeader, Panel } from "@/components/shared/page-header";
import { Pagination } from "@/components/shared/pagination";
import { EmptyState, ErrorState } from "@/components/shared/states";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatMoney } from "@/lib/format";
import { downloadPdf, apiErrorMessage } from "@/lib/api";
import { slipDownloadUrl } from "@/services/hr.service";
import { toast } from "sonner";

function StructureEditor() {
  const { data: structure, isLoading } = useMySalaryStructure();
  const updateStructure = useUpdateMySalaryStructure();
  const [open, setOpen] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { isSubmitting },
  } = useForm({
    values: structure
      ? {
          basic: structure.basic,
          housing: structure.housing,
          transport: structure.transport,
          medical: structure.medical,
          otherAllowances: structure.otherAllowances,
          deductions: structure.deductions,
        }
      : undefined,
  });

  const onSubmit = async (values: Record<string, number>) => {
    try {
      await updateStructure.mutateAsync(values as never);
      toast.success("Salary structure saved");
      setOpen(false);
    } catch (err) {
      toast.error(apiErrorMessage(err));
    }
  };

  if (isLoading) return <Skeleton className="h-48" />;

  return (
    <Panel
      title="My salary structure"
      description="Contact HR if your structure looks wrong."
      action={
        <Dialog open={open} onOpenChange={setOpen}>
          <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
            <Pencil className="mr-2 h-4 w-4" /> Edit
          </Button>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit salary structure</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              {(
                [
                  ["basic", "Basic salary"],
                  ["housing", "Housing"],
                  ["transport", "Transport"],
                  ["medical", "Medical"],
                  ["otherAllowances", "Other allowances"],
                  ["deductions", "Deductions"],
                ] as const
              ).map(([key, label]) => (
                <div key={key} className="space-y-2">
                  <Label htmlFor={key}>{label}</Label>
                  <Input id={key} type="number" min={0} step="0.01" {...register(key, { valueAsNumber: true })} />
                </div>
              ))}
              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save structure
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      }
    >
      {!structure ? (
        <EmptyState title="No salary structure" description="Ask your administrator to set one up." />
      ) : (
        <dl className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm sm:grid-cols-3">
          <div>
            <dt className="text-muted-foreground">Basic</dt>
            <dd className="font-medium">{formatMoney(structure.basic)}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Housing</dt>
            <dd className="font-medium">{formatMoney(structure.housing)}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Transport</dt>
            <dd className="font-medium">{formatMoney(structure.transport)}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Medical</dt>
            <dd className="font-medium">{formatMoney(structure.medical)}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Other</dt>
            <dd className="font-medium">{formatMoney(structure.otherAllowances)}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Deductions</dt>
            <dd className="font-medium">− {formatMoney(structure.deductions)}</dd>
          </div>
          <div className="col-span-2 border-t pt-2 sm:col-span-3">
            <div className="flex justify-between text-sm font-bold">
              <span>Net salary</span>
              <span>{formatMoney(structure.netSalary)}</span>
            </div>
          </div>
        </dl>
      )}
    </Panel>
  );
}

export default function PayrollPage() {
  const { isAdmin } = useAuth();
  const router = useRouter();

  const [page, setPage] = useState(1);
  const { data, isLoading, isError, refetch } = useMyPayrollRecords({ page, pageSize: 10 });

  useEffect(() => {
    if (isAdmin) router.replace("/payroll/manage");
  }, [isAdmin, router]);

  if (isAdmin) return null;

  const handleDownload = async (id: number) => {
    try {
      await downloadPdf(slipDownloadUrl(id));
    } catch (err) {
      toast.error(apiErrorMessage(err));
    }
  };

  return (
    <div>
      <PageHeader title="Payroll" description="Your salary slips and compensation." />

      <div className="mb-6 max-w-2xl">
        <StructureEditor />
      </div>

      <h2 className="mb-3 text-lg font-semibold">Salary slips</h2>
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Period</TableHead>
              <TableHead>Earnings</TableHead>
              <TableHead>Deductions</TableHead>
              <TableHead>Net salary</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Slip</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading &&
              Array.from({ length: 5 }).map((_, i) => (
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
                    title="No salary slips yet"
                    description="Your first payslip will appear after payroll is generated."
                  />
                </TableCell>
              </TableRow>
            )}
            {!isLoading &&
              !isError &&
              data?.items.map((record) => (
                <TableRow key={record.id}>
                  <TableCell className="font-medium">
                    {new Date(record.year, record.month - 1, 1).toLocaleString("en-US", { month: "long", year: "numeric" })}
                  </TableCell>
                  <TableCell>{formatMoney(record.earnings.basic + record.earnings.housing + record.earnings.transport + record.earnings.medical + record.earnings.otherAllowances)}</TableCell>
                  <TableCell>{formatMoney(record.deductions.deductions)}</TableCell>
                  <TableCell className="font-semibold">{formatMoney(record.netSalary)}</TableCell>
                  <TableCell>
                    <StatusBadge value={record.status} />
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="outline" size="sm" onClick={() => void handleDownload(record.id)}>
                      <Download className="mr-2 h-4 w-4" /> PDF
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
          </TableBody>
        </Table>
      </div>

      {data && data.totalPages > 1 && (
        <Pagination className="mt-4" page={page} totalPages={data.totalPages} total={data.total} onPageChange={setPage} />
      )}
    </div>
  );
}
