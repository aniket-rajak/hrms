"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  employeeCreateSchema,
  type EmployeeCreateInput,
  EMPLOYEE_STATUSES,
  GENDERS,
  GENDER_LABELS,
  EMPLOYEE_STATUS_LABELS,
} from "@hrms/shared";
import { Loader2, Eye, EyeOff } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useDepartments } from "@/hooks/use-query-hooks";

type EmployeeFormValues = EmployeeCreateInput;

export function EmployeeForm({
  defaultValues,
  onSubmit,
  submitting,
  submitLabel = "Create employee",
}: {
  defaultValues?: Partial<EmployeeFormValues>;
  onSubmit: (values: EmployeeFormValues) => Promise<void> | void;
  submitting?: boolean;
  submitLabel?: string;
}) {
  const { data: departments } = useDepartments();
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<EmployeeFormValues>({
    resolver: zodResolver(employeeCreateSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      gender: "MALE",
      dateOfBirth: null,
      address: "",
      city: "",
      state: "",
      postalCode: "",
      country: "",
      designation: "",
      joiningDate: "",
      status: "ACTIVE",
      departmentId: undefined,
      password: "",
      basic: 0,
      housing: 0,
      transport: 0,
      medical: 0,
      otherAllowances: 0,
      deductions: 0,
      ...defaultValues,
    },
  });

  const gender = watch("gender");
  const status = watch("status");

  const sectionTitle = "mt-8 mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground";

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="space-y-2">
          <Label htmlFor="firstName">First name *</Label>
          <Input id="firstName" placeholder="John" {...register("firstName")} />
          {errors.firstName && <p className="text-xs text-destructive">{errors.firstName.message}</p>}
        </div>
        <div className="space-y-2">
          <Label htmlFor="lastName">Last name *</Label>
          <Input id="lastName" placeholder="Smith" {...register("lastName")} />
          {errors.lastName && <p className="text-xs text-destructive">{errors.lastName.message}</p>}
        </div>
        <div className="space-y-2">
          <Label htmlFor="email">Email *</Label>
          <Input id="email" type="email" placeholder="john@company.com" {...register("email")} />
          {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
        </div>
        <div className="space-y-2">
          <Label htmlFor="phone">Phone</Label>
          <Input id="phone" placeholder="+1 555 0100" {...register("phone")} />
        </div>
        <div className="space-y-2">
          <Label>Gender *</Label>
          <Select value={gender} onValueChange={(v) => setValue("gender", v as EmployeeFormValues["gender"])}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {GENDERS.map((g) => (
                <SelectItem key={g} value={g}>
                  {GENDER_LABELS[g]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="dateOfBirth">Date of birth</Label>
          <Input id="dateOfBirth" type="date" {...register("dateOfBirth")} />
        </div>
      </div>

      <div className={sectionTitle}>Employment</div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="space-y-2">
          <Label htmlFor="designation">Designation *</Label>
          <Input id="designation" placeholder="Software Engineer" {...register("designation")} />
          {errors.designation && <p className="text-xs text-destructive">{errors.designation.message}</p>}
        </div>
        <div className="space-y-2">
          <Label htmlFor="joiningDate">Joining date *</Label>
          <Input id="joiningDate" type="date" {...register("joiningDate")} />
          {errors.joiningDate && <p className="text-xs text-destructive">{errors.joiningDate.message}</p>}
        </div>
        <div className="space-y-2">
          <Label>Department</Label>
          <Select
            value={watch("departmentId") ? String(watch("departmentId")) : "none"}
            onValueChange={(v) => setValue("departmentId", v === "none" ? undefined : v)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select department" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">No department</SelectItem>
              {departments?.map((d) => (
                <SelectItem key={d.id} value={String(d.id)}>
                  {d.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Status *</Label>
          <Select value={status} onValueChange={(v) => setValue("status", v as EmployeeFormValues["status"])}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {EMPLOYEE_STATUSES.map((s) => (
                <SelectItem key={s} value={s}>
                  {EMPLOYEE_STATUS_LABELS[s]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className={sectionTitle}>Login credentials</div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="space-y-2">
          <Label htmlFor="password">Temporary password *</Label>
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              placeholder="Set a starting password (min 8 chars)"
              autoComplete="new-password"
              className="pr-10"
              {...register("password")}
            />
            <Button
              type="button"
              variant="ghost"
              size="icon-xs"
              className="absolute right-1 top-1/2 -translate-y-1/2"
              aria-label={showPassword ? "Hide password" : "Show password"}
              onClick={() => setShowPassword((s) => !s)}
            >
              {showPassword ? <EyeOff /> : <Eye />}
            </Button>
          </div>
          {errors.password && <p className="text-xs text-destructive">{errors.password.message}</p>}
        </div>
        <p className="flex items-end pb-1 text-xs text-muted-foreground">
          The employee uses this password to sign in — give it to them securely.
        </p>
      </div>

      <div className={sectionTitle}>Salary structure</div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="space-y-2">
          <Label htmlFor="basic">Basic salary *</Label>
          <Input id="basic" type="number" min={0} step="0.01" {...register("basic", { valueAsNumber: true })} />
          {errors.basic && <p className="text-xs text-destructive">{errors.basic.message}</p>}
        </div>
        <div className="space-y-2">
          <Label htmlFor="housing">Housing allowance</Label>
          <Input id="housing" type="number" min={0} step="0.01" {...register("housing", { valueAsNumber: true })} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="transport">Transport allowance</Label>
          <Input id="transport" type="number" min={0} step="0.01" {...register("transport", { valueAsNumber: true })} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="medical">Medical allowance</Label>
          <Input id="medical" type="number" min={0} step="0.01" {...register("medical", { valueAsNumber: true })} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="otherAllowances">Other allowances</Label>
          <Input id="otherAllowances" type="number" min={0} step="0.01" {...register("otherAllowances", { valueAsNumber: true })} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="deductions">Deductions</Label>
          <Input id="deductions" type="number" min={0} step="0.01" {...register("deductions", { valueAsNumber: true })} />
        </div>
      </div>

      <div className={sectionTitle}>Address</div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="address">Address</Label>
          <Textarea id="address" placeholder="Street, building" rows={2} {...register("address")} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="city">City</Label>
          <Input id="city" placeholder="New York" {...register("city")} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="state">State</Label>
          <Input id="state" placeholder="NY" {...register("state")} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="postalCode">Postal code</Label>
          <Input id="postalCode" placeholder="10001" {...register("postalCode")} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="country">Country</Label>
          <Input id="country" placeholder="United States" {...register("country")} />
        </div>
      </div>

      <div className="flex items-center justify-end gap-3 border-t pt-4">
        <Button type="submit" disabled={submitting}>
          {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}
