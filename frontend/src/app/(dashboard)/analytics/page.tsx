"use client";

import {
  Users,
  Building2,
  CalendarClock,
  CalendarDays,
  Wallet,
  CheckCircle2,
  TrendingUp,
} from "lucide-react";
import {
  useAnalyticsSummary,
  useAttendanceChart,
  useLeaveStats,
  useDepartmentDistribution,
  useHiringTrend,
  usePayrollSummary,
  useActivities,
} from "@/hooks/use-query-hooks";
import { PageHeader, StatCard, Panel } from "@/components/shared/page-header";
import { EmptyState, ErrorState } from "@/components/shared/states";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AttendanceBarChart,
  HiringTrendChart,
  LeavePieChart,
  DepartmentBarChart,
} from "@/components/dashboard/charts";
import { formatDate, formatMoney } from "@/lib/format";

export default function AnalyticsPage() {
  const { data: summary, isLoading: summaryLoading } = useAnalyticsSummary();
  const { data: attendance, isLoading: attendanceLoading } = useAttendanceChart(6);
  const { data: leaveStats, isLoading: leaveLoading } = useLeaveStats();
  const { data: departments, isLoading: deptLoading } = useDepartmentDistribution();
  const { data: hiring, isLoading: hiringLoading } = useHiringTrend(12);
  const { data: payroll, isLoading: payrollLoading } = usePayrollSummary();
  const { data: activities, isLoading: activitiesLoading } = useActivities(15);

  const leavePieData = (leaveStats ?? []).map((l) => ({
    name: l.leaveType,
    value: l.approved,
  }));

  return (
    <div>
      <PageHeader title="Analytics" description="Organizational insights and trends." />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total employees" value={summary?.totalEmployees} icon={<Users className="h-5 w-5" />} loading={summaryLoading} hint={`${summary?.activeEmployees ?? 0} active`} />
        <StatCard label="Departments" value={summary?.totalDepartments} icon={<Building2 className="h-5 w-5" />} accent="info" loading={summaryLoading} />
        <StatCard label="Leaves (year)" value={(summary?.approvedLeaves ?? 0) + (summary?.pendingLeaves ?? 0)} icon={<CalendarDays className="h-5 w-5" />} accent="warning" loading={summaryLoading} hint={`${summary?.pendingLeaves ?? 0} pending`} />
        <StatCard label="Payroll records (month)" value={(summary?.payrollPaidThisMonth ?? 0) + (summary?.payrollDraftThisMonth ?? 0)} icon={<Wallet className="h-5 w-5" />} accent="success" loading={summaryLoading} />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <Panel title="Attendance trend" description="Last 6 months.">
          {attendanceLoading ? <Skeleton className="h-64" /> : <AttendanceBarChart data={attendance ?? []} />}
        </Panel>
        <Panel title="Hiring trend" description="New hires per month, last 12 months.">
          {hiringLoading ? <Skeleton className="h-60" /> : <HiringTrendChart data={hiring ?? []} />}
        </Panel>
        <Panel title="Leave statistics" description={`Approved leave by type · ${new Date().getFullYear()}.`}>
          {leaveLoading ? (
            <Skeleton className="h-60" />
          ) : leavePieData.every((d) => d.value === 0) ? (
            <EmptyState title="No approved leave" />
          ) : (
            <LeavePieChart data={leavePieData} />
          )}
        </Panel>
        <Panel title="Department distribution" description="Employees per department.">
          {deptLoading ? <Skeleton className="h-64" /> : <DepartmentBarChart data={departments ?? []} />}
        </Panel>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Panel title="Payroll summary" description={`Year ${new Date().getFullYear()}.`}>
          {payrollLoading ? (
            <Skeleton className="h-40" />
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between rounded-lg border p-3">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  <span className="text-sm">Paid records</span>
                </div>
                <span className="text-sm font-semibold">{payroll?.paidRecords ?? 0}</span>
              </div>
              <div className="flex items-center justify-between rounded-lg border p-3">
                <div className="flex items-center gap-2">
                  <CalendarClock className="h-4 w-4 text-amber-500" />
                  <span className="text-sm">Draft records</span>
                </div>
                <span className="text-sm font-semibold">{payroll?.draftRecords ?? 0}</span>
              </div>
              <div className="flex items-center justify-between rounded-lg border p-3">
                <div className="flex items-center gap-2">
                  <Wallet className="h-4 w-4 text-primary" />
                  <span className="text-sm">Total paid</span>
                </div>
                <span className="text-sm font-semibold">{formatMoney(payroll?.totalPaid)}</span>
              </div>
              <div className="flex items-center justify-between rounded-lg border p-3">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-sky-500" />
                  <span className="text-sm">Total draft</span>
                </div>
                <span className="text-sm font-semibold">{formatMoney(payroll?.totalDraft)}</span>
              </div>
            </div>
          )}
        </Panel>

        <Panel title="Recent activity" className="lg:col-span-2">
          {activitiesLoading ? (
            <Skeleton className="h-60" />
          ) : activities && activities.length > 0 ? (
            <ul className="space-y-1">
              {activities.map((activity) => (
                <li key={activity.id} className="flex items-start justify-between gap-3 rounded-md px-2 py-2 hover:bg-muted/50">
                  <div className="min-w-0">
                    <p className="truncate text-sm">{activity.message}</p>
                    <p className="text-xs text-muted-foreground">{activity.actorName}</p>
                  </div>
                  <span className="shrink-0 text-xs text-muted-foreground">{formatDate(activity.createdAt)}</span>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState title="No activity yet" />
          )}
        </Panel>
      </div>

      {summary && summary.totalEmployees === 0 && (
        <div className="mt-4">
          <ErrorState message="No data yet — add employees to see analytics." />
        </div>
      )}
    </div>
  );
}
