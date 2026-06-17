import api from "./client";
import type { NotificationSettings, NotificationSettingsUpdate } from "./types";

export async function getNotificationSettings(): Promise<NotificationSettings> {
  const { data } = await api.get<NotificationSettings>("/auth/me/notifications");
  return data;
}

export async function updateNotificationSettings(
  data: NotificationSettingsUpdate
): Promise<NotificationSettings> {
  const { data: settings } = await api.put<NotificationSettings>(
    "/auth/me/notifications",
    data
  );
  return settings;
}

export async function testNotificationChannel(
  channel: "email" | "telegram"
): Promise<void> {
  await api.post("/auth/me/notifications/test", { channel });
}
