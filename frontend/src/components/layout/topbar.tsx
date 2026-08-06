"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Menu, Moon, Sun, LogOut, ChevronDown } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/providers/auth-provider";
import { initials, fullName } from "@/lib/format";
import { toast } from "sonner";

const BREADCRUMB_LABELS: Record<string, string> = {
  "": "Dashboard",
  employees: "Employees",
  departments: "Departments",
  attendance: "Attendance",
  leaves: "Leave",
  payroll: "Payroll",
  analytics: "Analytics",
  settings: "Settings",
  profile: "My Profile",
  manage: "Manage",
  new: "New",
  slips: "Salary Slips",
};

function Breadcrumbs() {
  const pathname = usePathname();
  const segments = pathname.split("/").filter(Boolean);

  const crumbs = segments.length === 0
    ? [{ href: "/", label: "Dashboard" }]
    : [
        { href: "/", label: "Dashboard" },
        ...segments.map((segment, index) => ({
          href: `/${segments.slice(0, index + 1).join("/")}`,
          label: BREADCRUMB_LABELS[segment] ?? decodeURIComponent(segment),
        })),
      ];

  return (
    <nav aria-label="Breadcrumb" className="hidden items-center gap-1 text-sm text-muted-foreground sm:flex">
      {crumbs.map((crumb, index) => (
        <span key={crumb.href} className="flex items-center gap-1">
          {index > 0 && <span className="text-muted-foreground/50">/</span>}
          {index === crumbs.length - 1 ? (
            <span className="font-medium text-foreground">{crumb.label}</span>
          ) : (
            <a href={crumb.href} className="hover:text-foreground">
              {crumb.label}
            </a>
          )}
        </span>
      ))}
    </nav>
  );
}

function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const id = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(id);
  }, []);

  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label="Toggle theme"
      onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
    >
      {mounted && theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </Button>
  );
}

function UserMenu() {
  const router = useRouter();
  const { user, isAdmin, logout } = useAuth();
  const employee = user?.employee;
  const displayName = employee ? fullName(employee.firstName, employee.lastName) : user?.user.email ?? "Account";
  const avatarUrl = employee?.profileImageUrl ?? undefined;
  const fallback = employee ? initials(employee.firstName, employee.lastName) : "A";

  const handleLogout = async () => {
    await logout();
    toast.success("Signed out");
    router.replace("/login");
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="flex items-center gap-2 px-2">
          <Avatar className="h-8 w-8">
            <AvatarImage src={avatarUrl} alt={displayName} />
            <AvatarFallback>{fallback}</AvatarFallback>
          </Avatar>
          <span className="hidden max-w-[160px] truncate text-sm font-medium md:block">{displayName}</span>
          <ChevronDown className="hidden h-4 w-4 text-muted-foreground md:block" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>
          <p className="truncate text-sm font-medium">{displayName}</p>
          <p className="truncate text-xs font-normal text-muted-foreground">{user?.user.email}</p>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => router.push("/settings/profile")}>My Profile</DropdownMenuItem>
        {isAdmin && <DropdownMenuItem onClick={() => router.push("/settings")}>Settings</DropdownMenuItem>}
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleLogout} className="text-destructive focus:text-destructive">
          <LogOut className="mr-2 h-4 w-4" />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function Topbar({ onMenuClick }: { onMenuClick: () => void }) {
  return (
    <header className="sticky top-0 z-40 flex h-14 items-center gap-3 border-b bg-background/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <Button variant="ghost" size="icon" className="lg:hidden" onClick={onMenuClick} aria-label="Open menu">
        <Menu className="h-5 w-5" />
      </Button>
      <Breadcrumbs />
      <div className="ml-auto flex items-center gap-1">
        <ThemeToggle />
        <UserMenu />
      </div>
    </header>
  );
}
