import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, CheckCircle2, Circle } from 'lucide-react';
import api from '../../services/api';

type NotificationItem = {
  id: string;
  title: string;
  message: string;
  path?: string | null;
  isRead: boolean;
  createdAt: string;
};

export const NotificationsPage = () => {
  const navigate = useNavigate();
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'unread' | 'read'>('all');

  const fetchAll = async () => {
    try {
      setLoading(true);
      const response = await api.get('/notifications?limit=100');
      setItems(Array.isArray(response.data) ? (response.data as NotificationItem[]) : []);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
  }, []);

  const filteredItems = useMemo(() => {
    if (filter === 'unread') return items.filter((item) => !item.isRead);
    if (filter === 'read') return items.filter((item) => item.isRead);
    return items;
  }, [filter, items]);

  const unreadCount = useMemo(
    () => items.filter((item) => !item.isRead).length,
    [items],
  );

  const markAsRead = async (notificationId: string) => {
    try {
      await api.patch(`/notifications/${notificationId}/read`);
      setItems((prev) =>
        prev.map((item) =>
          item.id === notificationId
            ? { ...item, isRead: true }
            : item,
        ),
      );
    } catch {
      // non-critical
    }
  };

  const openNotification = async (notification: NotificationItem) => {
    if (!notification.isRead) {
      await markAsRead(notification.id);
    }

    if (notification.path) {
      navigate(`${notification.path}?notificationId=${notification.id}`);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Notificaciones</h1>
          <p className="text-gray-600 mt-1">
            {unreadCount} no leída(s) de {items.length} total(es)
          </p>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-3 flex flex-wrap gap-2">
        <button
          onClick={() => setFilter('all')}
          className={`px-4 py-2 rounded-lg text-sm ${
            filter === 'all'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          Todas
        </button>
        <button
          onClick={() => setFilter('unread')}
          className={`px-4 py-2 rounded-lg text-sm ${
            filter === 'unread'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          No leídas
        </button>
        <button
          onClick={() => setFilter('read')}
          className={`px-4 py-2 rounded-lg text-sm ${
            filter === 'read'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          Leídas
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
        {loading ? (
          <p className="text-sm text-gray-500">Cargando notificaciones...</p>
        ) : filteredItems.length === 0 ? (
          <div className="py-12 text-center">
            <Bell className="w-10 h-10 mx-auto text-gray-300 mb-3" />
            <p className="text-gray-500 text-sm">No hay notificaciones para este filtro.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredItems.map((notification) => (
              <button
                key={notification.id}
                onClick={() => openNotification(notification)}
                className={`w-full text-left border rounded-xl p-4 transition-colors ${
                  notification.isRead
                    ? 'border-gray-200 bg-white hover:bg-gray-50'
                    : 'border-blue-200 bg-blue-50/40 hover:bg-blue-50'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-semibold text-gray-900">{notification.title}</h3>
                    <p className="text-sm text-gray-600 mt-1">{notification.message}</p>
                    <p className="text-xs text-gray-400 mt-2">
                      {new Date(notification.createdAt).toLocaleString('es-EC')}
                    </p>
                  </div>
                  {notification.isRead ? (
                    <CheckCircle2 className="w-5 h-5 text-gray-400 mt-1" />
                  ) : (
                    <Circle className="w-5 h-5 text-blue-600 fill-blue-600 mt-1" />
                  )}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
