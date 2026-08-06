"use client";

import { useState } from "react";
import { Check, X, Search, Loader2 } from "lucide-react";
import { useAllLeaves, useReviewLeave, useDebounced } from "@/hooks/use-query-hooks";
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
import { formatDate, fullName, initials } from "@/lib/format";
import { apiErrorMessage } from "@/lib/api";
import type { LeaveRecordDto } from "@hrms/shared";
import { toast } from "sonner";

function ReviewDialog({
  leave,
  action,
  open,
  onOpenChange,
}: {
  leave: LeaveRecordDto | null;
  action: "approve" | "reject";
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const reviewLeave = useReviewLeave();
  const [note, setNote] = useState("");

  const submit = async () => {
    if (!leave) return;
    try {
      await reviewLeave.mutateAsync({ id: leave.id, action, note: note || undefined });
      toast.success(action === "approve" ? "Leave approved" : "Leave rejected");
      setNote("");
      onOpenChange(false);
    } catch (err) {
      toast.error(apiErrorMessage(err));
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{action === "approve" ? "Approve leave" : "Reject leave"}</DialogTitle>
          <DialogDescription>
            {leave ? (
              <>
                {fullName(leave.employee?.firstName, leave.employee?.lastName)} · {formatDate(leave.startDate)} →{" "}
                {formatDate(leave.endDate)} · {leave.days} day(s) · {LEAVE_TYPE_LABELS[leave.leaveType]}
              </>
            ) : null}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="reviewNote">Note (optional)</Label>
            <Textarea
              id="reviewNote"
              rows={3}
              placeholder={action === "reject" ? "Reason for rejection" : "Approval note"}
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              variant={action === "approve" ? "default" : "destructive"}
              onClick={() => void submit()}
              disabled={reviewLeave.isPending}
            >
              {reviewLeave.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {action === "approve" ? "Approve" : "Reject"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

import { LEAVE_TYPE_LABELS } from "@hrms/shared";

export default function LeaveManagePage() {
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<string>("all");
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounced(search, 300);
  const [reviewTarget, setReviewTarget] = useState<{ leave: LeaveRecordDto; action: "approve" | "reject" } | null>(null);

  const { data, isLoading, isError, refetch } = useAllLeaves({
    page,
    pageSize: 10,
    status: status === "all" ? undefined : status,
    search: debouncedSearch || undefined,
  });

  return (
    <div>
      <PageHeader title="Leave requests" description="Approve or reject employee leave requests." />

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
              <TableHead>Employee</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Duration</TableHead>
              <TableHead>Days</TableHead>
              <TableHead className="hidden lg:table-cell">Reason</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading &&
              Array.from({ length: 6 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell colSpan={7}>
                    <Skeleton className="h-10" />
                  </TableCell>
                </TableRow>
              ))}
            {!isLoading && isError && (
              <TableRow>
                <TableCell colSpan={7}>
                  <ErrorState message="Failed to load leave requests" onRetry={() => refetch()} />
                </TableCell>
              </TableRow>
            )}
            {!isLoading && !isError && data?.items.length === 0 && (
              <TableRow>
                <TableCell colSpan={7}>
                  <EmptyState title="No leave requests" icon="search" />
                </TableCell>
              </TableRow>
            )}
            {!isLoading &&
              !isError &&
              data?.items.map((leave) => (
                <TableRow key={leave.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={leave.employee?.profileImageUrl ?? undefined} />
                        <AvatarFallback>{initials(leave.employee?.firstName, leave.employee?.lastName)}</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-sm font-medium">{fullName(leave.employee?.firstName, leave.employee?.lastName)}</p>
                        <p className="text-xs text-muted-foreground">{leave.employee?.employeeCode}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <LeaveTypeBadge type={leave.leaveType} />
                  </TableCell>
                  <TableCell>
                    {formatDate(leave.startDate)} → {formatDate(leave.endDate)}
                  </TableCell>
                  <TableCell>{leave.days}</TableCell>
                  <TableCell className="hidden max-w-[200px] truncate lg:table-cell">{leave.reason}</TableCell>
                  <TableCell>
                    <StatusBadge value={leave.status} />
                  </TableCell>
                  <TableCell className="text-right">
                    {leave.status === "PENDING" ? (
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-emerald-600"
                          onClick={() => setReviewTarget({ leave, action: "approve" })}
                        >
                          <Check className="mr-1 h-4 w-4" /> Approve
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-destructive"
                          onClick={() => setReviewTarget({ leave, action: "reject" })}
                        >
                          <X className="mr-1 h-4 w-4" /> Reject
                        </Button>
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground">
                        {leave.reviewedByName ? `by ${leave.reviewedByName}` : ""}
                      </span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
          </TableBody>
        </Table>
      </div>

      {data && data.totalPages > 1 && (
        <Pagination className="mt-4" page={page} totalPages={data.totalPages} total={data.total} onPageChange={setPage} />
      )}

      <ReviewDialog
        leave={reviewTarget?.leave ?? null}
        action={reviewTarget?.action ?? "approve"}
        open={Boolean(reviewTarget)}
        onOpenChange={(open) => {
          if (!open) setReviewTarget(null);
        }}
      />
    </div>
  );
}
