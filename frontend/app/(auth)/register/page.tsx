"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Button,
  Input,
  Select,
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
  toast,
} from "@/components/ui";
import { registerSchema, type RegisterInput } from "@/lib/validations/auth";
import { registerUser, ApiError } from "@/lib/api/auth";

export default function RegisterPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    setError,
    watch,
  } = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      role: "worker",
    },
  });

  const selectedRole = watch("role");

  const onSubmit = async (data: RegisterInput) => {
    setIsLoading(true);

    try {
      const result = await registerUser(data);

      if (result.success && result.data) {
        toast.success("Registration successful!", {
          description: `Welcome to GigStream, ${result.data.user.name}!`,
        });

        // Show wallet creation success for workers
        if (result.data.user.role === "worker" && result.data.user.walletAddress) {
          toast.info("Wallet created", {
            description: "Your blockchain wallet has been created automatically.",
          });
        }

        // Redirect based on role
        const redirectPath =
          result.data.user.role === "worker"
            ? "/dashboard"
            : "/platform/dashboard";

        router.push(redirectPath);
      } else {
        throw new Error(result.message || "Registration failed");
      }
    } catch (error) {
      if (error instanceof ApiError) {
        // Handle specific field errors
        if (error.errors) {
          Object.entries(error.errors).forEach(([field, messages]) => {
            setError(field as keyof RegisterInput, {
              message: messages[0],
            });
          });
        } else {
          toast.error("Registration failed", {
            description: error.message,
          });
        }
      } else {
        toast.error("Registration failed", {
          description: "An unexpected error occurred. Please try again.",
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4 py-12">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center">
            Create an account
          </CardTitle>
          <CardDescription className="text-center">
            Join GigStream and start earning instantly
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <Input
              label="Full Name"
              type="text"
              placeholder="John Doe"
              error={!!errors.name}
              helperText={errors.name?.message}
              disabled={isLoading}
              {...register("name")}
            />

            <Input
              label="Email"
              type="email"
              placeholder="you@example.com"
              error={!!errors.email}
              helperText={errors.email?.message}
              disabled={isLoading}
              {...register("email")}
            />

            <Input
              label="Password"
              type="password"
              placeholder="••••••••"
              error={!!errors.password}
              helperText={errors.password?.message || "Must be at least 8 characters with uppercase, lowercase, and number"}
              disabled={isLoading}
              {...register("password")}
            />

            <Input
              label="Confirm Password"
              type="password"
              placeholder="••••••••"
              error={!!errors.confirmPassword}
              helperText={errors.confirmPassword?.message}
              disabled={isLoading}
              {...register("confirmPassword")}
            />

            <Select
              label="I am a..."
              error={!!errors.role}
              helperText={errors.role?.message}
              disabled={isLoading}
              {...register("role")}
            >
              <option value="worker">Worker - Looking for gigs</option>
              <option value="platform">Platform - Hiring workers</option>
            </Select>

            {selectedRole === "worker" && (
              <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
                <p className="text-sm text-blue-800">
                  <span className="font-medium">✨ Instant wallet creation:</span> A
                  blockchain wallet will be automatically created for you to receive
                  instant payments.
                </p>
              </div>
            )}

            <div className="flex items-start">
              <input
                id="terms"
                type="checkbox"
                required
                className="h-4 w-4 mt-0.5 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="terms" className="ml-2 block text-sm text-gray-700">
                I agree to the{" "}
                <Link href="/terms" className="text-blue-600 hover:text-blue-500">
                  Terms of Service
                </Link>{" "}
                and{" "}
                <Link href="/privacy" className="text-blue-600 hover:text-blue-500">
                  Privacy Policy
                </Link>
              </label>
            </div>

            <Button type="submit" className="w-full" loading={isLoading}>
              {isLoading ? "Creating account..." : "Create account"}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="flex flex-col space-y-4">
          <div className="relative w-full">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-gray-300" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white px-2 text-gray-500">
                Already have an account?
              </span>
            </div>
          </div>
          <Link href="/login" className="w-full">
            <Button variant="outline" className="w-full" disabled={isLoading}>
              Sign in
            </Button>
          </Link>
        </CardFooter>
      </Card>
    </div>
  );
}
