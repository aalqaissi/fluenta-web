import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "@/store/auth-context";
import { isAdmin } from "@/lib/auth";

/** Route guard: renders admin child routes only for admins; others go to the dashboard. */
export function AdminRoute() {
  const { user } = useAuth();
  if (!isAdmin(user)) return <Navigate to="/" replace />;
  return <Outlet />;
}
