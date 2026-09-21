from abc import ABC, abstractmethod
from typing import Dict, Any
from datetime import datetime, timedelta

class ResourcePredictorInterface(ABC):
    @abstractmethod
    def predict_resource_availability(
        self,
        hospital_id: str,
        resource_type: str,
        current_available: int,
        arrival_eta_minutes: int
    ) -> Dict[str, Any]:
        """Predicts availability probability and expected release time at estimated arrival."""
        pass

class HeuristicResourcePredictor(ResourcePredictorInterface):
    """Heuristic prediction model based on resource turnover rates and travel window."""

    def predict_resource_availability(
        self,
        hospital_id: str,
        resource_type: str,
        current_available: int,
        arrival_eta_minutes: int
    ) -> Dict[str, Any]:
        # If resource is currently available (>0), initial confidence is high
        if current_available > 0:
            # If ETA is long (> 30 min) and available is only 1, risk of depletion before arrival increases
            if current_available == 1 and arrival_eta_minutes > 30:
                return {
                    "availability_probability": 0.65,
                    "expected_available_time_minutes": arrival_eta_minutes,
                    "is_predicted_available": True,
                    "confidence": "MEDIUM",
                    "note": "Resource currently available but high risk of depletion during extended travel window."
                }
            return {
                "availability_probability": 0.95,
                "expected_available_time_minutes": 0,
                "is_predicted_available": True,
                "confidence": "HIGH",
                "note": "Resource immediately available and stable."
            }
        else:
            # If currently 0, predict expected turnover (e.g. ICU patient discharge window)
            # Simulated heuristic: typical ICU bed transition window in emergency network is ~15-20 mins
            simulated_release_mins = 15
            if simulated_release_mins <= arrival_eta_minutes + 5:
                return {
                    "availability_probability": 0.70,
                    "expected_available_time_minutes": simulated_release_mins,
                    "is_predicted_available": True,
                    "confidence": "MEDIUM",
                    "note": f"Resource currently occupied, but predicted release in {simulated_release_mins} min before/near arrival."
                }
            else:
                return {
                    "availability_probability": 0.15,
                    "expected_available_time_minutes": 45,
                    "is_predicted_available": False,
                    "confidence": "LOW",
                    "note": "Resource unavailable and unlikely to be freed before arrival."
                }

resource_predictor = HeuristicResourcePredictor()
