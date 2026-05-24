# Travel Service Platform 项目总规划

## 1. 项目简介

本项目是一个面向跨境旅行场景的本地导游沟通、匹配和交易平台。平台长期目标不是只服务中国市场，而是支持按不同国家、地区和城市扩展旅行服务市场。

当前首发市场聚焦海外用户来中国旅游，默认市场可以命名为 `china_inbound`。所有代码框架、接口、数据模型和后台配置都必须把中国视为一个市场子结构，而不是写死在全局业务逻辑中。

产品核心目标是让旅行者像网购一样浏览导游、比较每日雇佣价格、发布旅行计划，并通过平台内聊天、双方确认和匿名协议完成交易前确认。

平台重点解决以下问题：

- 旅行者可以清楚看到导游所在地区、可服务范围、每日价格、语言能力和信誉信息。
- 导游可以主动发现与自己服务范围匹配的旅行者计划。
- 双方沟通必须留在平台内，避免跳出平台交易和交换联系方式。
- 价格、行程、协议、支付状态、评价和信誉记录形成平台内闭环。
- 地图作为核心展示模块，帮助用户理解地区热度、用户密度、路线分布和服务覆盖。
- 平台架构支持未来增加日本、韩国、东南亚、欧洲等市场，不需要重写核心用户、订单、聊天和信誉模块。

当前首发市场边界：

- 目标用户：海外旅行者来中国旅游，以及服务中国本地目的地的导游。
- 目标地区：首期以中国主要入境城市和热门旅游城市为主，例如上海、北京、杭州、苏州、南京等。
- 目标服务：导游陪同、路线咨询、接机服务、行程协助、城市周边目的地推荐。
- 当前不展开其他国家市场的运营规则，但技术设计必须预留市场配置能力。

## 2. 技术栈

### 2.1 Backend

- Python 3.12+
- FastAPI
- SQLAlchemy 2.x
- Alembic
- Pydantic v2
- PostgreSQL 作为主数据库
- Redis 用于任务队列、限流、锁和缓存
- MinIO / S3-compatible object storage 用于证据、图片、协议、报告和用户上传材料
- Pandas + openpyxl 用于后续批量导入、运营报表和数据处理
- python-docx 用于后续平台报告、协议模板和运营文档生成
- Pytest

### 2.2 Frontend

当前前端设计来源已经在 Figma 中完成，具体代码位于 `/Users/gecko/trip/frontend`。后续前端开发应以现有 Figma 导出的页面结构和 `frontend` 代码为主，不应在产品规划中另起一套页面风格。

当前前端栈：

- React + TypeScript
- Vite
- React Router
- MUI、Radix UI、lucide-react
- Leaflet / react-leaflet 用于地图展示
- Recharts 用于图表
- Tailwind CSS
- motion 用于动效

后续建议补齐：

- TanStack Query 用于服务端状态和接口缓存
- React Hook Form + Zod 用于表单和校验
- Vitest + React Testing Library
- Playwright 用于端到端测试

### 2.3 Deployment

Docker Compose 至少覆盖：

- PostgreSQL
- Redis
- MinIO
- Backend API
- Frontend
- Optional worker

示例结构：

```yml
services:
  postgres:
    image: postgres:16
    container_name: travel_postgres

  redis:
    image: redis:7-alpine
    container_name: travel_redis

  minio:
    image: minio/minio:latest
    container_name: travel_minio

  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    container_name: travel_backend
    ports:
      - "8000:8000"
    volumes:
      - ./backend:/app

  worker:
    build:
      context: ./backend
      dockerfile: Dockerfile
    container_name: travel_worker
    volumes:
      - ./backend:/app

  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
    container_name: travel_frontend
    ports:
      - "5173:5173"
    volumes:
      - ./frontend:/app
      - /app/node_modules

volumes:
  postgres_data:
  minio_data:
```

## 3. 核心设计原则

1. 市场可扩展：所有市场相关规则都通过 `Market`、`Region`、`locale`、`currency`、`timezone` 和配置表表达，中国只是首发市场。
2. 用户身份可切换：同一账号可在旅行者和导游身份之间切换，权限、页面入口和筛选条件根据当前身份变化。
3. 不跳出平台交易：聊天、订单确认、匿名协议、支付和争议都应留在平台内形成闭环。
4. 导游价格清晰可比较：导游列表和详情页必须明显展示每日价格、币种、服务范围和接机能力。
5. 交易前确认可追溯：价格、行程、服务日期、接机、协议和双方确认记录必须可回溯。
6. 历史记录不可随意覆盖：订单、协议、评价、举报、支付、争议、认证和信誉变更使用软删除、状态流和审计日志。
7. 配置、原始数据、业务计算和输出分离：推荐、信誉、违约、搜索排序、地图热度等规则应可配置和可迭代。
8. 人工审核优先于自动决策：导游认证、严重举报、争议仲裁、账号处罚和报告审批必须保留人工审核入口。
9. AI 只能辅助叙述和推荐，不直接决定价格、处罚、支付、法律责任或最终仲裁。
10. 前端实现必须尊重现有 Figma 和 `/frontend` 代码结构，产品计划用于补齐接口、数据、状态和多市场约束。

## 4. 术语表

| 业务术语 | Code term | 说明 |
|---|---|---|
| 市场 | `Market` | 一个可独立配置运营规则的服务市场，例如 `china_inbound` |
| 地区 | `Region` | 国家、省、市、景点、机场、车站等层级地点 |
| 市场配置 | `MarketConfig` | 币种、语言、时区、支付、法规、内容规则等配置 |
| 用户 | `User` | 平台账号 |
| 用户身份 | `UserRoleProfile` | 旅行者或导游身份资料 |
| 旅行者 | `TravelerProfile` | 发布计划和雇佣导游的用户身份 |
| 导游 | `GuideProfile` | 提供本地服务的用户身份 |
| 导游认证 | `GuideVerification` | 身份、资质、头像、服务地区真实性审核 |
| 旅行计划 | `TravelPlan` | 旅行者发布的路线、时间、人数、预算和可见范围 |
| 行程路线 | `ItineraryRoute` | 计划中的城市、景点、交通节点和顺序 |
| 推荐地点 | `DestinationContent` | 城市、景点、周边目的地、评论和照片 |
| 聊天会话 | `MessageThread` | 用户之间的平台内沟通 |
| 关注关系 | `FollowRelation` | 决定陌生人消息限制的社交关系 |
| 订单草稿 | `OrderDraft` | 双方确认前的订单结构 |
| 服务订单 | `ServiceOrder` | 双方确认后的正式订单 |
| 匿名协议 | `AnonymousAgreement` | 交易前保证书和信誉记录依据 |
| 支付记录 | `PaymentRecord` | 定金、保证金、全款和退款状态 |
| 汇率记录 | `ExchangeRateSnapshot` | 价格展示、支付确认和退款计算使用的汇率快照 |
| 支付方式配置 | `PaymentMethodConfig` | 按市场、用户所在地和支付侧配置可用支付方式 |
| 收款账户 | `PayoutAccount` | 导游或平台可收款的账户资料和审核状态 |
| 结算记录 | `PayoutRecord` | 平台向导游结算的金额、币种、状态和时间 |
| 平台抽佣规则 | `CommissionPolicy` | 每单佣金、服务费、推广费等平台收入规则 |
| 会员计划 | `MembershipPlan` | 导游或旅行者可购买的会员身份和权益 |
| 争议案件 | `DisputeCase` | 取消、退款、违约、服务纠纷和仲裁记录 |
| 评价记录 | `ReviewRecord` | 双向评价和目的地内容沉淀 |
| 通知记录 | `NotificationRecord` | 聊天、订单、协议、退款、争议和风险通知 |
| 安全资料 | `SafetyProfile` | 紧急联系人、位置共享、黑名单和一键求助 |
| 后台工单 | `AdminWorkItem` | 审核、举报、争议、内容和风控处理 |

## 5. 用户身份与核心能力

平台默认支持一个账号在旅行者身份和导游身份之间切换。页面入口、筛选条件和功能重点根据当前身份变化。

### 5.1 旅行者

旅行者可以：

- 浏览导游列表。
- 查看导游每日价格、所在地区和服务范围。
- 查看导游语言能力、认证状态、评分、信誉度、历史成交次数、取消率、违约率和平均回复时间。
- 根据预算、地区、性别、年龄、语言、评分、价格、距离、回复速度和成交量筛选导游。
- 创建和发布旅行计划。
- 进入行程规划页面设计路线。
- 查看目标城市周边推荐地点、其他旅行者评论和照片。
- 向导游发起 Message 沟通。
- 确认导游定价。
- 签署匿名协议并进入订单确认流程。
- 在服务完成后评价导游。
- 在安全中心设置紧急联系人并使用一键求助。

### 5.2 导游

导游可以：

- 设置自己的所在地区，例如上海。
- 设置可服务地区范围，例如上海、江苏、浙江。
- 设置每日雇佣价格，例如人民币 1000 元/天。
- 设置报价结算币种和面向市场，当前首发中国市场默认导游以人民币报价和结算。
- 旅行者侧应根据用户所在地、偏好币种或支付币种展示换算价格，例如英国游客可看到人民币导游价格换算后的英镑参考价。
- 设置是否提供接机服务。
- 设置语言能力标签。
- 完成导游认证资料、服务范围、价格和接机能力设置。
- 浏览旅行者发布的旅行计划。
- 根据旅行者路线、人数、目的地、预算、出行日期和服务范围匹配度筛选计划。
- 主动向匹配的旅行者发起 Message。
- 确认旅行者的行程安排。
- 签署匿名协议并进入订单确认流程。
- 在服务完成后评价旅行者。

## 6. 数据模型设计

使用 UUID 主键。主要表包含 `created_at`、`updated_at`、`created_by`、`updated_by`、`deleted_at`。重要业务对象使用软删除和审计日志。

所有市场相关业务对象原则上都要带有：

- `market_id`
- `country_code`
- `region_id`
- `locale`
- `currency_code`
- `timezone`

中国首发市场只是一组初始配置，不应通过硬编码判断实现。

### 6.1 Common enums

- `status`: draft | submitted | under_review | approved | rejected | locked | active | inactive | archived
- `market_status`: draft | active | paused | archived
- `user_role`: traveler | guide | admin | reviewer | support
- `visibility`: public | guides_only | travelers_only | private
- `order_status`: draft | pending_traveler_price_confirm | pending_guide_itinerary_confirm | pending_agreement | pending_payment | confirmed | in_service | completed | pending_review | cancelled | disputed | closed
- `payment_status`: not_required | pending | paid | refunded | partially_refunded | failed | disputed
- `agreement_status`: draft | pending_sign | signed | broken | voided
- `verification_status`: not_started | pending | approved | rejected | expired
- `notification_type`: chat | system | order | agreement | refund | dispute | account_risk | announcement
- `risk_level`: none | low | medium | high | blocked

### 6.2 Market, region, and localisation

Tables:

- `markets`
- `market_configs`
- `regions`
- `region_aliases`
- `currencies`
- `exchange_rates`
- `exchange_rate_snapshots`
- `locales`
- `market_payment_configs`
- `payment_method_configs`
- `payment_provider_accounts`
- `market_policy_configs`

Key points:

- `markets` 表示一个可独立运营的市场，例如 `china_inbound`。
- `regions` 支持国家、省、市、区、景点、机场、车站等层级。
- 当前中国市场预置中国、上海、北京、江苏、浙江、苏州、杭州、南京、主要机场和车站。
- 价格、支付、内容审核、联系方式识别、地图热度、推荐城市、处罚阈值都应能按市场配置。
- 导游报价币种、旅行者展示币种、实际支付币种和导游结算币种需要分开建模。
- 汇率换算必须保存快照，避免订单确认、支付、退款和争议阶段因实时汇率变化产生不可追溯差异。
- 支付方式按市场、用户所在地、支付侧和收款侧配置；中国境内支付重点支持支付宝、微信支付等，境外游客支付重点支持 Visa / Mastercard 等国际卡组织或后续可接入的本地支付方式。
- 平台应区分游客付款、平台收款、平台抽佣、导游结算和退款资金流，不把全部支付逻辑简化成单一 `paid` 状态。
- 独立开发者不应把游客支付直接收进个人账户后线下转账给导游；需要通过合规支付服务商、市场型支付产品、商户账户或后续公司主体承接收款与结算。
- API 不使用 `/china/...` 作为核心路径，应使用 `/markets/{market_id}/...` 或请求上下文中的 `market_id`。

### 6.3 Identity, organisation, and RBAC

Tables:

- `users`
- `user_auth_identities`
- `roles`
- `permissions`
- `role_permissions`
- `user_roles`
- `user_role_profiles`
- `traveler_profiles`
- `guide_profiles`

Key points:

- 一个用户可以同时拥有旅行者和导游资料。
- 角色支持全局、市场、地区、订单、后台工单等 scope。
- 用户软删除。
- 后台权限必须在服务端检查，前端隐藏仅作为可用性优化。

### 6.4 GuideProfile

导游资料。

核心字段：

- 用户 ID。
- 市场 ID。
- 国家代码。
- 所在地区。
- 可服务地区范围。
- 每日雇佣价格。
- 报价结算币种。
- 旅行者展示币种。
- 汇率换算参考价。
- 是否提供接机服务。
- 性别。
- 年龄。
- 语言能力标签。
- 评分。
- 信誉状态。
- 认证状态。
- 历史成交次数。
- 取消率。
- 违约率。
- 平均回复时间。
- 认证徽章状态。
- 是否上架。

导游列表中的价格必须明显展示，让旅行者可以快速进行预算判断。

示例：

- 市场：海外用户来中国旅游
- 所在地区：上海
- 服务范围：上海、江苏、浙江
- 每日价格：CNY 1000/天
- 接机服务：可提供

### 6.5 TravelPlan and ItineraryRoute

旅行者可以创建旅行计划，计划内容包括：

- 发布者 ID。
- 市场 ID。
- 国家代码。
- 到达日期。
- 到达机场或车站。
- 是否需要接机。
- 大致旅行路线。
- 路线节点和顺序。
- 旅行人数。
- 预算范围。
- 预算币种。
- 可见范围。
- 当前状态。

旅行计划示例：

- 到达地点：上海机场
- 路线：上海 -> 北京 -> 上海
- 可见范围：所有用户 / 仅导游 / 仅旅行者

旅行计划发布后，导游身份用户可以看到并主动联系旅行者。

### 6.6 MessageThread and FollowRelation

聊天会话。

核心字段：

- 市场 ID。
- 发起者 ID。
- 接收者 ID。
- 关联旅行计划 ID。
- 关联订单 ID。
- 是否互相关注。
- 是否已发送问候语。
- 对方是否已回复。
- 当前消息限制状态。
- 是否存在联系方式风险。
- 风险等级。
- 最后一条消息时间。

关注关系用于区分普通陌生人沟通和更开放的多消息沟通。

规则：

- 单向未关注或未互关：可以发起一次问候。
- 对方回复：允许继续沟通。
- 对方不回复：限制继续发送。
- 互相关注：允许正常多条消息沟通。

### 6.7 OrderDraft and ServiceOrder

订单需要覆盖草稿、双方确认、协议、支付、服务、完成、评价、取消、争议和关闭。

核心字段：

- 市场 ID。
- 旅行者 ID。
- 导游 ID。
- 旅行计划 ID。
- 导游价格。
- 币种。
- 行程安排。
- 服务日期。
- 服务地区。
- 是否接机。
- 旅行人数。
- 旅行者确认状态。
- 导游确认状态。
- 旅行者确认时看到的展示金额。
- 旅行者确认时使用的汇率快照 ID。
- 匿名协议状态。
- 当前订单生命周期状态。
- 支付 / 保证金状态。
- 退款状态。
- 争议状态。

确认规则：

- 旅行者需要确认导游定价。
- 导游需要确认旅行者行程安排。
- 双方都确认后，才可以进入匿名协议签署。

### 6.8 AnonymousAgreement

匿名协议作为最终订单确认前的保证书。

核心字段：

- 协议 ID。
- 市场 ID。
- 旅行者 ID。
- 导游 ID。
- 订单 ID。
- 双方确认时间。
- 协议版本。
- 协议状态。
- 是否违约。
- 违约原因。
- 对信誉记录的影响。

如果用户多次打破保证书：

- 超过 A 次：进入系统警惕名单。
- 超过 B 次：账号显示警惕标签，信誉度下降。
- 超过 C 次：触发更严重处罚。

A/B/C 的具体次数和处罚力度后期再确定，并按市场配置。

可能的处罚包括：

- 降低信誉度。
- 展示警惕标签。
- 限制发起聊天。
- 限制发布旅行计划。
- 限制接单。
- 进入人工审核。

### 6.9 MapLayerState and DestinationContent

地图展示状态。

核心字段：

- 市场 ID。
- 当前地区。
- 旅游热度图层。
- 导游密度图层。
- 旅行者密度图层。
- 路线图层。
- 机场 / 车站接送点图层。
- 推荐城市 / 景点图层。
- 当前筛选条件。
- 当前身份视角。

推荐内容包括：

- 推荐城市详情。
- 景点详情。
- 城市评论照片墙。
- 行程规划推荐模块。
- 其他旅行者的评论和照片。

如果目标地点是上海，系统可以推荐苏州、杭州、南京等周边城市，并展示其他旅行者的评论和照片。

### 6.10 OnboardingProfile

新手引导资料。

核心字段：

- 用户 ID。
- 市场 ID。
- 当前身份选择。
- 旅行者兴趣偏好。
- 导游入驻进度。
- 首次地图引导完成状态。
- 首次聊天引导完成状态。
- 首次发布计划引导完成状态。

新用户首次进入 App 时必须能清楚理解旅行者可以做什么、导游如何获得订单。

### 6.11 GuideVerification

导游认证资料。

核心字段：

- 导游 ID。
- 市场 ID。
- 身份认证状态。
- 资质认证状态。
- 真人头像审核状态。
- 服务地区真实性审核状态。
- 语言能力审核状态。
- 认证徽章状态。
- 审核失败原因。
- 申诉状态。

导游认证能力包括：

- 身份认证。
- 导游资质认证。
- 真人头像审核。
- 服务地区真实性审核。
- 语言能力标签。
- 平台认证徽章。

### 6.12 PaymentRecord

支付与资金记录。

核心字段：

- 订单 ID。
- 市场 ID。
- 支付服务商。
- 商户账户 ID。
- 支付方式。
- 支付类型。
- 定金 / 保证金金额。
- 全款金额。
- 平台抽佣金额。
- 平台服务费金额。
- 导游报价金额。
- 导游报价币种。
- 旅行者展示金额。
- 旅行者展示币种。
- 实际支付金额。
- 实际支付币种。
- 导游结算金额。
- 导游结算币种。
- 汇率快照 ID。
- 支付渠道。
- 支付方式所在地区。
- 平台托管状态。
- 分账状态。
- 导游结算状态。
- 退款状态。
- 交易状态。

MVP 阶段可以先做订单草稿、双方确认和匿名协议；真实支付、保证金、退款和仲裁可后置，但需要在 UI、接口和数据结构中预留。

### 6.12.1 ExchangeRateSnapshot

汇率快照用于记录价格展示、订单确认、支付和退款时使用的汇率。

核心字段：

- 市场 ID。
- 源币种。
- 目标币种。
- 汇率值。
- 汇率来源。
- 生效时间。
- 过期时间。
- 使用场景。
- 关联订单 ID。
- 关联支付记录 ID。

规则：

- 导游报价金额和结算金额优先使用市场本地币种，当前中国首发市场默认人民币。
- 旅行者看到的展示金额应根据用户偏好币种、所在地或支付方式换算。
- 订单确认时必须保存当时展示金额和汇率快照。
- 支付、退款和争议处理不得只依赖实时汇率，应引用订单或支付时保存的汇率快照。

### 6.12.2 PaymentMethodConfig

支付方式配置用于区分不同市场、不同用户所在地和不同支付侧。

核心字段：

- 市场 ID。
- 支付方式代码。
- 支付渠道。
- 支持国家 / 地区。
- 支持币种。
- 适用用户类型。
- 适用支付侧。
- 是否启用。
- 手续费规则。
- 结算周期。

规则：

- 中国境内支付方式重点支持支付宝、微信支付等本地支付方式。
- 境外游客支付方式重点支持 Visa / Mastercard 等银行卡类支付方式。
- 后续可按市场增加 Apple Pay、Google Pay、PayPal 或当地常用支付方式。
- 前端支付页只展示当前市场、用户所在地和订单币种下可用的支付方式。

### 6.12.3 PayoutAccount and PayoutRecord

收款账户和结算记录用于管理导游收款、平台收入和后续市场扩展。

`PayoutAccount` 核心字段：

- 用户 ID。
- 市场 ID。
- 收款账户类型。
- 收款服务商。
- 收款国家 / 地区。
- 收款币种。
- 账户审核状态。
- KYC / KYB 状态。
- 是否默认收款账户。

`PayoutRecord` 核心字段：

- 订单 ID。
- 市场 ID。
- 导游 ID。
- 平台抽佣金额。
- 平台服务费金额。
- 导游应结算金额。
- 结算币种。
- 结算服务商。
- 结算状态。
- 结算时间。
- 失败原因。

规则：

- 平台收入必须先从订单金额中按 `CommissionPolicy` 计算，再形成导游应结算金额。
- 导游收款账户必须完成必要审核后才能结算。
- 退款、争议和违约处理可能影响导游结算，应允许冻结、部分结算或取消结算。
- 不同市场可以使用不同支付服务商和结算方式。

### 6.12.4 CommissionPolicy and MembershipPlan

平台盈利规则需要结构化配置，不能散落在订单代码中。

`CommissionPolicy` 核心字段：

- 市场 ID。
- 适用服务类型。
- 抽佣类型。
- 抽佣比例。
- 固定服务费。
- 最低 / 最高收费限制。
- 是否对会员减免。
- 生效时间。
- 失效时间。

`MembershipPlan` 核心字段：

- 市场 ID。
- 会员身份类型。
- 适用用户类型。
- 订阅周期。
- 价格。
- 币种。
- 权益列表。
- 是否启用。

可选盈利模式：

- 每单平台抽佣。
- 旅行者服务费。
- 导游会员订阅。
- 导游置顶推广。
- 旅行计划曝光推广。
- 高级认证服务。
- 接机服务抽佣。
- 平台保证金服务费。

MVP 阶段至少需要保留平台抽佣、服务费和会员计划的数据结构，即使先不真实收费。

### 6.13 DisputeCase

争议与仲裁记录。

核心字段：

- 争议 ID。
- 市场 ID。
- 订单 ID。
- 发起用户 ID。
- 争议类型。
- 证据材料。
- 当前处理状态。
- 平台仲裁结果。
- 处理时限。

后续支付能力包括：

- 平台内支付。
- 定金 / 保证金。
- 全款支付。
- 平台托管。
- 多币种价格展示。
- 汇率快照。
- 境外银行卡支付。
- 中国境内支付宝 / 微信支付。
- 取消规则。
- 退款规则。
- 改期规则。
- 争议申诉。
- 平台仲裁。

### 6.14 ReviewRecord

评价记录。

核心字段：

- 评价 ID。
- 市场 ID。
- 订单 ID。
- 评价者 ID。
- 被评价者 ID。
- 评分维度。
- 文字评价。
- 行程照片。
- 是否精选。
- 是否申诉中。

评价能力包括：

- 旅行者评价导游。
- 导游评价旅行者。
- 行程照片。
- 城市推荐评论。
- 差评申诉。
- 精选评价展示。

评分维度包括：

- 准时。
- 专业。
- 沟通。
- 路线安排。
- 安全感。

### 6.15 NotificationRecord

通知记录。

核心字段：

- 通知 ID。
- 市场 ID。
- 用户 ID。
- 通知类型。
- 关联订单 / 聊天 / 协议 ID。
- 是否已读。
- 创建时间。

通知类型包括：

- 新消息。
- 旅行计划被导游联系。
- 导游报价确认。
- 行程确认提醒。
- 匿名协议待签署。
- 订单状态变化。
- 退款 / 争议通知。
- 账号风险提醒。
- 平台公告。

### 6.16 SafetyProfile

安全资料。

核心字段：

- 用户 ID。
- 市场 ID。
- 紧急联系人。
- 位置共享开关。
- 黑名单用户列表。
- 风险提醒状态。
- 一键求助记录。

安全功能包括：

- 行程开始确认。
- 行程结束确认。
- 紧急联系人。
- 一键求助。
- 位置共享开关。
- 平台安全提示。
- 黑名单。
- 风险用户提醒。
- 可疑行为检测。

### 6.17 AdminWorkItem and AuditLog

后台处理工单。

核心字段：

- 工单 ID。
- 市场 ID。
- 工单类型。
- 关联用户 / 订单 / 内容 ID。
- 当前处理人。
- 当前状态。
- 处理结果。

后台需要处理：

- 用户管理。
- 导游认证审核。
- 内容审核。
- 聊天风险审核。
- 举报处理。
- 订单管理。
- 争议仲裁。
- 违约记录管理。
- 推荐城市内容管理。
- 地图热度数据管理。
- 平台数据看板。

审计日志必须记录所有状态变更动作，包括认证、订单、协议、支付、退款、争议、处罚、后台审核和权限变更。

## 7. 权限设计

RBAC with scoped roles。一个用户可以在不同 scope 中持有多个角色。

### 7.1 Built-in roles

- `sys_admin`
- `market_admin`
- `region_operator`
- `guide_reviewer`
- `content_reviewer`
- `risk_reviewer`
- `support_agent`
- `traveler`
- `guide`
- `viewer`

### 7.2 Permission boundaries

- 只有系统管理员可以创建、归档和全局配置市场。
- 只有市场管理员可以配置当前市场的币种、语言、支付、地图、推荐和审核规则。
- 只有导游审核员和市场管理员可以审批导游认证。
- 只有风控审核员、客服和市场管理员可以处理举报、争议和处罚。
- 导游可以编辑自己的资料、服务范围、价格和接机能力，但不能修改历史订单确认记录。
- 旅行者可以发布旅行计划、联系导游、确认价格和评价导游。
- 所有写操作必须在后端强制校验权限。

### 7.3 Implementation rules

- 使用 FastAPI dependency functions 做权限检查。
- Scope 检查必须比较用户角色 scope 与目标对象的 `market_id`、`region_id`、`order_id` 或 `user_id`。
- 前端隐藏按钮只是体验优化，不能代替后端权限。
- 为每个保护写操作的权限边界编写测试。

## 8. API 设计

Base prefix: `/api/v1`

标准 JSON envelope：

```json
{
  "success": true,
  "data": {},
  "meta": {}
}
```

标准错误结构：

```json
{
  "success": false,
  "error": {
    "error_code": "VALIDATION_ERROR",
    "message": "Invalid request",
    "field_errors": {},
    "trace_id": "..."
  }
}
```

分页使用 cursor 或 page-based pagination，但同一资源要保持一致。

### 8.1 Market and region

- `GET /markets`
- `POST /markets`
- `GET /markets/{market_id}`
- `PATCH /markets/{market_id}`
- `GET /markets/{market_id}/config`
- `PATCH /markets/{market_id}/config`
- `GET /markets/{market_id}/regions`
- `POST /markets/{market_id}/regions`
- `GET /markets/{market_id}/regions/{region_id}`
- `GET /markets/{market_id}/currencies`
- `GET /markets/{market_id}/exchange-rates/quote`
- `GET /markets/{market_id}/payment-methods`

首发中国市场通过 seed 创建，不通过硬编码创建。

### 8.2 Auth and users

- `POST /auth/login`
- `POST /auth/refresh`
- `POST /auth/logout`
- `GET /auth/me`
- `GET /users`
- `GET /users/{id}`
- `PATCH /users/{id}`
- `POST /users/{id}/roles`

### 8.3 Profiles and onboarding

- `GET /me/profiles`
- `POST /me/role-switch`
- `GET /me/onboarding`
- `PATCH /me/onboarding`
- `GET /travelers/{id}`
- `PATCH /travelers/{id}`
- `GET /guides/{id}`
- `PATCH /guides/{id}`
- `POST /guides/{id}/verification`
- `GET /guides/{id}/verification`

### 8.4 Discovery, maps, and search

- `GET /markets/{market_id}/guides`
- `GET /markets/{market_id}/travel-plans`
- `GET /markets/{market_id}/search`
- `GET /markets/{market_id}/map/layers`
- `GET /markets/{market_id}/map/heat`
- `GET /markets/{market_id}/destinations`
- `GET /markets/{market_id}/destinations/{id}`

筛选必须支持地区、价格、语言、性别、年龄、评分、距离、回复速度、成交量和服务范围。

### 8.5 Travel plans and itinerary

- `POST /markets/{market_id}/travel-plans`
- `GET /travel-plans/{id}`
- `PATCH /travel-plans/{id}`
- `POST /travel-plans/{id}/publish`
- `POST /travel-plans/{id}/archive`
- `PUT /travel-plans/{id}/route`
- `GET /travel-plans/{id}/recommendations`

### 8.6 Messages and follows

- `GET /message-threads`
- `POST /message-threads`
- `GET /message-threads/{id}`
- `POST /message-threads/{id}/messages`
- `POST /users/{id}/follow`
- `DELETE /users/{id}/follow`
- `POST /message-threads/{id}/report`
- `POST /users/{id}/block`

消息发送接口必须执行问候语、互关、回复状态和联系方式风险检查。

### 8.7 Orders and agreements

- `POST /orders/drafts`
- `GET /orders`
- `GET /orders/{id}`
- `PATCH /orders/{id}`
- `POST /orders/{id}/confirm-price`
- `POST /orders/{id}/confirm-itinerary`
- `POST /orders/{id}/agreements`
- `POST /agreements/{id}/sign`
- `POST /agreements/{id}/mark-broken`
- `POST /orders/{id}/cancel`
- `POST /orders/{id}/complete`

### 8.8 Payment, refund, and disputes

- `GET /orders/{id}/payment-options`
- `GET /orders/{id}/price-preview`
- `POST /orders/{id}/payments`
- `GET /orders/{id}/payments`
- `GET /payments/{id}/exchange-rate-snapshot`
- `POST /payments/{id}/refund`
- `GET /orders/{id}/commission-preview`
- `GET /guides/{id}/payout-accounts`
- `POST /guides/{id}/payout-accounts`
- `GET /guides/{id}/payouts`
- `POST /orders/{id}/disputes`
- `GET /disputes/{id}`
- `PATCH /disputes/{id}`
- `POST /disputes/{id}/evidence`
- `POST /disputes/{id}/resolve`

MVP 可以先保留接口设计和状态字段，真实支付接入后续实现。

价格预览接口必须返回导游报价金额、报价币种、旅行者展示金额、展示币种、汇率来源、汇率时间和可用支付方式。支付创建接口必须保存支付时使用的金额、币种和汇率快照。

抽佣预览接口必须返回订单总额、平台抽佣、平台服务费、导游预计结算金额、结算币种和适用规则 ID。

### 8.8.1 Membership and monetisation

- `GET /markets/{market_id}/commission-policies`
- `POST /markets/{market_id}/commission-policies`
- `GET /markets/{market_id}/membership-plans`
- `POST /markets/{market_id}/membership-plans`
- `POST /membership-subscriptions`
- `GET /me/membership-subscriptions`

会员和抽佣接口必须按市场隔离，不同市场可以拥有不同价格、币种、权益和抽佣规则。

### 8.9 Reviews, notifications, and safety

- `POST /orders/{id}/reviews`
- `GET /users/{id}/reviews`
- `GET /notifications`
- `POST /notifications/{id}/read`
- `GET /me/safety`
- `PATCH /me/safety`
- `POST /safety/sos`
- `POST /safety/trips/{order_id}/start`
- `POST /safety/trips/{order_id}/finish`

### 8.10 Admin

- `GET /admin/work-items`
- `GET /admin/work-items/{id}`
- `PATCH /admin/work-items/{id}`
- `GET /admin/guides/verifications`
- `POST /admin/guides/verifications/{id}/approve`
- `POST /admin/guides/verifications/{id}/reject`
- `GET /admin/reports`
- `GET /admin/disputes`
- `GET /admin/orders`
- `GET /admin/dashboard`
- `GET /admin/audit-logs`

## 9. 核心业务流程

### 9.1 新用户与身份切换

流程：

注册 / 登录 -> 选择当前市场 -> 选择旅行者或导游身份 -> 完成基础引导 -> 进入对应首页。

要求：

- 新用户首次进入 App 后，能理解旅行者和导游两种身份分别能做什么。
- 一个账号可切换旅行者和导游身份。
- 旅行者偏好和导游入驻进度分别保存。

### 9.2 导游入驻与认证

流程：

创建导游资料 -> 设置所在地区 -> 设置可服务地区范围 -> 设置每日价格和币种 -> 设置接机能力 -> 设置语言能力 -> 提交认证 -> 审核 -> 上架。

要求：

- 导游入驻需要完成基础资料、服务范围、价格和接机能力设置。
- 导游认证、身份真实性和信用信息是平台信任体系的核心，不应长期后置。
- 认证和上架规则需要按市场配置。

### 9.3 旅行计划发布

流程：

创建计划 -> 填写到达日期和到达机场 / 车站 -> 设置是否需要接机 -> 设计路线 -> 填写人数和预算 -> 设置可见范围 -> 发布。

要求：

- 旅行者必须能够发布包含时间、机场、路线和可见范围的旅行计划。
- 旅行计划可见范围包括：所有用户、仅导游、仅旅行者。
- 导游能看到旅行者发布的计划，并通过 Message 主动联系。

### 9.4 行程规划

旅行者点击旅游规划入口后，进入行程规划设计页面。

行程规划页面需要支持：

- 输入目标城市。
- 设计旅行路线。
- 填写到达时间和到达地点。
- 设置是否需要接机。
- 查看目标城市周边推荐城市。
- 查看其他旅行者的评论和照片。
- 发布旅行规划。

### 9.5 聊天与隐私安全

旅行者和导游都可以主动向对方发起 Message。

聊天必须遵守平台隐私安全规则：

- 不允许跳出平台交易。
- 不允许交换电话、微信、邮箱等联系方式。
- 未互相关注的情况下可以发起 Message。
- 未互相关注且对方未回复时，只能发送一条问候语。
- 对方回复后，即使双方仍未互相关注，也可以继续沟通。
- 如果对方没有回复，则不能继续发送消息。
- 互相关注后可以发送多条消息。

后续需要支持：

- 联系方式识别。
- 风险提示。
- 消息拦截。
- 举报。
- 拉黑。
- 平台审核。

### 9.6 订单确认与匿名协议

流程：

聊天沟通 -> 生成订单草稿 -> 旅行者确认导游价格 -> 导游确认旅行者行程 -> 双方签署匿名协议 -> 进入后续支付或服务确认。

订单确认内容应包括：

- 导游价格。
- 服务日期。
- 服务地区。
- 行程路线。
- 旅行人数。
- 是否接机。
- 其他双方已沟通确认的服务内容。

双方确认后才可以签署匿名协议。匿名协议记录会影响用户历史信誉。

### 9.7 服务完成与评价

流程：

服务开始确认 -> 服务中 -> 服务结束确认 -> 双方评价 -> 订单关闭 -> 评价进入信誉记录和目的地内容沉淀。

评价体系需要同时支持旅行者评价导游、导游评价旅行者。

### 9.8 争议与平台处理

流程：

取消 / 退款 / 服务问题 -> 用户提交争议 -> 上传证据 -> 平台客服或风控审核 -> 仲裁结果 -> 退款、处罚或关闭。

MVP 阶段可以先预留争议入口和状态，后续补齐支付、退款和仲裁执行。

## 10. 页面结构

前端和页面设计已经在 Figma 上进行，当前代码位于 `/Users/gecko/trip/frontend`。现有前端路由和页面包括：

- `/` 地图页，对应 `MapView`。
- `/discover` 发现页，对应 `DiscoverPage`。
- `/plans` 我的计划 / 我的服务，对应 `PlansPage`。
- `/messages` 消息页，对应 `MessagesPage`。
- `/profile` 我的页，对应 `ProfilePage`。
- `/user/:id` 用户详情页，对应 `UserProfilePage`。
- `/user/:id/reviews` 评价详情页，对应 `ReviewsDetailPage`。
- `/order/:id` 订单详情页，对应 `OrderPage`。
- `/chat/:id` 聊天详情页，对应 `ChatPage`。
- `/orders` 我的订单页，对应 `OrdersPage`。
- `/reviews` 我的评价页，对应 `MyReviewsPage`。
- `/credit` 信用页，对应 `CreditPage`。

### 10.1 主导航

当前 App 初步 UI 结构分为：

- 地图
- 发现
- 我的计划 / 我的服务
- 消息
- 我的

这些入口应继续作为移动端核心导航。文档中新增页面不代表立即推翻现有 Figma 设计，而是作为后续补齐的产品结构。

### 10.2 账号与新手引导

- 欢迎页 / 产品价值介绍页
- 登录 / 注册页
- 注册身份选择页
- 身份切换页
- 市场选择页
- 旅行者兴趣偏好设置页
- 导游入驻引导页
- 导游资料完善页
- 导游服务范围设置页
- 导游价格设置页

### 10.3 发现与匹配

- 地图页
- 用户列表 / 社交广场页
- 搜索结果页
- 筛选器页
- 排序菜单 / 排序组件
- 导游详情页
- 旅行者详情页

### 10.4 行程与内容

- 行程规划页
- 发布旅行计划页
- 旅行计划详情页
- 我的旅行规划页
- 我的导游范围页
- 推荐城市详情页
- 城市评论照片墙
- 行程规划推荐模块

### 10.5 沟通与通知

- 消息列表页
- 系统通知页
- 订单通知页
- 聊天详情页
- 通知设置页

### 10.6 订单、支付与争议

- 我的订单列表页
- 订单详情页
- 订单确认页
- 匿名协议页
- 支付确认页
- 支付成功页
- 取消订单页
- 退款申请页
- 争议提交页
- 仲裁进度页
- 服务进行中页
- 完成确认页
- 售后 / 争议页

### 10.7 信任、安全与设置

- 信誉记录页
- 导游认证页
- 认证状态页
- 信用详情页
- 用户评价详情页
- 评价提交页
- 评价列表页
- 平台安全说明页
- 安全中心页
- 紧急联系人设置页
- 行程安全页
- 一键求助页
- 黑名单管理页
- 设置页
- 隐私与安全设置页
- 举报与申诉页

### 10.8 管理后台

- 管理员登录页
- 市场管理页
- 市场配置页
- 用户列表页
- 导游审核列表页
- 举报工单页
- 后台订单列表页
- 争议详情页
- 内容审核队列页
- 数据仪表盘页

## 11. 匹配、搜索、排序与推荐规则

平台不仅需要筛选，还需要搜索、排序和推荐。

搜索能力包括：

- 城市搜索。
- 导游搜索。
- 路线搜索。
- 市场内搜索。

排序能力包括：

- 按价格排序。
- 按评分排序。
- 按距离排序。
- 按回复速度排序。
- 按成交量排序。

推荐能力包括：

- 推荐导游。
- 推荐旅行计划。
- 相似路线推荐。
- 推荐城市和周边目的地。

搜索与推荐需要支持空结果页，并在空结果状态提供扩大筛选范围、调整预算或查看推荐城市等替代路径。

推荐逻辑必须按市场隔离。中国市场的热度、城市、价格和推荐规则不能影响未来其他市场。

## 12. 地图、内容与评价体系

地图是 App 的重要展示模块。

地图需要支持不同图层：

- 旅游热度。
- 导游密度。
- 旅行者密度。
- 旅行路线可视化。
- 机场 / 车站接送点。
- 推荐城市 / 景点。

旅行者视角：

- 查看不同地区旅游热度。
- 查看导游密度。
- 查看旅行者密度。
- 查看已规划路线。
- 根据导游性别、年龄、服务地区、价格等条件筛选。

导游视角：

- 查看旅行者计划分布。
- 查看旅行者人数。
- 查看旅行路线与自身服务范围的匹配度。
- 根据目的地、出行日期、人数等条件筛选。

内容沉淀位置：

- 导游详情页。
- 旅行者详情页。
- 推荐城市详情页。
- 城市评论照片墙。
- 行程规划推荐模块。

## 13. 订单生命周期

订单需要形成完整状态流，支持用户理解当前进展，也方便后台处理。

基础状态流：

```text
待沟通
-> 已生成订单草稿
-> 待旅行者确认价格
-> 待导游确认行程
-> 待签署匿名协议
-> 待支付 / 待保证金
-> 已确认
-> 服务中
-> 已完成
-> 待评价
-> 已取消
-> 争议中
-> 已关闭
```

MVP 阶段可以先实现：

- 已生成订单草稿。
- 待旅行者确认价格。
- 待导游确认行程。
- 待签署匿名协议。
- 已关闭。

支付和保证金相关状态在后续阶段接入。

## 14. 支付、退款与争议处理

平台需要预留支付、保证金、退款和争议处理能力。

后续支付能力包括：

- 平台内支付。
- 定金 / 保证金。
- 全款支付。
- 平台托管。
- 取消规则。
- 退款规则。
- 改期规则。
- 争议申诉。
- 平台仲裁。

阶段策略：

- MVP 阶段只做订单草稿、双方确认和匿名协议。
- 支付、保证金、退款和仲裁作为后续交易闭环能力接入。
- 在 UI、API 和数据结构中提前预留支付状态、退款状态和争议状态。
- 支付通道、托管方式和合规边界按市场配置。
- 导游报价、旅行者展示、游客支付和导游结算需要拆分金额和币种字段。
- 例如中国导游以人民币报价，英国游客可以在导游列表、订单确认和支付页看到换算成英镑的参考价格。
- 订单确认、支付成功和退款计算必须记录汇率快照，不能只用实时汇率覆盖历史金额。
- 中国境内收款和本地支付优先考虑支付宝、微信支付；境外游客支付优先考虑 Visa / Mastercard 等国际银行卡支付。
- 平台需要选择明确的收款架构：平台作为商户统一收款后结算给导游，或使用 marketplace / split payment 能力自动分账。
- 如果平台替导游收款并延迟结算，必须记录托管、冻结、退款、争议和结算状态，不应只做简单转账备注。
- 独立开发者阶段可以先接入一个覆盖国际卡和部分本地支付方式的支付服务商，后续再增加中国本地支付服务商；支付服务商能力和主体资质作为市场配置。
- 真实上线前需要确认个人主体、个体工商户或公司主体是否满足支付服务商开户、跨境收款、导游分账和税务要求。

## 15. 导游认证与信任体系

信任体系是旅行交易平台的核心能力，应尽早进入产品结构。

用户信任信息包括：

- 信用等级。
- 历史成交次数。
- 取消率。
- 违约率。
- 平均回复时间。
- 用户评价。
- 认证徽章。
- 风险标签。

导游认证和信任信息需要在导游详情、导游列表、订单确认和聊天入口中清晰展示。

匿名协议违约记录必须进入用户历史数据。

## 16. 通知系统

消息中心需要同时承载聊天消息、系统通知和订单通知。

消息列表需要支持分组：

- 聊天。
- 系统通知。
- 订单通知。

用户能收到聊天、订单、协议、退款、争议和账号风险通知。

## 17. 安全中心与线下风险控制

旅行服务涉及线下见面，必须提供安全能力。

安全能力需要出现在：

- 安全中心页。
- 行程安全页。
- 聊天风险提示。
- 订单详情页。
- 服务进行中页。

旅行场景涉及线下见面，必须提供安全中心、紧急联系人、一键求助和风险用户提醒等能力。

## 18. 商业模式与平台收入

平台需要明确商业化路径，避免只停留在社交匹配工具。

可选收入模式：

- 订单佣金。
- 旅行者服务费。
- 导游会员订阅。
- 旅行者会员订阅。
- 导游置顶推广。
- 旅行计划曝光推广。
- 高级认证服务。
- 接机服务抽佣。
- 平台保证金服务费。
- 目的地商家推广或联名套餐。

商业化设计原则：

- 免费功能需要保证基础匹配和沟通可用。
- 付费功能应围绕更高信任、更高曝光、更高成交效率展开。
- 每单抽佣、服务费、会员、推广和保证金服务费的具体规则后期待定。
- 商业化参数必须按市场配置，不能写死为中国市场规则。
- 平台收入、导游结算和退款扣减必须在订单层可追溯。
- 导游会员不应替代基础上架和基础沟通能力，优先用于更高曝光、更多数据、推广工具、认证权益或降低抽佣。
- 旅行者会员不应影响基本安全和订单保障能力，优先用于优惠、客服优先级、行程工具或高级推荐。

## 19. 管理后台

商业平台需要管理后台支持运营、审核和风险处理。

后台模块包括：

- 市场管理。
- 市场配置管理。
- 用户管理。
- 导游认证审核。
- 内容审核。
- 聊天风险审核。
- 举报处理。
- 订单管理。
- 争议仲裁。
- 违约记录管理。
- 推荐城市内容管理。
- 地图热度数据管理。
- 平台数据看板。

管理后台能处理导游认证、举报、争议、内容审核和订单管理。

## 20. Code structure

### 20.1 Backend

```text
backend/app/
  main.py
  core/          # config, security, permissions, errors, logging
  db/            # session, base, migrations
  models/        # market, users, profiles, plans, messages, orders
  schemas/       # Pydantic schemas by domain
  api/v1/        # routers grouped by domain
  services/      # business logic per domain
  domain/        # matching, risk, pricing, agreements, recommendations
  workers/       # background tasks
  utils/
```

Implementation notes:

- 不要出现 `china_*` 作为核心模块命名，除非它明确属于 seed、配置或市场特定适配器。
- 市场特定规则放在 `market_configs`、策略类或配置表中。
- 聊天限制、联系方式识别、支付、退款、处罚阈值和地图热度都应支持按市场替换。

### 20.2 Frontend

当前已有结构：

```text
frontend/src/
  app/
    App.tsx
    components/
  imports/
  styles/
```

后续建议结构：

```text
frontend/src/
  app/           # routing, shell, app context
  pages/         # one folder per feature area
  components/    # shared UI components
  api/           # typed API client hooks
  stores/        # market, auth, role, UI state
  utils/
  styles/
```

Implementation notes:

- 前端应保留当前 Figma 导出的视觉方向和页面基础。
- `role` 状态需要扩展为同时包含 `market_id` 和当前用户身份。
- 页面文案、币种、地区、地图默认视角需要来自市场配置。

## 21. Testing strategy

### 21.1 Backend unit tests

覆盖：

- 市场配置读取和默认值。
- 地区层级和服务范围匹配。
- 聊天问候语限制。
- 互相关注后的消息解锁。
- 联系方式风险识别。
- 订单状态流。
- 匿名协议签署和违约影响。
- 信誉计算。
- 搜索排序。
- 推荐规则。

### 21.2 Backend integration tests

使用真实 PostgreSQL + migrations。覆盖：

- Auth
- RBAC
- 市场和地区配置
- 导游入驻和认证
- 旅行计划发布
- 消息发送限制
- 订单草稿和双方确认
- 匿名协议
- 评价
- 通知
- 后台审核

### 21.3 API contract tests

验证关键端点响应结构：

- `/auth/me`
- `/markets/{market_id}`
- `/markets/{market_id}/guides`
- `/markets/{market_id}/travel-plans`
- `/message-threads/{id}`
- `/orders/{id}`
- `/agreements/{id}`
- `/admin/work-items/{id}`

### 21.4 Frontend tests

- Vitest + React Testing Library 覆盖组件行为。
- Playwright 覆盖完整主流程：登录 -> 切换市场 -> 旅行者发布计划 -> 导游联系 -> 聊天限制 -> 订单确认 -> 匿名协议。
- 前端测试应对齐现有 `/frontend` 设计和路由。

### 21.5 Test quality requirements

- 所有权限边界有测试。
- 所有订单状态流有测试。
- 所有市场隔离规则有测试。
- 所有导游认证审批规则有测试。
- 所有写接口有权限测试。
- CI 运行 lint、type checks、migrations、backend tests、frontend tests、Playwright smoke tests。

## 22. Milestone plan

Milestone 维护规则：

- 每个 Milestone 接近完成时，必须回到本节更新该 Milestone 的状态说明。
- 状态说明至少包含三部分：`当前实现标注`、`未完成 / 暂缓项`、`后续 Milestone 依赖时的处理规则`。
- 如果某个能力只完成了基础结构或接口边界，不能在计划中写成完整完成；必须说明已完成范围和不能直接依赖的部分。
- 所有实现过程中遇到需要人为参与决策、业务规则确认、第三方协议选择、功能协议设计、法律 / 支付 / 风控 / 审核 / 隐私边界确认的内容，都必须写回对应 Milestone 的 `未完成 / 暂缓项` 和 `后续 Milestone 依赖时的处理规则`，作为进度汇报、待完善项和人为干预记录。
- 后续 Milestone 如果依赖前序 Milestone 的暂缓项，必须先暂停实现并与产品确认设计方案，不能自行补齐支付、汇率、权限、法律、风控、第三方平台配置等高风险规则。
- 进入下一个 Milestone 前，必须先阅读所有已完成和进行中的前序 Milestone 状态说明，确认哪些能力已完成、哪些能力只是基础结构、哪些能力处于暂缓或需要人为干预。
- 在开始编写下一个 Milestone 的代码之前，必须先向产品方列出该 Milestone 可能涉及的规则、协议、权限、状态流、第三方配置、风控、法律、支付、通知、内容审核、隐私边界等需要确认的设计问题；只有在这些问题被确认、明确暂缓或明确限定实现范围后，才能开始代码实现。
- Milestone 开始前的确认清单必须尽量具体，不能只写“需要确认业务规则”；例如 M5 必须先说明联系方式风险识别范围、举报后是否冻结聊天、风控工单分配给 support / reviewer 的规则、消息是否允许删除 / 撤回 / 编辑、系统消息模板和通知策略等。
- 如果产品方选择暂缓部分确认项，必须在该 Milestone 的 `未完成 / 暂缓项` 中记录暂缓原因和后续触发条件；实现时只能覆盖已确认或明确低风险的范围。
- 如果实现过程中判断某项能力当前无法可靠解决、需要大量时间 / 算力 / 外部研究、会显著拖慢当前 Milestone，或超出当前资源边界，必须停止硬编码实现；将其作为 `memory / 延后实现项` 写入对应 Milestone 的 `未完成 / 暂缓项`，说明原因、已知风险、后续触发条件和重新评估方式，然后继续推进不依赖它的低风险基础能力。
- 允许进入下一个 Milestone 的条件：当前 Milestone 的核心低风险基础能力已可运行、已验证，并且剩余工作主要属于外部配置缺失、第三方账号 / Bundle ID / Client ID / API token 未填写、法律 / 支付 / 风控 / 审核 / 隐私规则待确认、复杂算法或运营策略待设计等人为干预事项。
- 因外部配置或人为规则设计暂缓的事项，不阻塞后续 Milestone 的低风险基础建设；但必须在对应 Milestone 中写明阻塞原因、需要谁提供什么信息、后续依赖时必须如何确认。
- 如果下一个 Milestone 的实现会直接依赖前序暂缓项，例如真实 OAuth、支付、汇率、上架规则、认证材料、地图热度、推荐排序、联系方式识别、法律协议文案，则不能继续编码，必须先与产品确认该暂缓项的设计方案。
- 每次更新 Milestone 状态时，应保持 `Plan.md` 是项目事实来源，而不是聊天记录；只记录可执行、可验收、可追溯的信息。

### Milestone 0: 数据库设计与迁移基础

目标：先把产品对象落成稳定的数据结构，避免后端和前端在无数据契约的情况下开工。

- 完成核心 ERD 和表关系设计。
- 定义通用 UUID 主键、软删除字段、审计字段和状态枚举。
- 建立市场、地区、币种、语言、支付方式、政策配置等基础表。
- 建立用户、身份、角色、权限、旅行者资料、导游资料、导游认证表。
- 建立旅行计划、行程路线、聊天、关注、订单、匿名协议、评价、通知表。
- 建立支付记录、汇率快照、抽佣规则、收款账户、结算记录、会员计划的预留表。
- 建立后台工单、举报、争议、审计日志表。
- 输出 Alembic 初始 migration。
- 输出 demo seed 的数据范围和依赖顺序。

当前实现标注：

- 已完成 `database/migrations/0001_initial_schema.sql`，覆盖市场、地区、币种、语言、支付方式、用户、身份、角色、权限、旅行者、导游、认证、旅行计划、聊天、订单、协议、支付、结算、会员、争议、后台工单、审计日志等核心表。
- 已完成 `database/alembic/versions/0001_initial_schema.py`，通过 Alembic 管理初始 schema。
- 已完成 `database/ERD.md` 和 `database/README.md`，用于说明核心实体关系和数据库结构。
- 已完成 `database/seed_plan.md`，记录 demo seed 的范围和依赖顺序。
- 已确认首发中国市场应通过 seed 创建，不应通过核心业务代码硬编码创建。
- 已在后续 `0002_auth_tokens_and_invitations` migration 中补充 Auth refresh token 和后台邀请表，说明数据库结构会随 Milestone 继续演进，但必须通过 Alembic migration 追踪。

未完成 / 暂缓项：

- 初始 schema 已覆盖大部分规划对象，但仍可能在后续 Milestone 中按实际接口补充字段、索引、唯一约束和审计字段。
- 部分业务规则表目前只是预留结构，例如支付 provider、抽佣、结算、会员、争议、风控和政策配置，不能视为业务规则已经完整设计。
- ERD 和数据库文档需要在后续 migration 增加关键表或关系时同步维护。
- 当前数据库设计不直接决定支付、汇率、法律责任、风控处罚、导游认证材料等业务细节；这些必须在对应 Milestone 中确认。

后续 Milestone 依赖时的处理规则：

- 如果后续功能发现现有表无法表达业务，不允许直接在业务代码中绕过数据模型；必须新增 Alembic migration，并同步更新数据库文档。
- 如果后续功能依赖支付、结算、抽佣、会员、风控、争议等预留表，必须先确认字段语义、状态流、权限边界和审计要求。
- 如果某个市场相关对象缺少 `market_id` 或 scope 字段，必须先确认是否属于全局 reference data；不能默认写成中国市场专用逻辑。

验收标准：

- 数据库 migration 可从空库执行成功。
- 关键外键、唯一约束、索引和状态字段明确。
- 中国首发市场通过 seed 创建，不通过硬编码创建。
- 所有市场相关核心表具备 `market_id` 或明确说明为什么不需要。

### Milestone 1: 后端基础设施

目标：在数据库契约上建立最小可运行 API 服务。

- 建立 FastAPI 项目结构。
- 配置 PostgreSQL、Redis、MinIO、Alembic。
- 建立标准 JSON envelope 和错误结构。
- 建立 `/health`、配置加载、日志、trace id。
- 建立测试框架和基础 CI 命令。
- 建立 Docker Compose 本地运行环境。

当前实现标注：

- 已完成 FastAPI 后端项目结构，入口位于 `backend/app/main.py`。
- 已完成标准 success / error JSON envelope、异常处理和 trace id middleware。
- 已完成 `/health` endpoint 和基础 health 测试。
- 已完成配置加载基础结构，支持通过环境变量覆盖 PostgreSQL、Redis、MinIO、JWT 和 bootstrap admin 配置。
- 已完成 SQLAlchemy session、Alembic wiring、`alembic.ini` 和本地数据库 migration 验证流程。
- 已完成 Docker Compose 本地服务结构，覆盖 PostgreSQL、Redis、MinIO、Backend、Frontend。
- 已完成 `backend/pyproject.toml`、`backend/Dockerfile`、基础 pytest 配置和 README 本地运行命令。

未完成 / 暂缓项：

- 当前只建立了基础测试命令和本地验证流程，尚未建立正式 GitHub Actions / CI workflow。
- 日志目前只有基础应用结构，尚未建立结构化业务日志、访问日志规范、错误告警和指标采集。
- Redis、MinIO 已作为环境与依赖配置存在，但尚未在业务功能中接入缓存、任务队列、限流、文件上传或对象存储流程。
- 当前 Docker Compose 适合本地开发，不等同于生产部署方案；生产 secrets、网络、存储卷、备份、HTTPS、域名和监控仍需后续设计。
- `.env.example` 中的本地默认值仅用于开发，生产环境必须替换 `JWT_SECRET_KEY`、bootstrap admin 密码和第三方 OAuth / 支付配置。

后续 Milestone 依赖时的处理规则：

- 如果后续功能需要异步任务、缓存、限流或锁，必须先明确 Redis 的使用模式和失败策略。
- 如果后续功能需要图片、证据、协议、认证材料或报告上传，必须先设计 MinIO / S3 object key、访问权限、MIME 校验和生命周期规则。
- 如果后续功能需要 CI 阶段强制检查，必须新增正式 CI workflow，而不是只依赖本地命令。
- 如果后续功能需要生产部署，不应直接复用本地 Compose 作为生产架构；必须确认部署目标、环境变量管理、数据库备份和观测方案。

验收标准：

- `docker compose config` 通过。
- 后端 health endpoint 可访问。
- Pytest 可运行基础测试。
- Alembic 可连接数据库。

### Milestone 2: 市场、用户、Auth 与 RBAC 后端

目标：先完成所有后续业务依赖的身份和权限底座。

- 市场、地区、币种、语言、支付方式配置基础能力。
- 用户注册、登录、刷新、登出、`/auth/me`。
- 用户身份切换：旅行者 / 导游。
- 角色、权限、scope-based RBAC。
- 后端权限依赖函数和写操作权限测试。
- 创建 `china_inbound` demo seed。

当前实现标注：

- 已完成 `china_inbound` seed、市场读取、地区读取、地区创建、市场配置读取和基础更新。
- 已完成邮箱 / 手机号密码登录、JWT access / refresh、登出、`/auth/me`、旅行者 / 导游身份切换。
- 已完成初始 `sys_admin` seed、后台邀请创建 / 接受、用户列表、用户详情、用户资料更新、用户角色分配。
- 已完成 Google / Apple OAuth 登录接口边界和缺失配置报错，但真实第三方 token 验签未实现。
- 已完成基础 RBAC dependency、`user:read`、`user:write`、`market.config:write`、`admin.invitation:create` 等权限检查。

Milestone 2 暂缓项与后续设计方案：

- Google / Apple OAuth 真实验签暂缓：
  - 需要开发者后续提供 Google OAuth Client ID、Apple Service ID / Client ID、Apple Bundle ID、回调域名和平台类型。
  - 配置位置应放在 `.env` / 部署环境变量中，并在 `.env.example` 保留 TODO 标记。
  - 未填写时接口必须返回明确错误：`未填写Google/Apple Id, bundle id，到 /Users/gecko/trip/.env 内填写完整id`。
  - 后续实现前必须确认移动端 / Web 端登录入口、回调方式、Apple 私钥管理方式和 token 生命周期。
- 支付方式配置 CRUD 暂缓：
  - 当前 seed 仅保留 `visa`、`mastercard`、`alipay`、`wechat_pay` 的基础配置占位，并默认不启用。
  - 后续需要设计 payer / payee 两侧规则：旅行者支付方式、导游收款方式、平台商户账户、结算周期、手续费、退款能力、国家 / 地区可用性。
  - 国际卡、Google Pay、Apple Pay、支付宝、微信支付、Stripe / Adyen / Airwallex 等 provider 不应写死在业务代码中，必须通过 provider account 和 market payment config 管理。
  - 后续任何订单支付、退款、抽佣、结算、会员购买功能如果依赖支付配置，必须先暂停并确认支付 provider、收款主体、平台所在法域、KYC / KYB 和手续费策略。
- 货币与汇率配置 CRUD 暂缓：
  - 当前仅支持基础 currency reference 和同币种 quote fallback。
  - 后续需要补充汇率来源 provider、更新时间、缓存策略、报价锁定时间、汇率快照、退款时使用原始汇率还是实时汇率。
  - 导游报价币种、旅行者展示币种和实际支付币种必须分层，不允许只用一个 `currency_code` 混合表达。
  - 后续任何价格展示、订单确认、支付、退款、结算功能如果依赖多币种，必须先确认汇率 provider、舍入规则、展示文案和快照规则。
- 语言与 locale 配置 CRUD 暂缓：
  - 当前 seed 仅保留 `zh-CN`、`en-US`、`en-GB` 等基础语言。
  - 后续需要确认市场默认语言、用户偏好语言、内容翻译语言、后台审核语言、通知模板语言之间的关系。
  - 前端文案、通知、协议模板、评价标签和目的地内容不得直接写死单一语言。
  - 后续任何用户可见文案、本地化内容或通知模板功能如果依赖语言配置，必须先确认 locale fallback、翻译管理和运营维护方式。
- 市场配置后台规则暂缓：
  - 当前 `market_configs.config_json` 只作为轻量配置容器，不应承载复杂支付、法律、风控或推荐规则。
  - 后续需要把市场级配置拆为更明确的配置类型，例如支付规则、内容规则、审核规则、推荐规则、地图规则、价格展示规则。
  - 不同市场的数据隔离、权限 scope、可见地区、可用支付、默认币种、默认语言和政策规则都必须按 `market_id` 配置，不允许在核心业务代码中写死中国市场。
  - 后续任何 Milestone 如果需要读取或修改这些暂缓配置，必须先与产品确认配置字段、后台操作入口、权限边界和审计要求。

验收标准：

- 用户可登录并获得当前市场、身份和权限。
- 不同市场数据隔离。
- 写接口权限由后端强制校验。
- Milestone 2 暂缓项必须被保留为明确 TODO；后续 Milestone 依赖这些能力时，不能自行臆造实现方案，必须先确认业务规则。

### Milestone 3: 旅行者、导游与认证后端

目标：完成平台供给侧和用户资料能力。

- 旅行者资料、偏好和 onboarding 状态。
- 导游资料、所在地区、服务范围、每日价格、币种、接机能力、语言标签。
- 导游认证提交、审核状态、失败原因。
- 导游信誉字段预留：评分、成交次数、取消率、违约率、平均回复时间。
- 价格展示支持报价币种和旅行者展示币种字段。

当前实现标注：

- 已完成 `/me/profiles`，可读取当前用户的 role profiles、traveler profiles 和 guide profiles。
- 已完成 `/me/onboarding` 读取和更新，用于记录 traveler / guide onboarding 状态。
- 已完成旅行者资料创建、读取和更新，当前主要保存 `preference_json`。
- 已完成导游资料创建、读取和更新，覆盖 home region、service regions、每日报价金额、报价币种、接机能力、性别、出生年、语言标签等基础字段。
- 已完成导游认证提交和读取接口，提交后将导游认证状态置为 pending，并创建 guide verification 记录。
- 已完成导游认证基础审核接口，具备 `guide.verification:review` 权限且符合市场 scope 的后台用户可将认证结果更新为 approved / rejected，并记录失败原因和审核人。
- 已保留导游信誉字段读取：评分、成交次数、取消率、违约率、平均回复时间等，但这些值仍由后续订单、评价和风控流程产生。

未完成 / 暂缓项：

- 导游认证材料上传、证据文件、证件类型、头像真实性、服务地区证明、语言能力证明等具体字段暂未实现，需要结合 MinIO / S3 文件设计。
- 当前认证审核是整体验收 / 拒绝，不支持按材料逐项审核；申诉、审核队列、审核日志详情和二次复审暂未实现。
- `is_listed` 上架规则暂未开放修改，因为“导游是否必须认证后才能上架服务”仍需产品确认。
- 每日价格目前只保存导游报价币种和金额，不做旅行者展示币种换算；任何多币种展示必须依赖 Milestone 2 暂缓的汇率规则确认。
- 导游资料中的服务范围只保存 region id，不包含距离半径、跨城服务费、接机单独价格或节假日价格规则。
- 旅行者 onboarding 目前只保存状态和偏好 JSON，尚未形成完整表单步骤、必填字段和完成度计算。

后续 Milestone 依赖时的处理规则：

- 如果前端需要展示“已认证 / 可上架 / 可接单”状态，必须先确认认证通过和上架之间的业务规则。
- 如果后续搜索、订单或地图功能依赖导游价格，必须先确认多币种展示、汇率快照和价格锁定规则。
- 如果后续认证功能需要上传证据材料，必须先完成 MinIO / S3 文件权限、MIME 校验、对象 key 和审核访问规则。
- 如果后续推荐或搜索依赖导游信誉字段，必须先确认评价、订单完成、取消、违约和回复速度的计算来源。

验收标准：

- 导游可完成基础入驻资料。
- 旅行者可读取导游列表和详情所需字段。
- 导游认证状态可被后台或审核角色更新。

### Milestone 4: 旅行计划、地图、搜索与推荐后端

目标：完成发现和匹配所需的数据能力。

- 旅行计划创建、编辑、发布、归档。
- 行程路线节点和到达机场 / 车站。
- 旅行计划可见范围。
- 地图图层数据接口：导游密度、旅行者计划、路线、推荐城市。
- 导游搜索、旅行计划搜索、筛选和排序。
- 推荐城市、景点、评论照片内容基础结构。

当前实现标注：

- 已完成旅行计划基础 CRUD：创建、读取、更新、发布为 active、归档为 archived。
- 已完成旅行计划按 `market_id` 查询，保证查询入口必须带市场上下文。
- 已完成基础市场隔离：列表只查询指定市场，详情读取会检查 private 计划的可见性。
- 已完成行程路线节点基础 CRUD：新增、读取列表、更新、删除。
- 已完成按 route node region 或 arrival region 查询旅行计划，用于后续导游按服务范围匹配计划的基础数据能力。
- 已完成旅行计划写操作 owner / `user:write` 权限检查。

未完成 / 暂缓项：

- 可见范围目前只做最小保护：`private` 计划只允许本人或具备 `user:read` 的后台用户读取；`guides_only`、`travelers_only`、`public` 的完整业务含义暂未展开。
- 导游搜索、旅行计划搜索排序、匹配分数、距离计算、价格匹配、语言匹配和回复速度排序暂未实现。
- 地图图层数据接口、导游密度、旅行者计划热度、路线热度、推荐城市图层暂未实现。
- 推荐城市、景点、评论照片内容基础结构尚未接 API；内容来源、审核、图片存储和排序规则需要后续确认。
- 行程路线节点目前只保存 region、sequence、计划开始 / 结束时间和 notes，不包含交通方式、停留时长、机场 / 车站类型细分、多人团队路线规则。
- 旅行计划预算目前只保存金额和币种，不进行汇率换算、预算匹配或支付能力判断。

后续 Milestone 依赖时的处理规则：

- 如果前端或导游端需要展示“匹配计划”，必须先确认匹配算法使用哪些字段：服务地区、日期、语言、预算、接机、距离、导游状态和认证状态。
- 如果需要地图热度或路线图层，必须先确认数据来源、聚合粒度、隐私脱敏规则和是否允许展示用户密度。
- 如果需要推荐城市 / 景点 / 评论照片，必须先确认内容来源、运营录入后台、图片存储、审核流程和排序策略。
- 如果要完整实现 visibility，必须先确认 public、guides_only、travelers_only、private 在旅行者、导游、后台和未登录用户之间的可见边界。

验收标准：

- 旅行者可发布计划。
- 导游可按市场和服务范围查询匹配计划。
- 搜索结果不泄漏其他市场数据。

### Milestone 5: 聊天、关注与隐私风控后端

目标：完成平台内沟通闭环和基础安全规则。

- 聊天会话和消息发送。
- 关注 / 取消关注。
- 未互关问候语限制。
- 对方回复后解锁继续沟通。
- 联系方式风险识别预留。
- 举报、拉黑和聊天风险审核工单。

当前实现标注：

- 已完成聊天会话创建、读取和按市场列出当前用户会话。
- 已完成消息发送和消息列表读取，只有会话参与者可以访问会话与消息。
- 已完成关注 / 取消关注。
- 已完成拉黑 / 取消拉黑。
- 已完成被拉黑后的基础限制：任意一方存在有效拉黑关系时，不能创建会话或继续发送消息。
- 已完成未互关问候语最小限制：未互关且对方未回复时，发起方只能发送一条消息；对方回复后解除限制。
- 已使用 `message_threads.greeting_sent`、`recipient_replied`、`restriction_status`、`is_mutual_follow` 等字段记录基础沟通状态。

未完成 / 暂缓项：

- 联系方式风险识别暂未实现；手机号、邮箱、微信、WhatsApp、Telegram、Instagram 等识别范围和严格程度需要产品确认。
- 举报入口、举报类型、举报材料、举报后是否自动冻结聊天、举报工单流转暂未实现。
- 聊天风险审核工单、分配给 support / risk reviewer 的规则、处理结果和处罚动作暂未实现。
- 消息删除、撤回、编辑、已读状态、附件、图片、语音、位置分享暂未实现。
- 当前问候语限制是最小规则，尚未区分旅行者主动联系导游、导游主动联系旅行者、是否关联 travel plan、是否已关注等更细策略。
- 当前聊天不做联系方式内容扫描，因此不能依赖其防止跳出平台交易。

后续 Milestone 依赖时的处理规则：

- 如果订单、协议或支付流程依赖聊天记录作为证据，必须先确认消息不可变策略、附件存储、删除 / 撤回规则和审计保留周期。
- 如果要启用联系方式识别，必须先确认识别词典、误伤处理、用户提示文案、处罚等级和人工复核流程。
- 如果要接入举报和风控工单，必须先确认举报类型、处理角色、处理 SLA、账号限制动作和通知规则。
- 如果前端需要实时聊天体验，必须先确认 WebSocket / polling / push notification 方案。

验收标准：

- 未互关且未回复时只能发送一条问候语。
- 对方回复后允许继续沟通。
- 被拉黑用户不能继续发起会话。

### Milestone 6: 订单、匿名协议、评价与通知后端

目标：完成 MVP 交易确认闭环，但不接真实支付。

- 订单草稿。
- 旅行者确认导游价格。
- 导游确认旅行者行程。
- 匿名协议创建、签署、违约标记。
- 订单状态流。
- 双向评价。
- 聊天、订单、协议、风险通知。

本 Milestone 已确认的产品规则：

- 订单可以从聊天会话发起，也可以从导游详情或旅行计划直接发起；聊天框和订单详情都可以取消订单。
- 旅行者价格确认和导游行程确认没有先后顺序，系统必须分别记录双方确认时间；只有双方都确认后，才能进入协议签署阶段。
- MVP 完全不接真实支付，只记录导游报价金额、报价币种、双方确认状态和订单状态。
- 后期真实支付实现路线：先在订单中生成价格快照，再接入支付 provider 配置、平台商户账户、汇率快照、支付记录、退款记录、抽佣策略、导游收款账户和结算记录；接入前必须确认 Stripe / Adyen / Airwallex / 支付宝 / 微信支付等 provider、平台收款主体、KYC / KYB、手续费、退款、争议和结算周期。
- 匿名协议需要包含服务日期、服务地点、价格、取消规则、违约责任、双方签署时间。
- 评价必须订单完成后才能写；任一方完成评价后立即公开可见；评价不是必填，另一方不评价不会影响已评价内容展示。
- 通知先做数据库内通知；底层架构必须预留 Email 和 Push delivery 接口，但暂不接真实外部发送服务。
- 订单价格展示暂时只使用导游报价币种，不做汇率换算；后期用户可在设置中选择指定展示币种，或直接显示导游报价币种。
- 距离预定时间 24 小时内取消订单需要记录惩罚标记；具体惩罚金额、信誉影响、免责原因和申诉规则暂缓到后续确认。

当前实现标注：

- 已完成 `0003_milestone_6_order_flow` migration，补充订单来源会话、取消信息、24 小时取消惩罚标记、协议快照字段，以及 `pending_both_confirm` / `pending_guide_confirm` / `pending_traveler_confirm` 状态。
- 已完成订单创建、列表、详情、旅行者确认、导游确认、取消、完成接口。
- 已支持订单从聊天会话、旅行计划或直接指定导游创建；创建时校验市场、用户、导游资料、旅行计划归属和聊天参与者。
- 已完成双方无先后顺序确认：旅行者确认价格、导游确认行程分别记录时间戳；双方都确认后自动创建匿名协议。
- 已完成匿名协议读取和双方签署接口；双方签署后订单进入 `confirmed`。
- 已完成 MVP 订单取消逻辑；距离服务开始时间 24 小时内取消时记录 `cancellation_penalty_applied` 和延后规则说明。
- 已完成订单完成接口；当前为任一参与方可将已确认订单标记为 completed 的最小规则。
- 已完成订单完成后的公开评价创建和订单评价列表；任一方评价后立即可见，另一方不评价不阻塞展示。
- 已完成数据库内通知列表、标记已读，以及订单创建 / 确认 / 签署 / 取消 / 完成 / 评价场景的通知写入。
- 已完成 Email / Push delivery 的底层接口占位，当前实现为 no-op，不连接外部服务。
- 已通过本地测试和真实 PostgreSQL smoke：订单创建、双方确认、协议签署、订单完成、评价、通知写入均可落库。

未完成 / 暂缓项：

- 真实支付、汇率换算、抽佣、退款、争议和结算不在 M6 实现范围内。
- 24 小时内取消的具体惩罚金额、信誉影响、免责原因和申诉规则暂缓；M6 只记录是否触发惩罚标记。
- Email / Push 只保留接口占位，真实 provider、模板、发送频率、失败重试和退订策略暂缓。
- 订单完成目前采用最小规则：任一参与方可完成已确认订单；是否需要双方完成确认、自动完成、超时完成、争议中止完成，暂缓到订单运营规则确认。
- 匿名协议当前只记录服务日期、地点、价格、取消规则、违约责任和双方签署时间；完整法律文案、多语言模板、版本审计、电子签名效力和司法适用地暂缓。
- 协议违约标记、信誉影响、处罚动作、申诉和人工复核涉及法律与风控规则，当前作为 `memory / 延后实现项` 暂缓，不在 M6 低风险切片中实现。
- 评价当前只做完成后公开评价，不含图片 / 视频、标签、申诉、隐藏、排序、导游评分聚合和信誉影响计算。

后续 Milestone 依赖时的处理规则：

- 如果 M7 支付、抽佣、结算或会员能力依赖 M6 订单价格，必须先确认真实支付 provider、平台收款主体、汇率快照和退款规则。
- 如果前端需要展示取消惩罚，必须先确认惩罚文案、金额或信誉影响、是否允许人工豁免和申诉入口。
- 如果通知要进入 Email / Push，必须先确认 provider、模板语言、用户通知偏好、频率限制和失败补偿策略。
- 如果后台、风控或争议流程要依赖订单完成 / 取消 / 评价，必须先确认状态流、人工处理角色、审计要求、证据保留和用户通知规则。
- 如果要实现协议违约标记或信誉影响，必须先确认违约定义、证据要求、谁可以标记、是否需要后台复核、处罚等级、申诉流程和法律文案。

验收标准：

- 双方确认后才能签署匿名协议。
- 匿名协议可影响信誉记录。
- 用户可查询订单状态和通知列表。

### Milestone 7: 支付预留、抽佣、结算、会员与后台后端

目标：补齐商业系统的数据和接口预留，但真实支付可后置。

- 价格预览和汇率快照。
- 支付方式配置和支付记录预留。
- 平台抽佣规则和抽佣预览。
- 导游收款账户和结算记录预留。
- 会员计划和订阅记录预留。
- 管理后台接口：用户、导游认证、举报、争议、订单、内容审核、审计日志。
- 争议和退款状态预留。

本 Milestone 已确认的产品规则：

- 平台抽佣需要同时支持按比例抽佣和固定服务费，并且不能把抽佣方式写死；M7 先提供独立的 percentage policy 创建接口、fixed fee policy 创建接口和统一抽佣预览接口，后续可增加其他 commission strategy。
- 会员订阅身份先作为数据和接口预留；MVP 只做每单抽佣，不把会员权益接入真实收费或抽佣减免。
- 导游收款账户先只记录草稿和审核状态，不接 Stripe、支付宝、微信、银行账户或真实 KYC / KYB 验证。
- 支付 provider 暂缓，M7 只创建 `payment_records` 占位，不伪造支付成功，不调用真实 provider。
- 争议由订单任一参与方发起；发起方和被发起方都可以查看争议记录；仲裁流程、证据标准、处罚和退款执行后续再定。
- 后台管理权限先按角色分层：admin 可管理全部，support 可管理订单和争议，reviewer 可管理认证和举报；后续可以继续补充更细权限。

当前实现标注：

- 已完成 commission strategy 基础架构，当前支持 `percentage` 和 `fixed_fee` 两种可组合抽佣策略；后续可新增 strategy 和对应创建接口。
- 已完成按比例抽佣 policy 创建接口、固定服务费 policy 创建接口、commission policy 列表接口和订单抽佣预览接口。
- 已完成 payment record placeholder 创建接口；只写入 `payment_records` 且状态保持 `pending`，不调用 provider、不标记 paid。
- 已完成导游 / 用户收款账户草稿接口和列表接口，当前只记录 `provider_code`、国家、币种、账户引用和默认账户，不做真实验证。
- 已完成会员计划创建 / 列表、用户会员订阅草稿创建 / 列表，用于后续会员能力预留；当前不接真实收费和权益生效。
- 已完成订单争议创建和订单争议列表；订单任一参与方可发起，订单双方都可查看。
- 已完成后台订单列表和后台争议列表；当前按角色允许 `sys_admin`、`market_admin`、`support_agent` 查看订单和争议。
- 已通过本地测试和真实 PostgreSQL smoke：抽佣组合计算、payment placeholder、payout account、membership plan / subscription、dispute、后台订单 / 争议查询均可落库或读取。

未完成 / 暂缓项：

- 真实支付 provider、真实收款、分账、退款、风控冻结、结算执行和 KYC / KYB 验证暂缓。
- 会员订阅价格、权益、是否影响抽佣比例、曝光排序、认证标识或客服优先级暂缓。
- 争议仲裁流程、证据标准、处理时限、退款和处罚执行涉及平台规则和国际法律，作为 `memory / 延后实现项` 暂缓。
- 后台举报、内容审核、详细审计筛选和复杂运营规则暂缓。
- 当前抽佣预览只基于导游报价币种计算，不做旅行者展示币种换算、支付币种换算或导游结算币种转换。
- 当前后台权限只做角色级基础分层，尚未实现按市场 scope、按工单类型和按细粒度操作的完整权限矩阵。

后续 Milestone 依赖时的处理规则：

- 如果要接真实支付或分账，必须先确认支付 provider、平台收款主体、税务、手续费、退款、争议、结算周期和法域责任。
- 如果要启用会员权益，必须先确认会员类型、价格、权益边界、是否影响抽佣和是否影响用户基础安全能力。
- 如果要执行争议仲裁结果，必须先确认证据要求、人工角色、SLA、退款 / 处罚动作、申诉和法律文案。
- 如果前端或后台依赖抽佣预览做订单确认页展示，必须明确展示币种、舍入规则、是否展示平台服务费明细和导游预计结算金额。
- 如果要允许 support / reviewer 执行写操作，必须先确认每个角色可以处理的对象、状态流和审计日志要求。

验收标准：

- 订单确认前可计算平台抽佣、服务费和导游预计结算金额。
- 支付和结算字段可追溯，但不伪造支付成功。
- 后台可处理认证、举报、争议和审计查询。

### Milestone 8: 前端接口层与现有 Figma 页面整理

目标：后端核心接口稳定后，再系统接入前端。

- 梳理现有 `/frontend` 页面和路由。
- 建立 API client、请求 envelope 处理、错误处理。
- 建立 auth、market、role 全局状态。
- 接入 TanStack Query。
- 保留现有 Figma 视觉方向，不重做 UI。
- 补齐 loading、empty、error 状态。

本 Milestone 已确认的产品规则：

- 前端开发环境默认连接 `http://127.0.0.1:8000`，后续可通过 `VITE_API_BASE_URL` 覆盖。
- MVP 阶段 access / refresh token 使用 `localStorage` 保存。
- 已存在 `LoginPage.tsx`，M8 不重做登录页视觉，只把邮箱登录 / 注册接入真实 API。
- TanStack Query 暂不接入：当前 M8 只需要少量启动期接口和手动刷新，使用轻量 API client 可满足；后续进入大量列表缓存、分页、后台数据表或复杂失效策略时再评估引入。
- 现有 Figma 页面视觉不重做，只整理 API 接入层和全局状态管理。
- M8 先接入 `/auth/me`、markets、profiles、orders、message threads、travel plans 的基础读取框架；页面内大规模 mock 内容替换留到 M9 / M10 按具体流程逐步完成。

当前实现标注：

- 已完成前端 API client，支持标准 envelope 解析、错误对象、Bearer token 注入和 access token 过期后的 refresh retry。
- 已完成 localStorage token store，保存 `access_token` / `refresh_token`，支持清理登录状态。
- 已完成前端接口类型：当前用户、角色、市场、profiles、travel plans、message threads、orders 和启动数据。
- 已完成 App 顶层 auth bootstrap：存在 token 时自动调用 `/auth/me`、加载 markets、profiles、orders、message threads、travel plans，并放入 App context。
- 已完成 LoginPage 的邮箱登录 / 注册真实 API 接入；第三方登录和手机号验证码登录不再伪造成功，显示暂缓提示。
- 已补齐前端运行依赖 `react` / `react-dom`，并生成 `package-lock.json`；未安装 TanStack Query。
- 已通过前端 production build、后端 pytest，并启动 Vite dev server 验证页面可访问。

未完成 / 暂缓项：

- TanStack Query 作为 `memory / 延后实现项` 暂缓；当前不引入新缓存框架，避免在 M8 扩大架构面。
- 页面内部大批 mock 数据尚未全面替换；M8 只建立接口层和全局数据框架，M9 / M10 再按核心流程逐页接入。
- Google / Apple / 微信登录真实流程、手机号验证码、忘记密码邮件发送仍依赖后端和第三方配置，暂缓。
- 当前 role toggle 仍是前端本地切换，后续如果要和 `/me/role-switch` 强绑定，需要确认切换后的市场 scope 和页面跳转规则。

后续 Milestone 依赖时的处理规则：

- M9 接入发现、地图、计划和聊天前，必须先确认哪些页面字段来自真实 API，哪些继续保留 Figma mock 展示。
- 如果页面需要列表缓存、分页、乐观更新或跨页面失效，先重新评估是否引入 TanStack Query。
- 如果启用第三方登录或手机号验证码，必须先完成对应后端 provider / SMS 配置，不能在前端伪造登录成功。

验收标准：

- 前端可读取 `/auth/me`、当前市场、当前身份。
- 页面使用真实 API client，不再依赖散落 mock。
- 现有路由不被破坏。

### Milestone 9: 前端核心发现与沟通流程

目标：交付旅行者和导游最核心的使用路径。

- 市场选择和身份切换。
- 地图页。
- 发现页和导游列表。
- 导游详情页。
- 旅行计划创建和发布。
- 我的计划 / 我的服务。
- 消息列表和聊天详情。
- 问候语限制的前端提示。

本 Milestone 已确认的产品规则：

- 角色切换需要调用后端 `/api/v1/me/role-switch`；如果后端切换能让后续权限、市场 scope 和身份状态更完整，则不只做前端本地切换。
- M9 先新增后端 guide list API，用于 DiscoverPage 展示真实导游列表基础数据。
- 地图页先使用旅行计划数据，不做地图热度、推荐城市和路线热度；可以保留少量假数据用于验证交互完整性。
- 聊天发送失败遇到问候语限制时，前端展示文案：`在对方回复你之前，您最多只能发送这几条消息`。
- 旅行计划创建表单必填字段：旅行路线、每个城市的到达日期、每个城市的离开日期、人数、预算；接 / 送和备注不是必填。

当前实现标注：

- 已新增后端 `GET /api/v1/markets/{market_id}/guides`，支持按市场读取导游基础列表，包含 `limit` / `offset`，并保持登录鉴权。
- 已补充导游列表仓储查询，当前按 `market_id` 隔离，默认按评分和创建时间排序；复杂筛选和推荐权重暂缓。
- 已补充导游列表鉴权测试，后端测试通过。
- 已完成前端 API client 的 `guides`、`switchRole`、`createTravelPlan`、`publishTravelPlan`、`createRouteNode` 接口封装。
- 已完成 App 顶层身份切换接入 `/api/v1/me/role-switch`，切换后刷新 bootstrap 数据；失败时显示 API 错误并保留前端最小切换能力。
- 已完成 DiscoverPage 导游列表和旅行计划列表优先读取 bootstrap API 数据；没有真实数据时保留现有 Figma mock 数据用于页面交互验证。
- 已完成 MapView 路线层优先使用 `travelPlans` 数据生成路线，无法解析城市坐标时使用首发中国市场的少量假坐标兜底。
- 已完成聊天问候语限制文案，发送被限制时显示：`在对方回复你之前，您最多只能发送这几条消息`。
- 已完成旅行计划创建表单校验：旅行路线、到达日期、离开日期、人数、预算必填；接 / 送地点和备注选填。
- 已完成旅行计划创建低风险 API 接入：先创建 draft，发布时再调用 publish；当前使用一个 route node 保存整条路线的开始和结束时间。

未完成 / 暂缓项：

- 地图热度、推荐城市、路线热度、搜索排序算法和完整匹配算法仍作为 `memory / 延后实现项` 暂缓。
- DiscoverPage 的完整筛选、排序、价格换算和导游上架规则暂缓；M9 只接导游列表基础读取。
- 旅行计划路线中的城市与 region 精准映射如果缺少后端 region id，M9 允许先使用首个可用 region 或保留表单数据，后续再完善地区选择器。
- 旅行计划每个城市的到达 / 离开日期目前前端表单仍是整条路线的开始 / 结束日期；城市级多节点编辑器、region 选择器、每个城市的独立日期和交通方式作为 `memory / 延后实现项` 暂缓。
- 旅行计划编辑、删除和归档暂时仍是前端本地交互；后续如要正式接后端，需要补齐 update / archive 的前端调用、乐观更新和错误回滚。
- MapView 目前不是正式 GIS 地图渲染，路线坐标仍依赖少量城市假坐标；后续如要显示真实路线，必须接入 region 坐标、地图 provider 和隐私脱敏规则。
- 聊天页面 M9 只补齐前端限制文案；真实消息发送错误、联系方式识别严格程度、举报风控工单和系统消息模板仍按 M5 暂缓项处理。

后续 Milestone 依赖时的处理规则：

- 如果 M9 页面需要更复杂的分页、缓存、乐观更新或跨页面失效，再重新评估是否引入 TanStack Query。
- 如果发现页要进入真实推荐或地图热度，必须先确认排序字段、隐私聚合粒度和运营策略。
- 如果后续订单、推荐或地图依赖“每个城市”的精确行程，需要先设计城市选择器、region 匹配、route node 数据协议、日期冲突校验和多市场地点模型，不能继续用标题字符串解析路线。
- 如果后续导游发现页需要真实价格筛选或展示旅行者本地币种，必须先回到 M2 的汇率、币种展示和支付方式暂缓项确认方案。

验收标准：

- 旅行者可从发现导游进入聊天。
- 导游可查看旅行计划并联系旅行者。
- 前端能表达消息限制和风险提示。

### Milestone 10: 前端订单、信任与后台基础流程

目标：完成 MVP 交易确认和信任展示。

- 我的订单列表。
- 订单详情和双方确认。
- 匿名协议页。
- 评价提交和评价展示。
- 信用详情页。
- 通知中心。
- 导游认证页面。
- 后台基础页面：导游审核、举报工单、订单列表、争议详情。

本 Milestone 已确认的产品规则：

- 匿名协议页 MVP 只展示后端已有字段；完整法律协议、多语言协议模板、电子签名法律效力和司法适用地后期补充。
- 订单详情页双方确认后直接展示“可签署匿名协议”；M10 不接真实支付，支付 provider、支付状态、退款、结算和支付文案后期设计。
- 评价沿用 M6 规则：订单 `completed` 后任一方可评价，评价提交后立即公开；评论文本不是必须项。
- 通知中心 M10 只做站内通知；Email / Push 如果缺少 provider、模板、发送策略或 token 配置，则作为 `memory / 延后实现项` 暂缓。
- 导游认证页先只做“提交认证 / 查看认证状态”，不做材料上传；认证材料上传、对象存储、MIME 校验和审核访问权限列入待办。
- 后台页面先只给 admin / reviewer / support 基础列表和操作按钮，不做复杂筛选、审计详情、工单分配和处理 SLA。

当前实现标注：

- 已完成前端 API client 的 M10 接口封装：订单详情、双方确认、完成订单、匿名协议读取 / 签署、评价创建 / 读取、站内通知读取 / 标记已读、导游认证提交 / 查看 / 审核、后台订单 / 争议 / 导游认证列表。
- 已完成订单列表页基础接入：优先读取 bootstrap 中的真实订单数据，支持进入订单详情；无真实数据时保留现有 mock 演示数据。
- 已完成订单详情页基础接入：可读取真实订单，支持旅行者确认价格、导游确认行程、双方确认后展示“可签署匿名协议”，签署后可进入 MVP 完成订单流程；真实支付入口已移除。
- 已完成匿名协议弹窗调整：只展示后端已有字段，包括服务日期、地点、价格、取消规则、违约责任和双方签署时间，不再在 M10 写完整法律协议文案。
- 已完成评价提交基础接入：订单 completed 后可调用后端评价接口；mock 订单仍保留本地评价演示。
- 已完成站内通知接入：消息页系统通知优先读取 `/api/v1/me/notifications`，未读通知可标记为已读；未配置真实通知数据时保留 mock。
- 已完成导游认证基础页 `/verification`：支持查看认证状态、提交认证；材料上传作为待办提示。
- 已完成后台基础页 `/admin`：支持 admin / reviewer / support 角色查看基础订单、争议和导游认证记录，并支持导游认证通过 / 拒绝的基础操作。
- 已新增后端 `GET /api/v1/admin/markets/{market_id}/guide-verifications`，用于后台读取市场内导游认证记录，并补充鉴权测试。
- 已通过后端 pytest、前端 production build，并确认 Vite dev server 可访问。

未完成 / 暂缓项：

- 真实支付、支付方式选择、支付 provider、退款、结算和平台托管文案作为 `memory / 延后实现项` 暂缓。
- 匿名协议完整法律文案、多语言版本、电子签名合规性、协议版本审计和司法适用地暂缓。
- Email / Push 通知缺少 provider、模板、设备 token、退订和失败重试策略，M10 不强制实现。
- 导游认证材料上传、图片 / 文件存储、访问权限、文件生命周期和材料审核细则暂缓。
- 后台复杂筛选、审计详情、工单自动分配、举报处理流和争议仲裁流程暂缓。
- 订单创建入口、从聊天 / 导游详情 / 旅行计划直接发起订单的完整前端表单仍未完成；M10 只接已有订单的列表、详情和状态推进。
- 后台举报工单页面缺少后端独立举报模型和分配规则，M10 不臆造；继续按 M5 / M7 暂缓项处理。
- 前端构建存在 chunk size warning，当前不影响运行；M11 做 E2E / 部署整理时再评估路由级 code splitting。

后续 Milestone 依赖时的处理规则：

- 如果后续流程依赖真实支付或结算，必须先回到 M2 / M7 的支付、汇率、平台收款主体、provider 和退款规则确认。
- 如果后台需要处理举报、争议或认证材料，必须先确认证据模型、角色权限、审计要求、处理时限和通知策略。
- 如果匿名协议要用于真实法律约束，必须先补齐协议文案、版本管理、签署记录、适用法律和多语言展示规则。

验收标准：

- 用户可完成订单草稿 -> 双方确认 -> 匿名协议。
- 用户可查看信用、评价和通知。
- 后台可完成基础审核操作。

### Milestone 11: E2E、部署与上线前整理

目标：把前后端流程变成可演示、可测试、可部署的版本。

- Playwright E2E 覆盖主要路径。
- 后端集成测试覆盖权限、市场隔离、订单状态、聊天限制。
- Docker Compose 完整启动。
- Seed 数据可稳定演示。
- README 和开发文档更新。
- 安全、日志、备份、环境变量和部署说明整理。

验收标准：

- 一条完整路径可演示：登录 -> 选择市场 -> 旅行者发布计划 -> 导游联系 -> 聊天 -> 订单确认 -> 匿名协议。
- CI 至少运行后端测试、前端构建和 E2E smoke。
- 已知限制记录清楚。

本 Milestone 已确认的产品规则：

- M11 先做 `seed demo`，保证可稳定演示完整路径。
- E2E 先只覆盖一条主路径：登录 -> 发布计划 -> 发现导游 -> 聊天 -> 订单确认 -> 匿名协议。
- Docker Compose 接入 PostgreSQL、backend、frontend、Redis、MinIO；Redis / MinIO 先作为基础设施服务接入，不强行实现依赖它们的业务能力。
- CI 先做本地脚本级别：后端 pytest + 前端 build + E2E smoke，不接 GitHub Actions。
- README 同时写“开发者安装运行指南”和“产品演示流程”。

当前实现标注：

- 已重写 `backend/app/seed.py` 为确定性 demo seed，支持 `python -m app.seed demo`。
- Seed demo 已覆盖：默认 `china_inbound` 市场、中国核心城市、12 个旅行者、12 个导游、3 个已认证导游、3 个待审核导游、10 条旅行计划、5 条聊天会话、3 个订单、匿名协议、争议案例、10 条评价、10 条通知。
- 已新增 `scripts/e2e_smoke.py`，使用后端 API 验证主路径：登录 -> 发布计划 -> 发现导游 -> 聊天 -> 订单确认 -> 匿名协议。
- 已新增 `scripts/local_ci.sh`，串联后端 pytest、前端 build、Alembic 迁移、demo seed 和 E2E smoke。
- 已整理 Docker Compose，包含 PostgreSQL、backend、frontend、Redis、MinIO；backend 容器启动时执行迁移和 demo seed。
- 已修正 backend / frontend Dockerfile 的依赖安装方式，并补充 Docker ignore 文件。
- 已修复 Docker Compose 的 backend 挂载冲突：不再把 `./backend` 整体挂到 `/app` 后再嵌套挂载根目录 `alembic.ini`，避免 Docker Desktop 把挂载目标错误解析到 `backend/alembic.ini`。
- 已验证 `docker compose up --build -d` 可以完整构建并启动 PostgreSQL、Redis、MinIO、backend、frontend；前端 `http://127.0.0.1:5173/` 返回 200，后端 `GET http://127.0.0.1:8000/health` 返回成功。
- 已验证 `scripts/local_ci.sh` 通过：后端 pytest、前端 build、迁移、demo seed、E2E smoke 全部成功。

未完成 / 暂缓项：

- Playwright 浏览器级 E2E 暂缓；当前 M11 smoke 覆盖 API 主路径，后续如要验证真实 UI 点击流，需要再引入 Playwright 和浏览器测试数据隔离策略。
- GitHub Actions 暂缓；当前只保留本地 CI 脚本。
- Redis / MinIO 已接入 Compose，但业务侧队列、缓存、对象上传、生命周期和访问权限仍按前序 Milestone 暂缓项处理。

后续 Milestone 依赖时的处理规则：

- 如果进入真实上线流程，必须补齐生产级环境变量、密钥管理、日志、备份、对象存储权限、CORS / 域名、HTTPS 和部署目标。
- 如果要把 E2E 提升到浏览器级测试，先确认测试账号、数据重置策略、前端选择器稳定性和是否引入 Playwright。
- 如果要接 GitHub Actions，先确认仓库 secrets、Docker registry、部署环境和是否允许 CI 访问测试数据库。

## 23. Seed data requirements

```bash
python -m app.seed demo
```

创建：

- 1 个默认市场：`china_inbound`
- 中国地区树：国家、省、市、机场、车站、热门景点
- 12 个旅行者
- 12 个导游
- 3 个已认证导游
- 3 个待审核导游
- 10 条旅行计划
- 5 条聊天会话
- 3 个订单草稿
- 1 个匿名协议
- 1 个争议案例
- 10 条评价
- 10 条通知
- 推荐城市：上海、北京、杭州、苏州、南京

使用确定性数据，保证截图和测试稳定。

## 24. Validation rules checklist

### 24.1 Market and region

- `market_id` 必须存在且启用。
- 地区必须属于当前市场。
- 市场默认币种、语言和时区必须存在。
- 非当前市场数据不能出现在列表、搜索和推荐结果中。

### 24.2 Guide profile

- 导游必须设置所在地区。
- 导游必须设置至少一个可服务地区。
- 导游每日价格必须大于 0。
- 导游价格必须包含币种。
- 导游必须设置是否提供接机服务。
- 导游认证状态影响认证徽章和上架资格，具体规则按市场配置。

### 24.3 Travel plan

- 到达日期必填。
- 到达机场或车站必填。
- 是否需要接机必填。
- 旅行路线至少包含一个目的地。
- 旅行人数必须大于 0。
- 可见范围必须是允许枚举值。

### 24.4 Messages

- 未互关且对方未回复时，只允许发送一条问候语。
- 对方回复后允许继续沟通。
- 互相关注后允许多条消息沟通。
- 联系方式风险命中后需要提示、拦截或进入审核，具体严格程度按市场配置。

### 24.5 Orders and agreements

- 旅行者必须确认导游价格。
- 导游必须确认旅行者行程。
- 双方确认后才可以签署匿名协议。
- 匿名协议必须关联订单。
- 协议违约必须写入信誉记录。
- 已确认的历史订单字段不可直接覆盖。

### 24.6 Payment and disputes

- 支付金额、展示金额、导游报价金额和导游结算金额必须分别保存币种。
- 平台抽佣、平台服务费和导游应结算金额必须可追溯到 `CommissionPolicy`。
- 跨币种展示或支付必须关联汇率快照。
- 订单确认后不能用新的实时汇率覆盖用户当时确认的展示金额。
- 支付方式必须来自当前市场和用户所在地可用的 `PaymentMethodConfig`。
- 导游结算前必须存在已审核通过的 `PayoutAccount`。
- 争议中、退款中或被风控冻结的订单不能直接结算给导游。
- 退款和争议必须关联订单。
- 退款计算必须明确使用支付时汇率、退款时汇率或平台规则指定汇率，具体规则后续确定。
- 平台仲裁必须记录审核人、处理结果和时间。
- 真实支付接入前不得伪造支付成功。

### 24.7 Admin and audit

- 所有后台处理必须有操作者。
- 所有状态变更必须有审计日志。
- 严重处罚必须经过人工审核。

## 25. AI-assisted features rules

AI 可用于：

- 生成旅行路线草案。
- 总结旅行者需求。
- 总结导游服务亮点。
- 辅助生成城市介绍。
- 辅助客服整理争议材料。
- 辅助后台总结弱信任信号。

AI 不得用于：

- 自动决定价格。
- 自动扣罚保证金。
- 自动确认违约。
- 自动审批导游认证。
- 自动作出最终仲裁。
- 自动生成不可审核的法律协议结论。

AI 生成内容必须保存 prompt payload 和 output，以便审核和追溯。

## 26. Non-functional requirements

- JWT access + refresh tokens。
- Argon2 / bcrypt passwords。
- 文件上传校验 extension + MIME。
- 不向前端暴露 stack trace。
- 所有列表分页。
- 关键外键加索引。
- 导入、识别、推荐、通知和计算型任务使用后台 worker。
- 业务流程使用数据库事务。
- 订单、协议、支付、退款、争议和处罚状态变更必须幂等。
- 完成状态的重要业务对象保存不可变快照。
- 业务规则在 service / domain layer，不写在前端。
- 计算和策略模块保持小而可测试。
- 所有用户可见文案支持本地化。
- 当前中国市场默认中文 / 英文文案和人民币，但不写死到核心代码。

## 27. MVP 优先级

### 第一阶段

目标：先完成可讨论、可设计、可原型化的核心产品。

- 市场和地区基础结构。
- 当前中国首发市场 seed。
- 页面结构。
- 双身份切换。
- 注册与新手引导。
- 导游列表。
- 导游详情。
- 导游基础入驻资料。
- 导游认证入口和认证状态展示。
- 旅行计划发布。
- 行程规划基础功能。
- 聊天限制规则。
- 地图基础展示。
- 搜索、筛选和排序的基础能力。

### 第二阶段

目标：补齐平台内交易确认闭环。

- 我的订单列表和订单详情。
- 订单确认。
- 平台抽佣和导游预计结算金额预览。
- 双方确认状态。
- 匿名协议。
- 信誉记录。
- 评价提交和评价展示。
- 消息中心与订单通知。
- 举报与拉黑。

### 第三阶段

目标：增强平台治理和体验。

- 平台内支付。
- 导游收款账户。
- 导游结算记录。
- 平台会员计划。
- 保证金 / 定金。
- 退款与争议处理。
- 违约惩罚体系。
- 平台审核。
- 管理后台。
- 安全中心和一键求助。
- 更多地图图层。
- 旅行者评论和照片推荐。
- 更细的筛选条件。
- 推荐算法。
- 内容安全系统。
- 更多市场接入能力。

## 28. 验收场景

后续设计或实现应至少满足以下场景：

- 新用户首次进入 App 后，能理解旅行者和导游两种身份分别能做什么。
- 用户能选择或进入当前市场，首发默认为海外用户来中国旅游市场。
- 导游能完成入驻资料、服务范围、价格和认证状态设置。
- 旅行者能在导游列表中一眼看到每个导游的每日价格、币种和服务地区。
- 英国等境外游客能看到中国导游人民币报价换算后的本地币种参考价。
- 订单确认前，系统能展示平台抽佣、平台服务费和导游预计结算金额。
- 旅行者能发布包含机场、日期、路线和可见范围的旅行计划。
- 导游能看到旅行者发布的计划，并通过 Message 主动联系。
- 用户能搜索城市、导游和路线，并按价格、评分、距离、回复速度或成交量排序。
- 未互关用户只能发送一条问候语。
- 对方回复后，双方可以继续聊天。
- 平台能够表达禁止交换联系方式和跳出平台交易的规则。
- 双方必须分别确认价格和行程，才能进入匿名协议。
- 用户能在我的订单列表中查看订单状态变化。
- MVP 阶段的订单至少能表达草稿、双方确认、匿名协议和关闭状态。
- 后续支付阶段需要支持支付确认、支付成功、退款申请和争议提交。
- 后续支付阶段需要根据市场和用户所在地展示可用支付方式，例如中国本地支付的支付宝 / 微信支付，以及境外游客常用的 Visa / Mastercard。
- 后续结算阶段需要支持导游添加收款账户、平台审核账户、订单完成后生成导游结算记录。
- 用户能在服务完成后进行双向评价。
- 用户能收到聊天、订单、协议、退款、争议和账号风险通知。
- 用户能在安全中心设置紧急联系人，并在行程中触发一键求助。
- 管理后台能处理导游认证、举报、争议、内容审核和订单管理。
- 匿名协议记录会影响用户历史信誉。
- 地图能表达路线、热度、导游密度、旅行者密度和筛选条件。
- 新增另一个市场时，不需要重写核心订单、聊天、用户和导游模块。
- 所有后续 UI 和功能实现都应优先对齐本文件与现有 Figma / frontend 代码。
- 如果需求变化，应先更新本文件，再进入具体实现。

## 29. 待定问题

以下内容保留为后续产品讨论项：

- 平台最终品牌名是否继续包含 China。
- 首发中国市场的正式 `market_id` 命名。
- A/B/C 违约次数的具体阈值。
- 不同违约等级对应的具体处罚力度。
- 导游是否必须认证后才能上架服务。
- 平台是否直接接入支付。
- 平台收款架构选择：平台统一收款后结算，还是使用 marketplace / split payment 自动分账。
- 独立开发者阶段使用个人主体、个体工商户还是公司主体开户收款。
- 哪个支付服务商可同时满足国际卡、Google Pay / Apple Pay、中国支付宝 / 微信支付和导游结算需求。
- 是否需要多个支付服务商组合接入，而不是依赖单一服务商。
- 是否设置保证金。
- 汇率数据源选择哪个服务。
- 汇率展示价的刷新频率。
- 订单确认后汇率锁定多久。
- 退款按支付时汇率、退款时汇率还是平台规则汇率计算。
- 跨币种支付手续费由旅行者、导游还是平台承担。
- 导游结算是否固定使用市场本地币种，或允许导游选择结算币种。
- 导游收款账户需要哪些 KYC / KYB 材料。
- 争议、退款和风控冻结时导游结算延迟多久。
- 匿名协议的法律文案和平台责任边界。
- 联系方式识别的严格程度。
- 地图热度数据来源。
- 推荐城市和评论照片的数据来源。
- 多人团队旅行的报价方式。
- 导游认证需要哪些具体材料。
- 认证失败后的申诉规则。
- 平台抽佣比例。
- 旅行者服务费是否单独收取。
- 导游会员订阅价格。
- 旅行者会员是否创建，以及会员权益边界。
- 会员是否影响抽佣比例、曝光排序、认证标识或客服优先级。
- 置顶推广和曝光推广是否开放。
- 保证金金额和扣罚规则。
- 支付通道和平台托管方式。
- 中国市场支付宝、微信支付、银行卡和境外 Visa / Mastercard 的具体接入优先级。
- 是否接入 Apple Pay、Google Pay、PayPal 或其他海外本地支付方式。
- 取消、退款、改期的具体规则。
- 争议仲裁的证据标准和处理时限。
- 用户评价是否允许匿名。
- 差评申诉的处理规则。
- 紧急求助是否接入第三方服务或仅平台内通知。
- 位置共享的默认开关和隐私边界。
- 管理后台的角色权限划分。
- 搜索推荐排序的权重规则。
- 未来第二个市场优先选择哪个地区。
- 每个市场是否允许独立品牌、语言包、币种和服务类目。

## 30. Definition of done

一个里程碑完成需要满足：

- Backend migrations 完成。
- API endpoints 有测试。
- Frontend pages 支持目标 workflow。
- 权限检查已实现并测试。
- Demo seed 能演示该里程碑。
- `docker compose up` 能启动完整栈。
- README 更新。
- 已知限制已记录。
- 与现有 Figma / frontend 页面方向不冲突。
- 市场隔离字段、权限和筛选逻辑没有被写死为中国专用。

## 31. 后续工作原则

- 本文件是项目产品基准。
- UI 设计、前端实现、后端接口和数据结构设计都应优先对齐本文件。
- 新增功能前，应先判断是否属于本文件中的 MVP、第二阶段或第三阶段。
- 如果出现新的产品决策，应先更新本文件。
- 不在实现阶段临时改变核心业务规则。
- 中国是当前首发市场，不是代码和接口的全局边界。
