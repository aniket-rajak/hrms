"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { EmployeeForm } from "@/components/forms/employee-form";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { useCreateEmployee } from "@/hooks/use-query-hooks";
import { apiErrorMessage } from "@/lib/api";
import { toast } from "sonner";

export default function NewEmployeePage() {
  const router = useRouter();
  const createEmployee = useCreateEmployee();
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (values: Parameters<typeof createEmployee.mutateAsync>[0]) => {
    setError(null);
    try {
      const employee = await createEmployee.mutateAsync(values);
      toast.success(`Employee ${employee.firstName} ${employee.lastName} created`);
      router.push(`/employees/${employee.id}`);
    } catch (err) {
      setError(apiErrorMessage(err));
    }
  };

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader title="Add employee" description="Create an employee account with salary structure." />
      {error && (
        <div className="mb-4 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</div>
      )}
      <Card>
        <CardContent className="pt-6">
          <EmployeeForm onSubmit={onSubmit} submitting={createEmployee.isPending} />
        </CardContent>
      </Card>
    </div>
  );
}
