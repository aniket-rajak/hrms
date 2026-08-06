"use client";

import { useState } from "react";
import { Search, Pencil } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { attendanceUpdateSchema, type AttendanceUpdateInput, ATTENDANCE_STATUSES, ATTENDANCE_STATUS_LABELS } from "@hrms/shared";
import {
  useAllAttendance,
  useUpdateAttendance,
  useDebounced,
} from "@/hooks/use-query-hooks";
import { PageHeader } from "@/components/shared/page-header";
import { Pagination } from "@/components/shared/pagination";
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
import { formatDate, formatTime, formatHours, fullName, initials } from "@/lib/format";
import { apiErrorMessage } from "@/lib/api";
import type { AttendanceRecordDto } from "@hrms/shared";
import { toast } from "sonner";

function CorrectionDialog({
  record,
  open,
  onOpenChange,
}: {
  record: AttendanceRecordDto | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const updateAttendance = useUpdateAttendance();

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { isSubmitting },
  } = useForm<AttendanceUpdateInput>({
    resolver: zodResolver(attendanceUpdateSchema),
    values: record
      ? {
          date: record.date.slice(0, 10),
          checkIn: record.checkIn ? new Date(record.checkIn).toISOString().slice(0, 16) : "",
          checkOut: record.checkOut ? new Date(record.checkOut).toISOString().slice(0, 16) : "",
          status: record.status,
          note: record.note ?? "",
        }
      : undefined,
  });

  const onSubmit = async (values: AttendanceUpdateInput) => {
    if (!record) return;
    try {
      await updateAttendance.mutateAsync({
        id: record.id,
        input: {
          date: values.date,
          checkIn: values.checkIn ? new Date(values.checkIn).toISOString() : null,
          checkOut: values.checkOut ? new Date(values.checkOut).toISOString() : null,
          status: values.status,
          note: values.note ?? "",
        },
      });
      toast.success("Attendance corrected");
      onOpenChange(false);
    } catch (err) {
      toast.error(apiErrorMessage(err));
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Correct attendance</DialogTitle>
          <DialogDescription>
            {record ? `${fullName(record.employee?.firstName, record.employee?.lastName)} · ${formatDate(record.date)}` : ""}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="date">Date</Label>
            <Input id="date" type="date" {...register("date")} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="checkIn">Check in</Label>
              <Input id="checkIn" type="datetime-local" {...register("checkIn")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="checkOut">Check out</Label>
              <Input id="checkOut" type="datetime-local" {...register("checkOut")} />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Status</Label>
            <Select value={watch("status") ?? ""} onValueChange={(v) => setValue("status", v as AttendanceUpdateInput["status"])}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ATTENDANCE_STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {ATTENDANCE_STATUS_LABELS[s]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="note">Note</Label>
            <Input id="note" placeholder="Reason for correction" {...register("note")} />
          </div>
          <Button type="submit" className="w-full" disabled={isSubmitting}>
            Save correction
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function AttendanceManagePage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<string>("all");
  const [editing, setEditing] = useState<AttendanceRecordDto | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const debouncedSearch = useDebounced(search, 300);

  const { data, isLoading, isError, refetch } = useAllAttendance({
    page,
    pageSize: 10,
    search: debouncedSearch || undefined,
    status: status === "all" ? undefined : status,
  });

  return (
    <div>
      <PageHeader title="Attendance management" description="Review and correct daily attendance records." />

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
        <Select
          value={status}
          onValueChange={(v) => {
            setStatus(v);
            setPage(1);
          }}
        >
          <SelectTrigger className="sm:w-40">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {ATTENDANCE_STATUSES.map((s) => (
              <SelectItem key={s} value={s}>
                {ATTENDANCE_STATUS_LABELS[s]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Employee</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="hidden md:table-cell">Check in</TableHead>
              <TableHead className="hidden md:table-cell">Check out</TableHead>
              <TableHead className="hidden sm:table-cell">Hours</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading &&
              Array.from({ length: 8 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell colSpan={7}>
                    <Skeleton className="h-10" />
                  </TableCell>
                </TableRow>
              ))}
            {!isLoading && isError && (
              <TableRow>
                <TableCell colSpan={7}>
                  <ErrorState message="Failed to load attendance" onRetry={() => refetch()} />
                </TableCell>
              </TableRow>
            )}
            {!isLoading && !isError && data?.items.length === 0 && (
              <TableRow>
                <TableCell colSpan={7}>
                  <EmptyState title="No records found" icon="search" />
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
                  <TableCell>{formatDate(record.date)}</TableCell>
                  <TableCell>
                    <StatusBadge value={record.status} />
                  </TableCell>
                  <TableCell className="hidden md:table-cell">{formatTime(record.checkIn)}</TableCell>
                  <TableCell className="hidden md:table-cell">{formatTime(record.checkOut)}</TableCell>
                  <TableCell className="hidden sm:table-cell">{formatHours(record.workingHours)}</TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        setEditing(record);
                        setDialogOpen(true);
                      }}
                      aria-label="Correct attendance"
                    >
                      <Pencil className="h-4 w-4" />
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

      <CorrectionDialog record={editing} open={dialogOpen} onOpenChange={setDialogOpen} />
    </div>
  );
}
