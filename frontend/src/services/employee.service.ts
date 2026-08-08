import {
  type ApiResponse,
  type Department,
  type DepartmentCreateInput,
  type DepartmentUpdateInput,
  type Employee,
  type EmployeeCreateInput,
  type EmployeeDocumentInput,
  type EmployeeUpdateInput,
  type Paginated,
  type SalaryStructure,
  type SalaryStructureInput,
} from "@hrms/shared";
import { api } from "@/lib/api";

export interface EmployeeListParams {
  page?: number;
  pageSize?: number;
  search?: string;
  departmentId?: string | null;
  status?: string;
}

export async function listEmployees(params: EmployeeListParams = {}): Promise<Paginated<Employee>> {
  const res = await api.get<ApiResponse<Paginated<Employee>>>("/employees", { params });
  return res.data.data!;
}

export async function getEmployee(id: string): Promise<Employee> {
  const res = await api.get<ApiResponse<Employee>>(`/employees/${id}`);
  return res.data.data!;
}

export async function getMyEmployee(): Promise<Employee> {
  const res = await api.get<ApiResponse<Employee>>("/employees/me");
  return res.data.data!;
}

export async function createEmployee(input: EmployeeCreateInput): Promise<Employee> {
  const res = await api.post<ApiResponse<Employee>>("/employees", input);
  return res.data.data!;
}

export async function updateEmployee(id: string, input: EmployeeUpdateInput): Promise<Employee> {
  const res = await api.patch<ApiResponse<Employee>>(`/employees/${id}`, input);
  return res.data.data!;
}

export async function deleteEmployee(id: string): Promise<void> {
  await api.delete(`/employees/${id}`);
}

export async function updateProfileImage(id: string, url: string): Promise<Employee> {
  const res = await api.patch<ApiResponse<Employee>>(`/employees/${id}/profile-image`, { profileImageUrl: url });
  return res.data.data!;
}

export async function getSalaryStructure(employeeId: string): Promise<SalaryStructure> {
  const res = await api.get<ApiResponse<SalaryStructure>>(`/employees/${employeeId}/salary-structure`);
  return res.data.data!;
}

export async function upsertSalaryStructure(employeeId: string, input: SalaryStructureInput): Promise<SalaryStructure> {
  const res = await api.put<ApiResponse<SalaryStructure>>(`/employees/${employeeId}/salary-structure`, input);
  return res.data.data!;
}

export interface EmployeeDocumentDto {
  id: string;
  title: string;
  type: string;
  fileUrl: string;
  size: number;
  createdAt: string;
}

export async function addDocument(employeeId: string, input: EmployeeDocumentInput): Promise<EmployeeDocumentDto> {
  const res = await api.post<ApiResponse<EmployeeDocumentDto>>(`/employees/${employeeId}/documents`, input);
  return res.data.data!;
}

export async function removeDocument(documentId: string): Promise<void> {
  await api.delete(`/employees/documents/${documentId}`);
}

export async function listDepartments(): Promise<Department[]> {
  const res = await api.get<ApiResponse<Department[]>>("/departments");
  return res.data.data!;
}

export async function createDepartment(input: DepartmentCreateInput): Promise<Department> {
  const res = await api.post<ApiResponse<Department>>("/departments", input);
  return res.data.data!;
}

export async function updateDepartment(id: string, input: DepartmentUpdateInput): Promise<Department> {
  const res = await api.patch<ApiResponse<Department>>(`/departments/${id}`, input);
  return res.data.data!;
}

export async function deleteDepartment(id: string): Promise<void> {
  await api.delete(`/departments/${id}`);
}
