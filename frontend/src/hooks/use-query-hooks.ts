"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useDebounceValue } from "./use-debounce";
import * as employees from "@/services/employee.service";
import * as hr from "@/services/hr.service";
import * as dashboard from "@/services/dashboard.service";

export function useEmployees(params: {
  page?: number;
  pageSize?: number;
  search?: string;
  departmentId?: number | null;
  status?: string;
}) {
  const query = useQuery({
    queryKey: ["employees", params],
    queryFn: () => employees.listEmployees(params),
  });
  return query;
}

export function useEmployee(id: number) {
  return useQuery({
    queryKey: ["employees", id],
    queryFn: () => employees.getEmployee(id),
    enabled: !!id,
  });
}

export function useMyEmployee() {
  return useQuery({
    queryKey: ["employees", "me"],
    queryFn: () => employees.getMyEmployee(),
  });
}

export function useCreateEmployee() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: Parameters<typeof employees.createEmployee>[0]) => employees.createEmployee(input),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["employees"] });
      void qc.invalidateQueries({ queryKey: ["dashboard"] });
      void qc.invalidateQueries({ queryKey: ["analytics"] });
    },
  });
}

export function useUpdateEmployee() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: number; input: Parameters<typeof employees.updateEmployee>[1] }) =>
      employees.updateEmployee(id, input),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["employees"] });
      void qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}

export function useDeleteEmployee() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => employees.deleteEmployee(id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["employees"] });
      void qc.invalidateQueries({ queryKey: ["dashboard"] });
      void qc.invalidateQueries({ queryKey: ["analytics"] });
    },
  });
}

export function useProfileImage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, url }: { id: number; url: string }) => employees.updateProfileImage(id, url),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["employees"] }),
  });
}

export function useSalaryStructure(employeeId: number) {
  return useQuery({
    queryKey: ["salary-structure", employeeId],
    queryFn: () => employees.getSalaryStructure(employeeId),
    enabled: !!employeeId,
  });
}

export function useUpsertSalaryStructure() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ employeeId, input }: { employeeId: number; input: Parameters<typeof employees.upsertSalaryStructure>[1] }) =>
      employees.upsertSalaryStructure(employeeId, input),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["salary-structure"] }),
  });
}

export function useDepartments() {
  return useQuery({ queryKey: ["departments"], queryFn: employees.listDepartments });
}

export function useCreateDepartment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: employees.createDepartment,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["departments"] });
      void qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}

export function useUpdateDepartment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: number; input: Parameters<typeof employees.updateDepartment>[1] }) =>
      employees.updateDepartment(id, input),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["departments"] }),
  });
}

export function useDeleteDepartment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => employees.deleteDepartment(id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["departments"] });
      void qc.invalidateQueries({ queryKey: ["employees"] });
    },
  });
}

export function useTodayAttendance() {
  return useQuery({ queryKey: ["attendance", "today"], queryFn: hr.getTodayAttendance });
}

export function useCheckIn() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (note?: string) => hr.checkIn(note),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["attendance"] });
      void qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}

export function useCheckOut() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => hr.checkOut(),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["attendance"] });
      void qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}

export function useAttendanceHistory(params: { page?: number; pageSize?: number; month?: number; year?: number }) {
  return useQuery({ queryKey: ["attendance", "history", params], queryFn: () => hr.getAttendanceHistory(params) });
}

export function useMonthlyAttendance(month: number, year: number) {
  return useQuery({
    queryKey: ["attendance", "monthly", month, year],
    queryFn: () => hr.getMonthlyAttendance(month, year),
  });
}

export function useAllAttendance(params: Parameters<typeof hr.getAllAttendance>[0]) {
  return useQuery({ queryKey: ["attendance", "all", params], queryFn: () => hr.getAllAttendance(params) });
}

export function useUpdateAttendance() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: number; input: Parameters<typeof hr.updateAttendance>[1] }) =>
      hr.updateAttendance(id, input),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["attendance"] }),
  });
}

export function useLeaveBalance(year?: number) {
  return useQuery({ queryKey: ["leaves", "balance", year], queryFn: () => hr.getLeaveBalance(year) });
}

export function useMyLeaves(params: { page?: number; pageSize?: number; status?: string }) {
  return useQuery({ queryKey: ["leaves", "mine", params], queryFn: () => hr.getMyLeaves(params) });
}

export function useAllLeaves(params: { page?: number; pageSize?: number; status?: string; search?: string }) {
  return useQuery({ queryKey: ["leaves", "all", params], queryFn: () => hr.getAllLeaves(params) });
}

export function useApplyLeave() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: hr.applyLeave,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["leaves"] });
      void qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}

export function useReviewLeave() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, action, note }: { id: number; action: "approve" | "reject"; note?: string }) =>
      hr.reviewLeave(id, action, note),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["leaves"] });
      void qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}

export function useMyPayrollRecords(params: { page?: number; pageSize?: number }) {
  return useQuery({ queryKey: ["payroll", "mine", params], queryFn: () => hr.getMyPayrollRecords(params) });
}

export function useAllPayrollRecords(params: Parameters<typeof hr.getAllPayrollRecords>[0]) {
  return useQuery({ queryKey: ["payroll", "all", params], queryFn: () => hr.getAllPayrollRecords(params) });
}

export function useMySalaryStructure() {
  return useQuery({ queryKey: ["payroll", "structure", "me"], queryFn: hr.getMySalaryStructure });
}

export function useUpdateMySalaryStructure() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: hr.updateMySalaryStructure,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["payroll", "structure"] });
      void qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}

export function useGeneratePayroll() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: hr.generatePayroll,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["payroll"] });
      void qc.invalidateQueries({ queryKey: ["analytics"] });
    },
  });
}

export function useMarkPaid() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: hr.markPaid,
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["payroll"] }),
  });
}

export function useDeletePayrollRecord() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: hr.deletePayrollRecord,
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["payroll"] }),
  });
}

export function useAdminDashboard() {
  return useQuery({ queryKey: ["dashboard", "admin"], queryFn: dashboard.getAdminDashboard });
}

export function useEmployeeDashboard() {
  return useQuery({ queryKey: ["dashboard", "employee"], queryFn: dashboard.getEmployeeDashboard });
}

export function useAnalyticsSummary() {
  return useQuery({ queryKey: ["analytics", "summary"], queryFn: dashboard.getAnalyticsSummary });
}

export function useAttendanceChart(months = 6) {
  return useQuery({ queryKey: ["analytics", "attendance-chart", months], queryFn: () => dashboard.getAttendanceChart(months) });
}

export function useLeaveStats(year?: number) {
  return useQuery({ queryKey: ["analytics", "leave-stats", year], queryFn: () => dashboard.getLeaveStats(year) });
}

export function useDepartmentDistribution() {
  return useQuery({ queryKey: ["analytics", "departments"], queryFn: dashboard.getDepartmentDistribution });
}

export function useHiringTrend(months = 12) {
  return useQuery({ queryKey: ["analytics", "hiring", months], queryFn: () => dashboard.getHiringTrend(months) });
}

export function usePayrollSummary(year?: number) {
  return useQuery({ queryKey: ["analytics", "payroll", year], queryFn: () => dashboard.getPayrollSummary(year) });
}

export function useActivities(limit = 20) {
  return useQuery({ queryKey: ["activities", limit], queryFn: () => dashboard.getActivities(limit) });
}

export function usePublicSettings() {
  return useQuery({ queryKey: ["settings", "public"], queryFn: dashboard.getPublicSettings });
}

export function useUpdateSettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: dashboard.updateSettings,
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["settings"] }),
  });
}

export function useUpdateCompanyLogo() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: dashboard.updateCompanyLogo,
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["settings"] }),
  });
}

export function useUpdateMyProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: dashboard.updateMyProfile,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["employees", "me"] });
      void qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}

export function useHolidays() {
  return useQuery({ queryKey: ["holidays"], queryFn: dashboard.listHolidays });
}

export function useCreateHoliday() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: dashboard.createHoliday,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["holidays"] });
      void qc.invalidateQueries({ queryKey: ["settings"] });
    },
  });
}

export function useDeleteHoliday() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: dashboard.deleteHoliday,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["holidays"] });
      void qc.invalidateQueries({ queryKey: ["settings"] });
    },
  });
}

export function useDebounced<T>(value: T, delay = 300): T {
  return useDebounceValue(value, delay);
}
