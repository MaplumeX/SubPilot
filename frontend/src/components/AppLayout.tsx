import { useState } from "react";
import { Routes, Route, Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "@/auth-hook";
import DashboardPage from "@/pages/DashboardPage";
import SubscriptionsPage from "@/pages/SubscriptionsPage";
import SubscriptionForm from "@/components/SubscriptionForm";
import { createSubscription } from "@/api/subscriptions";
import type { SubscriptionCreate } from "@/api/types";

export default function AppLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [formOpen, setFormOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const handleCreate = async (data: SubscriptionCreate) => {
    await createSubscription(data);
    setFormOpen(false);
  };

  return (
    <div className="flex min-h-screen flex-col">
      <header className="flex items-center justify-between border-b px-6 py-3">
        <div className="flex items-center gap-6">
          <h1 className="text-lg font-semibold">SubPilot</h1>
          <nav className="flex items-center gap-4">
            <button
              onClick={() => navigate("/")}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Dashboard
            </button>
            <button
              onClick={() => navigate("/subscriptions")}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Subscriptions
            </button>
          </nav>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm text-muted-foreground">{user?.email}</span>
          <button
            onClick={handleLogout}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Sign out
          </button>
        </div>
      </header>

      <main className="flex-1 p-6">
        <Routes>
          <Route
            path="/"
            element={
              <DashboardPage
                onAddSubscription={() => setFormOpen(true)}
              />
            }
          />
          <Route path="/subscriptions" element={<SubscriptionsPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>

      <SubscriptionForm
        key="app-create"
        open={formOpen}
        onOpenChange={setFormOpen}
        onSubmit={handleCreate}
      />
    </div>
  );
}
