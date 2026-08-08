"use client";

import { useState } from "react";
import Link from "next/link";
import { Plus, Search, Pencil, Trash2 } from "lucide-react";
import { useEmployees, useDepartments, useDeleteEmployee } from "@/hooks/use-query-hooks";
import { PageHeader } from "@/components/shared/page-header";
import { Pagination } from "@/components/shared/pagination";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { EmptyState, ErrorState } from "@/components/shared/states";
import { StatusBadge } from "@/components/shared/status-badge";
import { PasswordReveal } from "@/components/shared/password-reveal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { useDebounced } from "@/hooks/use-query-hooks";
import { EMPLOYEE_STATUSES, EMPLOYEE_STATUS_LABELS, type Employee } from "@hrms/shared";
import { formatDate, fullName, initials } from "@/lib/format";
import { apiErrorMessage } from "@/lib/api";
import { toast } from "sonner";

export default function EmployeesPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [departmentId, setDepartmentId] = useState<string>("all");
  const [status, setStatus] = useState<string>("all");
  const debouncedSearch = useDebounced(search, 300);

  const { data, isLoading, isError, refetch } = useEmployees({
    page,
    pageSize: 10,
    search: debouncedSearch || undefined,
    departmentId: departmentId === "all" ? null : departmentId,
    status: status === "all" ? undefined : status,
  });

  const { data: departments } = useDepartments();
  const deleteEmployee = useDeleteEmployee();

  const handleDelete = async (id: string) => {
    try {
      await deleteEmployee.mutateAsync(id);
      toast.success("Employee deleted");
    } catch (err) {
      toast.error(apiErrorMessage(err));
    }
  };

  return (
    <div>
      <PageHeader
        title="Employees"
        description="Manage your workforce."
        actions={
          <Button asChild>
            <Link href="/employees/new">
              <Plus className="mr-2 h-4 w-4" /> Add employee
            </Link>
          </Button>
        }
      />

      <div className="mb-4 flex flex-col gap-3 sm:flex-row">
        <div className="relative sm:max-w-xs">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search name, email, code…"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="pl-9"
          />
        </div>
        <Select
          value={departmentId}
          onValueChange={(v) => {
            setDepartmentId(v);
            setPage(1);
          }}
        >
          <SelectTrigger className="sm:w-48">
            <SelectValue placeholder="Department" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All departments</SelectItem>
            {departments?.map((d) => (
              <SelectItem key={d.id} value={String(d.id)}>
                {d.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
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
            {EMPLOYEE_STATUSES.map((s) => (
              <SelectItem key={s} value={s}>
                {EMPLOYEE_STATUS_LABELS[s]}
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
              <TableHead className="hidden md:table-cell">Department</TableHead>
              <TableHead className="hidden sm:table-cell">Designation</TableHead>
              <TableHead className="hidden lg:table-cell">User ID & Password</TableHead>
              <TableHead className="hidden lg:table-cell">Joining date</TableHead>
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
                  <ErrorState message="Failed to load employees" onRetry={() => refetch()} />
                </TableCell>
              </TableRow>
            )}

            {!isLoading && !isError && data?.items.length === 0 && (
              <TableRow>
                <TableCell colSpan={7}>
                  <EmptyState
                    title="No employees found"
                    description="Try adjusting your search or add a new employee."
                    icon="search"
                  />
                </TableCell>
              </TableRow>
            )}

            {!isLoading &&
              !isError &&
              data?.items.map((employee: Employee) => (
                <TableRow key={employee.id}>
                  <TableCell>
                    <Link href={`/employees/${employee.id}`} className="flex items-center gap-3">
                      <Avatar className="h-9 w-9">
                        <AvatarImage src={employee.profileImageUrl ?? undefined} />
                        <AvatarFallback>{initials(employee.firstName, employee.lastName)}</AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium hover:text-primary">
                          {fullName(employee.firstName, employee.lastName)}
                        </p>
                        <p className="truncate text-xs text-muted-foreground">
                          {employee.employeeCode} · {employee.email}
                        </p>
                      </div>
                    </Link>
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    {employee.department?.name ?? "—"}
                  </TableCell>
                  <TableCell className="hidden sm:table-cell">{employee.designation}</TableCell>
                  <TableCell className="hidden lg:table-cell">
                    <div className="flex items-start gap-2">
                      <span className="max-w-36 truncate font-mono text-xs">{employee.email}</span>
                      <PasswordReveal value={employee.credentialPassword} />
                    </div>
                  </TableCell>
                  <TableCell className="hidden lg:table-cell">{formatDate(employee.joiningDate)}</TableCell>
                  <TableCell>
                    <StatusBadge value={employee.status} />
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button variant="ghost" size="icon" asChild>
                        <Link href={`/employees/${employee.id}`} aria-label="Edit employee">
                          <Pencil className="h-4 w-4" />
                        </Link>
                      </Button>
                      <ConfirmDialog
                        title="Delete employee?"
                        description={`${fullName(employee.firstName, employee.lastName)} and their account will be permanently removed.`}
                        onConfirm={() => handleDelete(employee.id)}
                      >
                        <Button variant="ghost" size="icon" className="text-destructive" aria-label="Delete employee">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </ConfirmDialog>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
          </TableBody>
        </Table>
      </div>

      {data && data.totalPages > 1 && (
        <Pagination
          className="mt-4"
          page={page}
          totalPages={data.totalPages}
          total={data.total}
          onPageChange={setPage}
        />
      )}
    </div>
  );
}
