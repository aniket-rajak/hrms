"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  departmentCreateSchema,
  type DepartmentCreateInput,
  type Department,
} from "@hrms/shared";
import { Plus, Pencil, Trash2, Loader2, Users } from "lucide-react";
import {
  useDepartments,
  useEmployees,
  useCreateDepartment,
  useUpdateDepartment,
  useDeleteDepartment,
} from "@/hooks/use-query-hooks";
import { PageHeader, StatCard } from "@/components/shared/page-header";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { EmptyState, ErrorState } from "@/components/shared/states";
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
import { apiErrorMessage } from "@/lib/api";
import { fullName } from "@/lib/format";
import { toast } from "sonner";

function DepartmentDialog({
  open,
  onOpenChange,
  department,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  department?: Department | null;
}) {
  const { data: employees } = useEmployees({ page: 1, pageSize: 100 });
  const createDepartment = useCreateDepartment();
  const updateDepartment = useUpdateDepartment();

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<DepartmentCreateInput>({
    resolver: zodResolver(departmentCreateSchema),
    defaultValues: {
      name: "",
      code: "",
      description: "",
      headEmployeeId: undefined,
    },
    values: department
      ? {
          name: department.name,
          code: department.code,
          description: department.description ?? "",
          headEmployeeId: department.headEmployeeId ?? undefined,
        }
      : undefined,
  });

  const onSubmit = async (values: DepartmentCreateInput) => {
    try {
      if (department) {
        await updateDepartment.mutateAsync({ id: department.id, input: values });
        toast.success("Department updated");
      } else {
        await createDepartment.mutateAsync(values);
        toast.success("Department created");
      }
      reset();
      onOpenChange(false);
    } catch (err) {
      toast.error(apiErrorMessage(err));
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{department ? "Edit department" : "Create department"}</DialogTitle>
          <DialogDescription>
            {department ? "Update department details." : "Add a new department to your organization."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name *</Label>
            <Input id="name" placeholder="Engineering" {...register("name")} />
            {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="code">Code *</Label>
            <Input id="code" placeholder="ENG" className="uppercase" {...register("code")} />
            {errors.code && <p className="text-xs text-destructive">{errors.code.message}</p>}
          </div>
          <div className="space-y-2">
            <Label>Department head</Label>
            <Select
              value={watch("headEmployeeId") ? String(watch("headEmployeeId")) : "none"}
              onValueChange={(v) => setValue("headEmployeeId", v === "none" ? undefined : v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select an employee" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No head</SelectItem>
                {employees?.items.map((e) => (
                  <SelectItem key={e.id} value={String(e.id)}>
                    {fullName(e.firstName, e.lastName)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea id="description" rows={3} placeholder="What does this team do?" {...register("description")} />
          </div>
          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {department ? "Save changes" : "Create department"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function DepartmentsPage() {
  const { data, isLoading, isError, refetch } = useDepartments();
  const deleteDepartment = useDeleteDepartment();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Department | null>(null);

  const handleDelete = async (id: string, name: string) => {
    try {
      await deleteDepartment.mutateAsync(id);
      toast.success(`Department "${name}" deleted`);
    } catch (err) {
      toast.error(apiErrorMessage(err));
    }
  };

  return (
    <div>
      <PageHeader
        title="Departments"
        description="Organize your company structure."
        actions={
          <Button
            onClick={() => {
              setEditing(null);
              setDialogOpen(true);
            }}
          >
            <Plus className="mr-2 h-4 w-4" /> Create department
          </Button>
        }
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <StatCard
          label="Total departments"
          value={isLoading ? undefined : data?.length ?? 0}
          icon={<Users className="h-5 w-5" />}
          loading={isLoading}
        />
      </div>

      {isLoading && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-36" />
          ))}
        </div>
      )}

      {!isLoading && isError && <ErrorState message="Failed to load departments" onRetry={() => refetch()} />}

      {!isLoading && !isError && (!data || data.length === 0) && (
        <EmptyState
          title="No departments yet"
          description="Create your first department to organize employees."
        />
      )}

      {!isLoading && !isError && data && data.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {data.map((department) => (
            <div key={department.id} className="rounded-lg border bg-card p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="rounded-md bg-primary/10 px-2 py-1 text-xs font-bold text-primary">
                    {department.code}
                  </span>
                  <h3 className="font-semibold">{department.name}</h3>
                </div>
                <div className="flex items-center gap-0.5">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => {
                      setEditing(department);
                      setDialogOpen(true);
                    }}
                    aria-label="Edit department"
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <ConfirmDialog
                    title="Delete department?"
                    description={`"${department.name}" will be deleted. Employees keep their profiles but become unassigned.`}
                    onConfirm={() => handleDelete(department.id, department.name)}
                  >
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" aria-label="Delete department">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </ConfirmDialog>
                </div>
              </div>
              <p className="mt-2 line-clamp-2 min-h-8 text-sm text-muted-foreground">
                {department.description || "No description"}
              </p>
              <div className="mt-3 flex items-center justify-between border-t pt-3 text-sm">
                <span className="flex items-center gap-1.5 text-muted-foreground">
                  <Users className="h-4 w-4" />
                  {department._count?.employees ?? 0} employee(s)
                </span>
                <span className="truncate text-xs text-muted-foreground">
                  Head:{" "}
                  {department.headEmployee
                    ? fullName(department.headEmployee.firstName, department.headEmployee.lastName)
                    : "—"}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      <DepartmentDialog open={dialogOpen} onOpenChange={setDialogOpen} department={editing} />
    </div>
  );
}
