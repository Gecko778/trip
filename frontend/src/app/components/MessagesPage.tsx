import { useState } from 'react';
import { Link } from 'react-router-dom';
import { MessageCircle, Bell, ShoppingBag, ChevronRight, Package, AlertCircle, CheckCircle } from 'lucide-react';
import { apiClient } from '../api/client';
import { useApp } from '../App';

export function MessagesPage() {
  const { data, user, refreshAppData } = useApp();
  const [activeTab, setActiveTab] = useState<'chats' | 'system' | 'orders'>('chats');
  const formatTime = (value?: string | null) => value?.slice(0, 16).replace('T', ' ') ?? '';
  const conversations = (data?.messageThreads ?? []).map(thread => {
    const isInitiator = thread.initiator_user_id === user?.id;
    const otherUserId = isInitiator ? thread.recipient_user_id : thread.initiator_user_id;
    const otherName = isInitiator ? thread.recipient_display_name : thread.initiator_display_name;
    const otherAvatar = isInitiator ? thread.recipient_avatar_url : thread.initiator_avatar_url;
    return {
      id: thread.id,
      userId: otherUserId,
      name: otherName ?? `用户 ${otherUserId.slice(0, 4)}`,
      lastMessage: thread.last_message_body ?? '暂无消息',
      time: formatTime(thread.last_message_created_at ?? thread.last_message_at),
      unread: 0,
      avatar: otherAvatar ?? `https://api.dicebear.com/7.x/avataaars/svg?seed=${otherUserId}`,
      online: false,
    };
  });

  const mockSystemNotifications = [
    {
      id: 1,
      type: 'order',
      title: '订单已确认',
      content: '您与导游张伟的订单已双方确认,请及时完成支付',
      time: '2小时前',
      read: false,
    },
    {
      id: 2,
      type: 'message',
      title: '新消息提醒',
      content: '导游李娜回复了您的消息',
      time: '昨天',
      read: true,
    },
    {
      id: 3,
      type: 'system',
      title: '安全提示',
      content: '请勿在平台外进行交易,保护您的权益',
      time: '2天前',
      read: true,
    },
  ];

  const apiNotifications = (data?.notifications ?? []).map(notification => ({
    id: notification.id,
    type: notification.type,
    title: notification.title,
    content: notification.body ?? '',
    time: notification.created_at?.slice(0, 16).replace('T', ' ') ?? '',
    read: Boolean(notification.read_at),
    relatedOrderId: notification.related_order_id,
  }));
  const systemNotifications = apiNotifications.length > 0 ? apiNotifications : mockSystemNotifications;

  const orderNotifications = [
    {
      id: 1,
      orderId: '202606150001',
      status: 'confirmed',
      title: '订单等待支付',
      content: '订单已双方确认,请在24小时内完成支付',
      time: '2小时前',
      amount: 3000,
    },
    {
      id: 2,
      orderId: '202605200002',
      status: 'completed',
      title: '服务已完成',
      content: '请对本次服务进行评价',
      time: '3天前',
      amount: 1000,
    },
  ];

  return (
    <div className="max-w-screen-xl mx-auto">
      {/* Tabs */}
      <div className="sticky top-0 bg-white border-b border-gray-200 z-30">
        <div className="flex">
          <button
            onClick={() => setActiveTab('chats')}
            className={`flex-1 py-4 font-medium ${
              activeTab === 'chats'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-600'
            }`}
          >
            聊天 ({conversations.filter(c => c.unread > 0).length})
          </button>
          <button
            onClick={() => setActiveTab('system')}
            className={`flex-1 py-4 font-medium ${
              activeTab === 'system'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-600'
            }`}
          >
            系统通知 ({systemNotifications.filter(n => !n.read).length})
          </button>
          <button
            onClick={() => setActiveTab('orders')}
            className={`flex-1 py-4 font-medium ${
              activeTab === 'orders'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-600'
            }`}
          >
            订单通知 ({orderNotifications.length})
          </button>
        </div>
      </div>

      {/* Tab Content */}
      <div>
        {activeTab === 'chats' && (
          /* Conversations List */
          <div className="divide-y divide-gray-200">
            {conversations.map(conversation => (
              <div
                key={conversation.id}
                className="flex items-center gap-3 p-4 bg-white hover:bg-gray-50 transition-colors"
              >
                <Link to={`/user/${conversation.userId}`} className="relative flex-shrink-0">
                  <img
                    src={conversation.avatar}
                    alt={conversation.name}
                    className="w-14 h-14 rounded-full bg-gray-100"
                  />
                  {conversation.online && (
                    <div className="absolute bottom-0 right-0 w-4 h-4 bg-green-500 border-2 border-white rounded-full"></div>
                  )}
                </Link>

                <Link to={`/chat/${conversation.id}`} className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="font-medium truncate">{conversation.name}</h3>
                    <span className="text-xs text-gray-500 ml-2">{conversation.time}</span>
                  </div>
                  <p className="text-sm text-gray-600 truncate">{conversation.lastMessage}</p>
                </Link>

                {conversation.unread > 0 && (
                  <div className="w-6 h-6 bg-red-600 text-white rounded-full flex items-center justify-center text-xs font-medium">
                    {conversation.unread}
                  </div>
                )}

                <Link to={`/chat/${conversation.id}`}>
                  <ChevronRight size={20} className="text-gray-400" />
                </Link>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'system' && (
          /* System Notifications */
          <div className="divide-y divide-gray-200">
            {systemNotifications.map(notification => (
              <button
                key={notification.id}
                onClick={async () => {
                  if (!notification.read && typeof notification.id === 'string') {
                    await apiClient.markNotificationRead(notification.id).catch(() => null);
                    await refreshAppData();
                  }
                }}
                className={`w-full p-4 text-left ${notification.read ? 'bg-white' : 'bg-blue-50'}`}
              >
                <div className="flex items-start gap-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                    notification.type === 'system' ? 'bg-blue-100' :
                    notification.type === 'message' ? 'bg-green-100' :
                    'bg-orange-100'
                  }`}>
                    {notification.type === 'system' ? <AlertCircle size={20} className="text-blue-600" /> :
                     notification.type === 'message' ? <MessageCircle size={20} className="text-green-600" /> :
                     <Package size={20} className="text-orange-600" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <h3 className="font-medium text-sm">{notification.title}</h3>
                      <span className="text-xs text-gray-500">{notification.time}</span>
                    </div>
                    <p className="text-sm text-gray-600">{notification.content}</p>
                  </div>
                  {!notification.read && (
                    <div className="w-2 h-2 bg-blue-600 rounded-full flex-shrink-0"></div>
                  )}
                </div>
              </button>
            ))}
          </div>
        )}

        {activeTab === 'orders' && (
          /* Order Notifications */
          <div className="divide-y divide-gray-200">
            {orderNotifications.map(order => (
              <Link
                key={order.id}
                to={`/order/${order.orderId}`}
                className="block p-4 bg-white hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-start gap-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                    order.status === 'confirmed' ? 'bg-green-100' :
                    order.status === 'completed' ? 'bg-blue-100' :
                    'bg-orange-100'
                  }`}>
                    {order.status === 'confirmed' ? <AlertCircle size={20} className="text-orange-600" /> :
                     order.status === 'completed' ? <CheckCircle size={20} className="text-blue-600" /> :
                     <Package size={20} className="text-gray-600" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <h3 className="font-medium text-sm">{order.title}</h3>
                      <span className="text-xs text-gray-500">{order.time}</span>
                    </div>
                    <p className="text-sm text-gray-600 mb-2">{order.content}</p>
                    <div className="flex items-center gap-3 text-xs text-gray-500">
                      <span>订单号: {order.orderId}</span>
                      <span>¥{order.amount}</span>
                    </div>
                  </div>
                  <ChevronRight size={20} className="text-gray-400" />
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
