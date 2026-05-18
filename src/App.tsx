import { useEffect, useState } from "react";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { DataProvider } from "./context/DataContext";

import Layout from "./components/Layout";
import AuthPage from "./pages/AuthPage";

import AdminDashboard from "./pages/AdminDashboard";
import StaffDashboard from "./pages/StaffDashboard";
import CustomerDashboard from "./pages/CustomerDashboard";

import OrderManagement from "./pages/OrderManagement";
import InventoryManagement from "./pages/InventoryManagement";
import Reports from "./pages/Reports";
import PlaceOrder from "./pages/PlaceOrder";
import UserManagement from "./pages/UserManagement";
import WalkInSale from "./pages/WalkInSale";

function AppContent() {
  const { isAuthenticated, isAdmin, isStaff, user } = useAuth();
  const [page, setPage] = useState("dashboard");

  useEffect(() => {
    if (isAuthenticated) {
      setPage("dashboard");
    }
  }, [isAuthenticated]);

  const handleLogin = () => {
    setPage("dashboard");
  };

  if (!isAuthenticated) {
    return <AuthPage onLogin={handleLogin} />;
  }

  const renderPage = () => {
    try {
      if (isAdmin) {
        switch (page) {
          case "dashboard":
            return <AdminDashboard />;
          case "walk-in":
            return <WalkInSale />;
          case "orders":
            return <OrderManagement />;
          case "inventory":
            return <InventoryManagement />;
          case "reports":
            return <Reports />;
          case "users":
            return <UserManagement />;
          default:
            return <AdminDashboard />;
        }
      }

      if (isStaff) {
        switch (page) {
          case "dashboard":
            return <StaffDashboard />;
          case "walk-in":
            return <WalkInSale />;
          case "orders":
            return <OrderManagement />;
          case "inventory":
            return <InventoryManagement />;
          case "reports":
            return <Reports />;
          default:
            return <StaffDashboard />;
        }
      }

      switch (page) {
        case "dashboard":
          return <CustomerDashboard onNavigate={setPage} />;
        case "place-order":
          return <PlaceOrder />;
        case "my-orders":
          return <OrderManagement />;
        default:
          return <CustomerDashboard onNavigate={setPage} />;
      }
    } catch (error: any) {
      return (
        <div className="min-h-screen bg-slate-100 p-10">
          <div className="mx-auto max-w-3xl rounded-2xl bg-white p-8 shadow">
            <h1 className="text-2xl font-bold text-red-600">
              Dashboard Error
            </h1>
            <p className="mt-4 text-slate-700">
              The login worked, but the dashboard crashed.
            </p>
            <pre className="mt-4 overflow-auto rounded-lg bg-slate-900 p-4 text-sm text-white">
              {String(error?.message || error)}
            </pre>
            <p className="mt-4 text-sm text-slate-500">
              Logged in as: {user?.email} / role: {user?.role}
            </p>
          </div>
        </div>
      );
    }
  };

  return (
    <Layout currentPage={page} onNavigate={setPage}>
      {renderPage()}
    </Layout>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <DataProvider>
        <AppContent />
      </DataProvider>
    </AuthProvider>
  );
}
