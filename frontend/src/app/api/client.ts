import { clearTokens, getAccessToken, getRefreshToken, saveTokens } from './auth-store';
import type {
  ApiEnvelope,
  AppBootstrapData,
  AuthResponse,
  CurrentUser,
  AnonymousAgreement,
  CalendarEventRecord,
  DisputeCase,
  FollowedUser,
  GuideProfile,
  GuideProfileUpdatePayload,
  GuideVerification,
  Market,
  MapRouteRecord,
  MessageRecord,
  MessageThread,
  NotificationRecord,
  PartnerLead,
  PublicUserProfile,
  Region,
  RouteNodeCreatePayload,
  ProfileBundle,
  ReviewRecord,
  ServiceOrder,
  TravelPlan,
  TravelPlanLead,
  TravelPlanCreatePayload,
} from './types';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://127.0.0.1:8000';

export class ApiError extends Error {
  status: number;
  traceId?: string;
  fieldErrors: Record<string, string>;

  constructor(message: string, status: number, traceId?: string, fieldErrors: Record<string, string> = {}) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.traceId = traceId;
    this.fieldErrors = fieldErrors;
  }
}

async function request<T>(path: string, init: RequestInit = {}, retry = true): Promise<T> {
  const headers = new Headers(init.headers);
  headers.set('content-type', 'application/json');
  const token = getAccessToken();
  if (token) {
    headers.set('authorization', `Bearer ${token}`);
  }
  const response = await fetch(`${API_BASE_URL}${path}`, { ...init, headers });
  const payload = (await response.json().catch(() => null)) as ApiEnvelope<T> | null;
  if (response.status === 401 && retry && getRefreshToken()) {
    const refreshed = await refreshAccessToken();
    if (refreshed) {
      return request<T>(path, init, false);
    }
  }
  if (!response.ok || !payload?.success) {
    throw new ApiError(
      payload?.error?.message ?? `Request failed: ${response.status}`,
      response.status,
      payload?.error?.trace_id,
      payload?.error?.field_errors ?? {},
    );
  }
  return payload.data as T;
}

async function refreshAccessToken() {
  const refreshToken = getRefreshToken();
  if (!refreshToken) {
    return false;
  }
  const response = await fetch(`${API_BASE_URL}/api/v1/auth/refresh`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ refresh_token: refreshToken }),
  });
  const payload = (await response.json().catch(() => null)) as ApiEnvelope<{ access_token: string }> | null;
  if (!response.ok || !payload?.success || !payload.data?.access_token) {
    clearTokens();
    return false;
  }
  const existingRefreshToken = getRefreshToken();
  if (!existingRefreshToken) {
    return false;
  }
  saveTokens({
    access_token: payload.data.access_token,
    refresh_token: existingRefreshToken,
    token_type: 'bearer',
  });
  return true;
}

export const apiClient = {
  login(identifier: string, password: string) {
    return request<AuthResponse>('/api/v1/auth/login', {
      method: 'POST',
      body: JSON.stringify({ provider: 'email', identifier, password }),
    });
  },
  register(identifier: string, password: string, displayName: string) {
    return request<AuthResponse>('/api/v1/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        provider: 'email',
        identifier,
        password,
        display_name: displayName,
        preferred_locale: 'en-US',
        preferred_currency: 'CNY',
      }),
    });
  },
  me() {
    return request<CurrentUser>('/api/v1/auth/me');
  },
  markets() {
    return request<Market[]>('/api/v1/markets', {}, false);
  },
  regions(marketId: string) {
    return request<Region[]>(`/api/v1/markets/${marketId}/regions`, {}, false);
  },
  profiles() {
    return request<ProfileBundle>('/api/v1/me/profiles');
  },
  switchRole(role: 'traveler' | 'guide', marketId?: string | null) {
    return request<{ active_profile: unknown; user: CurrentUser }>('/api/v1/me/role-switch', {
      method: 'POST',
      body: JSON.stringify({ role, market_id: marketId ?? null }),
    });
  },
  guides(marketId: string) {
    return request<GuideProfile[]>(`/api/v1/markets/${marketId}/guides`);
  },
  guideProfile(guideProfileId: string) {
    return request<GuideProfile>(`/api/v1/guides/${guideProfileId}`);
  },
  updateGuideProfile(guideProfileId: string, payload: GuideProfileUpdatePayload) {
    return request<GuideProfile>(`/api/v1/guides/${guideProfileId}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  },
  publicUserProfile(userId: string) {
    return request<PublicUserProfile>(`/api/v1/users/${userId}/public-profile`);
  },
  travelPlans(marketId: string) {
    return request<TravelPlan[]>(`/api/v1/markets/${marketId}/travel-plans`);
  },
  mapRoutes(marketId: string, role: 'traveler' | 'guide') {
    return request<MapRouteRecord[]>(`/api/v1/markets/${marketId}/map-routes?role=${role}`);
  },
  calendarEvents(marketId: string, role: 'traveler' | 'guide') {
    return request<CalendarEventRecord[]>(`/api/v1/markets/${marketId}/calendar-events?role=${role}`);
  },
  travelPlanLeads(marketId: string) {
    return request<TravelPlanLead[]>(`/api/v1/markets/${marketId}/travel-plan-leads`);
  },
  partnerLeads(marketId: string) {
    return request<PartnerLead[]>(`/api/v1/markets/${marketId}/partner-leads`);
  },
  followedUsers() {
    return request<FollowedUser[]>('/api/v1/me/follows');
  },
  followUser(userId: string, marketId?: string | null) {
    const suffix = marketId ? `?market_id=${marketId}` : '';
    return request<FollowedUser | { follower_user_id: string; followed_user_id: string }>(`/api/v1/users/${userId}/follow${suffix}`, {
      method: 'POST',
    });
  },
  unfollowUser(userId: string) {
    return request<{ deleted: boolean }>(`/api/v1/users/${userId}/follow`, {
      method: 'DELETE',
    });
  },
  followStatus(userId: string) {
    return request<{ is_following: boolean }>(`/api/v1/users/${userId}/follow`);
  },
  createTravelPlan(marketId: string, payload: TravelPlanCreatePayload) {
    return request<TravelPlan>(`/api/v1/markets/${marketId}/travel-plans`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },
  publishTravelPlan(planId: string) {
    return request<TravelPlan>(`/api/v1/travel-plans/${planId}/publish`, {
      method: 'POST',
    });
  },
  createRouteNode(planId: string, payload: RouteNodeCreatePayload) {
    return request<TravelPlan['route_nodes']>(`/api/v1/travel-plans/${planId}/route-nodes`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },
  messageThreads(marketId: string) {
    return request<MessageThread[]>(`/api/v1/markets/${marketId}/message-threads`);
  },
  createMessageThread(marketId: string, recipientUserId: string, travelPlanId?: string | null) {
    return request<MessageThread>(`/api/v1/markets/${marketId}/message-threads`, {
      method: 'POST',
      body: JSON.stringify({ recipient_user_id: recipientUserId, travel_plan_id: travelPlanId ?? null }),
    });
  },
  messageThread(threadId: string) {
    return request<MessageThread>(`/api/v1/message-threads/${threadId}`);
  },
  threadMessages(threadId: string) {
    return request<MessageRecord[]>(`/api/v1/message-threads/${threadId}/messages`);
  },
  sendThreadMessage(threadId: string, body: string) {
    return request<MessageRecord>(`/api/v1/message-threads/${threadId}/messages`, {
      method: 'POST',
      body: JSON.stringify({ body }),
    });
  },
  orders(marketId: string) {
    return request<ServiceOrder[]>(`/api/v1/markets/${marketId}/orders`);
  },
  order(orderId: string) {
    return request<ServiceOrder>(`/api/v1/orders/${orderId}`);
  },
  travelerConfirmOrder(orderId: string) {
    return request<ServiceOrder>(`/api/v1/orders/${orderId}/traveler-confirm`, {
      method: 'POST',
    });
  },
  guideConfirmOrder(orderId: string) {
    return request<ServiceOrder>(`/api/v1/orders/${orderId}/guide-confirm`, {
      method: 'POST',
    });
  },
  completeOrder(orderId: string) {
    return request<ServiceOrder>(`/api/v1/orders/${orderId}/complete`, {
      method: 'POST',
    });
  },
  agreement(orderId: string) {
    return request<AnonymousAgreement>(`/api/v1/orders/${orderId}/agreement`);
  },
  signAgreement(orderId: string) {
    return request<AnonymousAgreement>(`/api/v1/orders/${orderId}/agreement/sign`, {
      method: 'POST',
    });
  },
  reviews(orderId: string) {
    return request<ReviewRecord[]>(`/api/v1/orders/${orderId}/reviews`);
  },
  createReview(orderId: string, rating: number, body: string, dimensions: Record<string, unknown> = {}) {
    return request<ReviewRecord>(`/api/v1/orders/${orderId}/reviews`, {
      method: 'POST',
      body: JSON.stringify({ rating, body: body || null, dimensions_json: dimensions }),
    });
  },
  notifications() {
    return request<NotificationRecord[]>('/api/v1/me/notifications');
  },
  markNotificationRead(notificationId: string) {
    return request<NotificationRecord>(`/api/v1/me/notifications/${notificationId}/read`, {
      method: 'POST',
    });
  },
  submitGuideVerification(guideProfileId: string) {
    return request<GuideVerification>(`/api/v1/guides/${guideProfileId}/verification`, {
      method: 'POST',
    });
  },
  guideVerification(guideProfileId: string) {
    return request<GuideVerification>(`/api/v1/guides/${guideProfileId}/verification`);
  },
  reviewGuideVerification(guideProfileId: string, verificationId: string, status: 'approved' | 'rejected', failureReason?: string) {
    return request<GuideVerification>(`/api/v1/guides/${guideProfileId}/verification/${verificationId}`, {
      method: 'PATCH',
      body: JSON.stringify({ status, failure_reason: failureReason ?? null }),
    });
  },
  adminOrders(marketId: string) {
    return request<ServiceOrder[]>(`/api/v1/admin/markets/${marketId}/orders`);
  },
  adminDisputes(marketId: string) {
    return request<DisputeCase[]>(`/api/v1/admin/markets/${marketId}/disputes`);
  },
  adminGuideVerifications(marketId: string) {
    return request<GuideVerification[]>(`/api/v1/admin/markets/${marketId}/guide-verifications`);
  },
  async bootstrap(activeRole: 'traveler' | 'guide' = 'traveler'): Promise<AppBootstrapData> {
    const markets = await apiClient.markets();
    const selectedMarket = markets[0] ?? null;
    if (!selectedMarket || !getAccessToken()) {
      return {
        markets,
        selectedMarket,
        regions: [],
        profiles: null,
        guides: [],
        travelPlans: [],
        mapRoutes: [],
        calendarEvents: [],
        travelPlanLeads: [],
        partnerLeads: [],
        followedUsers: [],
        messageThreads: [],
        orders: [],
        notifications: [],
      };
    }
    const [regions, profiles, guides, travelPlans, mapRoutes, calendarEvents, travelPlanLeads, partnerLeads, followedUsers, messageThreads, orders, notifications] = await Promise.all([
      apiClient.regions(selectedMarket.id).catch(() => []),
      apiClient.profiles().catch(() => null),
      apiClient.guides(selectedMarket.id).catch(() => []),
      apiClient.travelPlans(selectedMarket.id).catch(() => []),
      apiClient.mapRoutes(selectedMarket.id, activeRole).catch(() => []),
      apiClient.calendarEvents(selectedMarket.id, activeRole).catch(() => []),
      apiClient.travelPlanLeads(selectedMarket.id).catch(() => []),
      apiClient.partnerLeads(selectedMarket.id).catch(() => []),
      apiClient.followedUsers().catch(() => []),
      apiClient.messageThreads(selectedMarket.id).catch(() => []),
      apiClient.orders(selectedMarket.id).catch(() => []),
      apiClient.notifications().catch(() => []),
    ]);
    return {
      markets,
      selectedMarket,
      regions,
      profiles,
      guides,
      travelPlans,
      mapRoutes,
      calendarEvents,
      travelPlanLeads,
      partnerLeads,
      followedUsers,
      messageThreads,
      orders,
      notifications,
    };
  },
};
