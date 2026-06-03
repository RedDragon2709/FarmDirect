import json
import os
import joblib
import pandas as pd

from xgboost import XGBRegressor

from sklearn.metrics import (
    mean_squared_error,
    r2_score
)

from sklearn.model_selection import (
    train_test_split
)

from sklearn.preprocessing import (
    LabelEncoder
)

DATA_DIR = "data"
MODELS_DIR = "models"

INPUT_FILE = os.path.join(
    DATA_DIR,
    "processed_prices.csv"
)


def main():
    os.makedirs(MODELS_DIR, exist_ok=True)

    print("Loading processed dataset...")

    df = pd.read_csv(INPUT_FILE)

    season_encoder = LabelEncoder()

    df["season_encoded"] = (
        season_encoder.fit_transform(
            df["season"]
        )
    )

    joblib.dump(
        season_encoder,
        os.path.join(
            MODELS_DIR,
            "season_encoder.pkl"
        )
    )

    feature_columns = [
        "commodity_encoded",
        "state_encoded",
        "district_encoded",
        "month",
        "season_encoded",
        "price_range",
        "min_price",
    ]

    X = df[feature_columns]

    y = df["modal_price"]

    X_train, X_test, y_train, y_test = (
        train_test_split(
            X,
            y,
            test_size=0.2,
            random_state=42
        )
    )

    print("Training model...")

    model = XGBRegressor(
        n_estimators=300,
        learning_rate=0.05,
        max_depth=6,
        random_state=42,
        objective="reg:squarederror"
    )

    model.fit(X_train, y_train)

    predictions = model.predict(X_test)

    rmse = mean_squared_error(
        y_test,
        predictions,
        squared=False
    )

    r2 = r2_score(
        y_test,
        predictions
    )

    print("\n======================")
    print("MODEL PERFORMANCE")
    print("======================")

    print(f"RMSE: {rmse:.2f}")
    print(f"R² Score: {r2:.4f}")

    joblib.dump(
        model,
        os.path.join(
            MODELS_DIR,
            "price_model.pkl"
        )
    )

    with open(
        os.path.join(
            MODELS_DIR,
            "feature_columns.json"
        ),
        "w"
    ) as f:
        json.dump(
            feature_columns,
            f,
            indent=2
        )

    median_prices = (
        df.groupby("commodity")["modal_price"]
        .median()
        .to_dict()
    )

    with open(
        os.path.join(
            MODELS_DIR,
            "median_prices.json"
        ),
        "w"
    ) as f:
        json.dump(
            median_prices,
            f,
            indent=2
        )

    with open(
        os.path.join(
            MODELS_DIR,
            "metrics.json"
        ),
        "w"
    ) as f:
        json.dump(
            {
                "rmse": rmse,
                "r2": r2
            },
            f,
            indent=2
        )

    print("\nModel saved successfully.")


if __name__ == "__main__":
    main()