"use client";

import { useState } from "react";
import { Download, Printer } from "lucide-react";
import { useMyPayrollRecords } from "@/hooks/use-query-hooks";
import { useAuth } from "@/providers/auth-provider";
import { useRouter } from "next/navigation";

import { PageHeader } from "@/components/shared/page-header";
import { StructureEditor } from "@/components/shared/structure-editor";
import { Pagination } from "@/components/shared/pagination";
import { EmptyState, ErrorState } from "@/components/shared/states";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
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
import { downloadPdf, openPdf, apiErrorMessage } from "@/lib/api";
import { slipDownloadUrl, slipPrintUrl } from "@/services/hr.service";
import { toast } from "sonner";

export default function PayslipsPage() {
  const { user, isAdmin, loading } = useAuth();
  const router = useRouter();

  const [page, setPage] = useState(1);
  const { data, isLoading, isError, refetch } = useMyPayrollRecords({ page, pageSize: 10 });

  if (isAdmin || loading) {
    if (isAdmin && !loading) router.replace("/payroll/manage");
    return null;
  }

  const handleDownload = async (id: string) => {
    try {
      await downloadPdf(slipDownloadUrl(id));
    } catch (err) {
      toast.error(apiErrorMessage(err));
    }
  };

  const handlePrint = async (id: string) => {
    try {
      await openPdf(slipPrintUrl(id));
    } catch (err) {
      toast.error(apiErrorMessage(err));
    }
  };

  return (
    <div>
      <PageHeader
        title="Payslips"
        description={`Your salary slips · ${user?.user.email}`}
      />

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
                  <ErrorState message="Failed to load payslips" onRetry={() => refetch()} />
                </TableCell>
              </TableRow>
            )}
            {!isLoading && !isError && data?.items.length === 0 && (
              <TableRow>
                <TableCell colSpan={6}>
                  <EmptyState
                    title="No payslips yet"
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
                    <div className="flex items-center justify-end gap-1.5">
                      <Button variant="outline" size="sm" onClick={() => void handlePrint(record.id)}>
                        <Printer className="mr-2 h-4 w-4" /> Print
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => void handleDownload(record.id)}>
                        <Download className="mr-2 h-4 w-4" /> PDF
                      </Button>
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
    </div>
  );
}