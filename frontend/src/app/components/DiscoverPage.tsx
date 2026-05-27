import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Search, Filter, Star, MapPin, CheckCircle, Award, List, Grid3x3, Plane, Users } from 'lucide-react';
import { useApp } from '../App';
import { motion, AnimatePresence } from 'motion/react';

type LayoutMode = 'list' | 'grid';
type ContentType = 'guides' | 'travelers' | 'partners';

export function DiscoverPage() {
  const { role, data } = useApp();
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [priceRange, setPriceRange] = useState([0, 3000]);
  const [selectedGender, setSelectedGender] = useState<string[]>([]);
  const [selectedRegions, setSelectedRegions] = useState<string[]>([]);
  const [layoutMode, setLayoutMode] = useState<LayoutMode>('list');
  const [contentType, setContentType] = useState<ContentType>('guides');

  useEffect(() => {
    setContentType(role === 'guide' ? 'travelers' : 'guides');
  }, [role]);

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

  const mockGuides = [
    {
      id: 1,
      name: '张伟',
      location: '上海',
      serviceAreas: ['上海', '江苏', '浙江'],
      pricePerDay: 1000,
      rating: 4.9,
      reviews: 127,
      verified: true,
      airportPickup: true,
      gender: 'male',
      age: 32,
      languages: ['中文', 'English'],
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=zhang',
      completedTrips: 89,
    },
    {
      id: 2,
      name: '李娜',
      location: '北京',
      serviceAreas: ['北京', '天津', '河北'],
      pricePerDay: 1200,
      rating: 4.8,
      reviews: 98,
      verified: true,
      airportPickup: true,
      gender: 'female',
      age: 28,
      languages: ['中文', 'English', '日本語'],
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=li',
      completedTrips: 76,
    },
    {
      id: 3,
      name: '王芳',
      location: '杭州',
      serviceAreas: ['浙江'],
      pricePerDay: 800,
      rating: 4.7,
      reviews: 56,
      verified: true,
      airportPickup: false,
      gender: 'female',
      age: 35,
      languages: ['中文'],
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=wang',
      completedTrips: 45,
    },
    {
      id: 4,
      name: '刘强',
      location: '苏州',
      serviceAreas: ['江苏', '上海'],
      pricePerDay: 900,
      rating: 4.9,
      reviews: 134,
      verified: true,
      airportPickup: true,
      gender: 'male',
      age: 40,
      languages: ['中文', 'English'],
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=liu',
      completedTrips: 112,
    },
    {
      id: 5,
      name: '陈晓明',
      location: '广州',
      serviceAreas: ['广东', '深圳', '香港'],
      pricePerDay: 1100,
      rating: 4.8,
      reviews: 85,
      verified: true,
      airportPickup: true,
      gender: 'male',
      age: 29,
      languages: ['中文', 'English', '粤语'],
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=chenxm',
      completedTrips: 68,
    },
    {
      id: 6,
      name: '赵敏',
      location: '西安',
      serviceAreas: ['陕西', '甘肃'],
      pricePerDay: 850,
      rating: 4.9,
      reviews: 112,
      verified: true,
      airportPickup: true,
      gender: 'female',
      age: 31,
      languages: ['中文', 'English'],
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=zhaomin',
      completedTrips: 95,
    },
    {
      id: 7,
      name: '周杰',
      location: '成都',
      serviceAreas: ['四川', '重庆'],
      pricePerDay: 950,
      rating: 4.7,
      reviews: 73,
      verified: true,
      airportPickup: false,
      gender: 'male',
      age: 36,
      languages: ['中文', 'English'],
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=zhoujie',
      completedTrips: 61,
    },
    {
      id: 8,
      name: '吴静',
      location: '南京',
      serviceAreas: ['江苏', '安徽'],
      pricePerDay: 880,
      rating: 4.8,
      reviews: 91,
      verified: true,
      airportPickup: true,
      gender: 'female',
      age: 27,
      languages: ['中文', 'English', 'Français'],
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=wujing',
      completedTrips: 72,
    },
    {
      id: 9,
      name: '孙浩',
      location: '厦门',
      serviceAreas: ['福建', '台湾'],
      pricePerDay: 920,
      rating: 4.9,
      reviews: 105,
      verified: true,
      airportPickup: true,
      gender: 'male',
      age: 33,
      languages: ['中文', 'English', '闽南语'],
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=sunhao',
      completedTrips: 88,
    },
    {
      id: 10,
      name: '林婷婷',
      location: '桂林',
      serviceAreas: ['广西', '云南'],
      pricePerDay: 780,
      rating: 4.7,
      reviews: 67,
      verified: true,
      airportPickup: false,
      gender: 'female',
      age: 26,
      languages: ['中文', 'English'],
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=linting',
      completedTrips: 54,
    },
    {
      id: 11,
      name: '黄磊',
      location: '武汉',
      serviceAreas: ['湖北', '湖南'],
      pricePerDay: 860,
      rating: 4.8,
      reviews: 79,
      verified: true,
      airportPickup: true,
      gender: 'male',
      age: 34,
      languages: ['中文', 'English'],
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=huanglei',
      completedTrips: 66,
    },
    {
      id: 12,
      name: '郑雪',
      location: '青岛',
      serviceAreas: ['山东', '河南'],
      pricePerDay: 900,
      rating: 4.9,
      reviews: 96,
      verified: true,
      airportPickup: true,
      gender: 'female',
      age: 30,
      languages: ['中文', 'English', '日本語'],
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=zhengxue',
      completedTrips: 81,
    },
  ];

  const mockTravelPlans = [
    {
      id: 1,
      traveler: '陈晓',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=chen1',
      nationality: '🇨🇳',
      route: '上海 → 北京 → 上海',
      startDate: '2026-06-15',
      endDate: '2026-06-18',
      arrivalPoint: '上海浦东机场',
      needsPickup: true,
      budget: '3000-5000',
      travelers: 2,
      status: 'published',
    },
    {
      id: 2,
      traveler: '赵敏',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=zhao',
      nationality: '🇨🇳',
      route: '杭州 → 苏州 → 南京',
      startDate: '2026-07-01',
      endDate: '2026-07-03',
      arrivalPoint: '杭州东站',
      needsPickup: false,
      budget: '2000-3000',
      travelers: 1,
      status: 'published',
    },
    {
      id: 3,
      traveler: 'John Smith',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=john',
      nationality: '🇺🇸',
      route: '北京 → 西安 → 成都',
      startDate: '2026-06-20',
      endDate: '2026-06-27',
      arrivalPoint: '北京首都机场',
      needsPickup: true,
      budget: '5000-8000',
      travelers: 3,
      status: 'published',
    },
    {
      id: 4,
      traveler: '佐藤花子',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=hanako',
      nationality: '🇯🇵',
      route: '上海 → 杭州 → 苏州',
      startDate: '2026-07-10',
      endDate: '2026-07-15',
      arrivalPoint: '上海虹桥机场',
      needsPickup: true,
      budget: '4000-6000',
      travelers: 2,
      status: 'published',
    },
  ];

  const apiGuides = (data?.guides ?? []).map(guide => ({
    id: guide.user_id,
    profileId: guide.id,
    name: guide.user_display_name ?? `导游 ${guide.user_id.slice(0, 4)}`,
    location: guide.home_region_name ?? `地区 ${guide.home_region_id.slice(0, 4)}`,
    serviceAreas: guide.service_regions?.length
      ? guide.service_regions.map(region => region.name)
      : [`地区 ${guide.home_region_id.slice(0, 4)}`],
    pricePerDay: Number(guide.daily_price_amount),
    rating: Number(guide.rating ?? 0),
    reviews: guide.completed_order_count,
    verified: guide.verification_status === 'approved',
    airportPickup: guide.offers_pickup,
    gender: guide.gender,
    age: guide.birth_year ? new Date().getFullYear() - guide.birth_year : undefined,
    languages: guide.language_tags.length ? guide.language_tags : ['English'],
    avatar: guide.user_avatar_url ?? `https://api.dicebear.com/7.x/avataaars/svg?seed=${guide.user_id}`,
    completedTrips: guide.completed_order_count,
  }));
  const guides = apiGuides.length > 0 ? apiGuides : mockGuides;
  const followedUsers = role === 'traveler'
    ? (data?.followedUsers ?? []).map(user => ({
        id: user.id,
        name: user.display_name,
        avatar: user.avatar_url ?? `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.id}`,
      }))
    : [];

  const apiTravelPlanLeads = (data?.travelPlanLeads ?? []).map(lead => ({
    id: lead.travel_plan_id,
    travelerUserId: lead.traveler_user_id,
    traveler: lead.traveler_display_name,
    avatar: lead.traveler_avatar_url ?? `https://api.dicebear.com/7.x/avataaars/svg?seed=${lead.traveler_user_id}`,
    nationality: '🌐',
    route: lead.guide_hiring_mode === 'full_route'
      ? `${lead.lead_region_name} 起始的整条线路`
      : `${lead.lead_region_name} 可接单片段`,
    startDate: lead.lead_start_date,
    endDate: lead.lead_end_date,
    arrivalPoint: lead.lead_region_name,
    needsPickup: Boolean(lead.needs_pickup),
    budget: [lead.budget_min_amount, lead.budget_max_amount].filter(Boolean).join('-') || '待确认',
    travelers: lead.traveler_count ?? 1,
    status: 'privacy_scoped',
    privacyLabel: lead.guide_hiring_mode === 'full_route'
      ? '整条线路同一导游'
      : '仅显示匹配城市和日期',
  }));
  const partnerPlans = (data?.partnerLeads ?? []).map(lead => ({
    id: lead.travel_plan_id,
    travelerUserId: lead.traveler_user_id,
    traveler: lead.traveler_display_name,
    avatar: lead.traveler_avatar_url ?? `https://api.dicebear.com/7.x/avataaars/svg?seed=${lead.traveler_user_id}`,
    nationality: '🌐',
    route: `${lead.overlap_region_name} 旅伴重叠行程`,
    startDate: lead.overlap_start_date,
    endDate: lead.overlap_end_date,
    arrivalPoint: lead.overlap_region_name,
    needsPickup: false,
    budget: lead.partner_note ?? '已开启寻找旅伴',
    travelers: lead.traveler_count ?? 1,
    status: 'looking_for_partner',
    privacyLabel: '双方均开启 looking for partner',
  }));
  const travelPlans = role === 'guide'
    ? apiTravelPlanLeads
    : contentType === 'partners'
      ? partnerPlans
      : [];

  return (
    <div className="max-w-screen-xl mx-auto">
      {/* Followed Users */}
      {followedUsers.length > 0 && (
        <div className="sticky top-0 bg-white border-b border-gray-200 p-4 z-20">
          <div className="flex items-center gap-3 overflow-x-auto pb-2 scrollbar-hide">
            <div className="flex-shrink-0 text-sm font-medium text-gray-600">关注:</div>
            {followedUsers.map(user => (
              <Link
                key={user.id}
                to={`/user/${user.id}`}
                className="flex-shrink-0"
              >
                <div className="flex flex-col items-center gap-1">
                  <div className="relative">
                    <img
                      src={user.avatar}
                      alt={user.name}
                      className="w-14 h-14 rounded-full border-2 border-blue-500 bg-gray-100"
                    />
                    <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-blue-600 rounded-full border-2 border-white flex items-center justify-center">
                      <Star size={10} className="text-white fill-white" />
                    </div>
                  </div>
                  <span className="text-xs text-gray-700 max-w-[60px] truncate">{user.name}</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Search Bar */}
      <div className="sticky top-0 bg-white border-b border-gray-200 p-4 z-30">
        <div className="flex gap-2 mb-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder={role === 'traveler' ? '搜索导游、城市、旅伴...' : '搜索可接单城市片段...'}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="px-4 py-3 bg-gray-100 rounded-lg hover:bg-gray-200 flex items-center gap-2"
          >
            <Filter size={20} />
          </button>
        </div>

        {/* Content Type Tabs and Layout Toggle - Full Width */}
        <div className="flex items-center gap-2 mb-3">
          {/* Content Type Toggle - Takes most space */}
          <div className="flex-1 flex gap-2">
            {role === 'traveler' && (
              <motion.button
                onClick={() => setContentType('guides')}
                whileTap={{ scale: 0.98 }}
                className={`flex-1 py-2.5 rounded-lg font-medium text-sm transition-all ${
                  contentType === 'guides'
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <span className="inline-block mr-1">🧑‍✈️</span>
                导游 ({guides.length})
              </motion.button>
            )}
            <motion.button
              onClick={() => setContentType(role === 'guide' ? 'travelers' : 'partners')}
              whileTap={{ scale: 0.98 }}
              className={`flex-1 py-2.5 rounded-lg font-medium text-sm transition-all ${
                contentType === 'travelers' || contentType === 'partners'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {role === 'guide' ? (
                <>
                  <span className="inline-block mr-1">😎</span>
                  可接单片段 ({travelPlans.length})
                </>
              ) : (
                <>
                  <Users size={16} className="inline-block mr-1" />
                  旅伴 ({partnerPlans.length})
                </>
              )}
            </motion.button>
          </div>

          {/* Layout Mode Toggle */}
          <div className="flex gap-1 bg-gray-100 p-1 rounded-lg">
            <motion.button
              onClick={() => setLayoutMode('list')}
              whileTap={{ scale: 0.95 }}
              className={`p-2 rounded transition-colors ${
                layoutMode === 'list' ? 'bg-white shadow-sm' : 'hover:bg-gray-200'
              }`}
            >
              <List size={18} />
            </motion.button>
            <motion.button
              onClick={() => setLayoutMode('grid')}
              whileTap={{ scale: 0.95 }}
              className={`p-2 rounded transition-colors ${
                layoutMode === 'grid' ? 'bg-white shadow-sm' : 'hover:bg-gray-200'
              }`}
            >
              <Grid3x3 size={18} />
            </motion.button>
          </div>
        </div>

        {/* Filters Panel */}
        <AnimatePresence>
          {showFilters && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                <h3 className="font-medium mb-3">筛选条件</h3>

                <div className="mb-4">
                  <label className="block text-sm font-medium mb-2">价格范围 (每天)</label>
                  <div className="flex items-center gap-4">
                    <span className="text-sm">¥{priceRange[0]}</span>
                    <input
                      type="range"
                      min="0"
                      max="3000"
                      value={priceRange[1]}
                      onChange={(e) => setPriceRange([priceRange[0], parseInt(e.target.value)])}
                      className="flex-1"
                    />
                    <span className="text-sm">¥{priceRange[1]}</span>
                  </div>
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-medium mb-2">地区</label>
                  <div className="flex flex-wrap gap-2">
                    {['上海', '北京', '杭州', '苏州', '南京'].map(region => (
                      <button
                        key={region}
                        onClick={() => {
                          setSelectedRegions(prev =>
                            prev.includes(region)
                              ? prev.filter(r => r !== region)
                              : [...prev, region]
                          );
                        }}
                        className={`px-3 py-1.5 rounded-full text-sm ${
                          selectedRegions.includes(region)
                            ? 'bg-blue-600 text-white'
                            : 'bg-white border border-gray-300'
                        }`}
                      >
                        {region}
                      </button>
                    ))}
                  </div>
                </div>

                {contentType === 'guides' && (
                  <div>
                    <label className="block text-sm font-medium mb-2">性别</label>
                    <div className="flex gap-2">
                      {['male', 'female'].map(gender => (
                        <button
                          key={gender}
                          onClick={() => {
                            setSelectedGender(prev =>
                              prev.includes(gender)
                                ? prev.filter(g => g !== gender)
                                : [...prev, gender]
                            );
                          }}
                          className={`px-4 py-1.5 rounded-full text-sm ${
                            selectedGender.includes(gender)
                              ? 'bg-blue-600 text-white'
                              : 'bg-white border border-gray-300'
                          }`}
                        >
                          {gender === 'male' ? '男' : '女'}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Results */}
      <div className="p-4">
        {role === 'traveler' && contentType === 'guides' ? (
          /* Guide Listings */
          <AnimatePresence mode="wait">
            {layoutMode === 'list' ? (
              /* List View */
              <motion.div
                key="list"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="space-y-4"
              >
                {guides.map((guide, index) => (
                  <motion.div
                    key={guide.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                  >
                    <Link
                      to={`/user/${guide.id}`}
                      className="block bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow p-4"
                    >
                      <div className="flex gap-4">
                        <img
                          src={guide.avatar}
                          alt={guide.name}
                          className="w-20 h-20 rounded-full bg-gray-100"
                        />
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-bold text-lg">{guide.name}</h3>
                            {guide.verified && (
                              <CheckCircle size={16} className="text-blue-600" />
                            )}
                            <Award size={16} className="text-yellow-500" />
                          </div>

                          <div className="flex items-center gap-3 text-sm text-gray-600 mb-2">
                            <div className="flex items-center gap-1">
                              <MapPin size={14} />
                              <span>{guide.location}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Star size={14} className="fill-yellow-400 text-yellow-400" />
                              <span>{guide.rating} ({guide.reviews})</span>
                            </div>
                          </div>

                          <div className="text-sm text-gray-600 mb-2">
                            服务范围: {guide.serviceAreas.join(' • ')}
                          </div>

                          <div className="flex items-center gap-2 text-xs">
                            <span className="text-gray-500">{guide.completedTrips}次成交</span>
                            {guide.airportPickup && (
                              <div className="w-5 h-5 rounded-full bg-green-500 flex items-center justify-center" title="可接机">
                                <Plane size={12} className="text-white" />
                              </div>
                            )}
                            {guide.languages.map(lang => (
                              <span key={lang} className="text-base" title={lang}>
                                {getCountryFlag(lang)}
                              </span>
                            ))}
                          </div>
                        </div>

                        <div className="text-right">
                          <div className="text-2xl font-bold text-blue-600">¥{guide.pricePerDay}</div>
                          <div className="text-xs text-gray-500">每天</div>
                        </div>
                      </div>
                    </Link>
                  </motion.div>
                ))}
              </motion.div>
            ) : (
              /* Grid View */
              <motion.div
                key="grid"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="grid grid-cols-2 gap-4"
              >
                {guides.map((guide, index) => (
                  <motion.div
                    key={guide.id}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: index * 0.1 }}
                  >
                    <Link
                      to={`/user/${guide.id}`}
                      className="block bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow p-4"
                    >
                      <div className="flex flex-col items-center text-center mb-3">
                        <img
                          src={guide.avatar}
                          alt={guide.name}
                          className="w-16 h-16 rounded-full bg-gray-100 mb-2"
                        />
                        <div className="flex items-center gap-1 mb-1">
                          <h3 className="font-bold">{guide.name}</h3>
                          {guide.verified && (
                            <CheckCircle size={14} className="text-blue-600" />
                          )}
                        </div>
                        <div className="flex items-center gap-1 text-xs text-gray-600">
                          <Star size={12} className="fill-yellow-400 text-yellow-400" />
                          <span>{guide.rating}</span>
                        </div>
                      </div>

                      <div className="text-center mb-3">
                        <div className="text-xl font-bold text-blue-600">¥{guide.pricePerDay}</div>
                        <div className="text-xs text-gray-500">每天</div>
                      </div>

                      <div className="flex items-center justify-center gap-1.5 flex-wrap mb-2">
                        {guide.airportPickup && (
                          <div className="w-5 h-5 rounded-full bg-green-500 flex items-center justify-center" title="可接机">
                            <Plane size={10} className="text-white" />
                          </div>
                        )}
                        {guide.languages.map(lang => (
                          <span key={lang} className="text-sm" title={lang}>
                            {getCountryFlag(lang)}
                          </span>
                        ))}
                      </div>

                      <div className="text-xs text-gray-500 text-center">
                        {guide.location} · {guide.completedTrips}次
                      </div>
                    </Link>
                  </motion.div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        ) : (
          /* Travel Plan Listings */
          <AnimatePresence mode="wait">
            {layoutMode === 'list' ? (
              /* List View for Travelers */
              <motion.div
                key="list-travelers"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="space-y-4"
              >
                {travelPlans.map((plan, index) => (
                  <motion.div
                    key={plan.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="bg-white rounded-xl shadow-sm p-4 hover:shadow-md transition-shadow"
                  >
                    <div className="flex gap-4">
                      <Link to={`/user/${'travelerUserId' in plan ? plan.travelerUserId : plan.id}`}>
                        <img
                          src={plan.avatar}
                          alt={plan.traveler}
                          className="w-16 h-16 rounded-full bg-gray-100 hover:ring-2 hover:ring-blue-500 transition-all cursor-pointer"
                        />
                      </Link>

                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <h3 className="font-bold text-lg">{plan.traveler}</h3>
                            <span className="text-2xl" title="国籍">{plan.nationality}</span>
                          </div>
                          <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">
                            {plan.privacyLabel}
                          </span>
                        </div>

                        <h4 className="font-medium text-blue-600 mb-2">{plan.route}</h4>

                        <div className="grid grid-cols-2 gap-3 text-sm mb-3">
                          <div>
                            <span className="text-gray-500">到达日期:</span>
                            <span className="ml-2 font-medium">{plan.startDate}</span>
                          </div>
                          <div>
                            <span className="text-gray-500">离开日期:</span>
                            <span className="ml-2 font-medium">{plan.endDate}</span>
                          </div>
                          <div>
                            <span className="text-gray-500">人数:</span>
                            <span className="ml-2 font-medium">{plan.travelers}人</span>
                          </div>
                          <div>
                            <span className="text-gray-500">{contentType === 'partners' ? '说明:' : '预算:'}</span>
                            <span className="ml-2 font-medium">
                              {contentType === 'partners' ? plan.budget : `¥${plan.budget}`}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          {plan.needsPickup && (
                            <div className="w-5 h-5 rounded-full bg-green-500 flex items-center justify-center" title="需要接机">
                              <Plane size={12} className="text-white" />
                            </div>
                          )}
                          <span className="text-xs text-gray-500">{plan.arrivalPoint}</span>
                        </div>
                      </div>

                      <button className="px-6 py-2 h-fit bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium text-sm">
                        {role === 'guide' ? '沟通接单' : '联系旅伴'}
                      </button>
                    </div>
                  </motion.div>
                ))}
              </motion.div>
            ) : (
              /* Grid View for Travelers */
              <motion.div
                key="grid-travelers"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="grid grid-cols-2 gap-4"
              >
                {travelPlans.map((plan, index) => (
                  <motion.div
                    key={plan.id}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: index * 0.1 }}
                    className="bg-white rounded-xl shadow-sm p-4 hover:shadow-md transition-shadow"
                  >
                    {/* Date Badge */}
                    <div className="flex items-center justify-between mb-3">
                      <div className="bg-blue-600 text-white px-3 py-1.5 rounded-lg text-center">
                        <div className="text-xs opacity-90">到达</div>
                        <div className="font-bold">{plan.startDate.split('-')[1]}/{plan.startDate.split('-')[2]}</div>
                      </div>
                      <span className="text-3xl" title="国籍">{plan.nationality}</span>
                    </div>

                    {/* Avatar and Name */}
                    <div className="flex flex-col items-center mb-3">
                      <Link to={`/user/${'travelerUserId' in plan ? plan.travelerUserId : plan.id}`}>
                        <img
                          src={plan.avatar}
                          alt={plan.traveler}
                          className="w-14 h-14 rounded-full bg-gray-100 mb-2 hover:ring-2 hover:ring-blue-500 transition-all cursor-pointer"
                        />
                      </Link>
                      <h3 className="font-bold text-center text-sm">{plan.traveler}</h3>
                    </div>

                    {/* Route - Main Focus */}
                    <div className="mb-3 text-center">
                      <div className="text-xs text-gray-500 mb-1">
                        {role === 'guide' ? '脱敏需求片段' : '重叠旅伴行程'}
                      </div>
                      <div className="font-bold text-blue-600 text-sm leading-tight">
                        {plan.route}
                      </div>
                    </div>

                    {/* Trip Duration */}
                    <div className="text-center text-xs text-gray-600 mb-3">
                      {plan.startDate} ~ {plan.endDate}
                    </div>

                    {/* Quick Info */}
                    <div className="flex items-center justify-center gap-2 mb-3 text-xs text-gray-500">
                      <span>{plan.travelers}人</span>
                      {plan.needsPickup && (
                        <div className="w-4 h-4 rounded-full bg-green-500 flex items-center justify-center" title="需要接机">
                          <Plane size={10} className="text-white" />
                        </div>
                      )}
                    </div>

                    <button className="w-full py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium text-sm">
                      {role === 'guide' ? '沟通接单' : '联系旅伴'}
                    </button>
                  </motion.div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}
