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
  status: string;
  title: string | null;
  arrival_date: string;
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
  travelPlans: TravelPlan[];
  messageThreads: MessageThread[];
  orders: ServiceOrder[];
}
