import os
import joblib
import pandas as pd
import numpy as np

from fastapi import FastAPI
from pydantic import BaseModel

# =========================
# PATHS
# =========================

MODELS_DIR = "models"
DATA_DIR = "data"

MODEL_PATH = os.path.join(
    MODELS_DIR,
    "price_model.pkl"
)

DATASET_PATH = os.path.join(
    DATA_DIR,
    "processed_prices.csv"
)

# =========================
# LOAD MODEL
# =========================

model = joblib.load(MODEL_PATH)

state_encoder = joblib.load(
    os.path.join(
        MODELS_DIR,
        "state_encoder.pkl"
    )
)

district_encoder = joblib.load(
    os.path.join(
        MODELS_DIR,
        "district_encoder.pkl"
    )
)

commodity_encoder = joblib.load(
    os.path.join(
        MODELS_DIR,
        "commodity_encoder.pkl"
    )
)

df = pd.read_csv(DATASET_PATH)

# =========================
# FASTAPI
# =========================

app = FastAPI()


# =========================
# REQUEST MODEL
# =========================

class PriceRequest(BaseModel):
    commodity: str
    state: str
    district: str
    month: int


# =========================
# ROOT
# =========================

@app.get("/")
def root():
    return {
        "status": "ML service running"
    }


# =========================
# PRICE PREDICTION API
# =========================

@app.post("/api/ml/price-suggest")
def predict_price(request: PriceRequest):

    # =========================
    # CLEAN INPUTS
    # =========================

    commodity = (
        request.commodity
        .strip()
        .title()
    )

    state = (
        request.state
        .strip()
        .title()
    )

    district = (
        request.district
        .strip()
        .title()
    )

    month = request.month

    # =========================
    # DISTRICT ALIASES
    # =========================

    district_aliases = {
        "Bengaluru": "Bangalore",
        "Bengaluru Rural": "Bangalore Rural",
        "Bengaluru Urban": "Bangalore Urban",
        "Mysuru": "Mysore"
    }

    district = district_aliases.get(
        district,
        district
    )

    # =========================
    # CHECK ENCODERS
    # =========================

    try:

        commodity_encoded = (
            commodity_encoder.transform(
                [commodity]
            )[0]
        )

        state_encoded = (
            state_encoder.transform(
                [state]
            )[0]
        )

        district_encoded = (
            district_encoder.transform(
                [district]
            )[0]
        )

    except Exception:

        # =========================
        # FALLBACK PREDICTION
        # =========================

        commodity_data = df[
            df["commodity"] == commodity
        ]

        if len(commodity_data) == 0:
            return {
                "error": "Commodity not found"
            }

        fallback_modal = round(
            float(
                commodity_data[
                    "modal_price"
                ].median()
            ),
            2
        )

        return {
            "commodity": commodity,
            "state": state,
            "district": district,
            "suggested_min": round(
                fallback_modal * 0.85,
                2
            ),
            "suggested_max": round(
                fallback_modal * 1.15,
                2
            ),
            "suggested_modal": fallback_modal,
            "confidence": "low",
            "used_fallback": True,
            "note": (
                "Fallback prediction used"
            )
        }

    # =========================
    # DERIVED FEATURES
    # =========================

    # season encoding

    season_map = {
        12: 0,
        1: 0,
        2: 0,
        3: 0,

        6: 1,
        7: 1,
        8: 1,
        9: 1,
        10: 1
    }

    season_encoded = season_map.get(
        month,
        2
    )

    # placeholder values
    # needed because training
    # used 7 features

    price_range = 10

    placeholder_feature = 0

    # =========================
    # FEATURE VECTOR
    # =========================

    features = np.array([
        [
            state_encoded,
            district_encoded,
            commodity_encoded,
            month,
            season_encoded,
            price_range,
            placeholder_feature
        ]
    ])

    # =========================
    # ML PREDICTION
    # =========================

    predicted_modal = float(
        model.predict(features)[0]
    )

    # =========================
    # HISTORICAL SAFETY CHECK
    # =========================

    commodity_data = df[
        df["commodity"] == commodity
    ]

    historical_avg = float(
        commodity_data[
            "modal_price"
        ].median()
    )

    # =========================
    # STABILIZE OUTPUTS
    # =========================

    MAX_ALLOWED_MULTIPLIER = 2.0

    upper_limit = (
        historical_avg *
        MAX_ALLOWED_MULTIPLIER
    )

    lower_limit = (
        historical_avg * 0.5
    )

    predicted_modal = max(
        lower_limit,
        min(
            predicted_modal,
            upper_limit
        )
    )

    # =========================
    # DERIVE MIN/MAX
    # =========================

    predicted_min = (
        predicted_modal * 0.85
    )

    predicted_max = (
        predicted_modal * 1.15
    )

    # =========================
    # ROUND VALUES
    # =========================

    predicted_min = round(
        predicted_min,
        2
    )

    predicted_max = round(
        predicted_max,
        2
    )

    predicted_modal = round(
        predicted_modal,
        2
    )

    # =========================
    # RESPONSE
    # =========================

    return {
        "commodity": commodity,
        "state": state,
        "district": district,
        "suggested_min": predicted_min,
        "suggested_max": predicted_max,
        "suggested_modal": predicted_modal,
        "confidence": "high",
        "used_fallback": False,
        "note": (
            f"Based on {district}, "
            f"{state} mandi data"
        )
    }