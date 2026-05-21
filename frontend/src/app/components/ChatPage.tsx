import { useState, useRef, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Send, AlertCircle, Shield, Info, MoreVertical, Flag, UserX } from 'lucide-react';

interface Message {
  id: number;
  senderId: string;
  content: string;
  time: string;
  isBlocked?: boolean;
  warning?: string;
}

export function ChatPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 1,
      senderId: 'other',
      content: '您好，我看到您发布的旅行计划，我可以为您提供导游服务',
      time: '10:30',
    },
    {
      id: 2,
      senderId: 'me',
      content: '您好，请问您的每日价格是多少？',
      time: '10:32',
    },
    {
      id: 3,
      senderId: 'other',
      content: '我的价格是1000元/天，包含全天陪同和行程规划',
      time: '10:35',
    },
  ]);
  const [isMutualFollow, setIsMutualFollow] = useState(false);
  const [hasReplied, setHasReplied] = useState(true);
  const [hasSentGreeting, setHasSentGreeting] = useState(true);
  const [showMenu, setShowMenu] = useState(false);
  const [showWarning, setShowWarning] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const otherUser = {
    name: '张伟',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=zhang',
    role: 'guide',
    verified: true,
    rating: 4.9,
  };

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

  const handleSend = () => {
    if (!message.trim()) return;

    // Check for contact information
    if (containsContactInfo(message)) {
      const blockedMessage: Message = {
        id: messages.length + 1,
        senderId: 'me',
        content: message,
        time: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }),
        isBlocked: true,
        warning: '检测到联系方式，消息已被拦截。请勿在平台外交易，以保护您的权益。',
      };
      setMessages([...messages, blockedMessage]);
      setMessage('');
      return;
    }

    // Check privacy rules
    if (!isMutualFollow && !hasReplied && hasSentGreeting) {
      alert('对方未回复前，您只能发送一条问候语');
      return;
    }

    const newMessage: Message = {
      id: messages.length + 1,
      senderId: 'me',
      content: message,
      time: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages([...messages, newMessage]);
    setMessage('');

    if (!hasSentGreeting) {
      setHasSentGreeting(true);
    }
  };

  const canSendMessage = () => {
    if (isMutualFollow) return true;
    if (hasReplied) return true;
    if (!hasSentGreeting) return true;
    return false;
  };

  return (
    <div className="fixed inset-0 bg-white z-50 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 h-20 border-b border-gray-200 bg-white">
        <div className="flex items-center gap-3 flex-1">
          <button onClick={() => navigate(-1)} className="p-3 -ml-2 hover:bg-gray-100 rounded-xl">
            <ArrowLeft size={28} />
          </button>
          <button
            onClick={() => navigate(`/user/${id}`)}
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
            onClick={() => navigate(`/order/new?guideId=${id}`)}
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
              onChange={(e) => setMessage(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder={canSendMessage() ? "输入消息..." : "对方回复后才可继续发送"}
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
      </div>
    </div>
  );
}
