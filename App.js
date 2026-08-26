import { AuthProvider } from "src/store/authStore";
import AppNavigator from "./src/navigation/AppNavigator";
import ErrorBoundary from "src/component/common/ErrorBoundary";

export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <AppNavigator />
      </AuthProvider>
    </ErrorBoundary>
  );
}
