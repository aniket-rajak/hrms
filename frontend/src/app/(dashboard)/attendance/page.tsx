"use client";

import { useEffect, useState } from "react";
import {
  LogIn,
  LogOut,
  CalendarCheck,
  Clock,
} from "lucide-react";
import {
  useTodayAttendance,
  useCheckIn,
  useCheckOut,
  useMonthlyAttendance,
} from "@/hooks/use-query-hooks";
import { useAuth } from "@/providers/auth-provider";
import { useRouter } from "next/navigation";

import { PageHeader, StatCard, Panel } from "@/components/shared/page-header";
import { ErrorState } from "@/components/shared/states";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDate, formatTime, formatHours } from "@/lib/format";
import { apiErrorMessage } from "@/lib/api";
import { toast } from "sonner";

export default function AttendancePage() {
  const { isAdmin } = useAuth();
  const router = useRouter();

  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());

  const { data: today, isLoading: todayLoading } = useTodayAttendance();
  const { data: monthly, isLoading: monthlyLoading, isError } = useMonthlyAttendance(month, year);
  const checkIn = useCheckIn();
  const checkOut = useCheckOut();

  useEffect(() => {
    if (isAdmin) router.replace("/attendance/manage");
  }, [isAdmin, router]);

  if (isAdmin) return null;

  const handleCheckIn = async () => {
    try {
      await checkIn.mutateAsync(undefined);
      toast.success("Checked in. Have a productive day!");
    } catch (err) {
      toast.error(apiErrorMessage(err));
    }
  };

  const handleCheckOut = async () => {
    try {
      const record = await checkOut.mutateAsync();
      toast.success(`Checked out. You worked ${formatHours(record.workingHours)} today.`);
    } catch (err) {
      toast.error(apiErrorMessage(err));
    }
  };

  const monthOptions = Array.from({ length: 12 }, (_, i) => i + 1);

  return (
    <div>
      <PageHeader title="Attendance" description="Check in, check out and review your attendance." />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Panel title="Today">
          <div className="flex flex-col items-center gap-3 py-2 text-center">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <CalendarCheck className="h-4 w-4" />
              {formatDate(new Date().toISOString())}
            </div>
            {todayLoading ? (
              <Skeleton className="h-10 w-full" />
            ) : (
              <div className="flex gap-3">
                {!today?.checkIn ? (
                  <Button onClick={() => void handleCheckIn()} disabled={checkIn.isPending}>
                    <LogIn className="mr-2 h-4 w-4" />
                    {checkIn.isPending ? "Checking in…" : "Check in"}
                  </Button>
                ) : (
                  <Button
                    onClick={() => void handleCheckOut()}
                    disabled={checkOut.isPending || Boolean(today.checkOut)}
                    variant={today.checkOut ? "secondary" : "default"}
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    {today.checkOut ? "Checked out" : checkOut.isPending ? "Checking out…" : "Check out"}
                  </Button>
                )}
              </div>
            )}
            {today && (
              <div className="grid w-full grid-cols-2 gap-2 text-center text-sm">
                <div className="rounded-md bg-muted/60 p-2">
                  <p className="text-xs text-muted-foreground">Check in</p>
                  <p className="font-semibold">{formatTime(today.checkIn)}</p>
                </div>
                <div className="rounded-md bg-muted/60 p-2">
                  <p className="text-xs text-muted-foreground">Check out</p>
                  <p className="font-semibold">{formatTime(today.checkOut)}</p>
                </div>
              </div>
            )}
          </div>
        </Panel>

        <StatCard
          label="Present days"
          value={monthly?.summary.present ?? "—"}
          icon={<Clock className="h-5 w-5" />}
          accent="success"
          loading={monthlyLoading}
        />
        <StatCard
          label="Total hours"
          value={monthly ? formatHours(monthly.summary.totalHours) : "—"}
          icon={<Clock className="h-5 w-5" />}
          accent="info"
          loading={monthlyLoading}
        />
        <StatCard
          label="Days off / leave"
          value={monthly ? `${monthly.summary.halfDay} half · ${monthly.summary.leave} leave` : "—"}
          icon={<CalendarCheck className="h-5 w-5" />}
          accent="warning"
          loading={monthlyLoading}
        />
      </div>

      <div className="mt-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Monthly attendance</h2>
          <div className="flex items-center gap-2">
            <Select
              value={String(year)}
              onValueChange={(v) => setYear(Number(v))}
            >
              <SelectTrigger className="w-28">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[year - 1, year, year + 1].map((y) => (
                  <SelectItem key={y} value={String(y)}>
                    {y}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={String(month)} onValueChange={(v) => setMonth(Number(v))}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {monthOptions.map((m) => (
                  <SelectItem key={m} value={String(m)}>
                    {new Date(year, m - 1, 1).toLocaleString("en-US", { month: "long" })}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {isError && <ErrorState message="Failed to load attendance" />}

        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="hidden sm:table-cell">Check in</TableHead>
                <TableHead className="hidden sm:table-cell">Check out</TableHead>
                <TableHead>Working hours</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {monthlyLoading &&
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell colSpan={5}>
                      <Skeleton className="h-9" />
                    </TableCell>
                  </TableRow>
                ))}
              {!monthlyLoading && monthly?.records.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="py-8 text-center text-sm text-muted-foreground">
                    No attendance records for this month.
                  </TableCell>
                </TableRow>
              )}
              {!monthlyLoading &&
                monthly?.records.map((record) => (
                  <TableRow key={record.id}>
                    <TableCell className="font-medium">{formatDate(record.date)}</TableCell>
                    <TableCell>
                      <StatusBadge value={record.status} />
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">{formatTime(record.checkIn)}</TableCell>
                    <TableCell className="hidden sm:table-cell">{formatTime(record.checkOut)}</TableCell>
                    <TableCell>{formatHours(record.workingHours)}</TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
