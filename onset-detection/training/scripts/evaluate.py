"""
Evaluate the trained onset detection model and convert to TensorFlow.js format.
"""

import json
import shutil
from datetime import datetime
from pathlib import Path
import numpy as np
from sklearn.metrics import (
    classification_report,
    confusion_matrix,
    roc_curve,
    auc,
)
import tensorflow as tf  # type: ignore
import tensorflowjs as tfjs
import matplotlib.pyplot as plt
import seaborn as sns


def _fix_tfjs_input_layer(tfjs_model_json: Path, input_shape) -> None:
    """Ensure tfjs model.json has batch_input_shape for the InputLayer."""
    with tfjs_model_json.open("r") as f:
        data = json.load(f)

    try:
        layers_cfg = data["modelTopology"]["model_config"]["config"]["layers"]
        input_cfg = layers_cfg[0]["config"]
        if "batch_input_shape" not in input_cfg:
            batch_shape = input_cfg.get("batch_shape") or [None] + list(
                input_shape[1:]
            )
            input_cfg["batch_input_shape"] = batch_shape
            print(f"Added batch_input_shape to tfjs manifest: {batch_shape}")
    except Exception as err:  # noqa: BLE001
        print(
            f"Warning: could not patch batch_input_shape in model.json: {err}"
        )
    else:
        with tfjs_model_json.open("w") as f:
            json.dump(data, f, separators=(",", ":"))


def _copy_to_static(tfjs_dir: Path) -> None:
    """Copy exported tfjs model into the app static path."""
    repo_root = Path(__file__).resolve().parents[3]
    static_dir = repo_root / "static" / "models" / "onset-model-v1"
    static_dir.mkdir(parents=True, exist_ok=True)
    # Copy files individually to avoid stale leftovers
    for fname in ["model.json", "group1-shard1of1.bin", "config.json"]:
        src = tfjs_dir / fname
        if src.exists():
            shutil.copy2(src, static_dir / fname)
            print(f"Copied {fname} -> {static_dir}")


def evaluate_model(
    model_path: str,
    data_dir: str,
    output_dir: str,
    copy_to_static: bool = True,
):
    """Evaluate the trained model and export a TF.js bundle.

    Args:
        model_path: Path to the saved Keras model
        data_dir: Directory containing preprocessed data
        output_dir: Directory to save evaluation results and TF.js bundle
        copy_to_static: Copy the TF.js bundle into the app static folder
    """
    model_file = Path(model_path)
    data_path = Path(data_dir)
    output_path = Path(output_dir)
    output_path.mkdir(parents=True, exist_ok=True)

    # Load model
    print("Loading model...")
    model = tf.keras.models.load_model(model_file)  # type: ignore
    model.summary()

    # Load data
    print("\nLoading data...")
    X = np.load(data_path / "X.npy")
    y = np.load(data_path / "y.npy")

    # Make predictions
    print("\nMaking predictions...")
    y_pred_proba = model.predict(X)
    y_pred = (y_pred_proba > 0.5).astype(int).flatten()

    # Classification report
    print("\nClassification Report:")
    report = classification_report(
        y, y_pred, target_names=["No Onset", "Onset"]
    )
    print(report)

    # Save report
    with open(output_path / "classification_report.txt", "w") as f:
        f.write(str(report))

    # Confusion matrix
    cm = confusion_matrix(y, y_pred)
    plt.figure(figsize=(8, 6))
    sns.heatmap(
        cm,
        annot=True,
        fmt="d",
        cmap="Blues",
        xticklabels=["No Onset", "Onset"],
        yticklabels=["No Onset", "Onset"],
    )
    plt.title("Confusion Matrix")
    plt.ylabel("True Label")
    plt.xlabel("Predicted Label")
    plt.tight_layout()
    plt.savefig(output_path / "confusion_matrix.png", dpi=300)
    print(f"Confusion matrix saved to {output_path / 'confusion_matrix.png'}")

    # ROC curve
    fpr, tpr, thresholds = roc_curve(y, y_pred_proba)
    roc_auc = auc(fpr, tpr)

    plt.figure(figsize=(8, 6))
    plt.plot(
        fpr,
        tpr,
        color="darkorange",
        lw=2,
        label=f"ROC curve (AUC = {roc_auc:.3f})",
    )
    plt.plot([0, 1], [0, 1], color="navy", lw=2, linestyle="--")
    plt.xlim([0.0, 1.0])
    plt.ylim([0.0, 1.05])
    plt.xlabel("False Positive Rate")
    plt.ylabel("True Positive Rate")
    plt.title("Receiver Operating Characteristic (ROC) Curve")
    plt.legend(loc="lower right")
    plt.grid(True)
    plt.tight_layout()
    plt.savefig(output_path / "roc_curve.png", dpi=300)
    print(f"ROC curve saved to {output_path / 'roc_curve.png'}")

    # Find optimal threshold
    optimal_idx = np.argmax(tpr - fpr)
    optimal_threshold = thresholds[optimal_idx]
    print(f"\nOptimal threshold: {optimal_threshold:.4f}")

    # Save evaluation metadata
    eval_metadata = {
        "auc": float(roc_auc),
        "optimal_threshold": float(optimal_threshold),
        "confusion_matrix": cm.tolist(),
    }

    with open(output_path / "evaluation_metadata.json", "w") as f:
        json.dump(eval_metadata, f, indent=2)

    # Convert to TensorFlow.js format
    print("\nConverting model to TensorFlow.js format...")
    tfjs_path = output_path / "tfjs_model"
    tfjs.converters.save_keras_model(model, str(tfjs_path))
    print(f"TensorFlow.js model saved to {tfjs_path}")

    # Save model configuration for browser
    model_config = {
        "inputShape": list(model.input_shape[1:]),
        "outputShape": list(model.output_shape[1:]),
        "optimalThreshold": float(optimal_threshold),
        "version": "1.0.0",
        "created": datetime.utcnow().strftime("%Y-%m-%d"),
    }

    with open(tfjs_path / "config.json", "w") as f:
        json.dump(model_config, f, indent=2)

    # Patch tfjs manifest so batch_input_shape is present for tfjs loader
    _fix_tfjs_input_layer(tfjs_path / "model.json", model.input_shape)

    # Copy into app static folder for immediate use
    if copy_to_static:
        _copy_to_static(tfjs_path)

    print("\nEvaluation complete!")


if __name__ == "__main__":
    # Get the directory where this script is located
    script_dir = Path(__file__).parent.resolve()
    training_dir = script_dir.parent

    model_path = str(training_dir / "models" / "saved" / "best_model.keras")
    data_dir = str(training_dir / "data" / "processed")
    output_dir = str(training_dir / "models" / "saved")

    evaluate_model(model_path, data_dir, output_dir)
