from typing import Literal


ActiveRole = Literal["traveler", "guide"]
RouteStatusFilter = Literal[
    "confirmed",
    "paid_confirmed",
    "reserved",
    "in_service",
    "completed",
]
