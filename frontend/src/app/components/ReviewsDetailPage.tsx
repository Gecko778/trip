import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Star, Filter } from 'lucide-react';

export function ReviewsDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [filterRating, setFilterRating] = useState<number | null>(null);

  const allReviews = [
    {
      id: 1,
      traveler: {
        name: '王小明',
        avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=wang',
        nationality: '🇨🇳',
      },
      rating: 5,
      date: '2026-05-10',
      route: '上海-苏州-杭州',
      content: '非常专业的导游！行程安排合理，讲解详细，还推荐了很多当地美食。强烈推荐！',
      photos: ['photo1.jpg', 'photo2.jpg'],
      helpful: 24,
    },
    {
      id: 2,
      traveler: {
        name: '李华',
        avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=lh',
        nationality: '🇨🇳',
      },
      rating: 5,
      date: '2026-04-25',
      route: '上海市区游',
      content: '张导游很守时，服务态度好，对景点非常熟悉。我们一家人玩得很开心。',
      photos: [],
      helpful: 18,
    },
    {
      id: 3,
      traveler: {
        name: '陈敏',
        avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=cm',
        nationality: '🇨🇳',
      },
      rating: 4,
      date: '2026-04-12',
      route: '上海-南京',
      content: '整体不错，就是有一天下雨临时调整了行程，但导游处理得很好。',
      photos: ['photo3.jpg'],
      helpful: 12,
    },
    {
      id: 4,
      traveler: {
        name: 'John Smith',
        avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=john',
        nationality: '🇺🇸',
      },
      rating: 5,
      date: '2026-03-30',
      route: '上海-周庄古镇',
      content: 'Excellent guide! Very knowledgeable and patient. Made our trip memorable.',
      photos: ['photo4.jpg', 'photo5.jpg', 'photo6.jpg'],
      helpful: 31,
    },
    {
      id: 5,
      traveler: {
        name: '佐藤花子',
        avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=hanako',
        nationality: '🇯🇵',
      },
      rating: 5,
      date: '2026-03-15',
      route: '上海-杭州西湖',
      content: '素晴らしいガイドでした。歴史についての説明がとても分かりやすかったです。',
      photos: [],
      helpful: 22,
    },
    {
      id: 6,
      traveler: {
        name: '张丽',
        avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=zhangli',
        nationality: '🇨🇳',
      },
      rating: 4,
      date: '2026-02-28',
      route: '上海-苏州园林',
      content: '导游很专业，对园林的讲解很到位。如果能提供更多拍照建议就更好了。',
      photos: ['photo7.jpg'],
      helpful: 15,
    },
  ];

  const filteredReviews = filterRating
    ? allReviews.filter(r => r.rating === filterRating)
    : allReviews;

  const ratingDistribution = [5, 4, 3, 2, 1].map(rating => ({
    rating,
    count: allReviews.filter(r => r.rating === rating).length,
    percentage: (allReviews.filter(r => r.rating === rating).length / allReviews.length) * 100,
  }));

  const averageRating = (
    allReviews.reduce((sum, r) => sum + r.rating, 0) / allReviews.length
  ).toFixed(1);

  return (
    <div className="fixed inset-0 bg-gray-50 z-50 overflow-y-auto pt-14">
      {/* Header */}
      <div className="sticky top-14 bg-white border-b border-gray-200 px-4 h-14 flex items-center gap-3 z-10">
        <button onClick={() => navigate(-1)} className="p-2 -ml-2 hover:bg-gray-100 rounded-lg">
          <ArrowLeft size={20} />
        </button>
        <h1 className="font-bold flex-1">所有评价</h1>
      </div>

      <div className="max-w-screen-xl mx-auto p-4 pb-20">
        {/* Rating Summary */}
        <div className="bg-white rounded-xl shadow-sm p-6 mb-4">
          <div className="flex items-center gap-6 mb-6">
            <div className="text-center">
              <div className="text-5xl font-bold text-blue-600 mb-2">{averageRating}</div>
              <div className="flex items-center gap-1 justify-center mb-1">
                {[1, 2, 3, 4, 5].map(i => (
                  <Star key={i} size={16} className="fill-yellow-400 text-yellow-400" />
                ))}
              </div>
              <p className="text-sm text-gray-600">{allReviews.length}条评价</p>
            </div>

            <div className="flex-1 space-y-2">
              {ratingDistribution.map(({ rating, count, percentage }) => (
                <button
                  key={rating}
                  onClick={() => setFilterRating(filterRating === rating ? null : rating)}
                  className={`w-full flex items-center gap-3 hover:bg-gray-50 p-1 rounded ${
                    filterRating === rating ? 'bg-blue-50' : ''
                  }`}
                >
                  <span className="text-sm text-gray-600 w-8">{rating}星</span>
                  <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-yellow-400"
                      style={{ width: `${percentage}%` }}
                    ></div>
                  </div>
                  <span className="text-sm text-gray-600 w-10 text-right">{count}</span>
                </button>
              ))}
            </div>
          </div>

          {filterRating && (
            <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
              <span className="text-sm text-blue-700">
                显示 {filterRating} 星评价 ({filteredReviews.length}条)
              </span>
              <button
                onClick={() => setFilterRating(null)}
                className="text-sm text-blue-600 hover:text-blue-700 font-medium"
              >
                清除筛选
              </button>
            </div>
          )}
        </div>

        {/* Reviews List */}
        <div className="space-y-4">
          {filteredReviews.map(review => (
            <div key={review.id} className="bg-white rounded-xl shadow-sm p-6">
              <div className="flex items-start gap-3 mb-3">
                <img
                  src={review.traveler.avatar}
                  alt={review.traveler.name}
                  className="w-12 h-12 rounded-full"
                />
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{review.traveler.name}</p>
                      <span className="text-xl">{review.traveler.nationality}</span>
                    </div>
                    <span className="text-xs text-gray-500">{review.date}</span>
                  </div>
                  <div className="flex items-center gap-2 mb-1">
                    <div className="flex items-center gap-0.5">
                      {[1, 2, 3, 4, 5].map(i => (
                        <Star
                          key={i}
                          size={14}
                          className={i <= review.rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}
                        />
                      ))}
                    </div>
                    <span className="text-xs text-gray-500">· {review.route}</span>
                  </div>
                </div>
              </div>

              <p className="text-gray-700 mb-3 leading-relaxed">{review.content}</p>

              {review.photos.length > 0 && (
                <div className="flex gap-2 mb-3 overflow-x-auto">
                  {review.photos.map((photo, i) => (
                    <div key={i} className="w-24 h-24 bg-gray-200 rounded-lg flex-shrink-0"></div>
                  ))}
                </div>
              )}

              <button className="text-sm text-gray-500 hover:text-gray-700">
                👍 有帮助 ({review.helpful})
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
