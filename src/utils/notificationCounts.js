// src/utils/notificationCounts.js
// Calcula contadores de notificaciones para badge (campanita) y no leídas (punto azul).
export function getNotificationCounts(user) {
  const notifications = Array.isArray(user?.notifications)
    ? user.notifications
    : [];

  const unreadCount = notifications.reduce(
    (acc, notif) => acc + (notif?.read ? 0 : 1),
    0
  );

  const lastOpenedAt = user?.notificationsLastOpenedAt
    ? new Date(user.notificationsLastOpenedAt)
    : null;

  const badgeCount = notifications.reduce((acc, notif) => {
    if (!notif?.createdAt) return acc;
    const createdAt = new Date(notif.createdAt);
    if (Number.isNaN(createdAt.getTime())) return acc;
    if (!lastOpenedAt || createdAt > lastOpenedAt) return acc + 1;
    return acc;
  }, 0);

  return { unreadCount, badgeCount };
}
