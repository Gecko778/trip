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
  traveler_profiles: unknown[];
  guide_profiles: unknown[];
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
  status: string;
  payment_status: string;
  guide_price_amount: string;
  guide_price_currency: string;
  service_start_date: string | null;
}

export interface AppBootstrapData {
  markets: Market[];
  selectedMarket: Market | null;
  profiles: ProfileBundle | null;
  guides: GuideProfile[];
  travelPlans: TravelPlan[];
  messageThreads: MessageThread[];
  orders: ServiceOrder[];
}
