from sqlalchemy import text

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


def seed_demo() -> None:
    with SessionLocal.begin() as session:
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
        bootstrap_admin = session.execute(
            text(
                """
                SELECT user_id
                FROM user_auth_identities
                WHERE provider = 'email'
                  AND identifier = :email
                  AND deleted_at IS NULL
                """
            ),
            {"email": settings.bootstrap_admin_email.lower()},
        ).first()
        if bootstrap_admin is None:
            bootstrap_admin_user = session.execute(
                text(
                    """
                    INSERT INTO users (
                        display_name, preferred_locale, preferred_currency
                    )
                    VALUES (:display_name, 'en-US', 'CNY')
                    RETURNING id
                    """
                ),
                {"display_name": settings.bootstrap_admin_display_name},
            ).first()
            bootstrap_admin_id = bootstrap_admin_user[0]
            session.execute(
                text(
                    """
                    INSERT INTO user_auth_identities (
                        user_id, provider, identifier, password_hash, verified_at
                    )
                    VALUES (:user_id, 'email', :email, :password_hash, now())
                    """
                ),
                {
                    "user_id": bootstrap_admin_id,
                    "email": settings.bootstrap_admin_email.lower(),
                    "password_hash": hash_password(settings.bootstrap_admin_password),
                },
            )
        else:
            bootstrap_admin_id = bootstrap_admin[0]
            session.execute(
                text(
                    """
                    UPDATE user_auth_identities
                    SET password_hash = :password_hash,
                        updated_at = now()
                    WHERE user_id = :user_id
                      AND provider = 'email'
                      AND identifier = :email
                    """
                ),
                {
                    "user_id": bootstrap_admin_id,
                    "email": settings.bootstrap_admin_email.lower(),
                    "password_hash": hash_password(settings.bootstrap_admin_password),
                },
            )
        session.execute(
            text(
                """
                INSERT INTO user_roles (user_id, role_id, scope_type)
                SELECT :user_id, r.id, 'global'
                FROM roles r
                WHERE r.code = 'sys_admin'
                  AND NOT EXISTS (
                      SELECT 1 FROM user_roles ur
                      WHERE ur.user_id = :user_id
                        AND ur.role_id = r.id
                        AND ur.scope_type = 'global'
                        AND ur.deleted_at IS NULL
                  )
                """
            ),
            {"user_id": bootstrap_admin_id},
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
                SET name = EXCLUDED.name,
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
            (CHINA_REGION_ID, None, "country", "CN", "CN", "China", "Asia/Shanghai"),
            (SHANGHAI_REGION_ID, CHINA_REGION_ID, "city", "CN", "SHA", "Shanghai", "Asia/Shanghai"),
            (BEIJING_REGION_ID, CHINA_REGION_ID, "city", "CN", "BJS", "Beijing", "Asia/Shanghai"),
            (HANGZHOU_REGION_ID, CHINA_REGION_ID, "city", "CN", "HGH", "Hangzhou", "Asia/Shanghai"),
            (SUZHOU_REGION_ID, CHINA_REGION_ID, "city", "CN", "SZH", "Suzhou", "Asia/Shanghai"),
            (NANJING_REGION_ID, CHINA_REGION_ID, "city", "CN", "NKG", "Nanjing", "Asia/Shanghai"),
        ]
        for region in regions:
            session.execute(
                text(
                    """
                    INSERT INTO regions (
                        id, market_id, parent_id, type, country_code,
                        code, name, timezone, status
                    )
                    VALUES (
                        :id, :market_id, :parent_id, :type, :country_code,
                        :code, :name, :timezone, 'active'
                    )
                    ON CONFLICT (market_id, code) DO UPDATE
                    SET parent_id = EXCLUDED.parent_id,
                        type = EXCLUDED.type,
                        country_code = EXCLUDED.country_code,
                        name = EXCLUDED.name,
                        timezone = EXCLUDED.timezone,
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


if __name__ == "__main__":
    seed_demo()
