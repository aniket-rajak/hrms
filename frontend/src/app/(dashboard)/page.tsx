"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  Users,
  Building2,
  UserCheck,
  CalendarClock,
  CalendarPlus,
  TrendingUp,
  Wallet,
  Gift,
} from "lucide-react";
import { useAdminDashboard, useEmployeeDashboard } from "@/hooks/use-query-hooks";
import { PageHeader, StatCard, Panel } from "@/components/shared/page-header";
import { EmptyState, ErrorState } from "@/components/shared/states";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { formatDate, formatTime, formatHours, formatMoney, fullName, initials } from "@/lib/format";
import { useAuth } from "@/providers/auth-provider";
import { AttendanceBarChart } from "@/components/dashboard/charts";
import { LeaveTypeBadge, StatusBadge } from "@/components/shared/status-badge";

const fadeUp = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.25 },
};

function AdminDashboard() {
  const { data, isLoading, isError, refetch } = useAdminDashboard();

  if (isLoading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="h-28" />
        ))}
      </div>
    );
  }

  if (isError || !data) return <ErrorState message="Failed to load dashboard" onRetry={() => refetch()} />;

  return (
    <div className="space-y-6">
      <PageHeader title="Dashboard" description="Overview of your organization today." />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total Employees" value={data.totalEmployees} icon={<Users className="h-5 w-5" />} />
        <StatCard
          label="Present Today"
          value={data.presentToday}
          icon={<UserCheck className="h-5 w-5" />}
          accent="success"
          hint={`${data.absentToday} absent · ${data.onLeaveToday} on leave`}
        />
        <StatCard
          label="Pending Leaves"
          value={data.pendingLeaves}
          icon={<CalendarPlus className="h-5 w-5" />}
          accent="warning"
        />
        <StatCard
          label="Departments"
          value={data.totalDepartments}
          icon={<Building2 className="h-5 w-5" />}
          accent="info"
          hint={`${data.newHiresThisMonth} new hires this month`}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <motion.div {...fadeUp} className="lg:col-span-2">
          <Panel title="Attendance — last 6 months" description="Present, half day and absent per month.">
            <AttendanceBarChart data={data.monthlyAttendance} />
          </Panel>
        </motion.div>

        <Panel title="Upcoming birthdays" description="Employees celebrating in the next 30 days.">
          {data.upcomingBirthdays.length === 0 ? (
            <EmptyState title="No birthdays" description="No birthdays in the next 30 days." />
          ) : (
            <ul className="space-y-3">
              {data.upcomingBirthdays.map((b) => (
                <li key={b.id} className="flex items-center gap-3">
                  <Avatar className="h-9 w-9">
                    <AvatarImage src={b.profileImageUrl ?? undefined} />
                    <AvatarFallback>{initials(b.firstName, b.lastName)}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{fullName(b.firstName, b.lastName)}</p>
                    <p className="text-xs text-muted-foreground">{b.designation}</p>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Gift className="h-3.5 w-3.5 text-rose-500" />
                    {formatDate(b.birthdayDate)}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <motion.div {...fadeUp} className="lg:col-span-2">
          <Panel
            title="Recent activity"
            description="Latest system events."
            action={
              <Link href="/analytics" className="text-xs font-medium text-primary hover:underline">
                View analytics
              </Link>
            }
          >
            {data.recentActivities.length === 0 ? (
              <EmptyState title="No activity yet" />
            ) : (
              <ul className="space-y-1">
                {data.recentActivities.map((activity) => (
                  <li
                    key={activity.id}
                    className="flex items-start justify-between gap-3 rounded-md px-2 py-2 hover:bg-muted/50"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm">{activity.message}</p>
                      <p className="text-xs text-muted-foreground">{activity.actorName}</p>
                    </div>
                    <span className="shrink-0 text-xs text-muted-foreground">{formatDate(activity.createdAt)}</span>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </motion.div>

        <Panel title="Department distribution" description="Employees per department.">
          <ul className="space-y-3">
            {data.departmentDistribution.map((d) => (
              <li key={d.name} className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">{d.name}</span>
                  <span className="text-muted-foreground">{d.count}</span>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-primary"
                    style={{ width: `${Math.min(100, (d.count / Math.max(1, data.totalEmployees)) * 100)}%` }}
                  />
                </div>
              </li>
            ))}
          </ul>
        </Panel>
      </div>
    </div>
  );
}

function EmployeeDashboard() {
  const { data, isLoading, isError, refetch } = useEmployeeDashboard();

  if (isLoading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-28" />
        ))}
      </div>
    );
  }

  if (isError || !data) return <ErrorState message="Failed to load dashboard" onRetry={() => refetch()} />;

  const today = data.today;

  return (
    <div className="space-y-6">
      <PageHeader title="My Dashboard" description="Your attendance, leaves and salary at a glance." />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Today's Attendance"
          value={
            !data.todayCheckedIn
              ? "Not checked in"
              : data.todayCheckedOut
                ? "Checked out"
                : "Checked in"
          }
          icon={<CalendarClock className="h-5 w-5" />}
          accent={data.todayCheckedOut ? "info" : data.todayCheckedIn ? "success" : "warning"}
          hint={
            today?.checkIn
              ? `In ${formatTime(today.checkIn)}${today.checkOut ? ` · Out ${formatTime(today.checkOut)}` : ""}`
              : undefined
          }
        />
        <StatCard
          label="Hours This Month"
          value={formatHours(data.monthSummary.totalHours)}
          icon={<TrendingUp className="h-5 w-5" />}
          accent="success"
          hint={`${data.monthSummary.present} present days`}
        />
        <StatCard
          label="Leave Taken"
          value={data.monthSummary.leave}
          icon={<CalendarPlus className="h-5 w-5" />}
          accent="warning"
        />
        <StatCard
          label="Last Salary"
          value={data.lastPayroll ? formatMoney(data.lastPayroll.netSalary, "$") : "—"}
          icon={<Wallet className="h-5 w-5" />}
          accent="info"
          hint={data.lastPayroll ? `${data.lastPayroll.month}/${data.lastPayroll.year}` : "No records yet"}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <motion.div {...fadeUp} className="lg:col-span-2">
          <Panel
            title="Leave balance"
            description={`Year ${new Date().getFullYear()}`}
            action={
              <Link href="/leaves" className="text-xs font-medium text-primary hover:underline">
                Apply leave
              </Link>
            }
          >
            {data.leaveBalances.length === 0 ? (
              <EmptyState title="No leave balance" />
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {data.leaveBalances.map((b) => (
                  <div key={b.leaveType} className="rounded-lg border p-3">
                    <div className="flex items-center justify-between">
                      <LeaveTypeBadge type={b.leaveType} />
                      <span className="text-sm font-bold">{b.remaining}</span>
                    </div>
                    <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-primary"
                        style={{ width: `${Math.min(100, (b.used / Math.max(1, b.total)) * 100)}%` }}
                      />
                    </div>
                    <p className="mt-1.5 text-xs text-muted-foreground">
                      {b.used} of {b.total} used
                    </p>
                  </div>
                ))}
              </div>
            )}
          </Panel>
        </motion.div>

        <Panel title="Upcoming holidays" description="Next 30 days.">
          {data.upcomingHolidays.length === 0 ? (
            <EmptyState title="No holidays" description="No holidays in the next 30 days." />
          ) : (
            <ul className="space-y-3">
              {data.upcomingHolidays.map((h) => (
                <li key={h.id} className="flex items-center justify-between gap-2">
                  <span className="text-sm font-medium">{h.name}</span>
                  <span className="text-xs text-muted-foreground">{formatDate(h.date)}</span>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <motion.div {...fadeUp} className="lg:col-span-2">
          <Panel
            title="Recent attendance"
            description="Your latest check-ins."
            action={
              <Link href="/attendance" className="text-xs font-medium text-primary hover:underline">
                View all
              </Link>
            }
          >
            {data.recentAttendance.length === 0 ? (
              <EmptyState title="No attendance records" />
            ) : (
              <ul className="space-y-1">
                {data.recentAttendance.map((record) => (
                  <li key={record.id} className="flex items-center justify-between rounded-md px-2 py-2 hover:bg-muted/50">
                    <div className="flex items-center gap-3">
                      <StatusBadge value={record.status} />
                      <span className="text-sm">{formatDate(record.date)}</span>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {record.checkIn ? formatTime(record.checkIn) : "—"} →{" "}
                      {record.checkOut ? formatTime(record.checkOut) : "—"} ·{" "}
                      {record.workingHours !== null ? formatHours(record.workingHours) : "—"}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </motion.div>

        <Panel
          title="Upcoming approved leave"
          action={
            <Link href="/leaves" className="text-xs font-medium text-primary hover:underline">
              View all
            </Link>
          }
        >
          {data.upcomingLeaves.length === 0 ? (
            <EmptyState title="No upcoming leave" description="Enjoy your work days!" />
          ) : (
            <ul className="space-y-3">
              {data.upcomingLeaves.map((l) => (
                <li key={l.id} className="rounded-md border p-3">
                  <div className="flex items-center justify-between">
                    <LeaveTypeBadge type={l.leaveType} />
                    <span className="text-xs text-muted-foreground">{l.days} day(s)</span>
                  </div>
                  <p className="mt-1.5 text-sm">
                    {formatDate(l.startDate)} → {formatDate(l.endDate)}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { isAdmin, loading } = useAuth();

  if (loading) return null;
  return isAdmin ? <AdminDashboard /> : <EmployeeDashboard />;
}
