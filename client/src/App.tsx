import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import NotFound from "@/pages/not-found";
import { AuthProvider } from "@/hooks/use-auth";
import { ProtectedRoute } from "./lib/protected-route";
import Layout from "@/pages/layout";
import AuthPage from "@/pages/auth-page";
import DashboardPage from "@/pages/dashboard-page";
import VehiclesPage from "@/pages/vehicles-page";
import SalesPage from "@/pages/sales-page";
import FinancesPage from "@/pages/finances-page";
import ExpensesPage from "@/pages/expenses-page";
import PersonnelPage from "@/pages/personnel-page";
import ReportsPage from "@/pages/reports-page";
import UserManagementPage from "@/pages/user-management-page";
import PaymentsPage from "@/pages/payments-page";

function Router() {
  return (
    <Switch>
      <ProtectedRoute path="/" component={() => <Layout><DashboardPage /></Layout>} />
      <ProtectedRoute path="/vehicles" component={() => <Layout><VehiclesPage /></Layout>} />
      <ProtectedRoute path="/vehicles/:id" component={() => <Layout><VehiclesPage /></Layout>} />
      <ProtectedRoute path="/vehicles/:id/:action" component={() => <Layout><VehiclesPage /></Layout>} />
      <ProtectedRoute path="/vehicles/edit/:id" component={() => <Layout><VehiclesPage /></Layout>} />
      <ProtectedRoute path="/sales" component={() => <Layout><SalesPage /></Layout>} />
      <ProtectedRoute path="/sales/:id" component={() => <Layout><SalesPage /></Layout>} />
      <ProtectedRoute path="/sales/:id/:action" component={() => <Layout><SalesPage /></Layout>} />
      <ProtectedRoute path="/finances" component={() => <Layout><FinancesPage /></Layout>} />
      <ProtectedRoute path="/finances/:id" component={() => <Layout><FinancesPage /></Layout>} />
      <ProtectedRoute path="/finances/:id/:action" component={() => <Layout><FinancesPage /></Layout>} />
      <ProtectedRoute path="/expenses" component={() => <Layout><ExpensesPage /></Layout>} />
      <ProtectedRoute path="/expenses/:id" component={() => <Layout><ExpensesPage /></Layout>} />
      <ProtectedRoute path="/expenses/:id/:action" component={() => <Layout><ExpensesPage /></Layout>} />
      <ProtectedRoute path="/personnel" component={() => <Layout><PersonnelPage /></Layout>} />
      <ProtectedRoute path="/personnel/:id" component={() => <Layout><PersonnelPage /></Layout>} />
      <ProtectedRoute path="/personnel/:id/:action" component={() => <Layout><PersonnelPage /></Layout>} />
      <ProtectedRoute path="/payments" component={() => <Layout><PaymentsPage /></Layout>} />
      <ProtectedRoute path="/payments/:id" component={() => <Layout><PaymentsPage /></Layout>} />
      <ProtectedRoute path="/reports" component={() => <Layout><ReportsPage /></Layout>} />
      <ProtectedRoute path="/users" component={() => <Layout><UserManagementPage /></Layout>} />
      <Route path="/auth" component={AuthPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Router />
        <Toaster />
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
