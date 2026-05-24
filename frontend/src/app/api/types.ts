export type UserRole = 'traveler' | 'guide';

export interface ApiEnvelope<T> {
  success: boolean;
  data?: T;
  meta?: { trace_id?: string; [key: string]: unknown };
  error?: {
    error_code: string;
    message: string;
    field_errors: Record<string, string>;
    trace_id?: string;
  };
}

export interface AuthTokens {
  access_token: string;
  refresh_token: string;
  token_type: string;
}

export interface UserRoleAssignment {
  code: string;
  name: string;
  market_id: string | null;
  region_id?: string | null;
  scope_type: string;
  scope_id: string | null;
}

export interface CurrentUser {
  id: string;
  display_name: string;
  avatar_url: string | null;
  preferred_locale: string;
  preferred_currency: string;
  risk_level: string;
  status: string;
  roles: UserRoleAssignment[];
  permissions: string[];
}

export interface AuthResponse {
  user: CurrentUser;
  tokens: AuthTokens;
}

export interface Market {
  id: string;
  code: string;
  name: string;
  status?: string;
  default_country_code?: string;
  default_locale?: string;
  default_currency?: string;
  timezone?: string;
}

export interface ProfileBundle {
  role_profiles: unknown[];
  traveler_profiles: Array<{ id: string; user_id: string; market_id: string; preference_json: Record<string, unknown> }>;
  guide_profiles: GuideProfile[];
}

export interface TravelPlan {
  id: string;
  market_id: string;
  traveler_user_id: string;
  country_code?: string;
  status: string;
  title: string | null;
  arrival_date: string;
  arrival_region_id?: string | null;
  needs_pickup?: boolean;
  traveler_count?: number;
  budget_min_amount?: string | null;
  budget_max_amount?: string | null;
  budget_currency?: string | null;
  notes?: string | null;
  route_nodes?: Array<{
    id: string;
    region_id: string | null;
    sequence: number;
    planned_start_at: string | null;
    planned_end_at: string | null;
    notes: string | null;
  }>;
}

export type PlanVisibility = 'public' | 'guides_only' | 'travelers_only' | 'private';

export interface TravelPlanCreatePayload {
  country_code: string;
  arrival_date: string;
  arrival_region_id?: string | null;
  needs_pickup: boolean;
  traveler_count: number;
  budget_min_amount?: number | null;
  budget_max_amount?: number | null;
  budget_currency?: string | null;
  visibility: PlanVisibility;
  title?: string | null;
  notes?: string | null;
}

export interface RouteNodeCreatePayload {
  region_id?: string | null;
  sequence: number;
  planned_start_at?: string | null;
  planned_end_at?: string | null;
  notes?: string | null;
}

export interface GuideProfile {
  id: string;
  user_id: string;
  market_id: string;
  country_code: string;
  home_region_id: string;
  daily_price_amount: string;
  quote_currency: string;
  offers_pickup: boolean;
  gender: string;
  birth_year: number | null;
  language_tags: string[];
  rating: string | null;
  reputation_status: string;
  verification_status: string;
  completed_order_count: number;
  cancellation_rate: string;
  breach_rate: string;
  average_response_seconds: number | null;
  badge_status: string;
  is_listed: boolean;
  service_region_ids: string[];
}

export interface MessageThread {
  id: string;
  market_id: string;
  initiator_user_id: string;
  recipient_user_id: string;
  travel_plan_id: string | null;
  order_id?: string | null;
  restriction_status: string;
  last_message_at: string | null;
}

export interface ServiceOrder {
  id: string;
  market_id: string;
  traveler_user_id: string;
  guide_user_id: string;
  travel_plan_id?: string | null;
  message_thread_id?: string | null;
  status: string;
  payment_status: string;
  guide_price_amount: string;
  guide_price_currency: string;
  traveler_display_amount?: string | null;
  traveler_display_currency?: string | null;
  service_start_date: string | null;
  service_end_date?: string | null;
  service_region_id?: string | null;
  needs_pickup?: boolean;
  traveler_count?: number;
  traveler_price_confirmed_at?: string | null;
  guide_itinerary_confirmed_at?: string | null;
  itinerary_json?: Record<string, unknown>;
  cancellation_policy?: string | null;
  breach_responsibility?: string | null;
  canceled_at?: string | null;
  cancellation_penalty_applied?: boolean;
  cancellation_penalty_note?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface AnonymousAgreement {
  id: string;
  market_id: string;
  traveler_user_id: string;
  guide_user_id: string;
  order_id: string;
  agreement_version: string;
  status: string;
  service_start_date: string | null;
  service_end_date: string | null;
  service_region_id: string | null;
  price_amount: string;
  price_currency: string;
  cancellation_policy: string | null;
  breach_responsibility: string | null;
  traveler_signed_at: string | null;
  guide_signed_at: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface ReviewRecord {
  id: string;
  market_id: string;
  order_id: string;
  reviewer_user_id: string;
  reviewee_user_id: string;
  rating: string;
  body: string | null;
  dimensions_json: Record<string, unknown>;
  created_at: string;
}

export interface NotificationRecord {
  id: string;
  market_id: string | null;
  user_id: string;
  type: string;
  related_order_id: string | null;
  related_thread_id: string | null;
  related_agreement_id: string | null;
  title: string;
  body: string | null;
  read_at: string | null;
  created_at: string;
}

export interface GuideVerification {
  id: string;
  guide_profile_id: string;
  market_id: string;
  identity_status: string;
  qualification_status: string;
  real_avatar_status: string;
  service_region_status: string;
  language_status: string;
  badge_status: string;
  failure_reason: string | null;
  appeal_status: string | null;
  submitted_at: string | null;
  reviewed_at: string | null;
  reviewed_by: string | null;
}

export interface DisputeCase {
  id: string;
  market_id: string;
  order_id: string;
  opened_by_user_id: string;
  dispute_type: string;
  status: string;
  summary: string | null;
  created_at?: string;
}

export interface AppBootstrapData {
  markets: Market[];
  selectedMarket: Market | null;
  profiles: ProfileBundle | null;
  guides: GuideProfile[];
  travelPlans: TravelPlan[];
  messageThreads: MessageThread[];
  orders: ServiceOrder[];
  notifications: NotificationRecord[];
}
