import { Badge } from "@/components/ui/badge";
import {
  EMPLOYEE_STATUS_LABELS,
  LEAVE_STATUS_LABELS,
  LEAVE_TYPE_LABELS,
  ATTENDANCE_STATUS_LABELS,
  PAYROLL_STATUS_LABELS,
  type LeaveType,
} from "@hrms/shared";
import { cn } from "@/lib/utils";

type StatusValue = string;

const tone = (value: StatusValue): string => {
  const v = value.toUpperCase();
  if (["ACTIVE", "PRESENT", "APPROVED", "PAID"].includes(v)) {
    return "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20";
  }
  if (["PENDING", "HALF_DAY", "DRAFT", "ON_LEAVE"].includes(v)) {
    return "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20";
  }
  if (["REJECTED", "TERMINATED", "INACTIVE", "ABSENT"].includes(v)) {
    return "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20";
  }
  return "bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20";
};

const labels: Record<string, string> = {
  ...EMPLOYEE_STATUS_LABELS,
  ...LEAVE_STATUS_LABELS,
  ...ATTENDANCE_STATUS_LABELS,
  ...PAYROLL_STATUS_LABELS,
};

export function StatusBadge({ value, className }: { value: string; className?: string }) {
  const label = labels[value as never] ?? value;
  return (
    <Badge variant="outline" className={cn("font-medium capitalize", tone(value), className)}>
      {label}
    </Badge>
  );
}

export function LeaveTypeBadge({ type }: { type: LeaveType }) {
  return <Badge variant="outline">{LEAVE_TYPE_LABELS[type]}</Badge>;
}
