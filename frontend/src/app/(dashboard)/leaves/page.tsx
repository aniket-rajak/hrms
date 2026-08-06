"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { leaveApplySchema, type LeaveApplyInput, LEAVE_TYPES, LEAVE_TYPE_LABELS } from "@hrms/shared";
import { Plus, Loader2 } from "lucide-react";
import {
  useMyLeaves,
  useLeaveBalance,
  useApplyLeave,
} from "@/hooks/use-query-hooks";
import { useAuth } from "@/providers/auth-provider";
import { useRouter } from "next/navigation";

import { PageHeader } from "@/components/shared/page-header";
import { Pagination } from "@/components/shared/pagination";
import { EmptyState, ErrorState } from "@/components/shared/states";
import { StatusBadge, LeaveTypeBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
import { formatDate } from "@/lib/format";
import { apiErrorMessage } from "@/lib/api";
import { toast } from "sonner";

function ApplyLeaveDialog() {
  const applyLeave = useApplyLeave();
  const [open, setOpen] = useState(false);
  const { data: balance } = useLeaveBalance();

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<LeaveApplyInput>({
    resolver: zodResolver(leaveApplySchema),
    defaultValues: { leaveType: "ANNUAL", startDate: "", endDate: "", reason: "" },
  });

  const selectedType = watch("leaveType");
  const selectedBalance = balance?.find((b) => b.leaveType === selectedType);

  const onSubmit = async (values: LeaveApplyInput) => {
    try {
      await applyLeave.mutateAsync(values);
      toast.success("Leave request submitted for approval");
      reset();
      setOpen(false);
    } catch (err) {
      toast.error(apiErrorMessage(err));
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" /> Apply leave
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Apply for leave</DialogTitle>
          <DialogDescription>
            Your request will be reviewed by an administrator.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label>Leave type *</Label>
            <Select value={selectedType} onValueChange={(v) => setValue("leaveType", v as LeaveApplyInput["leaveType"])}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {LEAVE_TYPES.map((t) => (
                  <SelectItem key={t} value={t}>
                    {LEAVE_TYPE_LABELS[t]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedBalance && selectedType !== "UNPAID" && (
              <p className="text-xs text-muted-foreground">
                Available balance: <span className="font-medium">{selectedBalance.remaining}</span> of{" "}
                {selectedBalance.total} days
              </p>
            )}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="startDate">Start date *</Label>
              <Input id="startDate" type="date" {...register("startDate")} />
              {errors.startDate && <p className="text-xs text-destructive">{errors.startDate.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="endDate">End date *</Label>
              <Input id="endDate" type="date" {...register("endDate")} />
              {errors.endDate && <p className="text-xs text-destructive">{errors.endDate.message}</p>}
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="reason">Reason *</Label>
            <Textarea id="reason" rows={3} placeholder="Tell us why you need this leave" {...register("reason")} />
            {errors.reason && <p className="text-xs text-destructive">{errors.reason.message}</p>}
          </div>
          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Submit request
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function LeavesPage() {
  const { isAdmin } = useAuth();
  const router = useRouter();

  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const { data: balance } = useLeaveBalance();
  const { data, isLoading, isError, refetch } = useMyLeaves({
    page,
    pageSize: 10,
    status: statusFilter === "all" ? undefined : statusFilter,
  });

  useEffect(() => {
    if (isAdmin) router.replace("/leaves/manage");
  }, [isAdmin, router]);

  if (isAdmin) return null;

  return (
    <div>
      <PageHeader
        title="Leave"
        description="Apply for leave and track your requests."
        actions={<ApplyLeaveDialog />}
      />

      <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {balance?.map((b) => (
          <div key={b.leaveType} className="rounded-lg border bg-card p-4">
            <div className="flex items-center justify-between">
              <LeaveTypeBadge type={b.leaveType} />
              <span className="text-lg font-bold">{b.remaining}</span>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              {b.used} of {b.total} used · {new Date().getFullYear()}
            </p>
          </div>
        ))}
        {!balance && Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20" />)}
      </div>

      <div className="mb-4">
        <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All requests</SelectItem>
            <SelectItem value="PENDING">Pending</SelectItem>
            <SelectItem value="APPROVED">Approved</SelectItem>
            <SelectItem value="REJECTED">Rejected</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Type</TableHead>
              <TableHead>Duration</TableHead>
              <TableHead>Days</TableHead>
              <TableHead className="hidden md:table-cell">Reason</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="hidden sm:table-cell">Applied</TableHead>
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
                  <ErrorState message="Failed to load leave requests" onRetry={() => refetch()} />
                </TableCell>
              </TableRow>
            )}
            {!isLoading && !isError && data?.items.length === 0 && (
              <TableRow>
                <TableCell colSpan={6}>
                  <EmptyState title="No leave requests" description="Apply for your first leave above." />
                </TableCell>
              </TableRow>
            )}
            {!isLoading &&
              !isError &&
              data?.items.map((leave) => (
                <TableRow key={leave.id}>
                  <TableCell>
                    <LeaveTypeBadge type={leave.leaveType} />
                  </TableCell>
                  <TableCell>
                    {formatDate(leave.startDate)} → {formatDate(leave.endDate)}
                  </TableCell>
                  <TableCell>{leave.days}</TableCell>
                  <TableCell className="hidden max-w-xs truncate md:table-cell">{leave.reason}</TableCell>
                  <TableCell>
                    <StatusBadge value={leave.status} />
                  </TableCell>
                  <TableCell className="hidden sm:table-cell">{formatDate(leave.createdAt)}</TableCell>
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
