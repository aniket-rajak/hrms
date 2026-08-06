"use client";

import { useParams } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  employeeDocumentSchema,
  type EmployeeDocumentInput,
  type SalaryStructureInput,
  DOCUMENT_TYPES,
  DOCUMENT_TYPE_LABELS,
} from "@hrms/shared";
import {
  Camera,
  Trash2,
  Pencil,
  Upload,
  FileText,
  Loader2,
} from "lucide-react";
import {
  useEmployee,
  useProfileImage,
  useUpsertSalaryStructure,
  useSalaryStructure,
} from "@/hooks/use-query-hooks";
import { PageHeader, Panel } from "@/components/shared/page-header";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { EmptyState, ErrorState } from "@/components/shared/states";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDate, formatMoney, fullName, initials } from "@/lib/format";
import { uploadToCloudinary, uploadDocument } from "@/lib/cloudinary";
import { apiErrorMessage } from "@/lib/api";
import * as employees from "@/services/employee.service";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-4 py-1.5 text-sm">
      <dt className="shrink-0 text-muted-foreground">{label}</dt>
      <dd className="text-right font-medium">{value ?? "—"}</dd>
    </div>
  );
}

function DocumentUpload({ employeeId }: { employeeId: number }) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<EmployeeDocumentInput>({
    resolver: zodResolver(employeeDocumentSchema),
    defaultValues: { title: "", type: "OTHER", fileUrl: "", size: 0 },
  });

  const onSubmit = async (values: EmployeeDocumentInput) => {
    if (!file) {
      toast.error("Please choose a file");
      return;
    }
    setUploading(true);
    try {
      const fileUrl = await uploadDocument(file);
      await employees.addDocument(employeeId, { ...values, fileUrl, size: file.size });
      toast.success("Document uploaded");
      setOpen(false);
      reset();
      setFile(null);
      void qc.invalidateQueries({ queryKey: ["employees", employeeId] });
    } catch (err) {
      toast.error(apiErrorMessage(err));
    } finally {
      setUploading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Upload className="mr-2 h-4 w-4" /> Upload document
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Upload document</DialogTitle>
          <DialogDescription>Contracts, IDs, certificates and other files.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="docTitle">Title *</Label>
            <Input id="docTitle" placeholder="Employment contract" {...register("title")} />
            {errors.title && <p className="text-xs text-destructive">{errors.title.message}</p>}
          </div>
          <div className="space-y-2">
            <Label>Type *</Label>
            <Select value={watch("type")} onValueChange={(v) => setValue("type", v as EmployeeDocumentInput["type"])}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DOCUMENT_TYPES.map((t) => (
                  <SelectItem key={t} value={t}>
                    {DOCUMENT_TYPE_LABELS[t]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>File *</Label>
            <Input type="file" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
            {file && (
              <p className="text-xs text-muted-foreground">
                {file.name} ({(file.size / 1024).toFixed(0)} KB)
              </p>
            )}
          </div>
          <Button type="submit" className="w-full" disabled={uploading}>
            {uploading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Upload
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function monthsSince(dateString: string): string {
  const months = Math.max(0, Math.floor((Date.now() - new Date(dateString).getTime()) / 86400000 / 30.44));
  return `${months} months ago`;
}

function SalarySection({ employeeId, currencySymbol }: { employeeId: number; currencySymbol: string }) {
  const { data: structure, isLoading } = useSalaryStructure(employeeId);
  const upsert = useUpsertSalaryStructure();
  const [open, setOpen] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SalaryStructureInput>({
    defaultValues: {
      basic: structure?.basic ?? 0,
      housing: structure?.housing ?? 0,
      transport: structure?.transport ?? 0,
      medical: structure?.medical ?? 0,
      otherAllowances: structure?.otherAllowances ?? 0,
      deductions: structure?.deductions ?? 0,
    },
    values: structure
      ? {
          basic: structure.basic,
          housing: structure.housing,
          transport: structure.transport,
          medical: structure.medical,
          otherAllowances: structure.otherAllowances,
          deductions: structure.deductions,
        }
      : undefined,
  });

  const onSubmit = async (values: SalaryStructureInput) => {
    try {
      await upsert.mutateAsync({ employeeId, input: values });
      toast.success("Salary structure updated");
      setOpen(false);
    } catch (err) {
      toast.error(apiErrorMessage(err));
    }
  };

  if (isLoading) return <Skeleton className="h-48" />;

  return (
    <Panel
      title="Salary structure"
      action={
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm">
              <Pencil className="mr-2 h-4 w-4" /> Edit
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit salary structure</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              {(
                [
                  ["basic", "Basic salary"],
                  ["housing", "Housing"],
                  ["transport", "Transport"],
                  ["medical", "Medical"],
                  ["otherAllowances", "Other allowances"],
                  ["deductions", "Deductions"],
                ] as [keyof SalaryStructureInput, string][]
              ).map(([key, label]) => (
                <div key={key} className="space-y-2">
                  <Label htmlFor={key}>{label}</Label>
                  <Input id={key} type="number" min={0} step="0.01" {...register(key, { valueAsNumber: true })} />
                  {errors[key] && (
                    <p className="text-xs text-destructive">{errors[key]?.message as string}</p>
                  )}
                </div>
              ))}
              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save structure
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      }
    >
      {!structure ? (
        <EmptyState title="No salary structure" description="This employee has no salary structure yet." />
      ) : (
        <dl className="space-y-1">
          <InfoRow label="Basic" value={formatMoney(structure.basic, currencySymbol)} />
          <InfoRow label="Housing" value={formatMoney(structure.housing, currencySymbol)} />
          <InfoRow label="Transport" value={formatMoney(structure.transport, currencySymbol)} />
          <InfoRow label="Medical" value={formatMoney(structure.medical, currencySymbol)} />
          <InfoRow label="Other allowances" value={formatMoney(structure.otherAllowances, currencySymbol)} />
          <InfoRow label="Deductions" value={`− ${formatMoney(structure.deductions, currencySymbol)}`} />
          <div className="mt-2 border-t pt-2">
            <InfoRow label="Net salary" value={<span className="font-bold">{formatMoney(structure.netSalary, currencySymbol)}</span>} />
          </div>
        </dl>
      )}
    </Panel>
  );
}

export default function EmployeeDetailPage() {
  const params = useParams<{ id: string }>();
  const employeeId = Number(params.id);
  const { data: employee, isLoading, isError, refetch } = useEmployee(employeeId);
  const qc = useQueryClient();
  const profileImage = useProfileImage();

  const deleteDoc = useMutation({
    mutationFn: employees.removeDocument,
    onSuccess: () => {
      toast.success("Document removed");
      void qc.invalidateQueries({ queryKey: ["employees", employeeId] });
    },
    onError: (err) => toast.error(apiErrorMessage(err)),
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32" />
        <div className="grid gap-4 lg:grid-cols-3">
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
        </div>
      </div>
    );
  }

  if (isError || !employee) {
    return <ErrorState message="Employee not found" onRetry={() => refetch()} />;
  }

  const handleAvatarChange = async (file: File) => {
    try {
      const url = await uploadToCloudinary(file);
      await profileImage.mutateAsync({ id: employeeId, url });
      toast.success("Profile picture updated");
    } catch (err) {
      toast.error(apiErrorMessage(err));
    }
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <PageHeader
        title={fullName(employee.firstName, employee.lastName)}
        description={`${employee.employeeCode} · ${employee.designation}`}
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <Panel className="lg:col-span-1">
          <div className="flex flex-col items-center gap-3 pt-2 text-center">
            <div className="relative">
              <Avatar className="h-24 w-24">
                <AvatarImage src={employee.profileImageUrl ?? undefined} />
                <AvatarFallback className="text-2xl">
                  {initials(employee.firstName, employee.lastName)}
                </AvatarFallback>
              </Avatar>
              <label
                className="absolute -bottom-1 -right-1 cursor-pointer rounded-full bg-primary p-1.5 text-primary-foreground hover:bg-primary/90"
                title="Upload profile picture"
              >
                <Camera className="h-4 w-4" />
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) void handleAvatarChange(file);
                  }}
                />
              </label>
            </div>
            <div>
              <h2 className="text-lg font-semibold">{fullName(employee.firstName, employee.lastName)}</h2>
              <p className="text-sm text-muted-foreground">{employee.designation}</p>
              <div className="mt-2 flex items-center justify-center gap-2">
                <StatusBadge value={employee.status} />
                <span className="rounded-full border px-2 py-0.5 text-xs text-muted-foreground">
                  {employee.department?.name ?? "No department"}
                </span>
              </div>
            </div>
          </div>
        </Panel>

        <Panel title="Personal information">
          <dl className="space-y-1">
            <InfoRow label="Email" value={employee.email} />
            <InfoRow label="Phone" value={employee.phone} />
            <InfoRow label="Gender" value={employee.gender.toLowerCase()} />
            <InfoRow label="Date of birth" value={formatDate(employee.dateOfBirth)} />
            <InfoRow
              label="Address"
              value={
                [employee.address, employee.city, employee.state, employee.postalCode, employee.country]
                  .filter(Boolean)
                  .join(", ") || null
              }
            />
          </dl>
        </Panel>

        <Panel title="Employment">
          <dl className="space-y-1">
            <InfoRow label="Employee code" value={employee.employeeCode} />
            <InfoRow label="Department" value={employee.department?.name} />
            <InfoRow label="Designation" value={employee.designation} />
            <InfoRow label="Joining date" value={formatDate(employee.joiningDate)} />
            <InfoRow label="Joined" value={monthsSince(employee.joiningDate)} />
          </dl>
        </Panel>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <SalarySection employeeId={employeeId} currencySymbol="$" />

        <Panel
          title="Documents"
          description="Contracts, certificates and identity documents."
          action={<DocumentUpload employeeId={employeeId} />}
        >
          {(employee.documents ?? []).length === 0 ? (
            <EmptyState title="No documents" description="Upload contracts or certificates." />
          ) : (
            <ul className="space-y-2">
              {(employee.documents ?? []).map((doc) => (
                <li key={doc.id} className="flex items-center gap-3 rounded-md border px-3 py-2">
                  <FileText className="h-4 w-4 shrink-0 text-primary" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{doc.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {DOCUMENT_TYPE_LABELS[doc.type as never] ?? doc.type} ·{" "}
                      {formatDate(doc.createdAt)} · {(doc.size / 1024).toFixed(0)} KB
                    </p>
                  </div>
                  <Button variant="ghost" size="sm" asChild>
                    <a href={doc.fileUrl} target="_blank" rel="noreferrer">
                      Open
                    </a>
                  </Button>
                  <ConfirmDialog
                    title="Remove document?"
                    description={`"${doc.title}" will be permanently deleted.`}
                    onConfirm={() => deleteDoc.mutateAsync(doc.id)}
                  >
                    <Button variant="ghost" size="icon" className="text-destructive">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </ConfirmDialog>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>
    </div>
  );
}
