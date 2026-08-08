"use client";

import {
  CreditCard,
  Download,
  Printer,
  Loader2,
  Building,
  Building2,
  CalendarDays,
  BriefcaseBusiness,
} from "lucide-react";
import { useState } from "react";
import { useAuth } from "@/providers/auth-provider";
import { usePublicSettings } from "@/hooks/use-query-hooks";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { formatDate, fullName, initials } from "@/lib/format";
import { downloadPdf, openPdf, apiErrorMessage } from "@/lib/api";
import { myIdCardDownloadUrl, myIdCardPrintUrl } from "@/services/hr.service";
import { toast } from "sonner";

export default function IdCardPage() {
  const { user } = useAuth();
  const { data: settings } = usePublicSettings();
  const [busy, setBusy] = useState<null | "download" | "print">(null);

  const employee = user?.employee;

  if (!employee) {
    return (
      <div>
        <PageHeader title="Employee ID Card" description="Your official company ID card." />
        <p className="text-sm text-muted-foreground">ID cards are available for employee accounts.</p>
      </div>
    );
  }

  const companyName = settings?.companyName ?? "My Company";

  const handleDownload = async () => {
    setBusy("download");
    try {
      await downloadPdf(myIdCardDownloadUrl());
    } catch (err) {
      toast.error(apiErrorMessage(err));
    } finally {
      setBusy(null);
    }
  };

  const handlePrint = async () => {
    setBusy("print");
    try {
      await openPdf(myIdCardPrintUrl());
    } catch (err) {
      toast.error(apiErrorMessage(err));
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title="My ID Card"
        description="Your official company ID card — download or print it."
        actions={
          <>
            <Button variant="outline" onClick={() => void handlePrint()} disabled={busy !== null}>
              {busy === "print" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Printer className="mr-2 h-4 w-4" />}
              Print
            </Button>
            <Button onClick={() => void handleDownload()} disabled={busy !== null}>
              {busy === "download" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
              Download PDF
            </Button>
          </>
        }
      />

      <div className="mx-auto mt-8 w-full max-w-sm overflow-hidden rounded-xl border bg-background shadow-sm">
        <div className="flex items-center justify-between bg-primary px-4 py-2.5">
          <span className="text-xs font-semibold tracking-widest text-primary-foreground">EMPLOYEE ID CARD</span>
          <CreditCard className="h-4 w-4 text-primary-foreground/80" />
        </div>

        <div className="p-4">
          <div className="flex items-center gap-3">
            {settings?.companyLogo ? (
              <img
                src={settings.companyLogo}
                alt={companyName}
                className="h-10 w-10 rounded-full border object-cover"
              />
            ) : (
              <Building className="h-10 w-10 rounded-full bg-muted p-2 text-muted-foreground" />
            )}
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">{companyName}</p>
              <p className="text-xs text-muted-foreground">Official identification</p>
            </div>
          </div>

          <div className="mt-4 flex gap-3">
            <Avatar className="h-20 w-20 rounded-lg">
              <AvatarImage src={employee.profileImageUrl ?? undefined} />
              <AvatarFallback className="text-lg">{initials(employee.firstName, employee.lastName)}</AvatarFallback>
            </Avatar>

            <div className="min-w-0 flex-1 space-y-0.5">
              <p className="truncate font-bold uppercase tracking-wide">
                {fullName(employee.firstName, employee.lastName)}
              </p>
              <p className="font-mono text-xs text-muted-foreground">{employee.employeeCode}</p>

              <div className="mt-2 space-y-1 text-xs">
                <p className="flex items-center gap-1.5 text-muted-foreground">
                  <BriefcaseBusiness className="h-3.5 w-3.5" />
                  <span className="font-medium text-foreground">{employee.designation}</span>
                </p>
                <p className="flex items-center gap-1.5 text-muted-foreground">
                  <Building2 className="h-3.5 w-3.5" />
                  <span className="font-medium text-foreground">{employee.department?.name ?? "—"}</span>
                </p>
                <p className="flex items-center gap-1.5 text-muted-foreground">
                  <CalendarDays className="h-3.5 w-3.5" />
                  <span className="font-medium text-foreground">Joined {formatDate(employee.joiningDate)}</span>
                </p>
              </div>
            </div>
          </div>
        </div>

        <p className="border-t px-4 py-2 text-center text-[11px] text-muted-foreground">
          Valid while employed · {companyName}
        </p>
      </div>
      <p className="mt-4 text-center text-xs text-muted-foreground">
          The printed card carries your photo, employee code and department — keep it safe.
        </p>
    </div>
  );
}