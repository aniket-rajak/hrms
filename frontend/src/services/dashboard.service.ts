import {
  type ApiResponse,
  type AdminDashboardData,
  type EmployeeDashboardData,
  type AnalyticsSummary,
  type AttendanceChartPoint,
  type LeaveStatsPoint,
  type DepartmentDistributionPoint,
  type HiringTrendPoint,
  type PayrollSummary,
  type ActivityDto,
  type SystemSettingsDto,
  type ProfileUpdateInput,
  type SettingsUpdateInput,
  type HolidayDto,
  type HolidayCreateInput,
  type AuthMeResponse,
} from "@hrms/shared";
import { api } from "@/lib/api";

export async function getAdminDashboard(): Promise<AdminDashboardData> {
  const res = await api.get<ApiResponse<AdminDashboardData>>("/dashboard/admin");
  return res.data.data!;
}

export async function getEmployeeDashboard(): Promise<EmployeeDashboardData> {
  const res = await api.get<ApiResponse<EmployeeDashboardData>>("/dashboard/employee");
  return res.data.data!;
}

export async function getAnalyticsSummary(): Promise<AnalyticsSummary> {
  const res = await api.get<ApiResponse<AnalyticsSummary>>("/analytics/summary");
  return res.data.data!;
}

export async function getAttendanceChart(months = 6): Promise<AttendanceChartPoint[]> {
  const res = await api.get<ApiResponse<AttendanceChartPoint[]>>("/analytics/attendance-chart", { params: { months } });
  return res.data.data!;
}

export async function getLeaveStats(year?: number): Promise<LeaveStatsPoint[]> {
  const res = await api.get<ApiResponse<LeaveStatsPoint[]>>("/analytics/leave-stats", { params: { year } });
  return res.data.data!;
}

export async function getDepartmentDistribution(): Promise<DepartmentDistributionPoint[]> {
  const res = await api.get<ApiResponse<DepartmentDistributionPoint[]>>("/analytics/department-distribution");
  return res.data.data!;
}

export async function getHiringTrend(months = 12): Promise<HiringTrendPoint[]> {
  const res = await api.get<ApiResponse<HiringTrendPoint[]>>("/analytics/hiring-trend", { params: { months } });
  return res.data.data!;
}

export async function getPayrollSummary(year?: number): Promise<PayrollSummary> {
  const res = await api.get<ApiResponse<PayrollSummary>>("/analytics/payroll-summary", { params: { year } });
  return res.data.data!;
}

export async function getActivities(limit = 20): Promise<ActivityDto[]> {
  const res = await api.get<ApiResponse<ActivityDto[]>>("/analytics/activities", { params: { limit } });
  return res.data.data!;
}

export async function getPublicSettings(): Promise<SystemSettingsDto> {
  const res = await api.get<ApiResponse<SystemSettingsDto>>("/settings/public");
  return res.data.data!;
}

export async function updateSettings(input: SettingsUpdateInput): Promise<SystemSettingsDto> {
  const res = await api.patch<ApiResponse<SystemSettingsDto>>("/settings", input);
  return res.data.data!;
}

export async function updateCompanyLogo(url: string): Promise<SystemSettingsDto> {
  const res = await api.post<ApiResponse<SystemSettingsDto>>("/settings/company-logo", { companyLogo: url });
  return res.data.data!;
}

export async function updateMyProfile(input: ProfileUpdateInput): Promise<AuthMeResponse["employee"]> {
  const res = await api.patch<ApiResponse<AuthMeResponse["employee"]>>("/settings/profile", input);
  return res.data.data!;
}

export async function listHolidays(): Promise<HolidayDto[]> {
  const res = await api.get<ApiResponse<HolidayDto[]>>("/settings/holidays");
  return res.data.data!;
}

export async function createHoliday(input: HolidayCreateInput): Promise<HolidayDto> {
  const res = await api.post<ApiResponse<HolidayDto>>("/settings/holidays", input);
  return res.data.data!;
}

export async function deleteHoliday(id: string): Promise<void> {
  await api.delete(`/settings/holidays/${id}`);
}
