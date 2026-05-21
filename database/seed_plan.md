# Demo Seed Plan

Seed command target for later backend milestones:

```bash
python -m app.seed demo
```

Milestone 0 defines seed scope and dependency order only. Milestone 1 wires this into backend code.

## Dependency Order

1. Reference data
   - Currencies: `CNY`, `USD`, `GBP`, `EUR`
   - Locales: `zh-CN`, `en-US`, `en-GB`
   - Roles and permissions

2. Market and region
   - Market: `china_inbound`
   - Country: China
   - Cities: Shanghai, Beijing, Hangzhou, Suzhou, Nanjing
   - Transport nodes: major airports and train stations for seeded cities

3. Market config
   - Default locale: `en-US`
   - Supported locales: `en-US`, `en-GB`, `zh-CN`
   - Default local currency: `CNY`
   - Display currencies: `CNY`, `USD`, `GBP`
   - Payment method placeholders: Visa, Mastercard, Alipay, WeChat Pay

4. Users and profiles
   - 12 traveler users
   - 12 guide users
   - 3 approved guide verifications
   - 3 pending guide verifications

5. Discovery content
   - 10 travel plans
   - Route nodes for each travel plan
   - Destination content for Shanghai, Beijing, Hangzhou, Suzhou, Nanjing

6. Messaging and order samples
   - 5 message threads
   - 3 order drafts
   - 1 signed anonymous agreement
   - 10 notifications

7. Commercial reservations
   - 1 draft commission policy
   - 1 inactive guide membership plan
   - 1 inactive traveler membership plan

## Stability Rules

- Seed UUIDs should be deterministic once backend seeding is implemented.
- Demo values should be stable across runs for screenshots and tests.
- No seed should depend on hard-coded China logic outside the `markets` and `regions` rows.
