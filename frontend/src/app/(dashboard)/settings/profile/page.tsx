"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  changePasswordSchema,
  type ChangePasswordInput,
} from "@hrms/shared";
import { Camera, Loader2, KeyRound } from "lucide-react";
import { useAuth } from "@/providers/auth-provider";
import { PasswordReveal } from "@/components/shared/password-reveal";
import { useUpdateMyProfile } from "@/hooks/use-query-hooks";
import { PageHeader, Panel } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatDate, fullName, initials } from "@/lib/format";
import { uploadToCloudinary } from "@/lib/cloudinary";
import { apiErrorMessage } from "@/lib/api";
import * as authService from "@/services/auth.service";
import { toast } from "sonner";
import { GENDERS, GENDER_LABELS } from "@hrms/shared";

function ProfileForm() {
  const { user, refreshMe } = useAuth();
  const updateProfile = useUpdateMyProfile();
  const employee = user?.employee;

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { isSubmitting },
  } = useForm({
    values: employee
      ? {
          firstName: employee.firstName,
          lastName: employee.lastName,
          phone: employee.phone ?? "",
          gender: employee.gender,
          dateOfBirth: employee.dateOfBirth ? employee.dateOfBirth.slice(0, 10) : "",
          address: employee.address ?? "",
          city: employee.city ?? "",
          state: employee.state ?? "",
          postalCode: employee.postalCode ?? "",
          country: employee.country ?? "",
        }
      : undefined,
  });

  const onSubmit = async (values: Record<string, unknown>) => {
    try {
      await updateProfile.mutateAsync({
        firstName: values.firstName as string,
        lastName: values.lastName as string,
        phone: (values.phone as string) || null,
        gender: values.gender as never,
        dateOfBirth: (values.dateOfBirth as string) || null,
        address: (values.address as string) || null,
        city: (values.city as string) || null,
        state: (values.state as string) || null,
        postalCode: (values.postalCode as string) || null,
        country: (values.country as string) || null,
      });
      await refreshMe();
      toast.success("Profile updated");
    } catch (err) {
      toast.error(apiErrorMessage(err));
    }
  };

  const handleAvatar = async (file: File) => {
    try {
      const url = await uploadToCloudinary(file);
      await updateProfile.mutateAsync({ profileImageUrl: url });
      await refreshMe();
      toast.success("Profile picture updated");
    } catch (err) {
      toast.error(apiErrorMessage(err));
    }
  };

  if (!employee) {
    return (
      <Panel title="Profile">
        <p className="text-sm text-muted-foreground">Profile editing is available for employee accounts.</p>
      </Panel>
    );
  }

  return (
    <Panel title="Profile information" description="Update your personal details.">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="flex items-center gap-4">
          <div className="relative">
            <Avatar className="h-16 w-16">
              <AvatarImage src={employee.profileImageUrl ?? undefined} />
              <AvatarFallback>{initials(employee.firstName, employee.lastName)}</AvatarFallback>
            </Avatar>
            <label
              className="absolute -bottom-1 -right-1 cursor-pointer rounded-full bg-primary p-1 text-primary-foreground hover:bg-primary/90"
              title="Change profile picture"
            >
              <Camera className="h-3.5 w-3.5" />
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) void handleAvatar(file);
                }}
              />
            </label>
          </div>
          <div>
            <p className="font-semibold">{fullName(employee.firstName, employee.lastName)}</p>
            <p className="text-sm text-muted-foreground">
              {employee.employeeCode} · Joined {formatDate(employee.joiningDate)}
            </p>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="firstName">First name</Label>
            <Input id="firstName" {...register("firstName")} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="lastName">Last name</Label>
            <Input id="lastName" {...register("lastName")} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone">Phone</Label>
            <Input id="phone" {...register("phone")} />
          </div>
          <div className="space-y-2">
            <Label>Gender</Label>
            <Select value={watch("gender")} onValueChange={(v) => setValue("gender", v as never)}>
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
          <div className="space-y-2">
            <Label htmlFor="city">City</Label>
            <Input id="city" {...register("city")} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="state">State</Label>
            <Input id="state" {...register("state")} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="postalCode">Postal code</Label>
            <Input id="postalCode" {...register("postalCode")} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="country">Country</Label>
            <Input id="country" {...register("country")} />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="address">Address</Label>
            <Input id="address" {...register("address")} />
          </div>
        </div>

        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Save profile
        </Button>
      </form>
    </Panel>
  );
}

function ChangePassword() {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ChangePasswordInput>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: { currentPassword: "", newPassword: "" },
  });

  const onSubmit = async (values: ChangePasswordInput) => {
    try {
      await authService.changePassword(values);
      toast.success("Password changed. Please sign in again.");
      reset();
      window.location.assign("/login");
    } catch (err) {
      toast.error(apiErrorMessage(err));
    }
  };

  return (
    <Panel title="Change password" description="You will be signed out after changing your password.">
      <form onSubmit={handleSubmit(onSubmit)} className="max-w-sm space-y-4">
        <div className="space-y-2">
          <Label htmlFor="currentPassword">Current password</Label>
          <Input id="currentPassword" type="password" autoComplete="current-password" {...register("currentPassword")} />
          {errors.currentPassword && <p className="text-xs text-destructive">{errors.currentPassword.message}</p>}
        </div>
        <div className="space-y-2">
          <Label htmlFor="newPassword">New password</Label>
          <Input id="newPassword" type="password" autoComplete="new-password" {...register("newPassword")} />
          {errors.newPassword && <p className="text-xs text-destructive">{errors.newPassword.message}</p>}
        </div>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <KeyRound className="mr-2 h-4 w-4" />}
          Change password
        </Button>
      </form>
    </Panel>
  );
}

function MyCredentials() {
  const { user } = useAuth();
  const employee = user?.employee;

  if (!employee) return null;

  return (
    <Panel title="My credentials" description="Your sign-in details. Keep them safe.">
      <dl className="space-y-1">
        <div className="flex justify-between gap-4 py-1.5 text-sm">
          <dt className="shrink-0 text-muted-foreground">User ID</dt>
          <dd className="text-right font-medium">
            <span className="font-mono">{user?.user.email}</span>
          </dd>
        </div>
        <div className="flex justify-between gap-4 py-1.5 text-sm">
          <dt className="shrink-0 text-muted-foreground">Password</dt>
          <dd className="flex items-center justify-end font-medium">
            <PasswordReveal value={employee.credentialPassword} />
          </dd>
        </div>
      </dl>
    </Panel>
  );
}

export default function ProfilePage() {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader title="My Profile" description="Manage your account details." />
      <ProfileForm />
      <MyCredentials />
      <ChangePassword />
    </div>
  );
}
