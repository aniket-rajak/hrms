"use client";

import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { loginSchema, type LoginInput } from "@hrms/shared";
import { useState } from "react";
import Link from "next/link";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/providers/auth-provider";
import { apiErrorMessage } from "@/lib/api";
import { toast } from "sonner";

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  const [role, setRole] = useState<"admin" | "employee" | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const selectRole = (selected: "admin" | "employee") => {
    setRole(selected);
    setValue("email", selected === "admin" ? "admin@hrms.com" : "john.smith@acme.com");
    setValue("password", selected === "admin" ? "Admin@123" : "Welcome@123");
  };

  const onSubmit = async (values: LoginInput) => {
    setError(null);
    try {
      await login(values);
      toast.success("Welcome back!");
      router.replace("/");
    } catch (err) {
      setError(apiErrorMessage(err));
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-xl font-bold text-primary-foreground">
            H
          </div>
          <h1 className="text-2xl font-bold tracking-tight">HRMS</h1>
          <p className="text-sm text-muted-foreground">Sign in to your account</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Welcome back</CardTitle>
            <CardDescription>Use your work credentials to sign in.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="mb-4 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => selectRole("admin")}
                className={`cursor-pointer rounded-lg border px-3 py-2.5 text-left transition-colors ${
                  role === "admin"
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border bg-muted/40 hover:bg-muted"
                }`}
              >
                <span className="block text-sm font-semibold">Administrator</span>
                <span className="block text-xs text-muted-foreground">Full system access</span>
              </button>
              <button
                type="button"
                onClick={() => selectRole("employee")}
                className={`cursor-pointer rounded-lg border px-3 py-2.5 text-left transition-colors ${
                  role === "employee"
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border bg-muted/40 hover:bg-muted"
                }`}
              >
                <span className="block text-sm font-semibold">Employee</span>
                <span className="block text-xs text-muted-foreground">Own data only</span>
              </button>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@company.com"
                  autoComplete="email"
                  {...register("email")}
                />
                {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">Password</Label>
                  <Link href="/forgot-password" className="text-xs text-primary hover:underline">
                    Forgot password?
                  </Link>
                </div>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    autoComplete="current-password"
                    className="pr-9"
                    {...register("password")}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    className="absolute inset-y-0 right-0 flex cursor-pointer items-center pr-2.5 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {errors.password && <p className="text-xs text-destructive">{errors.password.message}</p>}
              </div>

              {error && (
                <div className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</div>
              )}

              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Sign in
              </Button>
            </form>
          </CardContent>
        </Card>

        <p className="mt-4 text-center text-xs text-muted-foreground">
          Demo — select a role above to prefill credentials, or sign in with your work email.
        </p>
      </div>
    </div>
  );
}
