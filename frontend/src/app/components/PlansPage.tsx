import { useEffect, useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import { Plus, Minus, Calendar, MapPin, Users, DollarSign, Plane, Edit2, Trash2, CheckCircle, FileText, ArrowLeft, Save, Send, AlertCircle } from 'lucide-react';
import { useApp } from '../App';
import { apiClient, ApiError } from '../api/client';
import type { GuideHiringMode, GuideServiceScopeMode, PlanVisibility, Region } from '../api/types';
import { motion, AnimatePresence } from 'motion/react';

interface RouteStopData {
  id: string;
  regionId: string | null;
  placeName: string;
  startDate: string;
  endDate: string;
  lookingForPartner: boolean;
}

interface PlanData {
  id?: number | string;
  route: string;
  startDate: string;
  endDate: string;
  arrivalPoint: string;
  needsPickup: boolean;
  travelers: number;
  budget: string;
  visibility: string;
  guideHiringMode: GuideHiringMode;
  routeStops: RouteStopData[];
  notes?: string;
}

interface PlanCardData extends PlanData {
  id: number | string;
  status: 'published' | 'draft' | string;
  interestedGuides: number;
}

interface ServiceData {
  id: number;
  location: string;
  serviceAreas: string[];
  pricePerDay: number;
  airportPickup: boolean;
  availability: string;
  serviceScopeModes: GuideServiceScopeMode[];
  activeOrders: number;
  upcomingBookings: number;
  profileId?: string;
}

interface PlanFormFieldsProps {
  formData: PlanData;
  setFormData: Dispatch<SetStateAction<PlanData>>;
  regions: Region[];
}

const serviceModeLabels: Record<GuideServiceScopeMode, string> = {
  point_to_point: '单一地区',
  full_route: '整条路线',
};

function FormFields({ formData, setFormData, regions }: PlanFormFieldsProps) {
  const [isAddingStop, setIsAddingStop] = useState(false);
  const [stopDraft, setStopDraft] = useState<RouteStopData>({
    id: '',
    regionId: '',
    placeName: '',
    startDate: '',
    endDate: '',
    lookingForPartner: false,
  });
  const cityRegions = regions.filter(region => region.type === 'city' || region.type === 'district');

  const resetStopDraft = () => {
    setStopDraft({
      id: '',
      regionId: '',
      placeName: '',
      startDate: '',
      endDate: '',
      lookingForPartner: false,
    });
  };

  const addStop = () => {
    const selectedRegion = cityRegions.find(region => region.id === stopDraft.regionId);
    const placeName = selectedRegion?.name ?? stopDraft.placeName.trim();
    if (!stopDraft.regionId || !placeName || !stopDraft.startDate || !stopDraft.endDate) {
      return;
    }
    if (stopDraft.startDate > stopDraft.endDate) {
      return;
    }
    const nextStop = {
      ...stopDraft,
      id: `local-${Date.now()}`,
      placeName,
    };
    const routeStops = [...formData.routeStops, nextStop];
    setFormData({
      ...formData,
      routeStops,
      route: routeStops.map(stop => stop.placeName).join(' → '),
      startDate: routeStops[0]?.startDate ?? '',
      endDate: routeStops[routeStops.length - 1]?.endDate ?? '',
      arrivalPoint: routeStops[0]?.placeName ?? '',
    });
    resetStopDraft();
    setIsAddingStop(false);
  };

  const removeStop = (stopId: string) => {
    const routeStops = formData.routeStops.filter(stop => stop.id !== stopId);
    setFormData({
      ...formData,
      routeStops,
      route: routeStops.map(stop => stop.placeName).join(' → '),
      startDate: routeStops[0]?.startDate ?? '',
      endDate: routeStops[routeStops.length - 1]?.endDate ?? '',
      arrivalPoint: routeStops[0]?.placeName ?? '',
    });
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium mb-2">招揽导游方式</label>
        <div className="grid grid-cols-2 gap-3">
          {([
            ['point_to_point', '点对点', '每个地点可匹配不同导游'],
            ['full_route', '整条线路', '整条路线由同一导游服务'],
          ] as const).map(([value, label, description]) => (
            <button
              key={value}
              type="button"
              onClick={() => setFormData({ ...formData, guideHiringMode: value })}
              className={`rounded-lg border-2 p-3 text-left transition-colors ${
                formData.guideHiringMode === value
                  ? 'border-blue-600 bg-blue-50 text-blue-700'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="font-semibold">{label}</div>
              <div className="text-xs text-gray-500">{description}</div>
            </button>
          ))}
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-3">
          <label className="block text-sm font-medium">行程地点</label>
          <button
            type="button"
            onClick={() => setIsAddingStop(true)}
            className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2 text-sm font-medium"
          >
            <Plus size={16} />
            添加地点
          </button>
        </div>

        <div className="rounded-xl border border-gray-200 p-4">
          {formData.routeStops.length === 0 ? (
            <p className="text-sm text-gray-500">还没有地点。请点击“添加地点”逐个设置城市、到达时间和离开时间。</p>
          ) : (
            <div className="space-y-0">
              {formData.routeStops.map((stop, index) => (
                <div key={stop.id} className="relative flex gap-3 pb-5 last:pb-0">
                  {index < formData.routeStops.length - 1 && (
                    <div className="absolute left-[11px] top-7 bottom-0 w-px bg-blue-200" />
                  )}
                  <div className="relative z-10 mt-1 h-6 w-6 rounded-full bg-blue-600 text-white text-xs flex items-center justify-center">
                    {index + 1}
                  </div>
                  <div className="flex-1 rounded-lg bg-gray-50 px-3 py-2">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="font-semibold">{stop.placeName}</div>
                        <div className="text-sm text-gray-600">{stop.startDate} - {stop.endDate}</div>
                        {stop.lookingForPartner && (
                          <div className="mt-1 text-xs text-green-700">已开启 looking for partner</div>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => removeStop(stop.id)}
                        className="p-1 text-gray-400 hover:text-red-600"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <AnimatePresence>
        {isAddingStop && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 12 }}
            className="rounded-xl border border-blue-200 bg-blue-50/60 p-4 space-y-4"
          >
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">添加地点</h3>
              <button
                type="button"
                onClick={() => {
                  resetStopDraft();
                  setIsAddingStop(false);
                }}
                className="p-1 text-gray-500 hover:text-gray-800"
              >
                <Minus size={16} />
              </button>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">选择地点</label>
              <select
                value={stopDraft.regionId ?? ''}
                onChange={(event) => {
                  const region = cityRegions.find(item => item.id === event.target.value);
                  setStopDraft({
                    ...stopDraft,
                    regionId: event.target.value,
                    placeName: region?.name ?? '',
                  });
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">请选择城市 / 地区</option>
                {cityRegions.map(region => (
                  <option key={region.id} value={region.id}>{region.name}</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium mb-2">到达日期</label>
                <input
                  type="date"
                  value={stopDraft.startDate}
                  onChange={(e) => setStopDraft({ ...stopDraft, startDate: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">离开日期</label>
                <input
                  type="date"
                  value={stopDraft.endDate}
                  onChange={(e) => setStopDraft({ ...stopDraft, endDate: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={stopDraft.lookingForPartner}
                onChange={(e) => setStopDraft({ ...stopDraft, lookingForPartner: e.target.checked })}
                className="w-4 h-4 accent-blue-600"
              />
              <span className="text-sm">此地点寻找旅伴 looking for partner</span>
            </label>

            <button
              type="button"
              onClick={addStop}
              className="w-full py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
            >
              确定
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <div>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={formData.needsPickup}
            onChange={(e) => setFormData({ ...formData, needsPickup: e.target.checked })}
            className="w-4 h-4"
          />
          <span className="text-sm">需要接机服务</span>
        </label>
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">旅行人数</label>
        <input
          type="number"
          min="1"
          value={formData.travelers}
          onChange={(e) => setFormData({ ...formData, travelers: parseInt(e.target.value) })}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">预算范围</label>
        <input
          type="text"
          placeholder="例: 3000-5000"
          value={formData.budget}
          onChange={(e) => setFormData({ ...formData, budget: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">备注（选填）</label>
        <textarea
          placeholder="例: 希望安排亲子友好路线"
          value={formData.notes ?? ''}
          onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
          rows={3}
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">可见范围</label>
        <select
          value={formData.visibility}
          onChange={(e) => setFormData({ ...formData, visibility: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="all">所有用户</option>
          <option value="guides">仅导游</option>
          <option value="travelers">仅旅行者</option>
        </select>
      </div>
    </div>
  );
}

export function PlansPage() {
  const { role, data, refreshAppData } = useApp();
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [editingPlan, setEditingPlan] = useState<number | string | null>(null);
  const [editingFromIcon, setEditingFromIcon] = useState<{ x: number; y: number } | null>(null);
  const [editingService, setEditingService] = useState<number | null>(null);
  const [editingServiceFromIcon, setEditingServiceFromIcon] = useState<{ x: number; y: number } | null>(null);
  const [serviceFormData, setServiceFormData] = useState<Omit<ServiceData, 'id' | 'activeOrders' | 'upcomingBookings'>>({
    location: '',
    serviceAreas: [],
    pricePerDay: 0,
    airportPickup: false,
    availability: 'available',
    serviceScopeModes: ['point_to_point'],
  });
  const [serviceAreasInput, setServiceAreasInput] = useState('');
  const [formData, setFormData] = useState<PlanData>({
    route: '',
    startDate: '',
    endDate: '',
    arrivalPoint: '',
    needsPickup: false,
    travelers: 1,
    budget: '',
    visibility: 'all',
    guideHiringMode: 'point_to_point',
    routeStops: [],
    notes: '',
  });

  const [myPlans, setMyPlans] = useState<PlanCardData[]>([
    {
      id: 1,
      route: '上海 → 北京 → 上海',
      startDate: '2026-06-15',
      endDate: '2026-06-18',
      arrivalPoint: '上海浦东机场',
      needsPickup: true,
      budget: '3000-5000',
      travelers: 2,
      visibility: 'all',
      guideHiringMode: 'full_route',
      routeStops: [
        { id: 'mock-1-1', regionId: null, placeName: '上海', startDate: '2026-06-15', endDate: '2026-06-16', lookingForPartner: false },
        { id: 'mock-1-2', regionId: null, placeName: '北京', startDate: '2026-06-17', endDate: '2026-06-18', lookingForPartner: false },
      ],
      status: 'published',
      interestedGuides: 5,
    },
    {
      id: 2,
      route: '杭州 → 苏州',
      startDate: '2026-07-01',
      endDate: '2026-07-03',
      arrivalPoint: '杭州东站',
      needsPickup: false,
      budget: '2000-3000',
      travelers: 1,
      visibility: 'all',
      guideHiringMode: 'point_to_point',
      routeStops: [
        { id: 'mock-2-1', regionId: null, placeName: '杭州', startDate: '2026-07-01', endDate: '2026-07-02', lookingForPartner: true },
        { id: 'mock-2-2', regionId: null, placeName: '苏州', startDate: '2026-07-03', endDate: '2026-07-03', lookingForPartner: true },
      ],
      status: 'draft',
      interestedGuides: 0,
    },
    {
      id: 3,
      route: '北京 → 西安',
      startDate: '2026-08-10',
      endDate: '2026-08-15',
      arrivalPoint: '北京首都机场',
      needsPickup: true,
      budget: '4000-6000',
      travelers: 3,
      visibility: 'all',
      guideHiringMode: 'point_to_point',
      routeStops: [
        { id: 'mock-3-1', regionId: null, placeName: '北京', startDate: '2026-08-10', endDate: '2026-08-12', lookingForPartner: false },
        { id: 'mock-3-2', regionId: null, placeName: '西安', startDate: '2026-08-13', endDate: '2026-08-15', lookingForPartner: false },
      ],
      status: 'draft',
      interestedGuides: 0,
    },
  ]);

  const [myServices, setMyServices] = useState<ServiceData[]>([
    {
      id: 1,
      location: '上海',
      serviceAreas: ['上海', '江苏', '浙江'],
      pricePerDay: 1000,
      airportPickup: true,
      availability: 'available',
      serviceScopeModes: ['point_to_point', 'full_route'],
      activeOrders: 2,
      upcomingBookings: 3,
    },
  ]);

  const publishedPlans = myPlans.filter(p => p.status === 'published');
  const draftPlans = myPlans.filter(p => p.status === 'draft');
  const regions = data?.regions ?? [];

  useEffect(() => {
    const guideProfiles = data?.profiles?.guide_profiles ?? [];
    if (role !== 'guide' || guideProfiles.length === 0 || editingService) {
      return;
    }
    setMyServices(guideProfiles.map((profile, index) => ({
      id: index + 1,
      profileId: profile.id,
      location: profile.home_region_name ?? '未设置',
      serviceAreas: profile.service_regions?.map(region => region.name) ?? [],
      pricePerDay: Number(profile.daily_price_amount),
      airportPickup: profile.offers_pickup,
      availability: profile.is_listed ? 'available' : 'unavailable',
      serviceScopeModes: profile.service_scope_modes?.length ? profile.service_scope_modes : ['point_to_point'],
      activeOrders: 0,
      upcomingBookings: 0,
    })));
  }, [data?.profiles?.guide_profiles, editingService, role]);

  const handleEdit = (plan: any, event: React.MouseEvent) => {
    const rect = (event.target as HTMLElement).getBoundingClientRect();
    setEditingFromIcon({ x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 });
    setFormData({
      id: plan.id,
      route: plan.route,
      startDate: plan.startDate,
      endDate: plan.endDate,
      arrivalPoint: plan.arrivalPoint,
      needsPickup: plan.needsPickup,
      travelers: plan.travelers,
      budget: plan.budget,
      visibility: 'all',
      guideHiringMode: plan.guideHiringMode ?? 'point_to_point',
      routeStops: plan.routeStops ?? [],
      notes: plan.notes ?? '',
    });
    setEditingPlan(plan.id);
    setFormError(null);
  };

  const handleSaveEdit = () => {
    if (!validatePlanForm()) return;
    setMyPlans(prev => prev.map(plan =>
      plan.id === editingPlan
        ? { ...plan, ...formData }
        : plan
    ));
    setEditingPlan(null);
    setEditingFromIcon(null);
  };

  const handlePublishEdit = () => {
    if (!validatePlanForm()) return;
    setMyPlans(prev => prev.map(plan =>
      plan.id === editingPlan
        ? { ...plan, ...formData, status: 'published' }
        : plan
    ));
    setEditingPlan(null);
    setEditingFromIcon(null);
  };

  const handleSaveDraft = async () => {
    if (!validatePlanForm()) return;
    await createPlan('draft');
  };

  const handlePublish = async () => {
    if (!validatePlanForm()) return;
    await createPlan('published');
  };

  const resetForm = () => {
    setFormData({
      route: '',
      startDate: '',
      endDate: '',
      arrivalPoint: '',
      needsPickup: false,
      travelers: 1,
      budget: '',
      visibility: 'all',
      guideHiringMode: 'point_to_point',
      routeStops: [],
      notes: '',
    });
    setFormError(null);
  };

  const validatePlanForm = () => {
    const requiredFields = [
      String(formData.routeStops.length),
      String(formData.travelers || ''),
      formData.budget.trim(),
    ];
    if (requiredFields.some(value => !value) || !Number.isFinite(formData.travelers)) {
      setFormError('请至少添加一个地点，并填写人数和预算。接 / 送与备注可以暂不填写。');
      return false;
    }
    const invalidStop = formData.routeStops.find(stop => !stop.regionId || !stop.startDate || !stop.endDate || stop.startDate > stop.endDate);
    if (invalidStop) {
      setFormError('每个地点都必须选择城市，并且离开日期不能早于到达日期。');
      return false;
    }
    if (formData.travelers < 1) {
      setFormError('旅行人数必须至少为 1 人。');
      return false;
    }
    setFormError(null);
    return true;
  };

  const parseBudget = () => {
    const values = formData.budget
      .split(/[-–—~至]/)
      .map(value => Number(value.replace(/[^\d.]/g, '')))
      .filter(value => Number.isFinite(value));
    return {
      min: values[0] ?? null,
      max: values[1] ?? values[0] ?? null,
    };
  };

  const toBackendVisibility = (): PlanVisibility => {
    if (formData.visibility === 'guides') return 'guides_only';
    if (formData.visibility === 'travelers') return 'travelers_only';
    if (formData.visibility === 'private') return 'private';
    return 'public';
  };

  const createPlan = async (status: 'draft' | 'published') => {
    const selectedMarket = data?.selectedMarket;
    if (!selectedMarket) {
      setFormError('当前市场尚未加载，无法保存旅行计划。');
      return;
    }
    const budget = parseBudget();
    try {
      const createdPlan = await apiClient.createTravelPlan(selectedMarket.id, {
        country_code: selectedMarket.default_country_code ?? 'CN',
        arrival_date: formData.routeStops[0].startDate,
        arrival_region_id: formData.routeStops[0].regionId,
        needs_pickup: formData.needsPickup,
        traveler_count: formData.travelers,
        budget_min_amount: budget.min,
        budget_max_amount: budget.max,
        budget_currency: selectedMarket.default_currency ?? 'CNY',
        visibility: toBackendVisibility(),
        title: formData.routeStops.map(stop => stop.placeName).join(' → '),
        notes: formData.notes?.trim() || null,
        looking_for_partner: formData.routeStops.some(stop => stop.lookingForPartner),
        guide_hiring_mode: formData.guideHiringMode,
      });
      await Promise.all(formData.routeStops.map((stop, index) =>
        apiClient.createRouteNode(createdPlan.id, {
          region_id: stop.regionId,
          sequence: index + 1,
          planned_start_at: `${stop.startDate}T00:00:00`,
          planned_end_at: `${stop.endDate}T23:59:59`,
          notes: stop.placeName,
          place_name: stop.placeName,
          looking_for_partner: stop.lookingForPartner,
        })
      ));
      if (status === 'published') {
        await apiClient.publishTravelPlan(createdPlan.id);
      }
      setMyPlans(prev => [
        ...prev,
        {
          id: createdPlan.id,
          ...formData,
          route: formData.routeStops.map(stop => stop.placeName).join(' → '),
          startDate: formData.routeStops[0].startDate,
          endDate: formData.routeStops[formData.routeStops.length - 1].endDate,
          arrivalPoint: formData.routeStops[0].placeName,
          status,
          interestedGuides: 0,
        },
      ]);
      setShowCreateForm(false);
      resetForm();
      await refreshAppData();
    } catch (error) {
      setFormError(error instanceof ApiError ? error.message : '旅行计划保存失败，请稍后重试。');
    }
  };

  const handleEditService = (service: ServiceData, event: React.MouseEvent) => {
    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
    setEditingServiceFromIcon({ x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 });
    setServiceFormData({
      location: service.location,
      serviceAreas: service.serviceAreas,
      pricePerDay: service.pricePerDay,
      airportPickup: service.airportPickup,
      availability: service.availability,
      serviceScopeModes: service.serviceScopeModes,
    });
    setServiceAreasInput(service.serviceAreas.join(', '));
    setEditingService(service.id);
  };

  const handleSaveService = async () => {
    const nextScopeModes = serviceFormData.serviceScopeModes.length
      ? serviceFormData.serviceScopeModes
      : ['point_to_point' as const];
    const currentService = myServices.find(service => service.id === editingService);
    try {
      if (currentService?.profileId) {
        await apiClient.updateGuideProfile(currentService.profileId, {
          service_scope_modes: nextScopeModes,
        });
        await refreshAppData();
      }
    } catch (error) {
      setFormError(error instanceof ApiError ? error.message : '导游服务设置保存失败，请稍后重试。');
      return;
    }
    setMyServices(prev => prev.map(s =>
      s.id === editingService
        ? { ...s, ...serviceFormData, serviceScopeModes: nextScopeModes, serviceAreas: serviceAreasInput.split(',').map(a => a.trim()).filter(Boolean) }
        : s
    ));
    setEditingService(null);
    setEditingServiceFromIcon(null);
  };

  return (
    <div className="max-w-screen-xl mx-auto p-4 pb-20">
      {role === 'traveler' ? (
        /* Traveler Plans */
        <div>
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold">我的旅行计划</h1>
            <motion.button
              onClick={() => {
                setShowCreateForm(!showCreateForm);
                if (showCreateForm) resetForm();
                if (!showCreateForm) setFormError(null);
              }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2 font-medium"
            >
              {showCreateForm ? <Minus size={20} /> : <Plus size={20} />}
              <span>{showCreateForm ? '收起' : '创建计划'}</span>
            </motion.button>
          </div>

          {/* Create Form - Expandable */}
          <AnimatePresence>
            {showCreateForm && (
              <motion.div
                initial={{ height: 0, opacity: 0, scale: 0.8, originY: 0 }}
                animate={{ height: 'auto', opacity: 1, scale: 1 }}
                exit={{ height: 0, opacity: 0, scale: 0.8 }}
                transition={{ duration: 0.5, ease: [0.34, 1.56, 0.64, 1] }}
                className="bg-white rounded-xl shadow-lg p-6 mb-6 overflow-hidden"
              >
                <h2 className="text-xl font-bold mb-4">创建旅行计划</h2>
                <FormFields formData={formData} setFormData={setFormData} regions={regions} />
                {formError && (
                  <div className="mt-4 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                    <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
                    <span>{formError}</span>
                  </div>
                )}

                <div className="flex gap-3 pt-6 mt-6 border-t border-gray-200">
                  <button
                    onClick={handleSaveDraft}
                    className="flex-1 px-4 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 font-medium flex items-center justify-center gap-2"
                  >
                    <FileText size={18} />
                    保存为草稿
                  </button>
                  <button
                    onClick={handlePublish}
                    className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium flex items-center justify-center gap-2"
                  >
                    <Send size={18} />
                    发布计划
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Published Plans Section */}
          {publishedPlans.length > 0 && (
            <div className="mb-8">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-6 h-6 rounded-full bg-green-600 flex items-center justify-center">
                  <CheckCircle size={16} className="text-white" />
                </div>
                <h2 className="text-lg font-bold text-green-700">已发布 ({publishedPlans.length})</h2>
              </div>

              <div className="space-y-4">
                {publishedPlans.map(plan => (
                  <motion.div
                    key={plan.id}
                    layout
                    className="bg-white rounded-xl shadow-sm p-4 border-l-4 border-green-500"
                  >
                    <div className="flex justify-between items-start mb-3">
                      <h3 className="font-bold text-lg">{plan.route}</h3>
                      <div className="flex items-center gap-2">
                        <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">
                          {plan.guideHiringMode === 'full_route' ? '整条线路导游' : '点对点导游'}
                        </span>
                        <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">
                          已发布
                        </span>
                        <button
                          onClick={(e) => handleEdit(plan, e)}
                          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                        >
                          <Edit2 size={16} className="text-gray-600" />
                        </button>
                        <button className="p-2 hover:bg-gray-100 rounded-lg text-red-600">
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 text-sm mb-3">
                      <div className="flex items-center gap-2 text-gray-600">
                        <Calendar size={16} />
                        <span>{plan.startDate} ~ {plan.endDate}</span>
                      </div>
                      <div className="flex items-center gap-2 text-gray-600">
                        <Users size={16} />
                        <span>{plan.travelers}人</span>
                      </div>
                      <div className="flex items-center gap-2 text-gray-600">
                        <MapPin size={16} />
                        <span>{plan.routeStops.map(stop => stop.placeName).join(' → ') || plan.arrivalPoint}</span>
                      </div>
                      <div className="flex items-center gap-2 text-gray-600">
                        <DollarSign size={16} />
                        <span>¥{plan.budget}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {plan.routeStops.some(stop => stop.lookingForPartner) && (
                        <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs">
                          looking for partner
                        </span>
                      )}
                      {plan.needsPickup && (
                        <span className="px-2 py-1 bg-orange-100 text-orange-700 rounded text-xs flex items-center gap-1">
                          <Plane size={12} />
                          需要接机
                        </span>
                      )}
                      {plan.interestedGuides > 0 && (
                        <span className="text-sm text-gray-600">
                          {plan.interestedGuides} 位导游对此感兴趣
                        </span>
                      )}
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          )}

          {/* Draft Plans Section */}
          {draftPlans.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-6 h-6 rounded-full bg-gray-400 flex items-center justify-center">
                  <FileText size={16} className="text-white" />
                </div>
                <h2 className="text-lg font-bold text-gray-600">草稿 ({draftPlans.length})</h2>
              </div>

              <div className="space-y-4">
                {draftPlans.map(plan => (
                  <motion.div
                    key={plan.id}
                    layout
                    className="bg-gray-50 rounded-xl shadow-sm p-4 border-l-4 border-gray-300"
                  >
                    <div className="flex justify-between items-start mb-3">
                      <h3 className="font-bold text-lg text-gray-700">{plan.route}</h3>
                      <div className="flex items-center gap-2">
                        <span className="px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-xs font-medium">
                          {plan.guideHiringMode === 'full_route' ? '整条线路导游' : '点对点导游'}
                        </span>
                        <span className="px-3 py-1 bg-gray-200 text-gray-600 rounded-full text-xs font-medium">
                          草稿
                        </span>
                        <button
                          onClick={(e) => handleEdit(plan, e)}
                          className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
                        >
                          <Edit2 size={16} className="text-gray-600" />
                        </button>
                        <button className="p-2 hover:bg-gray-200 rounded-lg text-red-600">
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 text-sm mb-3">
                      <div className="flex items-center gap-2 text-gray-500">
                        <Calendar size={16} />
                        <span>{plan.startDate} ~ {plan.endDate}</span>
                      </div>
                      <div className="flex items-center gap-2 text-gray-500">
                        <Users size={16} />
                        <span>{plan.travelers}人</span>
                      </div>
                      <div className="flex items-center gap-2 text-gray-500">
                        <MapPin size={16} />
                        <span>{plan.routeStops.map(stop => stop.placeName).join(' → ') || plan.arrivalPoint}</span>
                      </div>
                      <div className="flex items-center gap-2 text-gray-500">
                        <DollarSign size={16} />
                        <span>¥{plan.budget}</span>
                      </div>
                    </div>

                    {(plan.needsPickup || plan.routeStops.some(stop => stop.lookingForPartner)) && (
                      <div className="flex items-center gap-2">
                        {plan.routeStops.some(stop => stop.lookingForPartner) && (
                          <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs">
                            looking for partner
                          </span>
                        )}
                        {plan.needsPickup && (
                        <span className="px-2 py-1 bg-gray-200 text-gray-600 rounded text-xs flex items-center gap-1">
                          <Plane size={12} />
                          需要接机
                        </span>
                        )}
                      </div>
                    )}
                  </motion.div>
                ))}
              </div>
            </div>
          )}

          {/* Edit Modal with Expanding Animation */}
          <AnimatePresence>
            {editingPlan && editingFromIcon && (
              <>
                {/* Backdrop */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="fixed inset-0 bg-black/50 z-40"
                  onClick={() => {
                    setEditingPlan(null);
                    setEditingFromIcon(null);
                    setFormError(null);
                  }}
                />

                {/* Edit Card */}
                <motion.div
                  initial={{
                    position: 'fixed',
                    left: editingFromIcon.x,
                    top: editingFromIcon.y,
                    width: 40,
                    height: 40,
                    borderRadius: '50%',
                    opacity: 0,
                  }}
                  animate={{
                    left: '50%',
                    top: '50%',
                    width: 'min(600px, 90vw)',
                    height: 'auto',
                    borderRadius: '16px',
                    opacity: 1,
                    x: '-50%',
                    y: '-50%',
                  }}
                  exit={{
                    left: editingFromIcon.x,
                    top: editingFromIcon.y,
                    width: 40,
                    height: 40,
                    borderRadius: '50%',
                    opacity: 0,
                    x: 0,
                    y: 0,
                  }}
                  transition={{ duration: 0.5, ease: [0.34, 1.56, 0.64, 1] }}
                  className="fixed z-50 bg-white shadow-2xl overflow-hidden max-h-[85vh] flex flex-col"
                >
                  {/* Header */}
                  <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between flex-shrink-0">
                    <button
                      onClick={() => {
                        setEditingPlan(null);
                        setEditingFromIcon(null);
                        setFormError(null);
                      }}
                      className="p-2 -ml-2 hover:bg-gray-100 rounded-lg"
                    >
                      <ArrowLeft size={20} />
                    </button>
                    <h2 className="text-lg font-bold">编辑计划</h2>
                    <div className="w-10"></div>
                  </div>

                  {/* Scrollable Form Content */}
                  <div className="overflow-y-auto flex-1 px-6 py-4">
                    <FormFields formData={formData} setFormData={setFormData} regions={regions} />
                    {formError && (
                      <div className="mt-4 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                        <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
                        <span>{formError}</span>
                      </div>
                    )}

                    {/* Action Buttons - Inside scrollable area */}
                    <div className="flex gap-3 pt-6 mt-6 border-t border-gray-200">
                      <button
                        onClick={handleSaveEdit}
                        className="flex-1 px-4 py-3 border-2 border-blue-600 text-blue-600 rounded-lg hover:bg-blue-50 font-medium flex items-center justify-center gap-2"
                      >
                        <Save size={18} />
                        保存修改
                      </button>
                      <button
                        onClick={handlePublishEdit}
                        className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium flex items-center justify-center gap-2"
                      >
                        <Send size={18} />
                        发布计划
                      </button>
                    </div>
                  </div>
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </div>
      ) : (
        /* Guide Service Settings */
        <div>
          <h1 className="text-2xl font-bold mb-6">我的导游服务</h1>

          {myServices.map(service => (
            <div key={service.id} className="bg-white rounded-xl shadow-sm p-6 mb-6">
              <div className="flex justify-between items-start mb-6">
                <h3 className="font-bold text-xl">服务设置</h3>
                <button
                  onClick={(e) => handleEditService(service, e)}
                  className="px-4 py-2 bg-gray-100 rounded-lg hover:bg-gray-200 flex items-center gap-2 transition-colors"
                >
                  <Edit2 size={16} />
                  <span>编辑</span>
                </button>
              </div>

              <div className="grid md:grid-cols-2 gap-6 mb-6">
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-2">所在地区</label>
                  <p className="font-medium">{service.location}</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-2">服务地区</label>
                  <p className="font-medium">{service.serviceAreas.join(', ')}</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-2">每日价格</label>
                  <p className="text-2xl font-bold text-blue-600">¥{service.pricePerDay}</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-2">接机服务</label>
                  <p className="font-medium">{service.airportPickup ? '提供' : '不提供'}</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-2">服务方式</label>
                  <p className="font-medium">
                    {service.serviceScopeModes.map(mode => serviceModeLabels[mode]).join(' / ')}
                  </p>
                </div>
              </div>

              <div className="pt-6 border-t border-gray-200">
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <p className="text-2xl font-bold text-blue-600">{service.activeOrders}</p>
                    <p className="text-sm text-gray-600">进行中订单</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-green-600">{service.upcomingBookings}</p>
                    <p className="text-sm text-gray-600">待服务订单</p>
                  </div>
                  <div>
                    <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${
                      service.availability === 'available'
                        ? 'bg-green-100 text-green-700'
                        : 'bg-gray-100 text-gray-700'
                    }`}>
                      {service.availability === 'available' ? '可接单' : '暂停接单'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))}

          {/* Upcoming Bookings */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h3 className="font-bold text-lg mb-4">待服务订单</h3>
            <div className="space-y-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <p className="font-medium">上海 → 北京 → 上海</p>
                      <p className="text-sm text-gray-600">旅行者: 陈晓</p>
                    </div>
                    <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs">
                      已确认
                    </span>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-gray-600">
                    <span>2026-06-15</span>
                    <span>2人</span>
                    <span>¥1000/天</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Service Edit Full-Screen Overlay */}
          <AnimatePresence>
            {editingService && editingServiceFromIcon && (
              <>
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="fixed inset-0 bg-black/40 z-40"
                />
                <motion.div
                  initial={{
                    position: 'fixed',
                    left: editingServiceFromIcon.x,
                    top: editingServiceFromIcon.y,
                    width: 40,
                    height: 40,
                    borderRadius: '50%',
                    opacity: 0,
                    x: '-50%',
                    y: '-50%',
                  }}
                  animate={{
                    left: 0,
                    top: 0,
                    width: '100vw',
                    height: '100vh',
                    borderRadius: '0px',
                    opacity: 1,
                    x: 0,
                    y: 0,
                  }}
                  exit={{
                    left: editingServiceFromIcon.x,
                    top: editingServiceFromIcon.y,
                    width: 40,
                    height: 40,
                    borderRadius: '50%',
                    opacity: 0,
                    x: '-50%',
                    y: '-50%',
                  }}
                  transition={{ duration: 0.45, ease: [0.34, 1.2, 0.64, 1] }}
                  className="fixed z-50 bg-white flex flex-col overflow-hidden"
                >
                  {/* Header */}
                  <div className="bg-white border-b border-gray-200 px-4 py-4 flex items-center gap-3 flex-shrink-0 pt-safe">
                    <button
                      onClick={() => {
                        setEditingService(null);
                        setEditingServiceFromIcon(null);
                      }}
                      className="p-2 -ml-2 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                      <ArrowLeft size={20} />
                    </button>
                    <h2 className="text-lg font-bold flex-1">编辑导游服务</h2>
                  </div>

                  {/* Scrollable Content */}
                  <div className="overflow-y-auto flex-1 px-5 py-5 space-y-5">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">所在地区</label>
                      <input
                        type="text"
                        value={serviceFormData.location}
                        onChange={(e) => setServiceFormData({ ...serviceFormData, location: e.target.value })}
                        placeholder="例: 上海"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">服务地区（逗号分隔）</label>
                      <input
                        type="text"
                        value={serviceAreasInput}
                        onChange={(e) => setServiceAreasInput(e.target.value)}
                        placeholder="例: 上海, 江苏, 浙江"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">每日价格（元）</label>
                      <input
                        type="number"
                        min="0"
                        value={serviceFormData.pricePerDay}
                        onChange={(e) => setServiceFormData({ ...serviceFormData, pricePerDay: parseInt(e.target.value) || 0 })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label className="flex items-center gap-3 cursor-pointer p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                        <input
                          type="checkbox"
                          checked={serviceFormData.airportPickup}
                          onChange={(e) => setServiceFormData({ ...serviceFormData, airportPickup: e.target.checked })}
                          className="w-5 h-5 accent-blue-600"
                        />
                        <div>
                          <p className="font-medium text-sm">提供接机服务</p>
                          <p className="text-xs text-gray-500">勾选后旅行者可在订单中选择接机</p>
                        </div>
                      </label>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">接单状态</label>
                      <div className="grid grid-cols-2 gap-3">
                        {[
                          { value: 'available', label: '可接单', color: 'green' },
                          { value: 'unavailable', label: '暂停接单', color: 'gray' },
                        ].map(({ value, label, color }) => (
                          <button
                            key={value}
                            onClick={() => setServiceFormData({ ...serviceFormData, availability: value })}
                            className={`py-3 rounded-lg border-2 font-medium text-sm transition-colors ${
                              serviceFormData.availability === value
                                ? color === 'green'
                                  ? 'border-green-500 bg-green-50 text-green-700'
                                  : 'border-gray-400 bg-gray-100 text-gray-700'
                                : 'border-gray-200 text-gray-500 hover:border-gray-300'
                            }`}
                          >
                            {label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">可接受的服务方式</label>
                      <div className="grid grid-cols-2 gap-3">
                        {([
                          ['point_to_point', '单一地区', '只服务某个城市或片段'],
                          ['full_route', '整条路线', '可陪同完成整条线路'],
                        ] as const).map(([value, label, description]) => {
                          const checked = serviceFormData.serviceScopeModes.includes(value);
                          return (
                            <button
                              key={value}
                              type="button"
                              onClick={() => {
                                const nextModes = checked
                                  ? serviceFormData.serviceScopeModes.filter(mode => mode !== value)
                                  : [...serviceFormData.serviceScopeModes, value];
                                setServiceFormData({
                                  ...serviceFormData,
                                  serviceScopeModes: nextModes.length ? nextModes : [value],
                                });
                              }}
                              className={`rounded-lg border-2 p-3 text-left transition-colors ${
                                checked
                                  ? 'border-blue-600 bg-blue-50 text-blue-700'
                                  : 'border-gray-200 text-gray-600 hover:border-gray-300'
                              }`}
                            >
                              <div className="font-semibold text-sm">{label}</div>
                              <div className="text-xs text-gray-500">{description}</div>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div className="pt-4 border-t border-gray-200">
                      <button
                        onClick={handleSaveService}
                        className="w-full py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
                      >
                        <Save size={18} />
                        保存设置
                      </button>
                    </div>
                  </div>
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
