import sys
from datetime import date, timedelta
from decimal import Decimal
from uuid import UUID

from sqlalchemy import text
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.security import hash_password
from app.db.session import SessionLocal

CHINA_INBOUND_MARKET_ID = "00000000-0000-0000-0000-000000000100"
CHINA_REGION_ID = "00000000-0000-0000-0000-000000000200"
SHANGHAI_REGION_ID = "00000000-0000-0000-0000-000000000201"
BEIJING_REGION_ID = "00000000-0000-0000-0000-000000000202"
HANGZHOU_REGION_ID = "00000000-0000-0000-0000-000000000203"
SUZHOU_REGION_ID = "00000000-0000-0000-0000-000000000204"
NANJING_REGION_ID = "00000000-0000-0000-0000-000000000205"

DEMO_PASSWORD = "DemoPass123!"


def seed_demo() -> None:
    with SessionLocal.begin() as session:
        _seed_foundation(session)
        _seed_users_and_profiles(session)
        _seed_demo_flow(session)


def _seed_foundation(session: Session) -> None:
    session.execute(
        text(
            """
            INSERT INTO currencies (code, name, symbol, decimal_places)
            VALUES
                ('CNY', 'Chinese Yuan', '¥', 2),
                ('USD', 'US Dollar', '$', 2),
                ('GBP', 'British Pound', '£', 2),
                ('EUR', 'Euro', '€', 2)
            ON CONFLICT (code) DO UPDATE
            SET name = EXCLUDED.name,
                symbol = EXCLUDED.symbol,
                decimal_places = EXCLUDED.decimal_places,
                updated_at = now()
            """
        )
    )
    session.execute(
        text(
            """
            INSERT INTO locales (code, name)
            VALUES
                ('zh-CN', 'Simplified Chinese'),
                ('en-US', 'English (United States)'),
                ('en-GB', 'English (United Kingdom)')
            ON CONFLICT (code) DO UPDATE
            SET name = EXCLUDED.name,
                updated_at = now()
            """
        )
    )
    _seed_roles(session)
    _seed_bootstrap_admin(session)
    session.execute(
        text(
            """
            INSERT INTO markets (
                id, code, name, status, default_country_code,
                default_locale, default_currency, timezone
            )
            VALUES (
                :market_id, 'china_inbound',
                'China Inbound Travel', 'active', 'CN',
                'en-US', 'CNY', 'Asia/Shanghai'
            )
            ON CONFLICT (code) DO UPDATE
            SET id = EXCLUDED.id,
                name = EXCLUDED.name,
                status = EXCLUDED.status,
                default_country_code = EXCLUDED.default_country_code,
                default_locale = EXCLUDED.default_locale,
                default_currency = EXCLUDED.default_currency,
                timezone = EXCLUDED.timezone,
                updated_at = now()
            """
        ),
        {"market_id": CHINA_INBOUND_MARKET_ID},
    )
    regions = [
        (CHINA_REGION_ID, None, "country", "CN", "CN", "China", "Asia/Shanghai", None, None),
        (SHANGHAI_REGION_ID, CHINA_REGION_ID, "city", "CN", "SHA", "Shanghai", "Asia/Shanghai", 31.2304, 121.4737),
        (BEIJING_REGION_ID, CHINA_REGION_ID, "city", "CN", "BJS", "Beijing", "Asia/Shanghai", 39.9042, 116.4074),
        (HANGZHOU_REGION_ID, CHINA_REGION_ID, "city", "CN", "HGH", "Hangzhou", "Asia/Shanghai", 30.2741, 120.1551),
        (SUZHOU_REGION_ID, CHINA_REGION_ID, "city", "CN", "SZH", "Suzhou", "Asia/Shanghai", 31.2989, 120.5853),
        (NANJING_REGION_ID, CHINA_REGION_ID, "city", "CN", "NKG", "Nanjing", "Asia/Shanghai", 32.0603, 118.7969),
    ]
    for region in regions:
        session.execute(
            text(
                """
                INSERT INTO regions (
                    id, market_id, parent_id, type, country_code,
                    code, name, timezone, latitude, longitude, status
                )
                VALUES (
                    :id, :market_id, :parent_id, :type, :country_code,
                    :code, :name, :timezone, :latitude, :longitude, 'active'
                )
                ON CONFLICT (market_id, code) DO UPDATE
                SET id = EXCLUDED.id,
                    parent_id = EXCLUDED.parent_id,
                    type = EXCLUDED.type,
                    country_code = EXCLUDED.country_code,
                    name = EXCLUDED.name,
                    timezone = EXCLUDED.timezone,
                    latitude = EXCLUDED.latitude,
                    longitude = EXCLUDED.longitude,
                    status = EXCLUDED.status,
                    updated_at = now()
                """
            ),
            {
                "id": region[0],
                "market_id": CHINA_INBOUND_MARKET_ID,
                "parent_id": region[1],
                "type": region[2],
                "country_code": region[3],
                "code": region[4],
                "name": region[5],
                "timezone": region[6],
                "latitude": region[7],
                "longitude": region[8],
            },
        )
    session.execute(
        text(
            """
            INSERT INTO market_configs (
                market_id, supported_locales, supported_display_currencies,
                default_search_region_id, config_json
            )
            VALUES (
                :market_id,
                ARRAY['en-US', 'en-GB', 'zh-CN'],
                ARRAY['CNY', 'USD', 'GBP'],
                :default_region_id,
                '{"current_scope":"overseas travelers visiting China"}'::jsonb
            )
            ON CONFLICT (market_id) DO UPDATE
            SET supported_locales = EXCLUDED.supported_locales,
                supported_display_currencies = EXCLUDED.supported_display_currencies,
                default_search_region_id = EXCLUDED.default_search_region_id,
                config_json = EXCLUDED.config_json,
                updated_at = now()
            """
        ),
        {"market_id": CHINA_INBOUND_MARKET_ID, "default_region_id": SHANGHAI_REGION_ID},
    )
    _seed_payment_method_placeholders(session)


def _seed_roles(session: Session) -> None:
    roles = [
        ("sys_admin", "System Admin"),
        ("market_admin", "Market Admin"),
        ("region_operator", "Region Operator"),
        ("guide_reviewer", "Guide Reviewer"),
        ("content_reviewer", "Content Reviewer"),
        ("risk_reviewer", "Risk Reviewer"),
        ("support_agent", "Support Agent"),
        ("traveler", "Traveler"),
        ("guide", "Guide"),
        ("viewer", "Viewer"),
    ]
    for code, name in roles:
        session.execute(
            text(
                """
                INSERT INTO roles (code, name)
                VALUES (:code, :name)
                ON CONFLICT (code) DO UPDATE
                SET name = EXCLUDED.name,
                    updated_at = now()
                """
            ),
            {"code": code, "name": name},
        )
    permissions = [
        ("admin.invitation:create", "Create admin, reviewer, and support invitations"),
        ("market:read", "Read market configuration"),
        ("market.config:write", "Write market configuration"),
        ("user:read", "Read users"),
        ("user:write", "Write users"),
        ("profile:write", "Write own profile"),
        ("guide.verification:review", "Review guide verification"),
        ("content:review", "Review destination and user content"),
        ("risk:review", "Review risk reports and disputes"),
        ("support.case:manage", "Manage support cases"),
    ]
    for code, description in permissions:
        session.execute(
            text(
                """
                INSERT INTO permissions (code, description)
                VALUES (:code, :description)
                ON CONFLICT (code) DO UPDATE
                SET description = EXCLUDED.description
                """
            ),
            {"code": code, "description": description},
        )
    role_permissions = {
        "sys_admin": [permission[0] for permission in permissions],
        "market_admin": [
            "admin.invitation:create",
            "market:read",
            "market.config:write",
            "user:read",
            "user:write",
            "guide.verification:review",
            "risk:review",
            "support.case:manage",
        ],
        "guide_reviewer": ["market:read", "user:read", "guide.verification:review"],
        "content_reviewer": ["market:read", "content:review"],
        "risk_reviewer": ["market:read", "user:read", "risk:review"],
        "support_agent": ["market:read", "user:read", "support.case:manage"],
        "traveler": ["market:read", "profile:write"],
        "guide": ["market:read", "profile:write"],
        "viewer": ["market:read"],
    }
    for role_code, permission_codes in role_permissions.items():
        for permission_code in permission_codes:
            session.execute(
                text(
                    """
                    INSERT INTO role_permissions (role_id, permission_id)
                    SELECT r.id, p.id
                    FROM roles r
                    JOIN permissions p ON p.code = :permission_code
                    WHERE r.code = :role_code
                    ON CONFLICT (role_id, permission_id) DO NOTHING
                    """
                ),
                {"role_code": role_code, "permission_code": permission_code},
            )


def _seed_bootstrap_admin(session: Session) -> None:
    admin_id = _upsert_user(
        session,
        user_id="00000000-0000-0000-0000-000000000001",
        email=settings.bootstrap_admin_email.lower(),
        password=settings.bootstrap_admin_password,
        display_name=settings.bootstrap_admin_display_name,
        currency="CNY",
    )
    _assign_role(session, admin_id, "sys_admin", None)


def _seed_payment_method_placeholders(session: Session) -> None:
    payment_methods = [
        ("visa", "manual", ["GB", "US", "EU"], ["CNY", "USD", "GBP"], "payer"),
        ("mastercard", "manual", ["GB", "US", "EU"], ["CNY", "USD", "GBP"], "payer"),
        ("alipay", "manual", ["CN"], ["CNY"], "payer"),
        ("wechat_pay", "manual", ["CN"], ["CNY"], "payer"),
    ]
    for method in payment_methods:
        session.execute(
            text(
                """
                INSERT INTO payment_method_configs (
                    market_id, method_code, provider_code,
                    supported_country_codes, supported_currencies,
                    applies_to_user_roles, applies_to_side, is_enabled
                )
                VALUES (
                    :market_id, :method_code, :provider_code,
                    :country_codes, :currencies,
                    ARRAY['traveler']::user_role_enum[], :side, false
                )
                ON CONFLICT (market_id, method_code, provider_code) DO UPDATE
                SET supported_country_codes = EXCLUDED.supported_country_codes,
                    supported_currencies = EXCLUDED.supported_currencies,
                    applies_to_user_roles = EXCLUDED.applies_to_user_roles,
                    applies_to_side = EXCLUDED.applies_to_side,
                    is_enabled = EXCLUDED.is_enabled,
                    updated_at = now()
                """
            ),
            {
                "market_id": CHINA_INBOUND_MARKET_ID,
                "method_code": method[0],
                "provider_code": method[1],
                "country_codes": method[2],
                "currencies": method[3],
                "side": method[4],
            },
        )


def _seed_users_and_profiles(session: Session) -> None:
    reviewer_id = _upsert_user(
        session,
        user_id="00000000-0000-0000-0000-000000000002",
        email="reviewer@trip.local",
        password=DEMO_PASSWORD,
        display_name="Demo Reviewer",
        currency="CNY",
    )
    support_id = _upsert_user(
        session,
        user_id="00000000-0000-0000-0000-000000000003",
        email="support@trip.local",
        password=DEMO_PASSWORD,
        display_name="Demo Support",
        currency="CNY",
    )
    _assign_role(session, reviewer_id, "guide_reviewer", CHINA_INBOUND_MARKET_ID)
    _assign_role(session, support_id, "support_agent", CHINA_INBOUND_MARKET_ID)
    _upsert_role_profile(session, reviewer_id, "reviewer", CHINA_INBOUND_MARKET_ID)
    _upsert_role_profile(session, support_id, "support", CHINA_INBOUND_MARKET_ID)

    traveler_names = [
        "Emily Carter",
        "James Wilson",
        "Sophie Brown",
        "Oliver Taylor",
        "Amelia Johnson",
        "Noah Miller",
        "Isla Davis",
        "Lucas Martin",
        "Mia Anderson",
        "Henry Clark",
        "Grace Lewis",
        "Leo Walker",
    ]
    guide_names = [
        "Zhang Wei",
        "Li Na",
        "Wang Fang",
        "Liu Qiang",
        "Chen Xiaoming",
        "Zhao Min",
        "Zhou Jie",
        "Wu Jing",
        "Sun Hao",
        "Lin Tingting",
        "Huang Lei",
        "Zheng Xue",
    ]
    region_cycle = [
        SHANGHAI_REGION_ID,
        BEIJING_REGION_ID,
        HANGZHOU_REGION_ID,
        SUZHOU_REGION_ID,
        NANJING_REGION_ID,
    ]
    for index, name in enumerate(traveler_names, start=1):
        user_id = f"10000000-0000-0000-0000-{index:012d}"
        traveler_id = _upsert_user(
            session,
            user_id=user_id,
            email=f"traveler{index}@trip.local",
            password=DEMO_PASSWORD,
            display_name=name,
            currency="GBP" if index == 1 else "USD",
        )
        _assign_role(session, traveler_id, "traveler", CHINA_INBOUND_MARKET_ID)
        _upsert_role_profile(session, traveler_id, "traveler", CHINA_INBOUND_MARKET_ID)
        session.execute(
            text(
                """
                INSERT INTO traveler_profiles (id, user_id, market_id, preference_json, created_by, updated_by)
                VALUES (:id, :user_id, :market_id, CAST(:preference_json AS jsonb), :user_id, :user_id)
                ON CONFLICT (user_id, market_id) DO UPDATE
                SET preference_json = EXCLUDED.preference_json,
                    updated_at = now()
                """
            ),
            {
                "id": f"11000000-0000-0000-0000-{index:012d}",
                "user_id": traveler_id,
                "market_id": CHINA_INBOUND_MARKET_ID,
                "preference_json": '{"travel_style":"city discovery","demo":true}',
            },
        )
    for index, name in enumerate(guide_names, start=1):
        user_id = f"20000000-0000-0000-0000-{index:012d}"
        guide_id = _upsert_user(
            session,
            user_id=user_id,
            email=f"guide{index}@trip.local",
            password=DEMO_PASSWORD,
            display_name=name,
            currency="CNY",
        )
        _assign_role(session, guide_id, "guide", CHINA_INBOUND_MARKET_ID)
        _upsert_role_profile(session, guide_id, "guide", CHINA_INBOUND_MARKET_ID)
        home_region = region_cycle[(index - 1) % len(region_cycle)]
        guide_profile_id = f"21000000-0000-0000-0000-{index:012d}"
        verification_status = "approved" if index <= 3 else "pending" if index <= 6 else "not_started"
        badge_status = "approved" if index <= 3 else "submitted" if index <= 6 else "draft"
        session.execute(
            text(
                """
                INSERT INTO guide_profiles (
                    id, user_id, market_id, country_code, home_region_id,
                    daily_price_amount, quote_currency, offers_pickup,
                    gender, birth_year, language_tags, rating,
                    reputation_status, verification_status, completed_order_count,
                    cancellation_rate, breach_rate, average_response_seconds,
                    badge_status, is_listed, created_by, updated_by
                )
                VALUES (
                    :id, :user_id, :market_id, 'CN', :home_region_id,
                    :daily_price_amount, 'CNY', :offers_pickup,
                    :gender, :birth_year, :language_tags, :rating,
                    'active', :verification_status, :completed_order_count,
                    0.0200, 0.0000, :average_response_seconds,
                    :badge_status, true, :user_id, :user_id
                )
                ON CONFLICT (user_id, market_id) DO UPDATE
                SET country_code = EXCLUDED.country_code,
                    home_region_id = EXCLUDED.home_region_id,
                    daily_price_amount = EXCLUDED.daily_price_amount,
                    quote_currency = EXCLUDED.quote_currency,
                    offers_pickup = EXCLUDED.offers_pickup,
                    gender = EXCLUDED.gender,
                    birth_year = EXCLUDED.birth_year,
                    language_tags = EXCLUDED.language_tags,
                    rating = EXCLUDED.rating,
                    reputation_status = EXCLUDED.reputation_status,
                    verification_status = EXCLUDED.verification_status,
                    completed_order_count = EXCLUDED.completed_order_count,
                    average_response_seconds = EXCLUDED.average_response_seconds,
                    badge_status = EXCLUDED.badge_status,
                    is_listed = EXCLUDED.is_listed,
                    updated_at = now()
                """
            ),
            {
                "id": guide_profile_id,
                "user_id": guide_id,
                "market_id": CHINA_INBOUND_MARKET_ID,
                "home_region_id": home_region,
                "daily_price_amount": Decimal(780 + index * 40),
                "offers_pickup": index % 2 == 1,
                "gender": "female" if index % 2 == 0 else "male",
                "birth_year": 1986 + index,
                "language_tags": ["中文", "English"] + (["日本語"] if index in {2, 12} else []),
                "rating": Decimal("4.6") + Decimal(index % 4) / Decimal("10"),
                "verification_status": verification_status,
                "completed_order_count": 20 + index * 6,
                "average_response_seconds": 300 + index * 60,
                "badge_status": badge_status,
            },
        )
        session.execute(text("DELETE FROM guide_service_regions WHERE guide_profile_id = :id"), {"id": guide_profile_id})
        for region_id in {home_region, SHANGHAI_REGION_ID, HANGZHOU_REGION_ID}:
            session.execute(
                text(
                    """
                    INSERT INTO guide_service_regions (guide_profile_id, region_id)
                    VALUES (:guide_profile_id, :region_id)
                    ON CONFLICT (guide_profile_id, region_id) DO NOTHING
                    """
                ),
                {"guide_profile_id": guide_profile_id, "region_id": region_id},
            )
        if index <= 6:
            status = "approved" if index <= 3 else "pending"
            session.execute(
                text(
                    """
                    INSERT INTO guide_verifications (
                        id, guide_profile_id, market_id, identity_status,
                        qualification_status, real_avatar_status, service_region_status,
                        language_status, badge_status, submitted_at, reviewed_at,
                        reviewed_by, created_by, updated_by
                    )
                    VALUES (
                        :id, :guide_profile_id, :market_id, CAST(:status AS verification_status_enum),
                        CAST(:status AS verification_status_enum), CAST(:status AS verification_status_enum),
                        CAST(:status AS verification_status_enum), CAST(:status AS verification_status_enum),
                        CAST(:badge_status AS status_enum), now() - (:days || ' days')::interval,
                        CASE WHEN :status = 'approved' THEN now() - (:review_days || ' days')::interval ELSE NULL END,
                        CASE WHEN :status = 'approved' THEN :reviewer_id ELSE NULL END,
                        :user_id, :reviewer_id
                    )
                    ON CONFLICT (id) DO UPDATE
                    SET identity_status = EXCLUDED.identity_status,
                        qualification_status = EXCLUDED.qualification_status,
                        real_avatar_status = EXCLUDED.real_avatar_status,
                        service_region_status = EXCLUDED.service_region_status,
                        language_status = EXCLUDED.language_status,
                        badge_status = EXCLUDED.badge_status,
                        submitted_at = EXCLUDED.submitted_at,
                        reviewed_at = EXCLUDED.reviewed_at,
                        reviewed_by = EXCLUDED.reviewed_by,
                        updated_at = now()
                    """
                ),
                {
                    "id": f"22000000-0000-0000-0000-{index:012d}",
                    "guide_profile_id": guide_profile_id,
                    "market_id": CHINA_INBOUND_MARKET_ID,
                    "status": status,
                    "badge_status": "approved" if status == "approved" else "submitted",
                    "days": index,
                    "review_days": index - 1,
                    "reviewer_id": reviewer_id,
                    "user_id": guide_id,
                },
            )


def _seed_demo_flow(session: Session) -> None:
    today = date.today()
    routes = [
        ("Shanghai -> Beijing -> Shanghai", SHANGHAI_REGION_ID, BEIJING_REGION_ID, 2, Decimal("3000"), Decimal("5000")),
        ("Hangzhou -> Suzhou", HANGZHOU_REGION_ID, SUZHOU_REGION_ID, 1, Decimal("1800"), Decimal("3000")),
        ("Shanghai -> Hangzhou -> Suzhou", SHANGHAI_REGION_ID, HANGZHOU_REGION_ID, 3, Decimal("3600"), Decimal("6200")),
        ("Beijing city culture tour", BEIJING_REGION_ID, BEIJING_REGION_ID, 2, Decimal("2400"), Decimal("4200")),
        ("Nanjing history weekend", NANJING_REGION_ID, NANJING_REGION_ID, 2, Decimal("2000"), Decimal("3500")),
        ("Shanghai family city walk", SHANGHAI_REGION_ID, SHANGHAI_REGION_ID, 4, Decimal("2800"), Decimal("5200")),
        ("Hangzhou tea village route", HANGZHOU_REGION_ID, HANGZHOU_REGION_ID, 2, Decimal("2200"), Decimal("4000")),
        ("Suzhou garden slow trip", SUZHOU_REGION_ID, SUZHOU_REGION_ID, 2, Decimal("1900"), Decimal("3400")),
        ("Beijing Great Wall day", BEIJING_REGION_ID, BEIJING_REGION_ID, 1, Decimal("1600"), Decimal("2600")),
        ("Shanghai -> Nanjing rail trip", SHANGHAI_REGION_ID, NANJING_REGION_ID, 2, Decimal("2600"), Decimal("4600")),
    ]
    plan_ids: list[str] = []
    for index, route in enumerate(routes, start=1):
        traveler_id = f"10000000-0000-0000-0000-{index:012d}"
        plan_id = f"30000000-0000-0000-0000-{index:012d}"
        plan_ids.append(plan_id)
        session.execute(
            text(
                """
                INSERT INTO travel_plans (
                    id, market_id, traveler_user_id, country_code,
                    arrival_date, arrival_region_id, needs_pickup, traveler_count,
                    budget_min_amount, budget_max_amount, budget_currency,
                    visibility, status, title, notes, created_by, updated_by
                )
                VALUES (
                    :id, :market_id, :traveler_user_id, 'CN',
                    :arrival_date, :arrival_region_id, :needs_pickup, :traveler_count,
                    :budget_min_amount, :budget_max_amount, 'CNY',
                    'guides_only', 'active', :title, :notes, :traveler_user_id, :traveler_user_id
                )
                ON CONFLICT (id) DO UPDATE
                SET arrival_date = EXCLUDED.arrival_date,
                    arrival_region_id = EXCLUDED.arrival_region_id,
                    needs_pickup = EXCLUDED.needs_pickup,
                    traveler_count = EXCLUDED.traveler_count,
                    budget_min_amount = EXCLUDED.budget_min_amount,
                    budget_max_amount = EXCLUDED.budget_max_amount,
                    status = EXCLUDED.status,
                    title = EXCLUDED.title,
                    notes = EXCLUDED.notes,
                    updated_at = now()
                """
            ),
            {
                "id": plan_id,
                "market_id": CHINA_INBOUND_MARKET_ID,
                "traveler_user_id": traveler_id,
                "arrival_date": today + timedelta(days=20 + index),
                "arrival_region_id": route[1],
                "needs_pickup": index % 2 == 1,
                "traveler_count": route[3],
                "budget_min_amount": route[4],
                "budget_max_amount": route[5],
                "title": route[0],
                "notes": "Demo travel plan for stable M11 screenshots.",
            },
        )
        _upsert_route_node(session, plan_id, 1, route[1], today + timedelta(days=20 + index), route[0])
        if route[2] != route[1]:
            _upsert_route_node(session, plan_id, 2, route[2], today + timedelta(days=21 + index), route[0])

    thread_ids = []
    for index in range(1, 6):
        thread_id = f"40000000-0000-0000-0000-{index:012d}"
        traveler_id = f"10000000-0000-0000-0000-{index:012d}"
        guide_id = f"20000000-0000-0000-0000-{index:012d}"
        thread_ids.append(thread_id)
        session.execute(
            text(
                """
                INSERT INTO message_threads (
                    id, market_id, initiator_user_id, recipient_user_id,
                    travel_plan_id, greeting_sent, recipient_replied,
                    restriction_status, last_message_at
                )
                VALUES (
                    :id, :market_id, :traveler_id, :guide_id,
                    :travel_plan_id, true, true, 'open', now() - (:hours || ' hours')::interval
                )
                ON CONFLICT (id) DO UPDATE
                SET travel_plan_id = EXCLUDED.travel_plan_id,
                    recipient_replied = EXCLUDED.recipient_replied,
                    restriction_status = EXCLUDED.restriction_status,
                    last_message_at = EXCLUDED.last_message_at,
                    updated_at = now()
                """
            ),
            {
                "id": thread_id,
                "market_id": CHINA_INBOUND_MARKET_ID,
                "traveler_id": traveler_id,
                "guide_id": guide_id,
                "travel_plan_id": plan_ids[index - 1],
                "hours": index,
            },
        )
        _upsert_message(session, f"41000000-0000-0000-0000-{index * 2 - 1:012d}", thread_id, traveler_id, "Hello, I am looking for a guide.")
        _upsert_message(session, f"41000000-0000-0000-0000-{index * 2:012d}", thread_id, guide_id, "I can help with this route.")

    order_ids = []
    for index in range(1, 4):
        order_id = f"50000000-0000-0000-0000-{index:012d}"
        order_ids.append(order_id)
        status = "pending_agreement" if index == 1 else "confirmed" if index == 2 else "completed"
        traveler_confirmed_at = "now() - interval '2 days'"
        guide_confirmed_at = "now() - interval '2 days'"
        session.execute(
            text(
                f"""
                INSERT INTO service_orders (
                    id, market_id, traveler_user_id, guide_user_id, travel_plan_id,
                    message_thread_id, guide_price_amount, guide_price_currency,
                    service_start_date, service_end_date, service_region_id,
                    needs_pickup, traveler_count, traveler_price_confirmed_at,
                    guide_itinerary_confirmed_at, status, payment_status,
                    itinerary_json, cancellation_policy, breach_responsibility,
                    created_by, updated_by
                )
                VALUES (
                    :id, :market_id, :traveler_id, :guide_id, :travel_plan_id,
                    :thread_id, :price, 'CNY',
                    :start_date, :end_date, :region_id,
                    :needs_pickup, :traveler_count, {traveler_confirmed_at},
                    {guide_confirmed_at}, :status, 'not_required',
                    CAST(:itinerary_json AS jsonb), :cancellation_policy, :breach_responsibility,
                    :traveler_id, :traveler_id
                )
                ON CONFLICT (id) DO UPDATE
                SET status = EXCLUDED.status,
                    payment_status = EXCLUDED.payment_status,
                    traveler_price_confirmed_at = EXCLUDED.traveler_price_confirmed_at,
                    guide_itinerary_confirmed_at = EXCLUDED.guide_itinerary_confirmed_at,
                    itinerary_json = EXCLUDED.itinerary_json,
                    cancellation_policy = EXCLUDED.cancellation_policy,
                    breach_responsibility = EXCLUDED.breach_responsibility,
                    updated_at = now()
                """
            ),
            {
                "id": order_id,
                "market_id": CHINA_INBOUND_MARKET_ID,
                "traveler_id": f"10000000-0000-0000-0000-{index:012d}",
                "guide_id": f"20000000-0000-0000-0000-{index:012d}",
                "travel_plan_id": plan_ids[index - 1],
                "thread_id": thread_ids[index - 1],
                "price": Decimal(1200 + index * 200),
                "start_date": today + timedelta(days=15 + index),
                "end_date": today + timedelta(days=17 + index),
                "region_id": SHANGHAI_REGION_ID if index == 1 else HANGZHOU_REGION_ID,
                "needs_pickup": index % 2 == 1,
                "traveler_count": index + 1,
                "status": status,
                "itinerary_json": '{"route":"Shanghai -> Hangzhou","demo":true}',
                "cancellation_policy": "Free cancellation until 24 hours before service. Detailed penalty policy is deferred.",
                "breach_responsibility": "No-show or material breach will be recorded in platform reputation history.",
            },
        )
        session.execute(
            text("UPDATE message_threads SET order_id = :order_id WHERE id = :thread_id"),
            {"order_id": order_id, "thread_id": thread_ids[index - 1]},
        )
        if index >= 2:
            _upsert_agreement(session, order_id, index, signed=True)
        else:
            _upsert_agreement(session, order_id, index, signed=False)
    _upsert_dispute(session, order_ids[1])
    _upsert_reviews_and_notifications(session, order_ids)


def _upsert_user(
    session: Session,
    *,
    user_id: str,
    email: str,
    password: str,
    display_name: str,
    currency: str,
) -> UUID:
    session.execute(
        text(
            """
            INSERT INTO users (id, display_name, preferred_locale, preferred_currency)
            VALUES (:id, :display_name, 'en-US', :currency)
            ON CONFLICT (id) DO UPDATE
            SET display_name = EXCLUDED.display_name,
                preferred_locale = EXCLUDED.preferred_locale,
                preferred_currency = EXCLUDED.preferred_currency,
                status = 'active',
                updated_at = now()
            """
        ),
        {"id": user_id, "display_name": display_name, "currency": currency},
    )
    session.execute(
        text(
            """
            INSERT INTO user_auth_identities (user_id, provider, identifier, password_hash, verified_at)
            VALUES (:user_id, 'email', :email, :password_hash, now())
            ON CONFLICT (provider, identifier) DO UPDATE
            SET user_id = EXCLUDED.user_id,
                password_hash = EXCLUDED.password_hash,
                verified_at = EXCLUDED.verified_at,
                deleted_at = NULL,
                updated_at = now()
            """
        ),
        {"user_id": user_id, "email": email.lower(), "password_hash": hash_password(password)},
    )
    return UUID(user_id)


def _assign_role(session: Session, user_id: UUID | str, role_code: str, market_id: str | None) -> None:
    if market_id is None:
        session.execute(
            text(
                """
                INSERT INTO user_roles (user_id, role_id, scope_type)
                SELECT :user_id, r.id, 'global'
                FROM roles r
                WHERE r.code = :role_code
                  AND NOT EXISTS (
                    SELECT 1 FROM user_roles ur
                    WHERE ur.user_id = :user_id
                      AND ur.role_id = r.id
                      AND ur.scope_type = 'global'
                      AND ur.deleted_at IS NULL
                  )
                """
            ),
            {"user_id": user_id, "role_code": role_code},
        )
        return
    session.execute(
        text(
            """
            INSERT INTO user_roles (user_id, role_id, market_id, scope_type, scope_id)
            SELECT :user_id, r.id, :market_id, 'market', :market_id
            FROM roles r
            WHERE r.code = :role_code
              AND NOT EXISTS (
                SELECT 1 FROM user_roles ur
                WHERE ur.user_id = :user_id
                  AND ur.role_id = r.id
                  AND ur.scope_type = 'market'
                  AND ur.scope_id = :market_id
                  AND ur.deleted_at IS NULL
              )
            """
        ),
        {"user_id": user_id, "role_code": role_code, "market_id": market_id},
    )


def _upsert_role_profile(session: Session, user_id: UUID | str, role: str, market_id: str) -> None:
    session.execute(
        text(
            """
            INSERT INTO user_role_profiles (user_id, role, market_id, is_active, onboarding_status)
            VALUES (:user_id, :role, :market_id, true, 'active')
            ON CONFLICT (user_id, role, market_id) DO UPDATE
            SET is_active = EXCLUDED.is_active,
                onboarding_status = EXCLUDED.onboarding_status,
                updated_at = now()
            """
        ),
        {"user_id": user_id, "role": role, "market_id": market_id},
    )


def _upsert_route_node(session: Session, plan_id: str, sequence: int, region_id: str, route_date: date, notes: str) -> None:
    session.execute(
        text(
            """
            INSERT INTO itinerary_route_nodes (
                id, travel_plan_id, region_id, sequence,
                planned_start_at, planned_end_at, notes
            )
            VALUES (
                :id, :travel_plan_id, :region_id, :sequence,
                :start_at, :end_at, :notes
            )
            ON CONFLICT (travel_plan_id, sequence) DO UPDATE
            SET region_id = EXCLUDED.region_id,
                planned_start_at = EXCLUDED.planned_start_at,
                planned_end_at = EXCLUDED.planned_end_at,
                notes = EXCLUDED.notes,
                updated_at = now()
            """
        ),
        {
            "id": f"31000000-0000-0000-{int(plan_id[-12:]):04d}-{sequence:012d}",
            "travel_plan_id": plan_id,
            "region_id": region_id,
            "sequence": sequence,
            "start_at": route_date.isoformat(),
            "end_at": route_date.isoformat(),
            "notes": notes,
        },
    )


def _upsert_message(session: Session, message_id: str, thread_id: str, sender_id: str, body: str) -> None:
    session.execute(
        text(
            """
            INSERT INTO messages (id, thread_id, sender_user_id, sender_type, body)
            VALUES (:id, :thread_id, :sender_id, 'user', :body)
            ON CONFLICT (id) DO UPDATE
            SET body = EXCLUDED.body
            """
        ),
        {"id": message_id, "thread_id": thread_id, "sender_id": sender_id, "body": body},
    )


def _upsert_agreement(session: Session, order_id: str, index: int, *, signed: bool) -> None:
    session.execute(
        text(
            """
            INSERT INTO anonymous_agreements (
                id, market_id, traveler_user_id, guide_user_id, order_id,
                agreement_version, status, service_start_date, service_end_date,
                service_region_id, price_amount, price_currency,
                cancellation_policy, breach_responsibility,
                traveler_signed_at, guide_signed_at, created_by, updated_by
            )
            SELECT
                :id, o.market_id, o.traveler_user_id, o.guide_user_id, o.id,
                'mvp-v1', :status, o.service_start_date, o.service_end_date,
                o.service_region_id, o.guide_price_amount, o.guide_price_currency,
                o.cancellation_policy, o.breach_responsibility,
                CASE WHEN :signed THEN now() - interval '1 day' ELSE NULL END,
                CASE WHEN :signed THEN now() - interval '1 day' ELSE NULL END,
                o.traveler_user_id, o.traveler_user_id
            FROM service_orders o
            WHERE o.id = :order_id
            ON CONFLICT (id) DO UPDATE
            SET status = EXCLUDED.status,
                service_start_date = EXCLUDED.service_start_date,
                service_end_date = EXCLUDED.service_end_date,
                service_region_id = EXCLUDED.service_region_id,
                price_amount = EXCLUDED.price_amount,
                price_currency = EXCLUDED.price_currency,
                cancellation_policy = EXCLUDED.cancellation_policy,
                breach_responsibility = EXCLUDED.breach_responsibility,
                traveler_signed_at = EXCLUDED.traveler_signed_at,
                guide_signed_at = EXCLUDED.guide_signed_at,
                updated_at = now()
            """
        ),
        {
            "id": f"51000000-0000-0000-0000-{index:012d}",
            "order_id": order_id,
            "status": "signed" if signed else "pending_sign",
            "signed": signed,
        },
    )


def _upsert_reviews_and_notifications(session: Session, order_ids: list[str]) -> None:
    completed_order_id = order_ids[2]
    for index in range(1, 11):
        reviewer_id = f"10000000-0000-0000-0000-{index:012d}"
        reviewee_id = f"20000000-0000-0000-0000-{index:012d}"
        session.execute(
            text(
                """
                INSERT INTO review_records (
                    id, market_id, order_id, reviewer_user_id, reviewee_user_id,
                    region_id, dimensions_json, rating, body, created_by, updated_by
                )
                VALUES (
                    :id, :market_id, :order_id, :reviewer_id, :reviewee_id,
                    :region_id, CAST(:dimensions_json AS jsonb), :rating, :body,
                    :reviewer_id, :reviewer_id
                )
                ON CONFLICT (id) DO UPDATE
                SET rating = EXCLUDED.rating,
                    body = EXCLUDED.body,
                    updated_at = now()
                """
            ),
            {
                "id": f"60000000-0000-0000-0000-{index:012d}",
                "market_id": CHINA_INBOUND_MARKET_ID,
                "order_id": completed_order_id,
                "reviewer_id": reviewer_id,
                "reviewee_id": reviewee_id,
                "region_id": HANGZHOU_REGION_ID,
                "dimensions_json": '{"demo":true}',
                "rating": Decimal("4.5") if index % 2 == 0 else Decimal("5.0"),
                "body": "Stable demo review for the China inbound travel flow.",
            },
        )
    notification_targets = [
        "10000000-0000-0000-0000-000000000001",
        "20000000-0000-0000-0000-000000000001",
        "00000000-0000-0000-0000-000000000002",
        "00000000-0000-0000-0000-000000000003",
    ]
    for index in range(1, 11):
        user_id = notification_targets[(index - 1) % len(notification_targets)]
        related_order = order_ids[(index - 1) % len(order_ids)]
        session.execute(
            text(
                """
                INSERT INTO notification_records (
                    id, market_id, user_id, type, related_order_id,
                    title, body, read_at
                )
                VALUES (
                    :id, :market_id, :user_id, :type, :related_order_id,
                    :title, :body,
                    CASE WHEN :read THEN now() - interval '1 hour' ELSE NULL END
                )
                ON CONFLICT (id) DO UPDATE
                SET title = EXCLUDED.title,
                    body = EXCLUDED.body,
                    read_at = EXCLUDED.read_at
                """
            ),
            {
                "id": f"70000000-0000-0000-0000-{index:012d}",
                "market_id": CHINA_INBOUND_MARKET_ID,
                "user_id": user_id,
                "type": "order" if index % 2 else "system",
                "related_order_id": related_order,
                "title": "Demo notification",
                "body": "Stable notification generated by seed demo.",
                "read": index % 3 == 0,
            },
        )


def _upsert_dispute(session: Session, order_id: str) -> None:
    session.execute(
        text(
            """
            INSERT INTO dispute_cases (
                id, market_id, order_id, raised_by_user_id, dispute_type,
                evidence_json, status, arbitration_result, created_by, updated_by
            )
            VALUES (
                '80000000-0000-0000-0000-000000000001',
                :market_id, :order_id, '10000000-0000-0000-0000-000000000002',
                'service_quality', CAST(:evidence_json AS jsonb), 'submitted',
                NULL, '10000000-0000-0000-0000-000000000002',
                '10000000-0000-0000-0000-000000000002'
            )
            ON CONFLICT (id) DO UPDATE
            SET status = EXCLUDED.status,
                evidence_json = EXCLUDED.evidence_json,
                updated_at = now()
            """
        ),
        {"market_id": CHINA_INBOUND_MARKET_ID, "order_id": order_id, "evidence_json": '{"demo":true}'},
    )


if __name__ == "__main__":
    command = sys.argv[1] if len(sys.argv) > 1 else "demo"
    if command != "demo":
        raise SystemExit("Usage: python -m app.seed demo")
    seed_demo()
    print("Seeded demo data for china_inbound.")
