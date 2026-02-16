import pandas as pd
import joblib
import os
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestClassifier
from sklearn.preprocessing import LabelEncoder
from sklearn.metrics import classification_report

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_PATH = os.path.join(BASE_DIR, "data", "predictive_maintenance.csv")

def train_model():
    print("Loading dataset...")
    df = pd.read_csv(DATA_PATH)

    # Drop unnecessary columns
    df = df.drop(columns=["UDI", "Product ID"])

    # Encode categorical columns
    le_type = LabelEncoder()
    df["Type"] = le_type.fit_transform(df["Type"])

    le_failure = LabelEncoder()
    df["Failure Type"] = le_failure.fit_transform(df["Failure Type"])

    # Features and target
    X = df.drop(columns=["Failure Type", "Target"])
    y = df["Failure Type"]

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42
    )

    print("Training Random Forest model...")
    model = RandomForestClassifier(
        n_estimators=150,
        max_depth=10,
        random_state=42
    )

    model.fit(X_train, y_train)

    y_pred = model.predict(X_test)

    print("\nModel Evaluation:")
    print(classification_report(y_test, y_pred))

    # Save model and encoders
    model_path = os.path.join(BASE_DIR, "model", "model.pkl")
    type_encoder_path = os.path.join(BASE_DIR, "model", "le_type.pkl")
    failure_encoder_path = os.path.join(BASE_DIR, "model", "le_failure.pkl")

    joblib.dump(model, model_path)
    joblib.dump(le_type, type_encoder_path)
    joblib.dump(le_failure, failure_encoder_path)

    print("\nModel saved successfully!")

if __name__ == "__main__":
    train_model()
