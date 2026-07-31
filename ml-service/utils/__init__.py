"""
ArogyaPredict — Utility Functions
===================================
Shared preprocessing and helper functions for prediction models.
"""


def validate_prediction_input(data, required_fields):
    """
    Validate that all required fields are present in the request data.
    
    Args:
        data (dict): Request JSON body
        required_fields (list[dict]): List of field specs with 'name', 'type', and optional 'range'
    
    Returns:
        tuple: (is_valid: bool, errors: list[str])
    
    Example:
        required = [
            {"name": "age", "type": "int", "range": [1, 120]},
            {"name": "cholesterol", "type": "float", "range": [100, 600]},
        ]
        valid, errors = validate_prediction_input(request_data, required)
    """
    errors = []

    if not data:
        return False, ["Request body is empty. Please provide prediction input data."]

    for field in required_fields:
        name = field["name"]
        expected_type = field.get("type", "float")
        value_range = field.get("range")

        # Check presence
        if name not in data:
            errors.append(f"Missing required field: '{name}'")
            continue

        value = data[name]

        # Check type
        try:
            if expected_type == "int":
                value = int(value)
            elif expected_type == "float":
                value = float(value)
            elif expected_type == "str":
                value = str(value)
        except (ValueError, TypeError):
            errors.append(f"Field '{name}' must be of type {expected_type}, got '{type(value).__name__}'")
            continue

        # Check range
        if value_range and isinstance(value, (int, float)):
            min_val, max_val = value_range
            if not (min_val <= value <= max_val):
                errors.append(f"Field '{name}' must be between {min_val} and {max_val}, got {value}")

    return len(errors) == 0, errors


def format_prediction_response(prediction, confidence, explanation, model_name):
    """
    Format a standardized prediction response.
    
    Args:
        prediction (dict): Prediction results (e.g., {"risk": "moderate", "probability": 0.67})
        confidence (dict): Confidence metrics (e.g., {"score": 0.67, "level": "moderate"})
        explanation (dict): SHAP-based explanations
        model_name (str): Name of the model used
    
    Returns:
        dict: Standardized response matching the API contract
    """
    return {
        "success": True,
        "prediction": prediction,
        "confidence": confidence,
        "explanation": explanation,
        "model": model_name,
        "disclaimer": (
            "This prediction is a statistical estimate based on the provided health parameters. "
            "It is NOT a medical diagnosis. Please consult a qualified healthcare professional "
            "for medical advice and treatment decisions."
        ),
    }


def get_risk_level(probability):
    """
    Convert a probability score to a human-readable risk level.
    
    Args:
        probability (float): Value between 0 and 1
    
    Returns:
        str: Risk level category
    """
    if probability < 0.2:
        return "very_low"
    elif probability < 0.4:
        return "low"
    elif probability < 0.6:
        return "moderate"
    elif probability < 0.8:
        return "high"
    else:
        return "very_high"


def get_risk_color(risk_level):
    """
    Map risk level to a display color for the frontend.
    
    Args:
        risk_level (str): One of very_low, low, moderate, high, very_high
    
    Returns:
        str: Color identifier
    """
    color_map = {
        "very_low": "emerald",
        "low": "green",
        "moderate": "amber",
        "high": "orange",
        "very_high": "rose",
    }
    return color_map.get(risk_level, "gray")
