"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { settingsUpdateSchema, type SettingsUpdateInput } from "@hrms/shared";
import { Loader2, Plus, Trash2, ImageIcon } from "lucide-react";
import {
  usePublicSettings,
  useUpdateSettings,
  useUpdateCompanyLogo,
  useHolidays,
  useCreateHoliday,
  useDeleteHoliday,
} from "@/hooks/use-query-hooks";
import { PageHeader, Panel } from "@/components/shared/page-header";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { EmptyState } from "@/components/shared/states";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDate } from "@/lib/format";
import { uploadToCloudinary } from "@/lib/cloudinary";
import { apiErrorMessage } from "@/lib/api";
import { toast } from "sonner";

function CompanyForm() {
  const { data: settings, isLoading } = usePublicSettings();
  const updateSettings = useUpdateSettings();
  const updateLogo = useUpdateCompanyLogo();
  const [uploadingLogo, setUploadingLogo] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { isSubmitting },
  } = useForm<SettingsUpdateInput>({
    resolver: zodResolver(settingsUpdateSchema),
    values: settings
      ? {
          companyName: settings.companyName,
          companyEmail: settings.companyEmail,
          companyPhone: settings.companyPhone,
          companyAddress: settings.companyAddress,
          currency: settings.currency,
          currencySymbol: settings.currencySymbol,
          annualLeaveQuota: settings.annualLeaveQuota,
          sickLeaveQuota: settings.sickLeaveQuota,
          casualLeaveQuota: settings.casualLeaveQuota,
        }
      : undefined,
  });

  const onSubmit = async (values: SettingsUpdateInput) => {
    try {
      await updateSettings.mutateAsync(values);
      toast.success("Company settings saved");
    } catch (err) {
      toast.error(apiErrorMessage(err));
    }
  };

  const handleLogo = async (file: File) => {
    setUploadingLogo(true);
    try {
      const url = await uploadToCloudinary(file);
      await updateLogo.mutateAsync(url);
      toast.success("Company logo updated");
    } catch (err) {
      toast.error(apiErrorMessage(err));
    } finally {
      setUploadingLogo(false);
    }
  };

  if (isLoading) return <Skeleton className="h-80" />;

  return (
    <Panel title="Company information" description="Shown on salary slips and the login page.">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="space-y-2">
          <Label>Company logo</Label>
          <div className="flex items-center gap-3">
            {settings?.companyLogo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={settings.companyLogo} alt="Company logo" className="h-12 w-12 rounded-lg border object-cover" />
            ) : (
              <div className="flex h-12 w-12 items-center justify-center rounded-lg border bg-muted">
                <ImageIcon className="h-5 w-5 text-muted-foreground" />
              </div>
            )}
            <label className="cursor-pointer">
              <Button type="button" variant="outline" size="sm" disabled={uploadingLogo}>
                {uploadingLogo ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Upload logo"}
              </Button>
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) void handleLogo(file);
                }}
              />
            </label>
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="companyName">Company name</Label>
            <Input id="companyName" {...register("companyName")} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="companyEmail">Company email</Label>
            <Input id="companyEmail" type="email" {...register("companyEmail")} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="companyPhone">Company phone</Label>
            <Input id="companyPhone" {...register("companyPhone")} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="companyAddress">Company address</Label>
            <Input id="companyAddress" {...register("companyAddress")} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="currency">Currency code</Label>
            <Input id="currency" placeholder="USD" {...register("currency")} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="currencySymbol">Currency symbol</Label>
            <Input id="currencySymbol" placeholder="$" {...register("currencySymbol")} />
          </div>
        </div>
        <div className="border-t pt-4">
          <p className="mb-3 text-sm font-semibold">Default leave quotas (per year)</p>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="annualLeaveQuota">Annual leave</Label>
              <Input id="annualLeaveQuota" type="number" min={0} max={60} {...register("annualLeaveQuota", { valueAsNumber: true })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sickLeaveQuota">Sick leave</Label>
              <Input id="sickLeaveQuota" type="number" min={0} max={60} {...register("sickLeaveQuota", { valueAsNumber: true })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="casualLeaveQuota">Casual leave</Label>
              <Input id="casualLeaveQuota" type="number" min={0} max={60} {...register("casualLeaveQuota", { valueAsNumber: true })} />
            </div>
          </div>
        </div>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Save settings
        </Button>
      </form>
    </Panel>
  );
}

function HolidaysManager() {
  const { data: holidays, isLoading } = useHolidays();
  const createHoliday = useCreateHoliday();
  const deleteHoliday = useDeleteHoliday();
  const [name, setName] = useState("");
  const [date, setDate] = useState("");

  const handleAdd = async () => {
    if (!name.trim() || !date) {
      toast.error("Holiday name and date are required");
      return;
    }
    try {
      await createHoliday.mutateAsync({ name: name.trim(), date });
      toast.success("Holiday added");
      setName("");
      setDate("");
    } catch (err) {
      toast.error(apiErrorMessage(err));
    }
  };

  return (
    <Panel
      title="Holidays"
      description="Public holidays shown to employees."
      action={
        <div className="flex items-center gap-2">
          <Input placeholder="Holiday name" value={name} onChange={(e) => setName(e.target.value)} className="w-40" />
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-36" />
          <Button size="sm" onClick={() => void handleAdd()}>
            <Plus className="mr-1 h-4 w-4" /> Add
          </Button>
        </div>
      }
    >
      {isLoading ? (
        <Skeleton className="h-40" />
      ) : !holidays || holidays.length === 0 ? (
        <EmptyState title="No holidays" description="Add public holidays for your company." />
      ) : (
        <ul className="space-y-2">
          {holidays.map((holiday) => (
            <li key={holiday.id} className="flex items-center justify-between rounded-md border px-3 py-2">
              <div>
                <p className="text-sm font-medium">{holiday.name}</p>
                <p className="text-xs text-muted-foreground">{formatDate(holiday.date)}</p>
              </div>
              <ConfirmDialog
                title="Remove holiday?"
                description={`"${holiday.name}" will be removed.`}
                onConfirm={async () => {
                  await deleteHoliday.mutateAsync(holiday.id);
                  toast.success("Holiday removed");
                }}
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
  );
}

export default function SettingsPage() {
  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <PageHeader title="Settings" description="Company configuration and holidays." />
      <CompanyForm />
      <HolidaysManager />
    </div>
  );
}
