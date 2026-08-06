import {
  type ApiResponse,
  type AttendanceRecordDto,
  type AttendanceSummary,
  type LeaveBalanceDto,
  type LeaveRecordDto,
  type LeaveApplyInput,
  type Paginated,
  type PayrollRecordDto,
  type SalaryStructure,
  type SalaryStructureInput,
  type PayrollGenerateInput,
  type PayrollStatus,
} from "@hrms/shared";
import { api } from "@/lib/api";

export async function checkIn(note?: string): Promise<AttendanceRecordDto> {
  const res = await api.post<ApiResponse<AttendanceRecordDto>>("/attendance/check-in", { note });
  return res.data.data!;
}

export async function checkOut(): Promise<AttendanceRecordDto> {
  const res = await api.post<ApiResponse<AttendanceRecordDto>>("/attendance/check-out");
  return res.data.data!;
}

export async function getTodayAttendance(): Promise<AttendanceRecordDto | null> {
  const res = await api.get<ApiResponse<AttendanceRecordDto | null>>("/attendance/today");
  return res.data.data ?? null;
}

export async function getAttendanceHistory(params: {
  page?: number;
  pageSize?: number;
  month?: number;
  year?: number;
} = {}): Promise<Paginated<AttendanceRecordDto>> {
  const res = await api.get<ApiResponse<Paginated<AttendanceRecordDto>>>("/attendance/history", { params });
  return res.data.data!;
}

export async function getMonthlyAttendance(month: number, year: number): Promise<{
  month: number;
  year: number;
  records: AttendanceRecordDto[];
  summary: AttendanceSummary;
}> {
  const res = await api.get<ApiResponse<{
    month: number;
    year: number;
    records: AttendanceRecordDto[];
    summary: AttendanceSummary;
  }>>("/attendance/monthly", { params: { month, year } });
  return res.data.data!;
}

export async function getAllAttendance(params: {
  page?: number;
  pageSize?: number;
  search?: string;
  month?: number;
  year?: number;
  status?: string;
} = {}): Promise<Paginated<AttendanceRecordDto>> {
  const res = await api.get<ApiResponse<Paginated<AttendanceRecordDto>>>("/attendance/all", { params });
  return res.data.data!;
}

export async function updateAttendance(
  id: number,
  input: Partial<{ date: string; checkIn: string | null; checkOut: string | null; status: string; note: string }>,
): Promise<AttendanceRecordDto> {
  const res = await api.patch<ApiResponse<AttendanceRecordDto>>(`/attendance/${id}`, input);
  return res.data.data!;
}

export async function applyLeave(input: LeaveApplyInput): Promise<LeaveRecordDto> {
  const res = await api.post<ApiResponse<LeaveRecordDto>>("/leaves/apply", input);
  return res.data.data!;
}

export async function getMyLeaves(params: {
  page?: number;
  pageSize?: number;
  status?: string;
} = {}): Promise<Paginated<LeaveRecordDto>> {
  const res = await api.get<ApiResponse<Paginated<LeaveRecordDto>>>("/leaves", { params });
  return res.data.data!;
}

export async function getAllLeaves(params: {
  page?: number;
  pageSize?: number;
  status?: string;
  search?: string;
} = {}): Promise<Paginated<LeaveRecordDto>> {
  const res = await api.get<ApiResponse<Paginated<LeaveRecordDto>>>("/leaves/all", { params });
  return res.data.data!;
}

export async function getLeaveBalance(year?: number): Promise<LeaveBalanceDto[]> {
  const res = await api.get<ApiResponse<LeaveBalanceDto[]>>("/leaves/balance", { params: { year } });
  return res.data.data!;
}

export async function reviewLeave(
  id: number,
  action: "approve" | "reject",
  note?: string,
): Promise<{ id: number; status: string }> {
  const res = await api.patch<ApiResponse<{ id: number; status: string }>>(`/leaves/${id}/${action}`, { note });
  return res.data.data!;
}

export async function getMyPayrollRecords(params: { page?: number; pageSize?: number } = {}): Promise<Paginated<PayrollRecordDto>> {
  const res = await api.get<ApiResponse<Paginated<PayrollRecordDto>>>("/payroll/records/me", { params });
  return res.data.data!;
}

export async function getAllPayrollRecords(params: {
  page?: number;
  pageSize?: number;
  month?: number;
  year?: number;
  status?: PayrollStatus;
  search?: string;
} = {}): Promise<Paginated<PayrollRecordDto>> {
  const res = await api.get<ApiResponse<Paginated<PayrollRecordDto>>>("/payroll/records", { params });
  return res.data.data!;
}

export async function getMySalaryStructure(): Promise<SalaryStructure> {
  const res = await api.get<ApiResponse<SalaryStructure>>("/payroll/structure/me");
  return res.data.data!;
}

export async function updateMySalaryStructure(input: SalaryStructureInput): Promise<SalaryStructure> {
  const res = await api.put<ApiResponse<SalaryStructure>>("/payroll/structure/me", input);
  return res.data.data!;
}

export async function generatePayroll(input: PayrollGenerateInput): Promise<{ created: number }> {
  const res = await api.post<ApiResponse<{ created: number }>>("/payroll/records/generate", input);
  return res.data.data!;
}

export async function markPaid(id: number): Promise<PayrollRecordDto> {
  const res = await api.patch<ApiResponse<PayrollRecordDto>>(`/payroll/records/${id}/paid`);
  return res.data.data!;
}

export async function deletePayrollRecord(id: number): Promise<void> {
  await api.delete(`/payroll/records/${id}`);
}

export function slipDownloadUrl(id: number): string {
  return `${api.defaults.baseURL}/payroll/records/${id}/slip`;
}
