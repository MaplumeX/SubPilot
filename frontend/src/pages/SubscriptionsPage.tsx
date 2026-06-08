import { useState, useEffect, useCallback } from "react";
import {
  listSubscriptions,
  deleteSubscription,
  createSubscription,
  updateSubscription,
} from "@/api/subscriptions";
import type { Subscription, SubscriptionCreate, SubscriptionUpdate } from "@/api/types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import SubscriptionForm from "@/components/SubscriptionForm";

export default function SubscriptionsPage() {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterCategory, setFilterCategory] = useState<string>("");
  const [filterStatus, setFilterStatus] = useState<string>("");
  const [filterCycle, setFilterCycle] = useState<string>("");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Subscription | null>(null);

  const fetchSubscriptions = useCallback(async () => {
    try {
      const params: Record<string, string> = {};
      if (filterCategory) params.category = filterCategory;
      if (filterStatus) params.status = filterStatus;
      if (filterCycle) params.billing_cycle = filterCycle;
      const data = await listSubscriptions(params);
      setSubscriptions(data);
    } catch {
      // 401 handled by interceptor
    } finally {
      setLoading(false);
    }
  }, [filterCategory, filterStatus, filterCycle]);

  useEffect(() => {
    fetchSubscriptions();
  }, [fetchSubscriptions]);

  const handleCreate = async (data: SubscriptionCreate) => {
    await createSubscription(data);
    setFormOpen(false);
    fetchSubscriptions();
  };

  const handleUpdate = async (data: SubscriptionCreate) => {
    if (!editing) return;
    await updateSubscription(editing.id, data as SubscriptionUpdate);
    setEditing(null);
    setFormOpen(false);
    fetchSubscriptions();
  };

  const handleDelete = async (id: number) => {
    await deleteSubscription(id);
    fetchSubscriptions();
  };

  const isDueSoon = (sub: Subscription) => {
    if (!sub.next_billing_date) return false;
    const next = new Date(sub.next_billing_date);
    const now = new Date();
    const threeDays = new Date();
    threeDays.setDate(now.getDate() + 3);
    return next >= now && next <= threeDays;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Subscriptions</h2>
        <Button
          onClick={() => {
            setEditing(null);
            setFormOpen(true);
          }}
        >
          Add Subscription
        </Button>
      </div>

      <div className="flex gap-4">
        <Select value={filterCategory || undefined} onValueChange={(v) => setFilterCategory(v === "__all__" ? "" : v)}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="All categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">All categories</SelectItem>
            <SelectItem value="streaming">Streaming</SelectItem>
            <SelectItem value="software">Software</SelectItem>
            <SelectItem value="cloud">Cloud</SelectItem>
            <SelectItem value="fitness">Fitness</SelectItem>
            <SelectItem value="music">Music</SelectItem>
            <SelectItem value="gaming">Gaming</SelectItem>
            <SelectItem value="news">News</SelectItem>
            <SelectItem value="productivity">Productivity</SelectItem>
            <SelectItem value="other">Other</SelectItem>
          </SelectContent>
        </Select>

        <Select value={filterStatus || undefined} onValueChange={(v) => setFilterStatus(v === "__all__" ? "" : v)}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">All statuses</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
            <SelectItem value="trial">Trial</SelectItem>
          </SelectContent>
        </Select>

        <Select value={filterCycle || undefined} onValueChange={(v) => setFilterCycle(v === "__all__" ? "" : v)}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="All cycles" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">All cycles</SelectItem>
            <SelectItem value="weekly">Weekly</SelectItem>
            <SelectItem value="monthly">Monthly</SelectItem>
            <SelectItem value="quarterly">Quarterly</SelectItem>
            <SelectItem value="yearly">Yearly</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <p className="text-muted-foreground">Loading...</p>
      ) : subscriptions.length === 0 ? (
        <p className="text-muted-foreground">No subscriptions found</p>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Price</TableHead>
                <TableHead>Cycle</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Next Billing</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {subscriptions.map((sub) => (
                <TableRow key={sub.id}>
                  <TableCell className="font-medium">
                    {sub.name}
                    {isDueSoon(sub) && (
                      <Badge variant="destructive" className="ml-2">
                        Due Soon
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    {sub.currency} {sub.price.toFixed(2)}
                  </TableCell>
                  <TableCell className="capitalize">{sub.billing_cycle}</TableCell>
                  <TableCell className="capitalize">{sub.category ?? "-"}</TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        sub.status === "active"
                          ? "default"
                          : sub.status === "trial"
                            ? "secondary"
                            : "outline"
                      }
                    >
                      {sub.status}
                    </Badge>
                  </TableCell>
                  <TableCell>{sub.next_billing_date ?? "-"}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setEditing(sub);
                          setFormOpen(true);
                        }}
                      >
                        Edit
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleDelete(sub.id)}
                      >
                        Delete
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <SubscriptionForm
        key={editing?.id ?? "create"}
        open={formOpen}
        onOpenChange={(open) => {
          setFormOpen(open);
          if (!open) setEditing(null);
        }}
        subscription={editing}
        onSubmit={editing ? handleUpdate : handleCreate}
      />
    </div>
  );
}
