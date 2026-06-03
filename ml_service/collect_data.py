import os
import pandas as pd
import kagglehub

from kagglehub import KaggleDatasetAdapter

OUTPUT_DIR = "data"

OUTPUT_FILE = os.path.join(
    OUTPUT_DIR,
    "raw_prices.csv"
)


def main():
    os.makedirs(OUTPUT_DIR, exist_ok=True)

    print("Downloading mandi dataset from Kaggle...")

    # IMPORTANT:
    # specify actual csv filename
    df = kagglehub.load_dataset(
        KaggleDatasetAdapter.PANDAS,
        "arjunyadav99/indian-agricultural-mandi-prices-20232025",
        "Mandi_Prices.csv"
    )

    print("\nDataset downloaded successfully.")

    print("\nFirst 5 rows:")
    print(df.head())

    print("\nDataset shape:")
    print(df.shape)

    # Save locally
    df.to_csv(
        OUTPUT_FILE,
        index=False
    )

    print("\n======================")
    print("DATA COLLECTION DONE")
    print("======================")

    print(f"Saved to: {OUTPUT_FILE}")


if __name__ == "__main__":
    main()