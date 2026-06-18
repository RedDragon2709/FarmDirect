import os

MODEL_PATH = os.path.join("models", "price_model.pkl")

if os.path.exists(MODEL_PATH):
    print("Pre-trained model found — skipping training.")
else:
    # Only runs if model files are missing (e.g. after deleting them manually)
    print("No model found — running full training pipeline...")
    print("\nSTEP 1 — Collecting data")
    os.system("python collect_data.py")
    print("\nSTEP 2 — Preprocessing")
    os.system("python preprocess.py")
    print("\nSTEP 3 — Training model")
    os.system("python train_model.py")

print("\nStarting ML server on port 8001...")
os.system("python -m uvicorn ml_server:app --reload --port 8001")