"""
ArogyaPredict — Machine Learning Prediction Service
=====================================================
Flask-based microservice for health risk predictions.
Serves trained ML models for heart disease, diabetes, and hypertension.

Architecture:
    React Frontend → Express Backend (proxy) → Flask ML API → Response

This service is intentionally kept separate from the Express backend
to maintain clear separation of concerns and allow independent scaling.
"""

import os
import joblib
import pandas as pd
import numpy as np
from flask import Flask, jsonify, request
from flask_cors import CORS
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Load Models (global to stay in memory)
MODELS_DIR = os.path.join(os.path.dirname(__file__), 'models')

def load_model(filename):
    path = os.path.join(MODELS_DIR, filename)
    if os.path.exists(path):
        return joblib.load(path)
    return None

heart_model = load_model('heart_disease_model.joblib')
diabetes_model = load_model('diabetes_model.joblib')
hypertension_model = load_model('hypertension_model.joblib')

# ---------------------------------------------------------------------------
# App Factory
# ---------------------------------------------------------------------------

def create_app():
    """
    Application factory pattern.
    Creates and configures the Flask application.
    
    Why factory pattern?
    - Enables testing with different configurations
    - Prevents circular imports
    - Follows Flask best practices for scalable applications
    """
    app = Flask(__name__)

    # Configuration
    app.config["ENV"] = os.getenv("FLASK_ENV", "development")
    app.config["DEBUG"] = app.config["ENV"] == "development"

    # CORS — Allow requests from the Express backend
    CORS(app, origins=[
        os.getenv("BACKEND_URL", "http://localhost:5000"),
        os.getenv("CLIENT_URL", "http://localhost:5173"),
    ])

    # -----------------------------------------------------------------------
    # Health Check
    # -----------------------------------------------------------------------
    @app.route("/health", methods=["GET"])
    def health_check():
        """
        Health check endpoint.
        Used by deployment platforms and monitoring tools
        to verify the service is running.
        """
        return jsonify({
            "success": True,
            "message": "ArogyaPredict ML Service is running",
            "data": {
                "version": "1.0.0",
                "environment": app.config["ENV"],
                "models_loaded": _get_loaded_models(),
            },
        }), 200

    # -----------------------------------------------------------------------
    # Prediction Routes
    # -----------------------------------------------------------------------
    @app.route("/predict/heart", methods=["POST"])
    def predict_heart():
        if not heart_model:
            return _prediction_not_ready("Heart Disease")
        
        try:
            data = request.json
            features = ['age', 'sex', 'cp', 'trestbps', 'chol', 'fbs', 'thalach', 'exang']
            input_df = pd.DataFrame([[data.get(f, 0) for f in features]], columns=features)
            
            prob = heart_model.predict_proba(input_df)[0][1]
            
            return jsonify({
                "success": True,
                "message": "Heart disease prediction successful",
                "data": {
                    "probability": round(float(prob), 4),
                    "risk_level": "High" if prob > 0.6 else "Medium" if prob > 0.3 else "Low"
                }
            })
        except Exception as e:
            return jsonify({"success": False, "message": "Prediction failed", "errors": [str(e)]}), 400

    @app.route("/predict/diabetes", methods=["POST"])
    def predict_diabetes():
        if not diabetes_model:
            return _prediction_not_ready("Diabetes")
        
        try:
            data = request.json
            features = ['pregnancies', 'glucose', 'bloodpressure', 'skinthickness', 'insulin', 'bmi', 'pedigree', 'age']
            input_df = pd.DataFrame([[data.get(f, 0) for f in features]], columns=features)
            
            prob = diabetes_model.predict_proba(input_df)[0][1]
            
            return jsonify({
                "success": True,
                "message": "Diabetes prediction successful",
                "data": {
                    "probability": round(float(prob), 4),
                    "risk_level": "High" if prob > 0.6 else "Medium" if prob > 0.3 else "Low"
                }
            })
        except Exception as e:
            return jsonify({"success": False, "message": "Prediction failed", "errors": [str(e)]}), 400

    @app.route("/predict/hypertension", methods=["POST"])
    def predict_hypertension():
        if not hypertension_model:
            return _prediction_not_ready("Hypertension")
        
        try:
            data = request.json
            features = ['age', 'sex', 'bmi', 'smoking', 'alcohol', 'physical_activity', 'sodium_intake', 'stress_level']
            input_df = pd.DataFrame([[data.get(f, 0) for f in features]], columns=features)
            
            prob = hypertension_model.predict_proba(input_df)[0][1]
            
            return jsonify({
                "success": True,
                "message": "Hypertension prediction successful",
                "data": {
                    "probability": round(float(prob), 4),
                    "risk_level": "High" if prob > 0.6 else "Medium" if prob > 0.3 else "Low"
                }
            })
        except Exception as e:
            return jsonify({"success": False, "message": "Prediction failed", "errors": [str(e)]}), 400

    # -----------------------------------------------------------------------
    # Error Handlers
    # -----------------------------------------------------------------------
    @app.errorhandler(404)
    def not_found(error):
        return jsonify({
            "success": False,
            "message": "Endpoint not found",
            "data": None,
            "errors": [str(error)],
        }), 404

    @app.errorhandler(500)
    def internal_error(error):
        return jsonify({
            "success": False,
            "message": "Internal server error",
            "data": None,
            "errors": [str(error)] if app.config["DEBUG"] else ["An unexpected error occurred"],
        }), 500

    @app.errorhandler(400)
    def bad_request(error):
        return jsonify({
            "success": False,
            "message": "Bad request",
            "data": None,
            "errors": [str(error)],
        }), 400

    return app


# ---------------------------------------------------------------------------
# Helper Functions
# ---------------------------------------------------------------------------

def _get_loaded_models():
    """
    Check which trained model files exist in the models/ directory.
    Returns a dict indicating availability of each model.
    """
    models_dir = os.path.join(os.path.dirname(__file__), "models")
    model_files = {
        "heart_disease": "heart_disease_model.joblib",
        "diabetes": "diabetes_model.joblib",
        "hypertension": "hypertension_model.joblib",
    }
    return {
        name: os.path.exists(os.path.join(models_dir, filename))
        for name, filename in model_files.items()
    }


def _prediction_not_ready(model_name):
    """
    Placeholder response for prediction endpoints that don't have
    trained models yet. Will be replaced in Phase 6.
    """
    return jsonify({
        "success": False,
        "message": f"{model_name} prediction model is not yet available. It will be trained and deployed in Phase 6.",
        "data": None,
        "errors": ["MODEL_NOT_AVAILABLE"],
    }), 503


# ---------------------------------------------------------------------------
# Entry Point
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    app = create_app()
    port = int(os.getenv("ML_PORT", 5001))
    
    print(f"\n{'='*60}")
    print(f"  ArogyaPredict ML Service")
    print(f"  Running on http://localhost:{port}")
    print(f"  Environment: {app.config['ENV']}")
    print(f"  Models: {_get_loaded_models()}")
    print(f"{'='*60}\n")
    
    app.run(
        host="0.0.0.0",
        port=port,
        debug=app.config["DEBUG"],
    )
