import os
import joblib
import pandas as pd
import numpy as np
from sklearn.ensemble import RandomForestClassifier
from sklearn.linear_model import LogisticRegression

# Ensure models directory exists
MODELS_DIR = os.path.join(os.path.dirname(__file__), 'models')
os.makedirs(MODELS_DIR, exist_ok=True)

def generate_heart_data(n=1000):
    """
    Generate synthetic data for Heart Disease prediction.
    Features: age, sex (0=F, 1=M), cp (chest pain 0-3), trestbps (resting bp),
              chol (cholesterol), fbs (fasting blood sugar > 120),
              thalach (max heart rate), exang (exercise induced angina)
    """
    np.random.seed(42)
    age = np.random.randint(30, 80, n)
    sex = np.random.randint(0, 2, n)
    cp = np.random.randint(0, 4, n)
    trestbps = np.random.normal(130, 20, n)
    chol = np.random.normal(240, 50, n)
    fbs = np.random.randint(0, 2, n)
    thalach = np.random.normal(150, 25, n)
    exang = np.random.randint(0, 2, n)
    
    # Calculate synthetic risk based on logical rules
    risk_score = (age/100) + (sex*0.2) + (cp*0.3) + (trestbps>140)*0.5 + (chol>240)*0.5 + (thalach<100)*0.4 + (exang*0.6)
    target = (risk_score > np.median(risk_score) + 0.2).astype(int)
    
    X = pd.DataFrame({'age': age, 'sex': sex, 'cp': cp, 'trestbps': trestbps,
                      'chol': chol, 'fbs': fbs, 'thalach': thalach, 'exang': exang})
    return X, target

def generate_diabetes_data(n=1000):
    """
    Generate synthetic data for Diabetes prediction.
    Features: pregnancies, glucose, bloodpressure, skinthickness,
              insulin, bmi, pedigree, age
    """
    np.random.seed(43)
    pregnancies = np.random.randint(0, 10, n)
    glucose = np.random.normal(120, 30, n)
    bloodpressure = np.random.normal(70, 15, n)
    skinthickness = np.random.normal(20, 10, n)
    insulin = np.random.normal(80, 40, n)
    bmi = np.random.normal(25, 5, n)
    pedigree = np.random.uniform(0.1, 1.5, n)
    age = np.random.randint(21, 80, n)
    
    risk_score = (glucose>125)*1.0 + (bmi>30)*0.6 + (age>45)*0.3 + pedigree*0.5
    target = (risk_score > np.median(risk_score) + 0.5).astype(int)
    
    X = pd.DataFrame({'pregnancies': pregnancies, 'glucose': glucose, 'bloodpressure': bloodpressure,
                      'skinthickness': skinthickness, 'insulin': insulin, 'bmi': bmi,
                      'pedigree': pedigree, 'age': age})
    return X, target

def generate_hypertension_data(n=1000):
    """
    Generate synthetic data for Hypertension prediction.
    Features: age, sex, bmi, smoking (0/1), alcohol (0/1),
              physical_activity (0/1), sodium_intake (low/med/high 0,1,2), stress_level (0-10)
    """
    np.random.seed(44)
    age = np.random.randint(20, 80, n)
    sex = np.random.randint(0, 2, n)
    bmi = np.random.normal(26, 6, n)
    smoking = np.random.randint(0, 2, n)
    alcohol = np.random.randint(0, 2, n)
    physical_activity = np.random.randint(0, 2, n)
    sodium_intake = np.random.randint(0, 3, n)
    stress_level = np.random.randint(0, 11, n)
    
    risk_score = (age>50)*0.5 + (bmi>28)*0.5 + smoking*0.7 + alcohol*0.3 - physical_activity*0.4 + sodium_intake*0.3 + (stress_level>7)*0.4
    target = (risk_score > np.median(risk_score) + 0.3).astype(int)
    
    X = pd.DataFrame({'age': age, 'sex': sex, 'bmi': bmi, 'smoking': smoking,
                      'alcohol': alcohol, 'physical_activity': physical_activity,
                      'sodium_intake': sodium_intake, 'stress_level': stress_level})
    return X, target

def train_and_save_models():
    print("Training Heart Disease Model...")
    X_heart, y_heart = generate_heart_data()
    heart_model = RandomForestClassifier(n_estimators=100, random_state=42)
    heart_model.fit(X_heart, y_heart)
    joblib.dump(heart_model, os.path.join(MODELS_DIR, 'heart_disease_model.joblib'))
    
    print("Training Diabetes Model...")
    X_diab, y_diab = generate_diabetes_data()
    diab_model = LogisticRegression(max_iter=1000, random_state=43)
    diab_model.fit(X_diab, y_diab)
    joblib.dump(diab_model, os.path.join(MODELS_DIR, 'diabetes_model.joblib'))
    
    print("Training Hypertension Model...")
    X_hyper, y_hyper = generate_hypertension_data()
    hyper_model = RandomForestClassifier(n_estimators=100, random_state=44)
    hyper_model.fit(X_hyper, y_hyper)
    joblib.dump(hyper_model, os.path.join(MODELS_DIR, 'hypertension_model.joblib'))
    
    print("All models trained and saved to ml-service/models/")

if __name__ == "__main__":
    train_and_save_models()
