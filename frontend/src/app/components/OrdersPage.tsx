import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ChevronRight, Star, TrendingUp, TrendingDown, Filter, Search, X, Send } from 'lucide-react';
import { useApp } from '../App';
import { apiClient, ApiError } from '../api/client';
import type { ServiceOrder } from '../api/types';
import { motion, AnimatePresence } from 'motion/react';

type OrderStatus = 'all' | 'ongoing' | 'completed' | 'cancelled';

interface Order {
  id: string;
  route: string;
  counterpart: string;
  counterpartAvatar: string;
  date: string;
  endDate: string;
  amount: number;
  status: 'ongoing' | 'completed' | 'cancelled';
  type: 'income' | 'expense';
  travelers: number;
  days: number;
  rated?: boolean;
  rating?: number;
  review?: string;
}

const ORDERS: Order[] = [
  {
    id: 'ORD-20260601-001',
    route: '上海 → 苏州 → 杭州',
    counterpart: '李明',
    counterpartAvatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=liming',
    date: '2026-06-01',
    endDate: '2026-06-03',
    amount: 3000,
    status: 'completed',
    type: 'income',
    travelers: 2,
    days: 3,
    rated: true,
    rating: 5,
    review: '非常棒的旅行体验，导游专业细心！',
  },
  {
    id: 'ORD-20260515-002',
    route: '上海 → 北京',
    counterpart: '王芳',
    counterpartAvatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=wangfang',
    date: '2026-05-15',
    endDate: '2026-05-18',
    amount: 4500,
    status: 'completed',
    type: 'income',
    travelers: 3,
    days: 4,
    rated: false,
  },
  {
    id: 'ORD-20260610-003',
    route: '上海 → 黄山',
    counterpart: '陈磊',
    counterpartAvatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=chenlei',
    date: '2026-06-10',
    endDate: '2026-06-12',
    amount: 2000,
    status: 'ongoing',
    type: 'income',
    travelers: 1,
    days: 2,
  },
  {
    id: 'ORD-20260420-004',
    route: '杭州 → 西湖 → 乌镇',
    counterpart: '张伟',
    counterpartAvatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=zhangwei',
    date: '2026-04-20',
    endDate: '2026-04-22',
    amount: 2800,
    status: 'completed',
    type: 'income',
    travelers: 2,
    days: 3,
    rated: true,
    rating: 4,
    review: '整体不错，但时间安排略紧。',
  },
  {
    id: 'ORD-20260301-005',
    route: '上海 → 南京',
    counterpart: '刘洋',
    counterpartAvatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=liuyang',
    date: '2026-03-01',
    endDate: '2026-03-02',
    amount: 1200,
    status: 'cancelled',
    type: 'income',
    travelers: 1,
    days: 1,
  },
];

const TRAVELER_ORDERS: Order[] = [
  {
    id: 'ORD-20260601-T01',
    route: '上海 → 苏州 → 杭州',
    counterpart: '张伟导游',
    counterpartAvatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=zhangwei',
    date: '2026-06-01',
    endDate: '2026-06-03',
    amount: 3000,
    status: 'completed',
    type: 'expense',
    travelers: 2,
    days: 3,
    rated: false,
  },
  {
    id: 'ORD-20260610-T02',
    route: '北京 → 故宫 → 长城',
    counterpart: '王磊导游',
    counterpartAvatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=wanglei',
    date: '2026-06-10',
    endDate: '2026-06-12',
    amount: 2400,
    status: 'ongoing',
    type: 'expense',
    travelers: 2,
    days: 3,
  },
  {
    id: 'ORD-20260420-T03',
    route: '成都 → 九寨沟',
    counterpart: '李娜导游',
    counterpartAvatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=lina',
    date: '2026-04-20',
    endDate: '2026-04-23',
    amount: 3600,
    status: 'completed',
    type: 'expense',
    travelers: 2,
    days: 4,
    rated: true,
    rating: 5,
    review: '九寨沟太美了，导游讲解很专业！',
  },
];

const STATUS_TABS: { key: OrderStatus; label: string }[] = [
  { key: 'all', label: '全部' },
  { key: 'ongoing', label: '进行中' },
  { key: 'completed', label: '已完成' },
  { key: 'cancelled', label: '已取消' },
];

const STATUS_COLORS: Record<string, string> = {
  ongoing: 'bg-blue-100 text-blue-700',
  completed: 'bg-green-100 text-green-700',
  cancelled: 'bg-gray-100 text-gray-500',
};

const STATUS_LABELS: Record<string, string> = {
  ongoing: '进行中',
  completed: '已完成',
  cancelled: '已取消',
};

interface RatingModalProps {
  order: Order;
  onClose: () => void;
  onSubmit: (orderId: string, rating: number, review: string) => void;
}

function RatingModal({ order, onClose, onSubmit }: RatingModalProps) {
  const [rating, setRating] = useState(0);
  const [hovered, setHovered] = useState(0);
  const [review, setReview] = useState('');
  const [tags, setTags] = useState<string[]>([]);

  const TAG_OPTIONS = ['专业负责', '热情友好', '准时守约', '讲解生动', '路线合理', '性价比高'];

  const toggleTag = (tag: string) => {
    setTags(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 z-50 flex items-end"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        className="bg-white w-full rounded-t-3xl p-6 max-h-[85vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-bold">评价此次服务</h3>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full">
            <X size={20} />
          </button>
        </div>

        <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl mb-6">
          <img src={order.counterpartAvatar} alt="" className="w-12 h-12 rounded-full bg-white" />
          <div>
            <p className="font-semibold">{order.counterpart}</p>
            <p className="text-sm text-gray-500">{order.route}</p>
          </div>
        </div>

        <p className="text-center text-sm text-gray-600 mb-3">总体评分</p>
        <div className="flex justify-center gap-3 mb-6">
          {[1, 2, 3, 4, 5].map(i => (
            <motion.button
              key={i}
              whileHover={{ scale: 1.2 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => setRating(i)}
              onMouseEnter={() => setHovered(i)}
              onMouseLeave={() => setHovered(0)}
            >
              <Star
                size={36}
                className={`transition-colors ${
                  i <= (hovered || rating) ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'
                }`}
              />
            </motion.button>
          ))}
        </div>

        {rating > 0 && (
          <p className="text-center font-medium text-yellow-600 mb-4 text-sm">
            {['', '很差', '较差', '一般', '不错', '非常满意'][rating]}
          </p>
        )}

        <div className="mb-5">
          <p className="text-sm font-medium text-gray-700 mb-3">快速标签（可多选）</p>
          <div className="flex flex-wrap gap-2">
            {TAG_OPTIONS.map(tag => (
              <button
                key={tag}
                onClick={() => toggleTag(tag)}
                className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${
                  tags.includes(tag)
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'border-gray-300 text-gray-600 hover:border-blue-400'
                }`}
              >
                {tag}
              </button>
            ))}
          </div>
        </div>

        <div className="mb-6">
          <p className="text-sm font-medium text-gray-700 mb-2">详细评价</p>
          <textarea
            value={review}
            onChange={e => setReview(e.target.value)}
            placeholder="分享你的旅行体验，帮助其他旅行者做决定..."
            rows={4}
            className="w-full px-4 py-3 border border-gray-200 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
          />
          <p className="text-right text-xs text-gray-400 mt-1">{review.length}/300</p>
        </div>

        <button
          onClick={() => {
            if (rating > 0) onSubmit(order.id, rating, review);
          }}
          disabled={rating === 0}
          className="w-full py-3.5 bg-blue-600 text-white rounded-xl font-semibold disabled:opacity-40 disabled:cursor-not-allowed hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
        >
          <Send size={18} />
          提交评价
        </button>
      </motion.div>
    </motion.div>
  );
}

export function OrdersPage() {
  const { role, user, data, refreshAppData } = useApp();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<OrderStatus>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [ratingOrder, setRatingOrder] = useState<Order | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [orders, setOrders] = useState<Order[]>(role === 'guide' ? ORDERS : TRAVELER_ORDERS);

  const mapApiOrder = (order: ServiceOrder): Order => {
    const status = order.status === 'completed'
      ? 'completed'
      : order.status === 'cancelled'
        ? 'cancelled'
        : 'ongoing';
    const start = order.service_start_date ?? order.created_at?.slice(0, 10) ?? '待确认';
    const end = order.service_end_date ?? start;
    const startTime = new Date(start).getTime();
    const endTime = new Date(end).getTime();
    const days = Number.isFinite(startTime) && Number.isFinite(endTime)
      ? Math.max(1, Math.round((endTime - startTime) / 86400000) + 1)
      : 1;
    const route = typeof order.itinerary_json?.route === 'string'
      ? order.itinerary_json.route
      : `订单 ${order.id.slice(0, 8)}`;
    const isGuideIncome = user?.id === order.guide_user_id;
    const counterpartId = isGuideIncome ? order.traveler_user_id : order.guide_user_id;
    return {
      id: order.id,
      route,
      counterpart: `${isGuideIncome ? '旅行者' : '导游'} ${counterpartId.slice(0, 4)}`,
      counterpartAvatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${counterpartId}`,
      date: start,
      endDate: end,
      amount: Number(order.guide_price_amount),
      status,
      type: isGuideIncome ? 'income' : 'expense',
      travelers: order.traveler_count ?? 1,
      days,
      rated: false,
    };
  };

  const apiOrders = (data?.orders ?? []).map(mapApiOrder);
  const allOrders = apiOrders.length > 0 ? apiOrders : orders;

  const filtered = allOrders.filter(o => {
    const matchTab = activeTab === 'all' || o.status === activeTab;
    const matchSearch = o.route.includes(searchQuery) || o.counterpart.includes(searchQuery) || o.id.includes(searchQuery);
    return matchTab && matchSearch;
  });

  const totalIncome = allOrders.filter(o => o.status === 'completed').reduce((s, o) => s + o.amount, 0);
  const ongoingCount = allOrders.filter(o => o.status === 'ongoing').length;
  const completedCount = allOrders.filter(o => o.status === 'completed').length;

  const handleRatingSubmit = async (orderId: string, rating: number, review: string) => {
    setActionError(null);
    try {
      await apiClient.createReview(orderId, rating, review);
      await refreshAppData();
    } catch (error) {
      if (error instanceof ApiError && error.status !== 422 && error.status !== 404) {
        setActionError(error.message);
        return;
      }
    } finally {
      setOrders(prev => prev.map(o =>
        o.id === orderId ? { ...o, rated: true, rating, review } : o
      ));
      setRatingOrder(null);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white px-4 py-4 flex items-center gap-3 border-b border-gray-100 sticky top-0 z-30">
        <button onClick={() => navigate(-1)} className="p-2 -ml-2 hover:bg-gray-100 rounded-lg">
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-lg font-bold flex-1">订单管理</h1>
        <button className="p-2 hover:bg-gray-100 rounded-lg text-gray-500">
          <Filter size={20} />
        </button>
      </div>

      {/* Summary Cards */}
      <div className="px-4 py-4 grid grid-cols-3 gap-3">
        <div className="bg-white rounded-2xl p-4 shadow-sm text-center">
          <div className={`flex items-center justify-center gap-1 mb-1 ${role === 'guide' ? 'text-green-600' : 'text-red-500'}`}>
            {role === 'guide' ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
            <span className="text-xs font-medium">{role === 'guide' ? '总收入' : '总支出'}</span>
          </div>
          <p className={`text-xl font-bold ${role === 'guide' ? 'text-green-600' : 'text-red-500'}`}>
            ¥{totalIncome.toLocaleString()}
          </p>
        </div>
        <div className="bg-white rounded-2xl p-4 shadow-sm text-center">
          <p className="text-xs text-gray-500 mb-1">进行中</p>
          <p className="text-xl font-bold text-blue-600">{ongoingCount}</p>
        </div>
        <div className="bg-white rounded-2xl p-4 shadow-sm text-center">
          <p className="text-xs text-gray-500 mb-1">已完成</p>
          <p className="text-xl font-bold text-gray-800">{completedCount}</p>
        </div>
      </div>

      {/* Search */}
      <div className="px-4 mb-3">
        <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-4 py-2.5 shadow-sm">
          <Search size={16} className="text-gray-400 flex-shrink-0" />
          <input
            type="text"
            placeholder="搜索订单号、路线、对方姓名..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="flex-1 text-sm bg-transparent focus:outline-none"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')}>
              <X size={16} className="text-gray-400" />
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      {actionError && (
        <div className="mx-4 mb-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          {actionError}
        </div>
      )}

      {/* Tabs */}
      <div className="flex px-4 gap-2 mb-4 overflow-x-auto">
        {STATUS_TABS.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-colors ${
              activeTab === tab.key
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-600 border border-gray-200'
            }`}
          >
            {tab.label}
            {tab.key !== 'all' && (
              <span className="ml-1 text-xs opacity-70">
                ({allOrders.filter(o => o.status === tab.key).length})
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Orders List */}
      <div className="px-4 pb-6 space-y-3">
        <AnimatePresence mode="popLayout">
          {filtered.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="bg-white rounded-2xl p-12 text-center text-gray-400"
            >
              <p className="text-4xl mb-3">📭</p>
              <p className="font-medium">暂无相关订单</p>
            </motion.div>
          ) : (
            filtered.map(order => (
              <motion.div
                key={order.id}
                layout
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.97 }}
                className="bg-white rounded-2xl shadow-sm overflow-hidden"
              >
                {/* Card Header */}
                <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b border-gray-100">
                  <span className="text-xs text-gray-500 font-mono">{order.id}</span>
                  <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[order.status]}`}>
                    {STATUS_LABELS[order.status]}
                  </span>
                </div>

                {/* Card Body */}
                <div className="px-4 py-4">
                  <div className="flex items-start gap-3 mb-4">
                    <img
                      src={order.counterpartAvatar}
                      alt={order.counterpart}
                      className="w-11 h-11 rounded-full bg-gray-100 flex-shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-900">{order.counterpart}</p>
                      <p className="text-sm text-gray-600 truncate">{order.route}</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className={`text-lg font-bold ${order.type === 'income' ? 'text-green-600' : 'text-gray-800'}`}>
                        {order.type === 'income' ? '+' : '-'}¥{order.amount.toLocaleString()}
                      </p>
                      <p className="text-xs text-gray-400">{order.days}天</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 text-xs text-gray-500 mb-4">
                    <span>📅 {order.date} ~ {order.endDate}</span>
                    <span>👥 {order.travelers}人</span>
                  </div>

                  {/* Rating display */}
                  {order.rated && order.rating && (
                    <div className="bg-yellow-50 border border-yellow-100 rounded-xl p-3 mb-3">
                      <div className="flex items-center gap-1 mb-1">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star
                            key={i}
                            size={14}
                            className={i < order.rating! ? 'fill-yellow-400 text-yellow-400' : 'text-gray-200'}
                          />
                        ))}
                        <span className="text-xs text-gray-500 ml-1">已评价</span>
                      </div>
                      {order.review && (
                        <p className="text-xs text-gray-600 line-clamp-2">{order.review}</p>
                      )}
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex gap-2">
                    {order.status === 'completed' && !order.rated && (
                      <button
                        onClick={() => setRatingOrder(order)}
                        className="flex-1 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition-colors flex items-center justify-center gap-1.5"
                      >
                        <Star size={15} />
                        去评价
                      </button>
                    )}
                    {order.status === 'ongoing' && (
                      <button className="flex-1 py-2.5 bg-blue-50 text-blue-700 rounded-xl text-sm font-medium border border-blue-200">
                        查看进度
                      </button>
                    )}
                    <button
                      onClick={() => navigate(`/order/${order.id}`)}
                      className="flex items-center justify-center gap-1.5 px-4 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50 transition-colors"
                    >
                      详情
                      <ChevronRight size={15} />
                    </button>
                  </div>
                </div>
              </motion.div>
            ))
          )}
        </AnimatePresence>
      </div>

      {/* Rating Modal */}
      <AnimatePresence>
        {ratingOrder && (
          <RatingModal
            order={ratingOrder}
            onClose={() => setRatingOrder(null)}
            onSubmit={handleRatingSubmit}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
