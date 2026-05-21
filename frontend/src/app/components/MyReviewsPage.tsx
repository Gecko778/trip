import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Star, ChevronRight, MessageSquare, Inbox } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

type Tab = 'sent' | 'received';

interface ReviewItem {
  id: string;
  orderId: string;
  orderRoute: string;
  orderDate: string;
  orderAmount: number;
  orderDays: number;
  counterpart: string;
  counterpartAvatar: string;
  counterpartRole: string;
  rating: number;
  comment: string;
  tags: string[];
  createdAt: string;
}

const SENT_REVIEWS: ReviewItem[] = [
  {
    id: 'REV-S-001',
    orderId: 'ORD-20260420-T03',
    orderRoute: '成都 → 九寨沟',
    orderDate: '2026-04-20',
    orderAmount: 3600,
    orderDays: 4,
    counterpart: '李娜',
    counterpartAvatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=lina',
    counterpartRole: '导游',
    rating: 5,
    comment: '九寨沟太美了，导游讲解很专业，对每一处景点的历史文化都如数家珍。全程安排紧凑但不赶，非常推荐！',
    tags: ['专业负责', '讲解生动', '路线合理'],
    createdAt: '2026-04-24',
  },
  {
    id: 'REV-S-002',
    orderId: 'ORD-20260310-T04',
    orderRoute: '西安 → 兵马俑 → 华山',
    orderDate: '2026-03-10',
    orderAmount: 2800,
    orderDays: 3,
    counterpart: '赵明',
    counterpartAvatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=zhaoming',
    counterpartRole: '导游',
    rating: 4,
    comment: '整体体验不错，导游比较负责，但接机稍微晚了些。景点安排合理，性价比还可以。',
    tags: ['热情友好', '准时守约'],
    createdAt: '2026-03-14',
  },
  {
    id: 'REV-S-003',
    orderId: 'ORD-20260115-T05',
    orderRoute: '桂林 → 漓江 → 阳朔',
    orderDate: '2026-01-15',
    orderAmount: 3200,
    orderDays: 4,
    counterpart: '孙丽',
    counterpartAvatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=sunli',
    counterpartRole: '导游',
    rating: 5,
    comment: '漓江风景绝美，导游全程非常用心，推荐的当地美食也很棒。下次来还会选择！',
    tags: ['专业负责', '热情友好', '性价比高'],
    createdAt: '2026-01-20',
  },
];

const RECEIVED_REVIEWS: ReviewItem[] = [
  {
    id: 'REV-R-001',
    orderId: 'ORD-20260601-001',
    orderRoute: '上海 → 苏州 → 杭州',
    orderDate: '2026-06-01',
    orderAmount: 3000,
    orderDays: 3,
    counterpart: '李明',
    counterpartAvatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=liming',
    counterpartRole: '旅行者',
    rating: 5,
    comment: '非常棒的旅行体验，导游专业细心，全程照顾有加，路线设计很合理，每个景点都有充足的时间游览。',
    tags: ['专业负责', '热情友好', '路线合理'],
    createdAt: '2026-06-04',
  },
  {
    id: 'REV-R-002',
    orderId: 'ORD-20260420-004',
    orderRoute: '杭州 → 西湖 → 乌镇',
    orderDate: '2026-04-20',
    orderAmount: 2800,
    orderDays: 3,
    counterpart: '张伟',
    counterpartAvatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=zhangwei',
    counterpartRole: '旅行者',
    rating: 4,
    comment: '整体不错，但时间安排略紧，有些景点没能充分游览。导游服务态度很好，下次希望能放慢节奏。',
    tags: ['热情友好', '准时守约'],
    createdAt: '2026-04-24',
  },
  {
    id: 'REV-R-003',
    orderId: 'ORD-20260215-006',
    orderRoute: '上海 → 周庄 → 同里',
    orderDate: '2026-02-15',
    orderAmount: 1800,
    orderDays: 2,
    counterpart: '吴晓',
    counterpartAvatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=wuxiao',
    counterpartRole: '旅行者',
    rating: 5,
    comment: '超级满意！导游对江南古镇了解很深，讲了很多不为人知的历史故事，非常有趣。强烈推荐！',
    tags: ['讲解生动', '专业负责', '性价比高'],
    createdAt: '2026-02-18',
  },
];

function StarRow({ rating, size = 16 }: { rating: number; size?: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          size={size}
          className={i < rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-200 fill-gray-200'}
        />
      ))}
    </div>
  );
}

interface DetailSheetProps {
  review: ReviewItem;
  onClose: () => void;
}

function DetailSheet({ review, onClose }: DetailSheetProps) {
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
        transition={{ type: 'spring', damping: 26, stiffness: 320 }}
        className="bg-white w-full rounded-t-3xl max-h-[88vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 bg-gray-200 rounded-full" />
        </div>

        <div className="px-5 py-4">
          <h3 className="text-lg font-bold mb-5">订单详情</h3>

          {/* Order Info */}
          <div className="bg-gray-50 rounded-2xl p-4 mb-5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-500 font-mono">{review.orderId}</span>
              <span className="px-2.5 py-1 bg-green-100 text-green-700 text-xs rounded-full font-medium">已完成</span>
            </div>
            <div>
              <p className="text-base font-semibold text-gray-900">{review.orderRoute}</p>
              <p className="text-sm text-gray-500 mt-0.5">{review.orderDate} · {review.orderDays}天</p>
            </div>
            <div className="flex items-center justify-between pt-2 border-t border-gray-200">
              <span className="text-sm text-gray-600">订单金额</span>
              <span className="text-xl font-bold text-gray-900">¥{review.orderAmount.toLocaleString()}</span>
            </div>
          </div>

          {/* Counterpart */}
          <div className="flex items-center gap-3 mb-5">
            <img src={review.counterpartAvatar} alt="" className="w-12 h-12 rounded-full bg-gray-100" />
            <div>
              <p className="font-semibold">{review.counterpart}</p>
              <p className="text-sm text-gray-500">{review.counterpartRole}</p>
            </div>
          </div>

          {/* Review */}
          <div className="border border-gray-100 rounded-2xl p-4 mb-4">
            <div className="flex items-center justify-between mb-3">
              <StarRow rating={review.rating} size={18} />
              <span className="text-xs text-gray-400">{review.createdAt}</span>
            </div>
            {review.tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-3">
                {review.tags.map(tag => (
                  <span key={tag} className="px-2.5 py-1 bg-blue-50 text-blue-700 rounded-full text-xs">
                    {tag}
                  </span>
                ))}
              </div>
            )}
            <p className="text-sm text-gray-700 leading-relaxed">{review.comment}</p>
          </div>

          <button
            onClick={onClose}
            className="w-full py-3.5 border border-gray-200 rounded-xl text-gray-600 font-medium hover:bg-gray-50 transition-colors"
          >
            关闭
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

export function MyReviewsPage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<Tab>('sent');
  const [selectedReview, setSelectedReview] = useState<ReviewItem | null>(null);

  const reviews = activeTab === 'sent' ? SENT_REVIEWS : RECEIVED_REVIEWS;

  const avgRating = reviews.length > 0
    ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1)
    : '0.0';

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white px-4 py-4 flex items-center gap-3 border-b border-gray-100 sticky top-0 z-30">
        <button onClick={() => navigate(-1)} className="p-2 -ml-2 hover:bg-gray-100 rounded-lg">
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-lg font-bold flex-1">我的评价</h1>
      </div>

      {/* Tab Switcher */}
      <div className="bg-white px-4 pt-4 pb-0">
        <div className="flex border-b border-gray-100">
          {[
            { key: 'sent' as Tab, label: '我发出的', icon: MessageSquare, count: SENT_REVIEWS.length },
            { key: 'received' as Tab, label: '我收到的', icon: Inbox, count: RECEIVED_REVIEWS.length },
          ].map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex-1 flex items-center justify-center gap-2 py-3.5 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === tab.key
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500'
                }`}
              >
                <Icon size={16} />
                {tab.label}
                <span className={`px-1.5 py-0.5 rounded-full text-xs ${
                  activeTab === tab.key ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-500'
                }`}>
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Summary Banner */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          className="mx-4 mt-4 mb-3 bg-white rounded-2xl px-5 py-4 shadow-sm flex items-center gap-4"
        >
          <div className="text-center">
            <p className="text-3xl font-bold text-gray-900">{avgRating}</p>
            <StarRow rating={Math.round(parseFloat(avgRating))} size={13} />
            <p className="text-xs text-gray-400 mt-1">平均评分</p>
          </div>
          <div className="w-px h-12 bg-gray-100" />
          <div className="flex-1 grid grid-cols-3 gap-2 text-center">
            {[5, 4, 3].map(star => {
              const count = reviews.filter(r => r.rating === star).length;
              const pct = reviews.length > 0 ? Math.round(count / reviews.length * 100) : 0;
              return (
                <div key={star}>
                  <p className="text-lg font-bold text-gray-800">{pct}%</p>
                  <div className="flex justify-center gap-0.5">
                    {Array.from({ length: star }).map((_, i) => (
                      <Star key={i} size={8} className="fill-yellow-400 text-yellow-400" />
                    ))}
                  </div>
                  <p className="text-xs text-gray-400">{count}条</p>
                </div>
              );
            })}
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Review List */}
      <div className="px-4 pb-6 space-y-3">
        <AnimatePresence mode="popLayout">
          {reviews.map((review, idx) => (
            <motion.button
              key={review.id}
              layout
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.97 }}
              transition={{ delay: idx * 0.04 }}
              onClick={() => setSelectedReview(review)}
              className="w-full bg-white rounded-2xl shadow-sm p-4 text-left hover:shadow-md transition-shadow"
            >
              {/* Counterpart + Date */}
              <div className="flex items-center gap-3 mb-3">
                <img
                  src={review.counterpartAvatar}
                  alt={review.counterpart}
                  className="w-10 h-10 rounded-full bg-gray-100 flex-shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900 text-sm">{review.counterpart}</p>
                  <p className="text-xs text-gray-400">{review.counterpartRole} · {review.createdAt}</p>
                </div>
                <ChevronRight size={16} className="text-gray-300 flex-shrink-0" />
              </div>

              {/* Route */}
              <p className="text-sm text-gray-600 mb-2 truncate">{review.orderRoute}</p>

              {/* Stars */}
              <div className="mb-2">
                <StarRow rating={review.rating} size={14} />
              </div>

              {/* Tags */}
              {review.tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {review.tags.map(tag => (
                    <span key={tag} className="px-2 py-0.5 bg-blue-50 text-blue-600 rounded-full text-xs">
                      {tag}
                    </span>
                  ))}
                </div>
              )}

              {/* Comment excerpt */}
              <p className="text-sm text-gray-700 line-clamp-2 leading-relaxed">{review.comment}</p>
            </motion.button>
          ))}
        </AnimatePresence>
      </div>

      {/* Detail Sheet */}
      <AnimatePresence>
        {selectedReview && (
          <DetailSheet review={selectedReview} onClose={() => setSelectedReview(null)} />
        )}
      </AnimatePresence>
    </div>
  );
}
