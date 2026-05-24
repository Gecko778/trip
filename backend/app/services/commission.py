from decimal import Decimal, ROUND_HALF_UP
from typing import Any, Protocol


CENT = Decimal("0.01")


class CommissionStrategy(Protocol):
    def calculate(self, *, order: dict[str, Any], policy: dict[str, Any]) -> dict[str, Decimal]:
        ...


def money(value: Decimal) -> Decimal:
    return value.quantize(CENT, rounding=ROUND_HALF_UP)


class PercentageCommissionStrategy:
    def calculate(self, *, order: dict[str, Any], policy: dict[str, Any]) -> dict[str, Decimal]:
        amount = Decimal(order["guide_price_amount"])
        fee = amount * Decimal(policy["commission_rate"])
        if policy["min_fee_amount"] is not None:
            fee = max(fee, Decimal(policy["min_fee_amount"]))
        if policy["max_fee_amount"] is not None:
            fee = min(fee, Decimal(policy["max_fee_amount"]))
        return {"platform_commission_amount": money(fee), "platform_service_fee_amount": Decimal("0.00")}


class FixedFeeCommissionStrategy:
    def calculate(self, *, order: dict[str, Any], policy: dict[str, Any]) -> dict[str, Decimal]:
        return {
            "platform_commission_amount": Decimal("0.00"),
            "platform_service_fee_amount": money(Decimal(policy["fixed_service_fee_amount"])),
        }


STRATEGIES: dict[str, CommissionStrategy] = {
    "percentage": PercentageCommissionStrategy(),
    "fixed_fee": FixedFeeCommissionStrategy(),
}


def preview_commission(order: dict[str, Any], policies: list[dict[str, Any]]) -> dict[str, Any]:
    commission_total = Decimal("0.00")
    service_fee_total = Decimal("0.00")
    items = []
    for policy in policies:
        strategy = STRATEGIES.get(policy["commission_type"])
        if strategy is None:
            items.append({"policy": policy, "skipped": True, "reason": "Unsupported commission strategy"})
            continue
        result = strategy.calculate(order=order, policy=policy)
        commission_total += result["platform_commission_amount"]
        service_fee_total += result["platform_service_fee_amount"]
        items.append({"policy": policy, "skipped": False, **result})
    guide_settlement_amount = money(
        Decimal(order["guide_price_amount"]) - commission_total - service_fee_total
    )
    if guide_settlement_amount < 0:
        guide_settlement_amount = Decimal("0.00")
    return {
        "order_id": order["id"],
        "currency_code": order["guide_price_currency"],
        "guide_quote_amount": money(Decimal(order["guide_price_amount"])),
        "platform_commission_amount": money(commission_total),
        "platform_service_fee_amount": money(service_fee_total),
        "guide_settlement_amount": guide_settlement_amount,
        "items": items,
    }
