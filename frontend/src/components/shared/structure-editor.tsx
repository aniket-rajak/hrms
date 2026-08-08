"use client";

import { useState } from "react";
import { Pencil, Loader2 } from "lucide-react";
import { useForm } from "react-hook-form";
import {
  useMySalaryStructure,
  useUpdateMySalaryStructure,
} from "@/hooks/use-query-hooks";
import { Panel } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/states";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { formatMoney } from "@/lib/format";
import { apiErrorMessage } from "@/lib/api";
import { toast } from "sonner";

export function StructureEditor() {
  const { data: structure, isLoading } = useMySalaryStructure();
  const updateStructure = useUpdateMySalaryStructure();
  const [open, setOpen] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { isSubmitting },
  } = useForm({
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

  const onSubmit = async (values: Record<string, number>) => {
    try {
      await updateStructure.mutateAsync(values as never);
      toast.success("Salary structure saved");
      setOpen(false);
    } catch (err) {
      toast.error(apiErrorMessage(err));
    }
  };

  if (isLoading) return <Skeleton className="h-48" />;

  return (
    <Panel
      title="My salary structure"
      description="Contact HR if your structure looks wrong."
      action={
        <Dialog open={open} onOpenChange={setOpen}>
          <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
            <Pencil className="mr-2 h-4 w-4" /> Edit
          </Button>
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
                ] as const
              ).map(([key, label]) => (
                <div key={key} className="space-y-2">
                  <Label htmlFor={key}>{label}</Label>
                  <Input id={key} type="number" min={0} step="0.01" {...register(key, { valueAsNumber: true })} />
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
        <EmptyState title="No salary structure" description="Ask your administrator to set one up." />
      ) : (
        <dl className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm sm:grid-cols-3">
          <div>
            <dt className="text-muted-foreground">Basic</dt>
            <dd className="font-medium">{formatMoney(structure.basic)}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Housing</dt>
            <dd className="font-medium">{formatMoney(structure.housing)}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Transport</dt>
            <dd className="font-medium">{formatMoney(structure.transport)}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Medical</dt>
            <dd className="font-medium">{formatMoney(structure.medical)}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Other</dt>
            <dd className="font-medium">{formatMoney(structure.otherAllowances)}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Deductions</dt>
            <dd className="font-medium">− {formatMoney(structure.deductions)}</dd>
          </div>
          <div className="col-span-2 border-t pt-2 sm:col-span-3">
            <div className="flex justify-between text-sm font-bold">
              <span>Net salary</span>
              <span>{formatMoney(structure.netSalary)}</span>
            </div>
          </div>
        </dl>
      )}
    </Panel>
  );
}