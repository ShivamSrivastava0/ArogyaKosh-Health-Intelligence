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
from flask import Flask, jsonify, request
from flask_cors import CORS
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

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
    # Prediction Routes (scaffolded — models will be trained in Phase 6)
    # -----------------------------------------------------------------------
    @app.route("/predict/heart", methods=["POST"])
    def predict_heart():
        """
        Heart disease risk prediction.
        Model: Random Forest / Logistic Regression (trained on UCI Heart Disease dataset)
        Will be implemented in Phase 6.
        """
        return _prediction_not_ready("Heart Disease")

    @app.route("/predict/diabetes", methods=["POST"])
    def predict_diabetes():
        """
        Diabetes risk prediction.
        Model: XGBoost with SMOTE (trained on PIMA Indians dataset)
        Will be implemented in Phase 6.
        """
        return _prediction_not_ready("Diabetes")

    @app.route("/predict/hypertension", methods=["POST"])
    def predict_hypertension():
        """
        Hypertension risk prediction.
        Model: Ensemble classifier
        Will be implemented in Phase 6.
        """
        return _prediction_not_ready("Hypertension")

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
