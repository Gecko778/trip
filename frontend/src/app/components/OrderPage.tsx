import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Calendar, MapPin, Users, DollarSign, Plane, CheckCircle, AlertTriangle, FileText, Shield } from 'lucide-react';
import { useApp } from '../App';
import { apiClient, ApiError } from '../api/client';
import type { AnonymousAgreement, ServiceOrder } from '../api/types';

type OrderStatus = 'draft' | 'traveler_confirm' | 'guide_confirm' | 'agreement_pending' | 'payment_pending' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled';

export function OrderPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, refreshAppData } = useApp();
  const [orderStatus, setOrderStatus] = useState<OrderStatus>('draft');
  const [travelerConfirmed, setTravelerConfirmed] = useState(false);
  const [guideConfirmed, setGuideConfirmed] = useState(false);
  const [showAgreement, setShowAgreement] = useState(false);
  const [agreementSigned, setAgreementSigned] = useState(false);
  const [apiOrder, setApiOrder] = useState<ServiceOrder | null>(null);
  const [apiAgreement, setApiAgreement] = useState<AnonymousAgreement | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const mockOrder = {
    id: '202606150001',
    guide: {
      name: '张伟',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=zhang',
      verified: true,
      rating: 4.9,
    },
    traveler: {
      name: '陈晓',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=chen',
    },
    route: '上海 → 北京 → 上海',
    startDate: '2026-06-15',
    endDate: '2026-06-18',
    days: 4,
    arrivalPoint: '上海浦东机场',
    needsPickup: true,
    travelers: 2,
    pricePerDay: 1000,
    totalAmount: 4000,
    serviceDetails: [
      '全天陪同导游服务',
      '行程规划与优化',
      '景点讲解',
      '餐厅推荐',
      '机场接送服务',
    ],
  };

  const syncApiState = (nextOrder: ServiceOrder) => {
    setApiOrder(nextOrder);
    setTravelerConfirmed(Boolean(nextOrder.traveler_price_confirmed_at));
    setGuideConfirmed(Boolean(nextOrder.guide_itinerary_confirmed_at));
    if (nextOrder.status === 'pending_both_confirm') setOrderStatus('draft');
    else if (nextOrder.status === 'pending_traveler_confirm') setOrderStatus('traveler_confirm');
    else if (nextOrder.status === 'pending_guide_confirm') setOrderStatus('guide_confirm');
    else if (nextOrder.status === 'pending_agreement') setOrderStatus('agreement_pending');
    else if (nextOrder.status === 'confirmed') setOrderStatus('confirmed');
    else if (nextOrder.status === 'completed') setOrderStatus('completed');
    else if (nextOrder.status === 'cancelled') setOrderStatus('cancelled');
  };

  useEffect(() => {
    if (!id) return;
    const loadOrder = async () => {
      try {
        const loadedOrder = await apiClient.order(id);
        syncApiState(loadedOrder);
        const agreement = await apiClient.agreement(id).catch(() => null);
        setApiAgreement(agreement);
        setAgreementSigned(Boolean(agreement?.traveler_signed_at || agreement?.guide_signed_at));
      } catch {
        setApiOrder(null);
      }
    };
    loadOrder();
  }, [id]);

  const order = apiOrder
    ? {
        id: apiOrder.id,
        guide: {
          name: `导游 ${apiOrder.guide_user_id.slice(0, 4)}`,
          avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${apiOrder.guide_user_id}`,
          verified: true,
          rating: 0,
        },
        traveler: {
          name: `旅行者 ${apiOrder.traveler_user_id.slice(0, 4)}`,
          avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${apiOrder.traveler_user_id}`,
        },
        route: typeof apiOrder.itinerary_json?.route === 'string' ? apiOrder.itinerary_json.route : `订单 ${apiOrder.id.slice(0, 8)}`,
        startDate: apiOrder.service_start_date ?? '待确认',
        endDate: apiOrder.service_end_date ?? apiOrder.service_start_date ?? '待确认',
        days: 1,
        arrivalPoint: apiOrder.service_region_id ? `地区 ${apiOrder.service_region_id.slice(0, 4)}` : '待确认',
        needsPickup: Boolean(apiOrder.needs_pickup),
        travelers: apiOrder.traveler_count ?? 1,
        pricePerDay: Number(apiOrder.guide_price_amount),
        totalAmount: Number(apiOrder.guide_price_amount),
        serviceDetails: ['MVP 导游服务订单', '双方确认后可签署匿名协议', '真实支付后续接入'],
      }
    : mockOrder;

  const getStatusText = (status: OrderStatus) => {
    const statusMap = {
      draft: '草稿',
      traveler_confirm: '待旅行者确认',
      guide_confirm: '待导游确认',
      agreement_pending: '待签署协议',
      payment_pending: '待支付',
      confirmed: '已确认',
      in_progress: '服务中',
      completed: '已完成',
      cancelled: '已取消',
    };
    return statusMap[status];
  };

  const handleTravelerConfirm = async () => {
    if (apiOrder) {
      try {
        const updated = await apiClient.travelerConfirmOrder(apiOrder.id);
        syncApiState(updated);
        await refreshAppData();
      } catch (error) {
        setActionError(error instanceof ApiError ? error.message : '旅行者确认失败');
      }
      return;
    }
    setTravelerConfirmed(true);
    if (guideConfirmed) {
      setOrderStatus('agreement_pending');
    } else {
      setOrderStatus('guide_confirm');
    }
  };

  const handleGuideConfirm = async () => {
    if (apiOrder) {
      try {
        const updated = await apiClient.guideConfirmOrder(apiOrder.id);
        syncApiState(updated);
        await refreshAppData();
      } catch (error) {
        setActionError(error instanceof ApiError ? error.message : '导游确认失败');
      }
      return;
    }
    setGuideConfirmed(true);
    if (travelerConfirmed) {
      setOrderStatus('agreement_pending');
    } else {
      setOrderStatus('traveler_confirm');
    }
  };

  const handleSignAgreement = async () => {
    if (apiOrder) {
      try {
        const signed = await apiClient.signAgreement(apiOrder.id);
        setApiAgreement(signed);
        setAgreementSigned(true);
        setShowAgreement(false);
        const updated = await apiClient.order(apiOrder.id);
        syncApiState(updated);
        await refreshAppData();
      } catch (error) {
        setActionError(error instanceof ApiError ? error.message : '匿名协议签署失败');
      }
      return;
    }
    setAgreementSigned(true);
    setShowAgreement(false);
    setOrderStatus('confirmed');
  };

  return (
    <div className="fixed inset-0 bg-gray-50 z-50 overflow-y-auto pb-8">
      {/* Header */}
      <div className="sticky top-0 bg-white border-b border-gray-200 px-4 h-14 flex items-center gap-3 z-10">
        <button onClick={() => navigate(-1)} className="p-2 -ml-2 hover:bg-gray-100 rounded-lg">
          <ArrowLeft size={20} />
        </button>
        <div className="flex-1">
          <h1 className="font-bold">订单详情</h1>
          <p className="text-xs text-gray-500">订单号: {order.id}</p>
        </div>
        <span className={`px-3 py-1 rounded-full text-xs font-medium ${
          orderStatus === 'confirmed' || orderStatus === 'in_progress' || orderStatus === 'completed'
            ? 'bg-green-100 text-green-700'
            : orderStatus === 'cancelled'
            ? 'bg-red-100 text-red-700'
            : 'bg-blue-100 text-blue-700'
        }`}>
          {getStatusText(orderStatus)}
        </span>
      </div>

      <div className="max-w-screen-xl mx-auto p-4 space-y-4">
        {/* Progress Steps */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="font-bold mb-4">订单进度</h2>
          <div className="space-y-3">
            {[
              { status: 'draft', label: '创建订单草稿', done: true },
              { status: 'traveler_confirm', label: '旅行者确认价格', done: travelerConfirmed },
              { status: 'guide_confirm', label: '导游确认行程', done: guideConfirmed },
              { status: 'agreement_pending', label: '签署匿名协议', done: agreementSigned },
              { status: 'payment_pending', label: 'MVP 暂不接真实支付', done: agreementSigned },
              { status: 'confirmed', label: '订单确认', done: orderStatus === 'confirmed' || orderStatus === 'completed' },
            ].map((step, index) => (
              <div key={step.status} className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                  step.done ? 'bg-green-600 text-white' : 'bg-gray-200 text-gray-500'
                }`}>
                  {step.done ? <CheckCircle size={16} /> : <span className="text-sm">{index + 1}</span>}
                </div>
                <span className={`text-sm ${step.done ? 'font-medium' : 'text-gray-500'}`}>
                  {step.label}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Participants */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="font-bold mb-4">参与方</h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <img src={order.guide.avatar} alt={order.guide.name} className="w-12 h-12 rounded-full" />
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-medium">{order.guide.name}</p>
                    {order.guide.verified && <Shield size={14} className="text-blue-600" />}
                  </div>
                  <p className="text-sm text-gray-500">导游 · {order.guide.rating}分</p>
                </div>
              </div>
              {guideConfirmed && (
                <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">
                  已确认
                </span>
              )}
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <img src={order.traveler.avatar} alt={order.traveler.name} className="w-12 h-12 rounded-full" />
                <div>
                  <p className="font-medium">{order.traveler.name}</p>
                  <p className="text-sm text-gray-500">旅行者</p>
                </div>
              </div>
              {travelerConfirmed && (
                <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">
                  已确认
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Order Details */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="font-bold mb-4">订单详情</h2>
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <MapPin size={20} className="text-gray-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm text-gray-600">旅行路线</p>
                <p className="font-medium">{order.route}</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Calendar size={20} className="text-gray-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm text-gray-600">服务日期</p>
                <p className="font-medium">{order.startDate} 至 {order.endDate} ({order.days}天)</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Plane size={20} className="text-gray-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm text-gray-600">到达地点</p>
                <p className="font-medium">{order.arrivalPoint}</p>
                {order.needsPickup && (
                  <span className="inline-block mt-1 px-2 py-0.5 bg-orange-100 text-orange-700 rounded text-xs">
                    需要接机服务
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Users size={20} className="text-gray-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm text-gray-600">旅行人数</p>
                <p className="font-medium">{order.travelers}人</p>
              </div>
            </div>
          </div>
        </div>

        {/* Service Details */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="font-bold mb-4">服务内容</h2>
          <ul className="space-y-2">
            {order.serviceDetails.map((detail, index) => (
              <li key={index} className="flex items-start gap-2 text-sm">
                <CheckCircle size={16} className="text-green-600 flex-shrink-0 mt-0.5" />
                <span>{detail}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Price Breakdown */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="font-bold mb-4">价格明细</h2>
          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">导游服务费 ({order.days}天 × ¥{order.pricePerDay})</span>
              <span className="font-medium">¥{order.days * order.pricePerDay}</span>
            </div>
            {order.needsPickup && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">接机服务费</span>
                <span className="font-medium">已包含</span>
              </div>
            )}
            <div className="pt-3 border-t border-gray-200">
              <div className="flex justify-between items-center">
                <span className="font-bold">总计</span>
                <span className="text-2xl font-bold text-blue-600">¥{order.totalAmount}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          {actionError && (
            <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              {actionError}
            </div>
          )}
          {!travelerConfirmed && (!apiOrder || user?.id === apiOrder.traveler_user_id) && (
            <div className="mb-4 p-4 bg-blue-50 rounded-lg">
              <div className="flex items-start gap-3 mb-3">
                <AlertTriangle size={20} className="text-blue-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-blue-900">等待您确认价格</p>
                  <p className="text-sm text-blue-700 mt-1">
                    请仔细核对导游价格和服务内容，确认无误后点击下方按钮
                  </p>
                </div>
              </div>
              <button
                onClick={handleTravelerConfirm}
                className="w-full py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
              >
                确认价格 (¥{order.totalAmount})
              </button>
            </div>
          )}

          {!travelerConfirmed && apiOrder && user?.id !== apiOrder.traveler_user_id && (
            <div className="mb-4 p-4 bg-blue-50 rounded-lg">
              <p className="font-medium text-blue-900">等待旅行者确认价格</p>
              <p className="text-sm text-blue-700 mt-1">旅行者确认后即可进入下一步。</p>
            </div>
          )}

          {!guideConfirmed && travelerConfirmed && (!apiOrder || user?.id === apiOrder.guide_user_id) && (
            <button
              onClick={handleGuideConfirm}
              className="mb-4 w-full py-3 bg-amber-600 text-white rounded-lg hover:bg-amber-700 font-medium"
            >
              导游确认行程
            </button>
          )}

          {!guideConfirmed && travelerConfirmed && apiOrder && user?.id !== apiOrder.guide_user_id && (
            <div className="mb-4 p-4 bg-amber-50 rounded-lg">
              <div className="flex items-start gap-3">
                <AlertTriangle size={20} className="text-amber-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-amber-900">等待导游确认行程</p>
                  <p className="text-sm text-amber-700 mt-1">
                    导游正在审核您的行程安排，请耐心等待
                  </p>
                </div>
              </div>
            </div>
          )}

          {travelerConfirmed && guideConfirmed && !agreementSigned && (
            <div className="mb-4 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
              双方已确认，当前订单可签署匿名协议。MVP 阶段不接真实支付。
            </div>
          )}

          {travelerConfirmed && guideConfirmed && !agreementSigned && (
            <button
              onClick={() => setShowAgreement(true)}
              className="w-full py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium flex items-center justify-center gap-2"
            >
              <FileText size={20} />
              签署匿名协议
            </button>
          )}

          {agreementSigned && orderStatus !== 'completed' && (
            <button
              onClick={async () => {
                if (apiOrder) {
                  const completed = await apiClient.completeOrder(apiOrder.id).catch(() => null);
                  if (completed) {
                    syncApiState(completed);
                    await refreshAppData();
                  }
                } else {
                  setOrderStatus('completed');
                }
              }}
              className="w-full py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium flex items-center justify-center gap-2"
            >
              <CheckCircle size={20} />
              标记服务完成
            </button>
          )}

          {orderStatus === 'confirmed' && (
            <div className="text-center py-4">
              <CheckCircle size={48} className="text-green-600 mx-auto mb-3" />
              <p className="font-bold text-lg mb-1">订单已确认</p>
              <p className="text-sm text-gray-600">MVP 阶段不接真实支付，后续补齐支付流程。</p>
            </div>
          )}
        </div>
      </div>

      {/* Agreement Modal */}
      {showAgreement && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-2xl w-full max-h-[80vh] overflow-y-auto p-6">
            <h2 className="text-xl font-bold mb-4">匿名服务协议</h2>
            <div className="prose prose-sm mb-6 text-gray-700 space-y-3">
              <p className="font-medium">订单编号: {order.id}</p>

              <p>协议版本: {apiAgreement?.agreement_version ?? 'mvp-v1'}</p>
              <p>协议状态: {apiAgreement?.status ?? 'pending_sign'}</p>
              <p>服务日期: {apiAgreement?.service_start_date ?? order.startDate} 至 {apiAgreement?.service_end_date ?? order.endDate}</p>
              <p>服务地点: {apiAgreement?.service_region_id ? `地区 ${apiAgreement.service_region_id.slice(0, 4)}` : order.arrivalPoint}</p>
              <p>价格: {apiAgreement?.price_currency ?? 'CNY'} {apiAgreement?.price_amount ?? order.totalAmount}</p>
              <p>取消规则: {apiAgreement?.cancellation_policy ?? apiOrder?.cancellation_policy ?? '后端暂无取消规则字段'}</p>
              <p>违约责任: {apiAgreement?.breach_responsibility ?? apiOrder?.breach_responsibility ?? '后端暂无违约责任字段'}</p>
              <p>旅行者签署时间: {apiAgreement?.traveler_signed_at ?? '未签署'}</p>
              <p>导游签署时间: {apiAgreement?.guide_signed_at ?? '未签署'}</p>

              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mt-6">
                <div className="flex items-start gap-3">
                  <Shield size={20} className="text-amber-600 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-amber-900">
                    <strong>重要提示：</strong>
                    签署本协议即表示您同意遵守以上条款。违反协议将影响您的信誉记录，
                    严重者可能导致账号受限。请务必按约履行义务。
                  </p>
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowAgreement(false)}
                className="flex-1 px-4 py-3 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                取消
              </button>
              <button
                onClick={handleSignAgreement}
                className="flex-1 px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium"
              >
                我已阅读并同意签署
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
