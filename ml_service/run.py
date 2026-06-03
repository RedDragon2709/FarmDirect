import os

print("\nSTEP 1 — Collecting data")
os.system("python collect_data.py")

print("\nSTEP 2 — Preprocessing")
os.system("python preprocess.py")

print("\nSTEP 3 — Training model")
os.system("python train_model.py")

print("\nSTEP 4 — Starting ML server")
os.system(
    "python -m uvicorn ml_server:app --reload --port 8001"
)