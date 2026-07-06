import { AuthProvider } from "./auth/AuthProvider";
import { AppRouter } from "./router/AppRouter";

export function App() {
  return (
    <AuthProvider>
      <AppRouter />
    </AuthProvider>
  );
}
