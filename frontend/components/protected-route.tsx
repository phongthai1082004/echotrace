"use client";

import { useSession } from "next-auth/react";
import { redirect } from "next/navigation";
import { ReactNode } from "react";

interface ProtectedRouteProps {
  children: ReactNode;
  requiredRole?: "admin" | "user";
}

export function ProtectedRoute({ children, requiredRole }: ProtectedRouteProps) {
  const { data: session, status } = useSession();

  if (status === "loading") {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (status === "unauthenticated") {
    redirect("/auth");
  }

  // Check role (cast to avoid type error since next-auth types don't know about custom role field)
  const userRole = (session?.user as any)?.role;
  if (requiredRole && userRole !== requiredRole) {
    redirect("/unauthorized");
  }

  return <>{children}</>;
}

/**
 * HOC for protecting page components
 * Usage: export default withProtectedRoute(YourPage, "admin")
 */
export function withProtectedRoute<P extends object>(
  Component: React.ComponentType<P>,
  requiredRole?: "admin" | "user",
) {
  return function ProtectedComponent(props: P) {
    return (
      <ProtectedRoute requiredRole={requiredRole}>
        <Component {...props} />
      </ProtectedRoute>
    );
  };
}
