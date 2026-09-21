from abc import ABC, abstractmethod
from typing import Dict, Any, List

class ClinicalParserInterface(ABC):
    @abstractmethod
    def parse_symptoms(self, symptoms_text: str, vitals: Dict[str, Any]) -> Dict[str, Any]:
        """Parses clinical symptoms and vitals to extract required resources and emergency severity."""
        pass

class RuleBasedClinicalParser(ClinicalParserInterface):
    """Deterministic rule-based clinical parser for 40% prototype milestone."""

    def parse_symptoms(self, symptoms_text: str, vitals: Dict[str, Any]) -> Dict[str, Any]:
        text_lower = symptoms_text.lower()
        spo2 = vitals.get("spo2")
        heart_rate = vitals.get("heart_rate")
        bp = vitals.get("blood_pressure")

        requires_icu = False
        requires_ventilator = False
        requires_oxygen = False
        requires_emergency_physician = True # Default for emergency referral
        specialist_type = None
        priority = "URGENT"
        emergency_type = "General Emergency"

        # Respiratory Distress logic
        if any(term in text_lower for term in ["breath", "respiratory", "spo2", "chest pain", "gasping"]):
            emergency_type = "Acute Respiratory Distress"
            requires_oxygen = True
            if spo2 and spo2 < 85:
                requires_icu = True
                requires_ventilator = True
                priority = "CRITICAL"
            elif spo2 and spo2 < 90:
                requires_icu = True
                priority = "HIGH"
            specialist_type = "Pulmonologist / Intensive Care"

        # Cardiac Emergency logic
        elif any(term in text_lower for term in ["cardiac", "heart attack", "angina", "cardiac arrest"]):
            emergency_type = "Cardiac Emergency"
            requires_icu = True
            requires_oxygen = True
            priority = "CRITICAL"
            specialist_type = "Cardiologist"

        # Trauma / Hemorrhage
        elif any(term in text_lower for term in ["accident", "trauma", "bleeding", "fracture", "head injury"]):
            emergency_type = "Major Trauma"
            requires_icu = True
            priority = "CRITICAL"
            specialist_type = "Orthopedic / General Surgeon"

        # Neurological / Stroke
        elif any(term in text_lower for term in ["stroke", "seizure", "unconscious", "paralysis"]):
            emergency_type = "Neurological Crisis"
            requires_icu = True
            priority = "CRITICAL"
            specialist_type = "Neurologist"

        # Fallback check on vitals
        if spo2 and spo2 < 88:
            requires_icu = True
            requires_oxygen = True
            requires_ventilator = True
            priority = "CRITICAL"

        return {
            "emergency_type": emergency_type,
            "priority": priority,
            "requires_icu": requires_icu,
            "requires_ventilator": requires_ventilator,
            "requires_oxygen": requires_oxygen,
            "requires_emergency_physician": requires_emergency_physician,
            "specialist_type": specialist_type,
            "required_resources_list": [
                res for res, val in [
                    ("ICU Bed", requires_icu),
                    ("Ventilator", requires_ventilator),
                    ("Oxygen Support", requires_oxygen),
                    ("Emergency Physician", requires_emergency_physician),
                    (f"Specialist ({specialist_type})" if specialist_type else None, bool(specialist_type))
                ] if val
            ]
        }

# Factory instance
clinical_parser = RuleBasedClinicalParser()
