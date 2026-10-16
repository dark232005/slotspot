from datetime import date
from typing import List, Optional
from pydantic import BaseModel


class AnalyticsOverview(BaseModel):
    total_resources: int
    active_resources: int
    today_bookings: int
    upcoming_bookings: int
    completed_bookings: int
    cancellation_rate_percentage: float
    no_show_rate_percentage: float
    average_booking_duration_minutes: float
    total_booking_count: int


class DailyUtilization(BaseModel):
    date_str: str
    available_operating_minutes: int
    reserved_minutes: int
    utilization_percentage: float


class ResourcePopularity(BaseModel):
    resource_id: str
    resource_name: str
    resource_type: str
    booking_count: int
    total_reserved_minutes: int


class PeakPeriod(BaseModel):
    hour: int
    hour_label: str
    booking_count: int


class AnalyticsReport(BaseModel):
    overview: AnalyticsOverview
    daily_utilization: List[DailyUtilization]
    top_resources: List[ResourcePopularity]
    peak_periods: List[PeakPeriod]
