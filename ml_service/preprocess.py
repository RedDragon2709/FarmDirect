import os
import joblib
import pandas as pd

from sklearn.preprocessing import LabelEncoder

DATA_DIR = "data"
MODELS_DIR = "models"

RAW_FILE = os.path.join(
    DATA_DIR,
    "raw_prices.csv"
)

PROCESSED_FILE = os.path.join(
    DATA_DIR,
    "processed_prices.csv"
)


def get_season(month: int) -> str:
    if month in [6, 7, 8, 9, 10]:
        return "Kharif"

    if month in [11, 12, 1, 2, 3]:
        return "Rabi"

    return "Zaid"


def main():
    os.makedirs(DATA_DIR, exist_ok=True)
    os.makedirs(MODELS_DIR, exist_ok=True)

    print("Loading raw dataset...")

    df = pd.read_csv(RAW_FILE)

    print("\nOriginal Shape:")
    print(df.shape)

    # =========================
    # RENAME COLUMNS
    # =========================

    df = df.rename(columns={
        "STATE": "state",
        "District Name": "district",
        "Market Name": "market",
        "Commodity": "commodity",
        "Min_Price": "min_price",
        "Max_Price": "max_price",
        "Modal_Price": "modal_price",
        "Price Date": "arrival_date"
    })

    required_columns = [
        "state",
        "district",
        "market",
        "commodity",
        "arrival_date",
        "min_price",
        "max_price",
        "modal_price"
    ]

    df = df[required_columns]

    # =========================
    # DROP NULLS
    # =========================

    df.dropna(inplace=True)

    # =========================
    # NUMERIC CONVERSION
    # =========================

    price_columns = [
        "min_price",
        "max_price",
        "modal_price"
    ]

    for col in price_columns:
        df[col] = pd.to_numeric(
            df[col],
            errors="coerce"
        )

    df.dropna(inplace=True)

    # =========================
    # REMOVE INVALID VALUES
    # =========================

    df = df[df["modal_price"] > 0]
    df = df[df["min_price"] > 0]
    df = df[df["max_price"] > 0]

    # =========================
    # CONVERT QUINTAL → KG
    # =========================

    for col in price_columns:
        df[col] = df[col] / 100

    # =========================
    # KEEP ONLY COMMON
    # FRUITS + VEGETABLES
    # =========================

    valid_commodities = [
        # Vegetables
        "Tomato",
        "Onion",
        "Potato",
        "Brinjal",
        "Cabbage",
        "Cauliflower",
        "Carrot",
        "Beans",
        "Green Chilli",
        "Bhindi",
        "Pumpkin",
        "Bottle Gourd",
        "Bitter Gourd",
        "Cucumber",
        "Peas Wet",
        "Garlic",
        "Ginger",

        # Fruits
        "Banana",
        "Apple",
        "Mango",
        "Orange",
        "Papaya",
        "Pomegranate",
        "Guava",
        "Water Melon",
        "Pineapple",
        "Mosambi",
        "Lemon",
        "Sapota",
        "Grapes"
    ]

    df["commodity"] = (
        df["commodity"]
        .astype(str)
        .str.strip()
        .str.title()
    )

    df = df[
        df["commodity"].isin(
            valid_commodities
        )
    ]

    # =========================
    # REMOVE EXTREME OUTLIERS
    # =========================

    MAX_ALLOWED_PRICE = 150

    df = df[
        df["modal_price"] < MAX_ALLOWED_PRICE
    ]

    df = df[
        df["min_price"] < MAX_ALLOWED_PRICE
    ]

    df = df[
        df["max_price"] < MAX_ALLOWED_PRICE
    ]

    # =========================
    # DATE PROCESSING
    # =========================

    df["arrival_date"] = pd.to_datetime(
        df["arrival_date"],
        errors="coerce"
    )

    df.dropna(
        subset=["arrival_date"],
        inplace=True
    )

    # =========================
    # FEATURE ENGINEERING
    # =========================

    df["month"] = (
        df["arrival_date"].dt.month
    )

    df["season"] = (
        df["month"].apply(get_season)
    )

    df["price_range"] = (
        df["max_price"] - df["min_price"]
    )

    # =========================
    # NORMALIZE TEXT
    # =========================

    text_columns = [
        "state",
        "district",
        "market",
        "commodity"
    ]

    for col in text_columns:
        df[col] = (
            df[col]
            .astype(str)
            .str.strip()
            .str.title()
        )

    # =========================
    # REMOVE RARE ENTRIES
    # =========================

    commodity_counts = (
        df["commodity"]
        .value_counts()
    )

    valid_final_commodities = (
        commodity_counts[
            commodity_counts > 100
        ].index
    )

    df = df[
        df["commodity"].isin(
            valid_final_commodities
        )
    ]

    # =========================
    # LABEL ENCODERS
    # =========================

    state_encoder = LabelEncoder()
    district_encoder = LabelEncoder()
    commodity_encoder = LabelEncoder()

    df["state_encoded"] = (
        state_encoder.fit_transform(
            df["state"]
        )
    )

    df["district_encoded"] = (
        district_encoder.fit_transform(
            df["district"]
        )
    )

    df["commodity_encoded"] = (
        commodity_encoder.fit_transform(
            df["commodity"]
        )
    )

    # =========================
    # SAVE ENCODERS
    # =========================

    joblib.dump(
        state_encoder,
        os.path.join(
            MODELS_DIR,
            "state_encoder.pkl"
        )
    )

    joblib.dump(
        district_encoder,
        os.path.join(
            MODELS_DIR,
            "district_encoder.pkl"
        )
    )

    joblib.dump(
        commodity_encoder,
        os.path.join(
            MODELS_DIR,
            "commodity_encoder.pkl"
        )
    )

    # =========================
    # SAVE DATASET
    # =========================

    df.to_csv(
        PROCESSED_FILE,
        index=False
    )

    print("\n======================")
    print("FINAL PREPROCESSING COMPLETE")
    print("======================")

    print("\nProcessed Shape:")
    print(df.shape)

    print("\nModal Price Statistics:")
    print(df["modal_price"].describe())

    print("\nUnique Commodities:")
    print(
        sorted(
            df["commodity"].unique()
        )
    )

    print("\nSaved processed dataset:")
    print(PROCESSED_FILE)


if __name__ == "__main__":
    main()