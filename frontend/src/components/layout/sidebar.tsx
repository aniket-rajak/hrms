"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import {
  Users,
  Building2,
  CalendarCheck,
  CalendarDays,
  Wallet,
  BarChart3,
  Settings,
  UserCircle,
  LayoutDashboard,
  CreditCard,
  ReceiptText,
  type LucideIcon,
} from "lucide-react";
import { useAuth } from "@/providers/auth-provider";
import { cn } from "@/lib/utils";

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  adminOnly?: boolean;
  employeeOnly?: boolean;
  exact?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { href: "/employees", label: "Employees", icon: Users, adminOnly: true },
  { href: "/departments", label: "Departments", icon: Building2, adminOnly: true },
  { href: "/attendance", label: "Attendance", icon: CalendarCheck },
  { href: "/leaves", label: "Leave", icon: CalendarDays },
  { href: "/payslips", label: "Payslips", icon: ReceiptText, employeeOnly: true },
  { href: "/id-card", label: "ID Card", icon: CreditCard, employeeOnly: true },
  { href: "/payroll/manage", label: "Payroll", icon: Wallet, adminOnly: true },
  { href: "/analytics", label: "Analytics", icon: BarChart3, adminOnly: true },
  { href: "/settings", label: "Settings", icon: Settings, adminOnly: true },
  { href: "/settings/profile", label: "My Profile", icon: UserCircle, employeeOnly: true },
];

interface SidebarProps {
  open: boolean;
  onClose: () => void;
}

function SidebarContent({ onNavigate }: { onNavigate: () => void }) {
  const pathname = usePathname();
  const { user, isAdmin } = useAuth();

  const items = NAV_ITEMS.filter((item) => {
    if (item.adminOnly) return isAdmin;
    if (item.employeeOnly) return !isAdmin;
    return true;
  });

  return (
    <div className="flex h-full flex-col gap-2 px-3 py-4">
      <div className="flex items-center gap-2.5 px-2 pb-6">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground text-lg font-bold">
          H
        </div>
        <div className="leading-tight">
          <p className="text-sm font-semibold">HRMS</p>
          <p className="text-xs text-muted-foreground">Management System</p>
        </div>
      </div>

      <nav className="flex-1 space-y-1">
        {items.map((item) => {
          const active = item.exact ? pathname === item.href : pathname.startsWith(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                active
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="rounded-lg border bg-muted/50 px-3 py-2.5">
        <p className="text-xs font-medium text-foreground">{user?.user.email}</p>
        <p className="text-xs text-muted-foreground capitalize">{user?.user.role.toLowerCase()} account</p>
      </div>
    </div>
  );
}

export function Sidebar({ open, onClose }: SidebarProps) {
  return (
    <>
      <aside className="hidden w-64 shrink-0 border-r bg-sidebar lg:block">
        <SidebarContent onNavigate={() => undefined} />
      </aside>

      <div
        className={cn(
          "fixed inset-0 z-50 bg-black/50 backdrop-blur-sm lg:hidden",
          open ? "block" : "hidden",
        )}
        onClick={onClose}
        aria-hidden="true"
      />
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-64 border-r bg-sidebar transition-transform duration-200 lg:hidden",
          open ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <SidebarContent onNavigate={onClose} />
      </aside>
    </>
  );
}
