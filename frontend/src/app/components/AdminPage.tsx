import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ClipboardList, ShieldCheck, AlertTriangle } from 'lucide-react';
import { apiClient, ApiError } from '../api/client';
import { useApp } from '../App';
import type { DisputeCase, GuideVerification, ServiceOrder } from '../api/types';

export function AdminPage() {
  const navigate = useNavigate();
  const { user, data } = useApp();
  const [orders, setOrders] = useState<ServiceOrder[]>([]);
  const [disputes, setDisputes] = useState<DisputeCase[]>([]);
  const [verifications, setVerifications] = useState<GuideVerification[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const canUseAdmin =
    user?.roles.some(role => ['sys_admin', 'market_admin', 'support_agent', 'guide_reviewer', 'risk_reviewer'].includes(role.code)) ||
    user?.permissions.includes('guide.verification:review');

  const loadAdminData = async () => {
    const marketId = data?.selectedMarket?.id;
    if (!marketId || !canUseAdmin) return;
    const [adminOrders, adminDisputes, guideVerifications] = await Promise.all([
      apiClient.adminOrders(marketId).catch(() => []),
      apiClient.adminDisputes(marketId).catch(() => []),
      apiClient.adminGuideVerifications(marketId).catch(() => []),
    ]);
    setOrders(adminOrders);
    setDisputes(adminDisputes);
    setVerifications(guideVerifications);
  };

  useEffect(() => {
    loadAdminData();
  }, [data?.selectedMarket?.id, canUseAdmin]);

  const reviewVerification = async (item: GuideVerification, status: 'approved' | 'rejected') => {
    try {
      await apiClient.reviewGuideVerification(
        item.guide_profile_id,
        item.id,
        status,
        status === 'rejected' ? 'M10 基础审核拒绝，详细原因后续补充。' : undefined,
      );
      setMessage(status === 'approved' ? '认证已通过。' : '认证已拒绝。');
      await loadAdminData();
    } catch (error) {
      setMessage(error instanceof ApiError ? error.message : '审核操作失败');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <div className="bg-white px-4 py-4 flex items-center gap-3 border-b border-gray-100 sticky top-0 z-30">
        <button onClick={() => navigate(-1)} className="p-2 -ml-2 hover:bg-gray-100 rounded-lg">
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-lg font-bold flex-1">后台基础</h1>
      </div>

      <div className="max-w-screen-xl mx-auto p-4 space-y-4">
        {!canUseAdmin && (
          <div className="rounded-xl bg-white p-6 shadow-sm">
            <div className="flex items-start gap-3">
              <AlertTriangle className="text-amber-600 flex-shrink-0" size={22} />
              <div>
                <p className="font-semibold">当前账号没有后台权限</p>
                <p className="text-sm text-gray-600 mt-1">后台入口仅对 admin / reviewer / support 角色开放。</p>
              </div>
            </div>
          </div>
        )}

        {message && (
          <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">
            {message}
          </div>
        )}

        <section className="rounded-xl bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <ClipboardList className="text-blue-600" size={22} />
            <h2 className="font-bold">订单列表</h2>
          </div>
          <div className="space-y-2">
            {orders.length === 0 ? (
              <p className="text-sm text-gray-500">暂无可展示订单，或当前账号无 support/admin 权限。</p>
            ) : orders.map(order => (
              <div key={order.id} className="rounded-lg border border-gray-100 p-3 text-sm">
                <div className="flex items-center justify-between gap-3">
                  <span className="font-mono text-xs text-gray-500">{order.id}</span>
                  <span className="rounded-full bg-gray-100 px-2 py-1 text-xs">{order.status}</span>
                </div>
                <p className="mt-2">价格: {order.guide_price_currency} {order.guide_price_amount}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-xl bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <ShieldCheck className="text-green-600" size={22} />
            <h2 className="font-bold">导游认证审核</h2>
          </div>
          <div className="space-y-2">
            {verifications.length === 0 ? (
              <p className="text-sm text-gray-500">暂无认证记录，或当前账号无 reviewer 权限。</p>
            ) : verifications.map(item => (
              <div key={item.id} className="rounded-lg border border-gray-100 p-3 text-sm">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="font-medium">Guide {item.guide_profile_id.slice(0, 8)}</p>
                    <p className="text-xs text-gray-500">badge: {item.badge_status}</p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => reviewVerification(item, 'approved')}
                      className="rounded-lg bg-green-600 px-3 py-2 text-xs font-medium text-white"
                    >
                      通过
                    </button>
                    <button
                      onClick={() => reviewVerification(item, 'rejected')}
                      className="rounded-lg bg-red-50 px-3 py-2 text-xs font-medium text-red-700"
                    >
                      拒绝
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-xl bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <AlertTriangle className="text-amber-600" size={22} />
            <h2 className="font-bold">争议列表</h2>
          </div>
          <div className="space-y-2">
            {disputes.length === 0 ? (
              <p className="text-sm text-gray-500">暂无争议记录，仲裁流程和工单分配后续补充。</p>
            ) : disputes.map(dispute => (
              <div key={dispute.id} className="rounded-lg border border-gray-100 p-3 text-sm">
                <div className="flex items-center justify-between gap-3">
                  <span className="font-medium">{dispute.dispute_type}</span>
                  <span className="rounded-full bg-amber-50 px-2 py-1 text-xs text-amber-700">{dispute.status}</span>
                </div>
                <p className="mt-2 text-gray-600">{dispute.summary ?? '暂无摘要'}</p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
