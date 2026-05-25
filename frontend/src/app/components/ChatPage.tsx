import { useState, useRef, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Send, AlertCircle, Shield, Info, MoreVertical, Flag, UserX } from 'lucide-react';
import { apiClient, ApiError } from '../api/client';
import { useApp } from '../App';
import type { MessageRecord, MessageThread } from '../api/types';

interface Message {
  id: string;
  senderId: string;
  content: string;
  time: string;
  isBlocked?: boolean;
  warning?: string;
}

const GREETING_LIMIT_MESSAGE = '在对方回复你之前，您最多只能发送这几条消息';
const fallbackAvatar = (seed: string) => `https://api.dicebear.com/7.x/avataaars/svg?seed=${seed}`;

function formatMessageTime(value?: string | null) {
  if (!value) {
    return new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
  }
  return new Date(value).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
}

function recordToMessage(currentUserId: string) {
  return (record: MessageRecord): Message => ({
    id: record.id,
    senderId: record.sender_user_id === currentUserId ? 'me' : 'other',
    content: record.body,
    time: formatMessageTime(record.created_at),
  });
}

export function ChatPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data, user, refreshAppData } = useApp();
  const [message, setMessage] = useState('');
  const [thread, setThread] = useState<MessageThread | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isMutualFollow, setIsMutualFollow] = useState(false);
  const [hasReplied, setHasReplied] = useState(false);
  const [hasSentGreeting, setHasSentGreeting] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [showWarning, setShowWarning] = useState(true);
  const [sendError, setSendError] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const otherUserId = thread && user?.id === thread.initiator_user_id
    ? thread.recipient_user_id
    : thread?.initiator_user_id ?? id ?? '';
  const otherUser = {
    id: otherUserId,
    name: user?.id === thread?.initiator_user_id
      ? thread.recipient_display_name ?? `用户 ${otherUserId.slice(0, 4)}`
      : thread?.initiator_display_name ?? `用户 ${otherUserId.slice(0, 4)}`,
    avatar: user?.id === thread?.initiator_user_id
      ? thread.recipient_avatar_url ?? fallbackAvatar(otherUserId)
      : thread?.initiator_avatar_url ?? fallbackAvatar(otherUserId),
    role: 'guide',
    verified: true,
    rating: 4.9,
  };

  useEffect(() => {
    let canceled = false;
    const loadThread = async () => {
      if (!id || !user) return;
      setLoadError(null);
      try {
        let nextThread: MessageThread;
        try {
          nextThread = await apiClient.messageThread(id);
        } catch (error) {
          const marketId = data?.selectedMarket?.id;
          if (!marketId) throw error;
          nextThread = await apiClient.createMessageThread(marketId, id);
        }
        const records = await apiClient.threadMessages(nextThread.id);
        if (canceled) return;
        setThread(nextThread);
        setIsMutualFollow(Boolean(nextThread.is_mutual_follow));
        setHasReplied(Boolean(nextThread.recipient_replied));
        setHasSentGreeting(Boolean(nextThread.greeting_sent));
        setMessages(records.map(recordToMessage(user.id)));
      } catch (error) {
        if (canceled) return;
        setLoadError(error instanceof ApiError ? error.message : '聊天记录加载失败');
      }
    };
    loadThread();
    return () => {
      canceled = true;
    };
  }, [data?.selectedMarket?.id, id, user]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const containsContactInfo = (text: string) => {
    const patterns = [
      /\d{11}/, // Phone number
      /微信/i,
      /wechat/i,
      /qq/i,
      /\d{5,}@/i, // Email pattern
      /whatsapp/i,
    ];
    return patterns.some(pattern => pattern.test(text));
  };

  const handleSend = async () => {
    if (!message.trim()) return;

    // Check for contact information
    if (containsContactInfo(message)) {
      const blockedMessage: Message = {
        id: `blocked-${Date.now()}`,
        senderId: 'me',
        content: message,
        time: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }),
        isBlocked: true,
        warning: '检测到联系方式，消息已被拦截。请勿在平台外交易，以保护您的权益。',
      };
      setMessages([...messages, blockedMessage]);
      setMessage('');
      setSendError(null);
      return;
    }

    // Check privacy rules
    if (!canSendMessage()) {
      setSendError(GREETING_LIMIT_MESSAGE);
      return;
    }

    if (!thread || !user) {
      setSendError('聊天线程还没有加载完成');
      return;
    }

    try {
      const sent = await apiClient.sendThreadMessage(thread.id, message);
      setMessages(prev => [...prev, recordToMessage(user.id)(sent)]);
      setMessage('');
      setSendError(null);
      setHasSentGreeting(true);
      await refreshAppData();
    } catch (error) {
      setSendError(error instanceof ApiError ? error.message : '消息发送失败');
    }
  };

  const canSendMessage = () => {
    if (thread && user?.id === thread.recipient_user_id) return true;
    if (isMutualFollow) return true;
    if (hasReplied) return true;
    if (!hasSentGreeting) return true;
    return false;
  };

  return (
    <div className="fixed inset-x-0 top-0 bottom-16 bg-white z-40 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 h-20 border-b border-gray-200 bg-white">
        <div className="flex items-center gap-3 flex-1">
          <button onClick={() => navigate(-1)} className="p-3 -ml-2 hover:bg-gray-100 rounded-xl">
            <ArrowLeft size={28} />
          </button>
          <button
            onClick={() => navigate(`/user/${otherUser.id}`)}
            className="flex items-center gap-3 hover:bg-gray-50 rounded-lg p-1 -ml-1"
          >
            <img src={otherUser.avatar} alt={otherUser.name} className="w-14 h-14 rounded-full" />
            <div className="text-left">
              <div className="flex items-center gap-2">
                <h2 className="font-semibold text-base">{otherUser.name}</h2>
                {otherUser.verified && (
                  <Shield size={16} className="text-blue-600" />
                )}
              </div>
              <p className="text-sm text-gray-500">
              {otherUser.role === 'guide' ? '导游' : '旅行者'} · {otherUser.rating}分
              </p>
            </div>
          </button>
        </div>
        <button
          onClick={() => setShowMenu(!showMenu)}
          className="p-3 hover:bg-gray-100 rounded-xl relative"
        >
          <MoreVertical size={28} />
          {showMenu && (
            <div className="absolute top-full right-0 mt-2 bg-white rounded-lg shadow-xl border border-gray-200 py-2 w-40 z-10">
              <button className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2">
                <Flag size={16} />
                举报
              </button>
              <button className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2 text-red-600">
                <UserX size={16} />
                拉黑
              </button>
            </div>
          )}
        </button>
      </div>

      {/* Privacy Warning */}
      {showWarning && (
        <div className="bg-amber-50 border-b border-amber-200 px-4 py-3">
          <div className="flex items-start gap-3">
            <AlertCircle size={20} className="text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="text-sm text-amber-900">
                <strong>安全提示：</strong>请勿交换电话、微信等联系方式，避免跳出平台交易。
                平台提供完整的交易保障和争议仲裁服务。
              </p>
              {!isMutualFollow && (
                <p className="text-xs text-amber-800 mt-1">
                  您与对方尚未互相关注，{hasReplied ? '可以继续沟通' : '对方回复前只能发送一条消息'}
                </p>
              )}
            </div>
            <button
              onClick={() => setShowWarning(false)}
              className="text-amber-600 hover:text-amber-800"
            >
              ×
            </button>
          </div>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
        {loadError && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {loadError}
          </div>
        )}
        {messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.senderId === 'me' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[70%] ${msg.senderId === 'me' ? 'order-2' : 'order-1'}`}>
              {msg.isBlocked ? (
                <div className="space-y-2">
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                    <div className="flex items-start gap-2 mb-2">
                      <Shield size={16} className="text-red-600 flex-shrink-0 mt-0.5" />
                      <p className="text-sm text-red-900 line-through">{msg.content}</p>
                    </div>
                    <p className="text-xs text-red-700">{msg.warning}</p>
                  </div>
                  <p className="text-xs text-gray-500 px-1">{msg.time}</p>
                </div>
              ) : (
                <div className="space-y-1">
                  <div
                    className={`rounded-2xl px-4 py-2 ${
                      msg.senderId === 'me'
                        ? 'bg-blue-600 text-white'
                        : 'bg-white border border-gray-200'
                    }`}
                  >
                    <p className="text-sm">{msg.content}</p>
                  </div>
                  <p className={`text-xs text-gray-500 px-1 ${msg.senderId === 'me' ? 'text-right' : 'text-left'}`}>
                    {msg.time}
                  </p>
                </div>
              )}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Quick Actions */}
      <div className="border-t border-gray-200 bg-white px-4 py-3">
        <div className="flex gap-2 mb-3">
          <button
            onClick={() => navigate(`/order/new?guideId=${otherUser.id}&threadId=${thread?.id ?? ''}`)}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium"
          >
            创建订单
          </button>
          <button className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-sm font-medium">
            查看详情
          </button>
        </div>
      </div>

      {/* Input */}
      <div className="border-t border-gray-200 bg-white p-4">
        <div className="flex items-end gap-2">
          <div className="flex-1 relative">
            <textarea
              value={message}
              onChange={(e) => {
                setMessage(e.target.value);
                if (sendError) setSendError(null);
              }}
              onKeyPress={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder={canSendMessage() ? "输入消息..." : GREETING_LIMIT_MESSAGE}
              disabled={!canSendMessage()}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none disabled:bg-gray-100 disabled:cursor-not-allowed"
              rows={1}
            />
          </div>
          <button
            onClick={handleSend}
            disabled={!message.trim() || !canSendMessage()}
            className="p-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
          >
            <Send size={20} />
          </button>
        </div>
        {(sendError || !canSendMessage()) && (
          <div className="mt-2 flex items-center gap-2 text-sm text-amber-700">
            <Info size={16} />
            <span>{sendError ?? GREETING_LIMIT_MESSAGE}</span>
          </div>
        )}
      </div>
    </div>
  );
}
