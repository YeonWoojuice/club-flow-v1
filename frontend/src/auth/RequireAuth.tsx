import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "./AuthProvider";
import { LoadingScreen } from "../components/LoadingScreen";

export function RequireAuth() {
  const { status } = useAuth();
  const location = useLocation();

  if (status === "loading") {
    return <LoadingScreen message="로그인 상태를 확인하고 있습니다." />;
  }
  if (status === "anonymous") {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }
  return <Outlet />;
}
