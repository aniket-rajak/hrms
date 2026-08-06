import type { ReactNode } from "react";
import { AuthProvider } from "@/providers/auth-provider";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      <main className="relative flex min-h-screen items-center justify-center bg-background px-4 py-10">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,hsl(var(--primary)/0.08),transparent_55%)]" />
        <div className="relative w-full max-w-md">{children}</div>
      </main>
    </AuthProvider>
  );
}
