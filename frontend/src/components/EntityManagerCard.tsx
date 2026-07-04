import { useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { Plus, Pencil, Check, Trash2, X } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { Category, PaymentMethod } from "@/api/types";

export type Entity = Category | PaymentMethod;

interface EntityManagerCardProps {
  title: string;
  description?: string;
  entities: Entity[];
  loading: boolean;
  onCreate: (name: string) => Promise<void>;
  onRename: (id: number, name: string) => Promise<void>;
  onDelete: (id: number) => Promise<void>;
  /** i18n-translated message for a 409 in-use error, already interpolated by caller via onErrorReceived */
  i18n: {
    add: string;
    rename: string;
    delete: string;
    emptyHint: string;
    namePlaceholder: string;
  };
}

export default function EntityManagerCard({
  title,
  description,
  entities,
  loading,
  onCreate,
  onRename,
  onDelete,
  i18n,
}: EntityManagerCardProps) {
  const { t } = useTranslation();
  const [newName, setNewName] = useState("");
  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState("");
  const [error, setError] = useState<string>("");

  const mapError = useCallback(
    (detail: string, count?: number): string => {
      if (detail.includes("in use") && count != null) {
        return t("settings.deleteBlockedInUse", { count });
      }
      if (
        detail === "Category already exists" ||
        detail === "Payment method already exists"
      ) {
        return t("errors.entityNameExists");
      }
      return detail;
    },
    [t]
  );

  const extractError = (err: unknown): { detail: string; count?: number } => {
    const body = (err as { response?: { data?: { detail?: unknown; count?: number } } })?.response?.data;
    const detail = typeof body?.detail === "string" ? body.detail : "Error";
    const count = typeof body?.count === "number" ? body.count : undefined;
    return { detail, count };
  };

  const handleCreate = async () => {
    const name = newName.trim();
    if (!name) return;
    setCreating(true);
    setError("");
    try {
      await onCreate(name);
      setNewName("");
    } catch (err: unknown) {
      const { detail, count } = extractError(err);
      setError(mapError(detail, count));
    } finally {
      setCreating(false);
    }
  };

  const startEdit = (entity: Entity) => {
    setEditingId(entity.id);
    setEditName(entity.name);
    setError("");
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditName("");
  };

  const commitRename = async (id: number) => {
    const name = editName.trim();
    if (!name) return;
    setError("");
    try {
      await onRename(id, name);
      setEditingId(null);
      setEditName("");
    } catch (err: unknown) {
      const { detail } = extractError(err);
      setError(mapError(detail));
    }
  };

  const handleDelete = async (id: number) => {
    setError("");
    try {
      await onDelete(id);
    } catch (err: unknown) {
      const { detail, count } = extractError(err);
      setError(mapError(detail, count));
    }
  };

  return (
    <Card className="max-w-md">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent className="space-y-3">
        {error && <p className="text-sm text-destructive">{error}</p>}

        <div className="flex gap-2">
          <Input
            placeholder={i18n.namePlaceholder}
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleCreate();
              }
            }}
          />
          <Button type="button" onClick={handleCreate} disabled={creating || !newName.trim()}>
            <Plus className="size-4" />
            {i18n.add}
          </Button>
        </div>

        {loading ? (
          <p className="text-sm text-muted-foreground">{t("subscriptions.loading")}</p>
        ) : entities.length === 0 ? (
          <p className="text-sm text-muted-foreground">{i18n.emptyHint}</p>
        ) : (
          <ul className="space-y-1">
            {entities.map((entity) => (
              <li key={entity.id} className="flex items-center gap-2 rounded-md border px-3 py-2">
                {editingId === entity.id ? (
                  <>
                    <Input
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          commitRename(entity.id);
                        }
                        if (e.key === "Escape") {
                          e.preventDefault();
                          cancelEdit();
                        }
                      }}
                      className="h-8"
                      autoFocus
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => commitRename(entity.id)}
                      aria-label={i18n.rename}
                    >
                      <Check className="size-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      onClick={cancelEdit}
                      aria-label={t("settings.cancel")}
                    >
                      <X className="size-4" />
                    </Button>
                  </>
                ) : (
                  <>
                    <span className="flex-1 truncate">{entity.name}</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => startEdit(entity)}
                      aria-label={i18n.rename}
                    >
                      <Pencil className="size-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => handleDelete(entity.id)}
                      aria-label={i18n.delete}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </>
                )}
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
