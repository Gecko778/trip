import { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, MessageCircle, UserPlus, UserMinus, Star, MapPin, Calendar, Award, Shield, Languages, Plane, ChevronRight, RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useApp } from '../App';
import { apiClient, ApiError } from '../api/client';
import type { PublicUserProfile } from '../api/types';

type ViewRole = 'guide' | 'traveler';
const fallbackAvatar = (seed: string) => `https://api.dicebear.com/7.x/avataaars/svg?seed=${seed}`;

export function UserProfilePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data, refreshAppData } = useApp();
  const [isFollowing, setIsFollowing] = useState(false);
  const [followError, setFollowError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'reviews' | 'gallery'>('overview');
  const [viewRole, setViewRole] = useState<ViewRole>('guide');
  const [isAnimating, setIsAnimating] = useState(false);
  const [profile, setProfile] = useState<PublicUserProfile | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let canceled = false;
    const loadProfile = async () => {
      if (!id) return;
      setLoadError(null);
      try {
        let nextProfile: PublicUserProfile;
        try {
          nextProfile = await apiClient.publicUserProfile(id);
        } catch (error) {
          const guideProfile = await apiClient.guideProfile(id);
          nextProfile = await apiClient.publicUserProfile(guideProfile.user_id);
          setViewRole('guide');
        }
        if (canceled) return;
        setProfile(nextProfile);
        setIsFollowing(Boolean(nextProfile.is_following));
        if (!nextProfile.guide_profiles.length && nextProfile.traveler_profiles.length) {
          setViewRole('traveler');
        }
      } catch (error) {
        if (canceled) return;
        setLoadError(error instanceof ApiError ? error.message : '用户资料加载失败');
      }
    };
    loadProfile();
    return () => {
      canceled = true;
    };
  }, [id]);

  const userData = useMemo(() => {
    if (!profile) return null;
    const base = profile.user;
    const avatar = base.avatar_url ?? fallbackAvatar(base.id);
    const guide = profile.guide_profiles[0];
    const traveler = profile.traveler_profiles[0];
    return {
      guide: guide
        ? {
            id: base.id,
            name: base.display_name,
            avatar,
            age: guide.birth_year ? new Date().getFullYear() - guide.birth_year : undefined,
            gender: guide.gender,
            location: guide.home_region_name ?? `地区 ${guide.home_region_id.slice(0, 4)}`,
            verified: guide.verification_status === 'approved',
            rating: Number(guide.rating ?? 0),
            totalReviews: 0,
            completedTrips: guide.completed_order_count,
            languages: guide.language_tags.length ? guide.language_tags : ['English'],
            memberSince: '已注册用户',
            responseTime: guide.average_response_seconds
              ? `${Math.round(guide.average_response_seconds / 60)}分钟`
              : '待统计',
            cancellationRate: `${(Number(guide.cancellation_rate) * 100).toFixed(1)}%`,
            bio: '',
            serviceAreas: guide.service_regions?.length
              ? guide.service_regions.map(region => region.name)
              : [guide.home_region_name ?? `地区 ${guide.home_region_id.slice(0, 4)}`],
            pricePerDay: Number(guide.daily_price_amount),
            airportPickup: guide.offers_pickup,
            specialties: guide.language_tags,
            certifications: [guide.verification_status === 'approved' ? '导游认证已通过' : '导游认证待完善'],
          }
        : null,
      traveler: traveler
        ? {
            id: base.id,
            name: base.display_name,
            avatar,
            age: undefined,
            gender: '',
            location: base.preferred_locale,
            verified: base.status === 'active',
            rating: 0,
            totalReviews: 0,
            completedTrips: 0,
            languages: [base.preferred_locale],
            memberSince: '已注册用户',
            responseTime: '待统计',
            bio: '',
            interests: Object.keys(traveler.preference_json ?? {}),
            traveledCountries: 0,
            plannedTrips: 0,
            visitedCities: 0,
          }
        : null,
    };
  }, [profile]);

  const availableRoles = {
    guide: Boolean(userData?.guide),
    traveler: Boolean(userData?.traveler),
  };
  const user = userData?.[viewRole] ?? userData?.guide ?? userData?.traveler;

  const handleRoleSwitch = () => {
    if (!availableRoles.guide || !availableRoles.traveler) return;
    setIsAnimating(true);
    setTimeout(() => {
      setViewRole(prev => prev === 'guide' ? 'traveler' : 'guide');
      setTimeout(() => setIsAnimating(false), 600);
    }, 300);
  };

  const handleBack = () => {
    navigate(-1);
  };

  const handleFollowToggle = async () => {
    if (!user?.id) return;
    const nextValue = !isFollowing;
    setIsFollowing(nextValue);
    setFollowError(null);
    try {
      if (nextValue) {
        await apiClient.followUser(user.id, data?.selectedMarket?.id ?? null);
      } else {
        await apiClient.unfollowUser(user.id);
      }
      await refreshAppData();
    } catch (error) {
      setIsFollowing(!nextValue);
      setFollowError(error instanceof ApiError ? error.message : '关注状态更新失败');
    }
  };

  const recentReviews: Array<{
    id: number;
    reviewer: { name: string; avatar: string; nationality: string };
    rating: number;
    date: string;
    route: string;
    content: string;
    photos: string[];
    helpful: number;
  }> = [];

  const galleryPhotos: string[] = [];

  const getCountryFlag = (lang: string) => {
    const flagMap: { [key: string]: string } = {
      '中文': '🇨🇳',
      'English': '🇬🇧',
      '日本語': '🇯🇵',
      'Español': '🇪🇸',
      'Français': '🇫🇷',
    };
    return flagMap[lang] || '🌐';
  };

  if (loadError) {
    return (
      <div className="fixed inset-0 bg-gray-50 z-50">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-4 h-14 flex items-center gap-3 z-10">
          <button onClick={handleBack} className="p-2 -ml-2 hover:bg-gray-100 rounded-lg">
            <ArrowLeft size={20} />
          </button>
          <h1 className="font-bold flex-1">个人主页</h1>
        </div>
        <div className="p-6 text-sm text-red-700">{loadError}</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="fixed inset-0 bg-gray-50 z-50">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-4 h-14 flex items-center gap-3 z-10">
          <button onClick={handleBack} className="p-2 -ml-2 hover:bg-gray-100 rounded-lg">
            <ArrowLeft size={20} />
          </button>
          <h1 className="font-bold flex-1">个人主页</h1>
        </div>
        <div className="p-6 text-sm text-gray-500">正在加载用户资料...</div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-gray-50 z-50 overflow-y-auto">
      {/* Header */}
      <div className="sticky top-0 bg-white border-b border-gray-200 px-4 h-14 flex items-center gap-3 z-10">
        <button onClick={handleBack} className="p-2 -ml-2 hover:bg-gray-100 rounded-lg">
          <ArrowLeft size={20} />
        </button>
        <h1 className="font-bold flex-1">个人主页</h1>
      </div>

      <div className="max-w-screen-xl mx-auto">
        {/* Profile Header */}
        <div className="bg-white border-b border-gray-200 p-6">
          <div className="flex gap-4 mb-4">
            {/* Avatar with Role Switch */}
            <div className="relative">
              <AnimatePresence mode="wait">
                <motion.button
                  key={viewRole}
                  onClick={handleRoleSwitch}
                  disabled={isAnimating || !availableRoles.guide || !availableRoles.traveler}
                  initial={{ scale: 0.8, rotate: -180, opacity: 0 }}
                  animate={{ scale: 1, rotate: 0, opacity: 1 }}
                  exit={{ scale: 0.8, rotate: 180, opacity: 0 }}
                  transition={{ duration: 0.6, type: "spring" }}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="relative block disabled:opacity-50 cursor-pointer"
                >
                  <img
                    src={user.avatar}
                    alt={user.name}
                    className="w-24 h-24 rounded-full bg-gray-100"
                  />

                  {/* Role Indicator */}
                  <div className="absolute -top-1 -left-1 w-8 h-8 bg-white rounded-full shadow-lg flex items-center justify-center text-lg border-2 border-gray-200">
                    {isAnimating ? (
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 0.6, ease: "linear", repeat: Infinity }}
                      >
                        <RefreshCw size={14} className="text-blue-600" />
                      </motion.div>
                    ) : (
                      <span>{viewRole === 'traveler' ? '😎' : '🧑‍✈️'}</span>
                    )}
                  </div>
                </motion.button>
              </AnimatePresence>

              {/* Tap Hint */}
              {availableRoles.guide && availableRoles.traveler && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 }}
                  className="absolute -bottom-6 left-1/2 -translate-x-1/2 whitespace-nowrap text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded"
                >
                  点击切换身份
                </motion.div>
              )}
            </div>

            <div className="flex-1 mt-2">
              <AnimatePresence mode="wait">
                <motion.div
                  key={viewRole}
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  transition={{ duration: 0.3 }}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <h2 className="text-2xl font-bold">{user.name}</h2>
                    {user.verified && (
                      <Shield size={20} className="text-blue-600" />
                    )}
                    {viewRole === 'guide' && (
                      <Award size={20} className="text-yellow-500" />
                    )}
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                      viewRole === 'guide'
                        ? 'bg-blue-100 text-blue-700'
                        : 'bg-purple-100 text-purple-700'
                    }`}>
                      {viewRole === 'guide' ? '导游身份' : '旅行者身份'}
                    </span>
                  </div>

                  <div className="flex items-center gap-3 text-sm text-gray-600 mb-2">
                    <div className="flex items-center gap-1">
                      <MapPin size={14} />
                      <span>{user.location}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Star size={14} className="fill-yellow-400 text-yellow-400" />
                      <span className="font-medium">{user.rating}</span>
                      <span className="text-gray-400">({user.totalReviews})</span>
                    </div>
                  </div>

                  {viewRole === 'guide' && 'serviceAreas' in user && (
                    <div className="text-sm text-gray-600 mb-3">
                      服务范围: {user.serviceAreas.join(' • ')}
                    </div>
                  )}

                  <div className="flex flex-wrap gap-2">
                    {viewRole === 'guide' && 'specialties' in user ? (
                      user.specialties.map(specialty => (
                        <span key={specialty} className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs">
                          {specialty}
                        </span>
                      ))
                    ) : (
                      'interests' in user && user.interests.map(interest => (
                        <span key={interest} className="px-2 py-1 bg-purple-100 text-purple-700 rounded text-xs">
                          {interest}
                        </span>
                      ))
                    )}
                  </div>
                </motion.div>
              </AnimatePresence>
            </div>

            {viewRole === 'guide' && 'pricePerDay' in user && (
              <div className="text-right">
                <div className="text-3xl font-bold text-blue-600">¥{user.pricePerDay}</div>
                <div className="text-sm text-gray-500">每天</div>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 mb-4">
            <Link
              to={`/chat/${user.id}`}
              className="flex-1 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium text-center flex items-center justify-center gap-2"
            >
              <MessageCircle size={18} />
              发消息
            </Link>
            <button
              onClick={handleFollowToggle}
              className={`flex-1 py-3 rounded-lg font-medium flex items-center justify-center gap-2 ${
                isFollowing
                  ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  : 'border-2 border-blue-600 text-blue-600 hover:bg-blue-50'
              }`}
            >
              {isFollowing ? <UserMinus size={18} /> : <UserPlus size={18} />}
              {isFollowing ? '取消关注' : '关注'}
            </button>
          </div>
          {followError && (
            <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {followError}
            </div>
          )}

          {/* Member Since */}
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <Calendar size={16} />
            <span>加入于 {user.memberSince}</span>
          </div>
        </div>

        {/* Stats */}
        <AnimatePresence mode="wait">
          <motion.div
            key={viewRole}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.3 }}
            className="bg-white border-b border-gray-200 p-6"
          >
            <div className="grid grid-cols-4 gap-4 text-center">
              <div>
                <p className="text-2xl font-bold text-blue-600">{user.completedTrips}</p>
                <p className="text-xs text-gray-600">{viewRole === 'guide' ? '成交订单' : '完成旅行'}</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-green-600">{user.responseTime}</p>
                <p className="text-xs text-gray-600">平均回复</p>
              </div>
              {viewRole === 'guide' && 'cancellationRate' in user ? (
                <>
                  <div>
                    <p className="text-2xl font-bold text-purple-600">{user.cancellationRate}</p>
                    <p className="text-xs text-gray-600">取消率</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-yellow-600">{user.rating}</p>
                    <p className="text-xs text-gray-600">综合评分</p>
                  </div>
                </>
              ) : 'traveledCountries' in user && (
                <>
                  <div>
                    <p className="text-2xl font-bold text-purple-600">{user.traveledCountries}</p>
                    <p className="text-xs text-gray-600">去过国家</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-orange-600">{user.plannedTrips}</p>
                    <p className="text-xs text-gray-600">计划中</p>
                  </div>
                </>
              )}
            </div>
          </motion.div>
        </AnimatePresence>

        {/* Tabs */}
        <div className="sticky top-14 bg-white border-b border-gray-200 z-10">
          <div className="flex">
            {[
              { id: 'overview', label: '概览' },
              { id: 'reviews', label: `评价(${user.totalReviews})` },
              { id: 'gallery', label: '相册' },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex-1 py-4 font-medium ${
                  activeTab === tab.id
                    ? 'text-blue-600 border-b-2 border-blue-600'
                    : 'text-gray-600'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Tab Content */}
        <div className="p-4 pb-20">
          <AnimatePresence mode="wait">
            <motion.div
              key={`${viewRole}-${activeTab}`}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              {activeTab === 'overview' && (
                <div className="space-y-4">
                  {/* Bio */}
                  {user.bio && (
                    <div className="bg-white rounded-xl shadow-sm p-6">
                      <h3 className="font-bold mb-3">个人简介</h3>
                      <p className="text-gray-700 leading-relaxed">{user.bio}</p>
                    </div>
                  )}

                  {/* Service Info for Guides */}
                  {viewRole === 'guide' && 'serviceAreas' in user && (
                    <div className="bg-white rounded-xl shadow-sm p-6">
                      <h3 className="font-bold mb-4">服务信息</h3>
                      <div className="space-y-3">
                        <div className="flex items-center gap-3">
                          <MapPin size={20} className="text-gray-400" />
                          <div>
                            <p className="text-sm text-gray-600">服务地区</p>
                            <p className="font-medium">{user.serviceAreas.join(' · ')}</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          <Plane size={20} className="text-gray-400" />
                          <div>
                            <p className="text-sm text-gray-600">接机服务</p>
                            <p className="font-medium">{user.airportPickup ? '提供' : '不提供'}</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          <Languages size={20} className="text-gray-400" />
                          <div>
                            <p className="text-sm text-gray-600">语言能力</p>
                            <p className="font-medium">{user.languages.join(' · ')}</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          <Award size={20} className="text-gray-400" />
                          <div>
                            <p className="text-sm text-gray-600">认证资质</p>
                            <div className="flex flex-wrap gap-2 mt-1">
                              {user.certifications.map(cert => (
                                <span key={cert} className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs">
                                  ✓ {cert}
                                </span>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Languages */}
                  <div className="bg-white rounded-xl shadow-sm p-6">
                    <div className="flex items-center gap-2 mb-3">
                      <Languages size={20} className="text-gray-400" />
                      <h3 className="font-bold">掌握的语言</h3>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {user.languages.map(lang => (
                        <div key={lang} className="flex items-center gap-2 px-3 py-2 bg-blue-50 text-blue-700 rounded-lg">
                          <span className="text-xl">{getCountryFlag(lang)}</span>
                          <span className="font-medium">{lang}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Availability Calendar for Guides */}
                  {viewRole === 'guide' && (
                    <div className="bg-white rounded-xl shadow-sm p-6">
                      <h3 className="font-bold mb-4">近期档期</h3>
                      <p className="text-sm text-gray-600">真实档期日历还没有接入，当前只展示后端已有的导游资料。</p>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'reviews' && (
                <div className="space-y-4">
                  {/* Rating Summary */}
                  <div className="bg-white rounded-xl shadow-sm p-6">
                    <div className="flex items-center gap-6 mb-6">
                      <div className="text-center">
                        <div className="text-5xl font-bold text-blue-600 mb-2">{user.rating}</div>
                        <div className="flex items-center gap-1 justify-center mb-1">
                          {[1, 2, 3, 4, 5].map(i => (
                            <Star key={i} size={16} className="fill-yellow-400 text-yellow-400" />
                          ))}
                        </div>
                        <p className="text-sm text-gray-600">{user.totalReviews}条评价</p>
                      </div>

                      <div className="flex-1 space-y-2">
                        {[5, 4, 3, 2, 1].map(star => (
                          <div key={star} className="flex items-center gap-3">
                            <span className="text-sm text-gray-600 w-8">{star}星</span>
                            <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-yellow-400"
                                style={{ width: user.totalReviews > 0 ? `${star === 5 ? 85 : star === 4 ? 12 : star === 3 ? 2 : 1}%` : '0%' }}
                              ></div>
                            </div>
                            <span className="text-sm text-gray-600 w-10 text-right">
                              {user.totalReviews > 0 ? (star === 5 ? 108 : star === 4 ? 15 : star === 3 ? 3 : 1) : 0}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Reviews List */}
                  {recentReviews.length > 0 ? (
                    recentReviews.map(review => (
                      <div key={review.id} className="bg-white rounded-xl shadow-sm p-6">
                        <div className="flex items-start gap-3 mb-3">
                          <img src={review.reviewer.avatar} alt={review.reviewer.name} className="w-10 h-10 rounded-full" />
                          <div className="flex-1">
                            <div className="flex items-center justify-between mb-1">
                              <div className="flex items-center gap-2">
                                <p className="font-medium">{review.reviewer.name}</p>
                                <span className="text-lg">{review.reviewer.nationality}</span>
                              </div>
                              <span className="text-xs text-gray-500">{review.date}</span>
                            </div>
                            <div className="flex items-center gap-2 mb-1">
                              <div className="flex items-center gap-0.5">
                                {[1, 2, 3, 4, 5].map(i => (
                                  <Star
                                    key={i}
                                    size={12}
                                    className={i <= review.rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}
                                  />
                                ))}
                              </div>
                              <span className="text-xs text-gray-500">· {review.route}</span>
                            </div>
                          </div>
                        </div>
                        <p className="text-gray-700 mb-3">{review.content}</p>
                        {review.photos.length > 0 && (
                          <div className="flex gap-2 mb-3">
                            {review.photos.map((photo, i) => (
                              <div key={i} className="w-20 h-20 bg-gray-200 rounded-lg"></div>
                            ))}
                          </div>
                        )}
                        <button className="text-sm text-gray-500 hover:text-gray-700">
                          有帮助 ({review.helpful})
                        </button>
                      </div>
                    ))
                  ) : (
                    <div className="bg-white rounded-xl shadow-sm p-6 text-sm text-gray-600">
                      暂无公开评价记录。
                    </div>
                  )}

                  {recentReviews.length > 0 && (
                    <Link
                      to={`/user/${user.id}/reviews`}
                      className="block bg-white rounded-xl shadow-sm p-4 text-center text-blue-600 hover:bg-blue-50 font-medium"
                    >
                      查看全部 {user.totalReviews} 条评价
                      <ChevronRight size={16} className="inline ml-1" />
                    </Link>
                  )}
                </div>
              )}

              {activeTab === 'gallery' && (
                <div className="grid grid-cols-2 gap-4">
                  {galleryPhotos.length > 0 ? (
                    galleryPhotos.map((photo, i) => (
                      <div key={i} className="aspect-square bg-gray-200 rounded-xl overflow-hidden">
                        <img src={photo} alt="" className="w-full h-full object-cover" />
                      </div>
                    ))
                  ) : (
                    <div className="col-span-2 bg-white rounded-xl shadow-sm p-6 text-sm text-gray-600">
                      暂无公开相册。
                    </div>
                  )}
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* Bottom Action - for guides */}
      {viewRole === 'guide' && 'pricePerDay' in user && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 z-20">
          <div className="max-w-screen-xl mx-auto">
            <Link
              to={`/order/new?guideId=${user.id}`}
              className="block w-full py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium text-center"
            >
              立即预订
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
