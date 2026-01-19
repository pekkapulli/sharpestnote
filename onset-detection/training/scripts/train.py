"""
Train the onset detection neural network.
"""

import json
import numpy as np
import shutil
from pathlib import Path
from sklearn.model_selection import train_test_split
from sklearn.utils.class_weight import compute_class_weight
from tensorflow import keras  # type: ignore
from tensorflow.keras import layers, models, callbacks  # type: ignore
import matplotlib.pyplot as plt


def create_model(input_shape: tuple, learning_rate: float = 0.001):
    """
    Create the onset detection neural network.

    Args:
        input_shape: Shape of input features (n_features,)
        learning_rate: Learning rate for optimizer

    Returns:
        Compiled Keras model
    """
    model = models.Sequential(
        [
            layers.Input(shape=input_shape),
            layers.Dense(128, activation="relu"),
            layers.Dropout(0.3),
            layers.Dense(64, activation="relu"),
            layers.Dropout(0.3),
            layers.Dense(32, activation="relu"),
            layers.Dropout(0.2),
            layers.Dense(16, activation="relu"),
            layers.Dense(1, activation="sigmoid"),
        ]
    )

    model.compile(
        optimizer=keras.optimizers.Adam(learning_rate=learning_rate),
        loss="binary_crossentropy",
        metrics=[
            "accuracy",
            keras.metrics.Precision(name="precision"),
            keras.metrics.Recall(name="recall"),
            keras.metrics.AUC(name="auc"),
        ],
    )

    return model


def plot_training_history(history, output_dir: Path):
    """Plot and save training history."""
    fig, axes = plt.subplots(2, 2, figsize=(12, 10))

    # Loss
    axes[0, 0].plot(history.history["loss"], label="Training")
    axes[0, 0].plot(history.history["val_loss"], label="Validation")
    axes[0, 0].set_title("Loss")
    axes[0, 0].set_xlabel("Epoch")
    axes[0, 0].set_ylabel("Loss")
    axes[0, 0].legend()
    axes[0, 0].grid(True)

    # Accuracy
    axes[0, 1].plot(history.history["accuracy"], label="Training")
    axes[0, 1].plot(history.history["val_accuracy"], label="Validation")
    axes[0, 1].set_title("Accuracy")
    axes[0, 1].set_xlabel("Epoch")
    axes[0, 1].set_ylabel("Accuracy")
    axes[0, 1].legend()
    axes[0, 1].grid(True)

    # Precision
    axes[1, 0].plot(history.history["precision"], label="Training")
    axes[1, 0].plot(history.history["val_precision"], label="Validation")
    axes[1, 0].set_title("Precision")
    axes[1, 0].set_xlabel("Epoch")
    axes[1, 0].set_ylabel("Precision")
    axes[1, 0].legend()
    axes[1, 0].grid(True)

    # Recall
    axes[1, 1].plot(history.history["recall"], label="Training")
    axes[1, 1].plot(history.history["val_recall"], label="Validation")
    axes[1, 1].set_title("Recall")
    axes[1, 1].set_xlabel("Epoch")
    axes[1, 1].set_ylabel("Recall")
    axes[1, 1].legend()
    axes[1, 1].grid(True)

    plt.tight_layout()
    plt.savefig(output_dir / "training_history.png", dpi=300)
    print(
        f"Training history plot saved to {output_dir / 'training_history.png'}"
    )


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


def export_tfjs_model(
    model, output_dir: Path, input_shape, X_val=None, y_val=None
):
    """Export model to TensorFlow.js format with proper configuration."""

    tfjs_path = output_dir / "tfjs_model"
    tfjs_path.mkdir(parents=True, exist_ok=True)

    print("\nConverting model to TensorFlow.js format...")

    # Create TFJS-compatible model from Keras
    _create_tfjs_from_keras(model, tfjs_path, input_shape)

    # Calculate optimal threshold if validation data provided
    optimal_threshold = 0.5  # Default
    if X_val is not None and y_val is not None:
        from sklearn.metrics import roc_curve

        print("Calculating optimal threshold from validation data...")
        y_pred = model.predict(X_val, verbose=0)
        fpr, tpr, thresholds = roc_curve(y_val, y_pred)
        # Find threshold that maximizes TPR - FPR
        optimal_idx = np.argmax(tpr - fpr)
        optimal_threshold = float(thresholds[optimal_idx])
        print(f"Optimal threshold: {optimal_threshold:.4f}")

    # Save model configuration for browser
    from datetime import datetime

    model_config = {
        "inputShape": list(input_shape[1:]),
        "outputShape": list(model.output_shape[1:]),
        "optimalThreshold": optimal_threshold,
        "version": "2.0.0",
        "created": datetime.utcnow().strftime("%Y-%m-%d"),
    }

    with open(tfjs_path / "config.json", "w") as f:
        json.dump(model_config, f, indent=2)

    # Patch tfjs manifest so batch_input_shape is present for tfjs loader
    _fix_tfjs_input_layer(tfjs_path / "model.json", input_shape)

    # Copy into app static folder for immediate use
    _copy_to_static(tfjs_path)

    print(f"TensorFlow.js model saved to {tfjs_path}")


def _create_tfjs_from_keras(model, tfjs_path: Path, input_shape):
    """Create TFJS-compatible model by serializing weights properly."""
    tfjs_path.mkdir(parents=True, exist_ok=True)

    print("Creating TFJS-compatible model...")

    # Get model config
    model_config = model.get_config()

    # Ensure first layer has proper batch input shape
    if model_config["layers"]:
        first_layer = model_config["layers"][0]
        if "config" in first_layer:
            config = first_layer["config"]
            if "batch_input_shape" not in config:
                config["batch_input_shape"] = [None] + list(input_shape[1:])
                print(
                    f"Set batch_input_shape to {config['batch_input_shape']}"
                )

    # Collect weights with proper TFJS names
    weight_specs = []
    all_weights_bytes = b""

    # Iterate through layers and get weights in order
    for layer in model.layers:
        if not layer.weights:
            continue

        layer_name = layer.name

        for w in layer.weights:
            weight_array = w.numpy().astype(np.float32)
            weight_bytes = weight_array.tobytes()

            # Construct proper TFJS weight name
            # Format: "layer_name/weight_name"
            #   (NOT "model_name/layer_name/weight_name")
            # e.g., "dense/kernel" or "dense_1/bias"
            weight_type = w.name  # This is just "kernel" or "bias" in Keras 3
            weight_name = f"{layer_name}/{weight_type}"

            print(f"  Weight: {weight_name}, shape: {weight_array.shape}")

            weight_specs.append(
                {
                    "name": weight_name,
                    "shape": list(weight_array.shape),
                    "dtype": "float32",
                }
            )

            all_weights_bytes += weight_bytes

    # Simplify model config to TFJS-compatible Keras 2.x format
    def simplify_layer_config(layer):
        """Convert Keras 3.x layer config to TFJS-compatible Keras 2.x format"""
        config = layer["config"].copy()

        # Simplify dtype if it's an object
        if isinstance(config.get("dtype"), dict):
            config["dtype"] = "float32"

        # Remove Keras 3.x specific fields that TFJS doesn't understand
        for key in ["module", "registered_name", "build_config", "autocast"]:
            config.pop(key, None)

        # Simplify initializers - just keep class name and config
        for key in [
            "kernel_initializer",
            "bias_initializer",
            "kernel_regularizer",
            "bias_regularizer",
            "kernel_constraint",
            "bias_constraint",
        ]:
            if key in config and isinstance(config[key], dict):
                if config[key] is None:
                    continue
                # Remove module and registered_name from nested configs
                init_config = config[key]
                simplified = {
                    "class_name": init_config["class_name"],
                    "config": init_config.get("config", {}),
                }
                config[key] = simplified

        return {"class_name": layer["class_name"], "config": config}

    # Simplify the model topology for TFJS compatibility
    simplified_layers = [
        simplify_layer_config(layer) for layer in model_config["layers"]
    ]

    # Create model.json with TFJS-compatible Keras 2.x format
    model_json = {
        "modelTopology": {
            "class_name": model.__class__.__name__,
            "config": {
                "name": model_config.get("name", "sequential"),
                "layers": simplified_layers,
            },
            # Claim Keras 2.x for TFJS compatibility
            "keras_version": "2.11.0",
            "backend": "tensorflow",
        },
        "weightsManifest": [
            {
                "paths": ["group1-shard1of1.bin"],
                "weights": weight_specs,
            }
        ],
    }

    # Save model.json
    with open(tfjs_path / "model.json", "w") as f:
        json.dump(model_json, f)

    # Save weights binary
    with open(tfjs_path / "group1-shard1of1.bin", "wb") as f:
        f.write(all_weights_bytes)

    print(
        f"Created TFJS model with {len(weight_specs)} weight tensors (Keras 2.x compatible)"
    )


def train_model(
    data_dir: str, output_dir: str, epochs: int = 100, batch_size: int = 256
):
    """
    Train the onset detection model.

    Args:
        data_dir: Directory containing preprocessed data
        output_dir: Directory to save trained model
        epochs: Number of training epochs
        batch_size: Batch size for training
    """
    data_path = Path(data_dir)
    output_path = Path(output_dir)
    output_path.mkdir(parents=True, exist_ok=True)

    # Load preprocessed data
    print("Loading preprocessed data...")
    X = np.load(data_path / "X.npy")
    y = np.load(data_path / "y.npy")

    with open(data_path / "metadata.json", "r") as f:
        metadata = json.load(f)

    print(f"Loaded {len(X)} samples with {X.shape[1]} features")
    print(f"Onset ratio: {metadata['onset_ratio']:.4f}")

    # Split data
    X_train, X_val, y_train, y_val = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    )

    print(f"Training samples: {len(X_train)}")
    print(f"Validation samples: {len(X_val)}")

    # Compute class weights to handle imbalance
    class_weights = compute_class_weight(
        "balanced", classes=np.unique(y_train), y=y_train
    )
    class_weight_dict = {0: class_weights[0], 1: class_weights[1]}
    print(f"Class weights: {class_weight_dict}")

    # Create model
    print("\nCreating model...")
    model = create_model(input_shape=(X.shape[1],))
    model.summary()

    # Callbacks
    model_callbacks = [
        callbacks.EarlyStopping(
            monitor="val_loss",
            patience=15,
            restore_best_weights=True,
            verbose=1,
        ),
        callbacks.ReduceLROnPlateau(
            monitor="val_loss", factor=0.5, patience=5, min_lr=1e-6, verbose=1
        ),
        callbacks.ModelCheckpoint(
            str(output_path / "best_model.keras"),
            monitor="val_loss",
            save_best_only=True,
            verbose=1,
        ),
    ]

    # Train model
    print("\nTraining model...")
    history = model.fit(
        X_train,
        y_train,
        validation_data=(X_val, y_val),
        epochs=epochs,
        batch_size=batch_size,
        class_weight=class_weight_dict,
        callbacks=model_callbacks,
        verbose=1,
    )

    # Save final model
    model.save(output_path / "final_model.keras")
    print(f"\nModel saved to {output_path}")

    # Plot training history
    plot_training_history(history, output_path)

    # Export to TensorFlow.js format with optimal threshold calculation
    export_tfjs_model(model, output_path, X.shape, X_val, y_val)

    # Save training metadata
    training_metadata = {
        "epochs": len(history.history["loss"]),
        "batch_size": batch_size,
        "final_val_loss": float(history.history["val_loss"][-1]),
        "final_val_accuracy": float(history.history["val_accuracy"][-1]),
        "final_val_precision": float(history.history["val_precision"][-1]),
        "final_val_recall": float(history.history["val_recall"][-1]),
        "final_val_auc": float(history.history["val_auc"][-1]),
        "class_weights": class_weight_dict,
    }

    with open(output_path / "training_metadata.json", "w") as f:
        json.dump(training_metadata, f, indent=2)

    print("\nTraining complete!")
    print("Final validation metrics:")
    print(f"  Loss: {training_metadata['final_val_loss']:.4f}")
    print(f"  Accuracy: {training_metadata['final_val_accuracy']:.4f}")
    print(f"  Precision: {training_metadata['final_val_precision']:.4f}")
    print(f"  Recall: {training_metadata['final_val_recall']:.4f}")
    print(f"  AUC: {training_metadata['final_val_auc']:.4f}")


if __name__ == "__main__":
    # Get the directory where this script is located
    script_dir = Path(__file__).parent.resolve()
    training_dir = script_dir.parent

    data_dir = str(training_dir / "data" / "processed")
    output_dir = str(training_dir / "models" / "saved")

    train_model(
        data_dir=data_dir, output_dir=output_dir, epochs=100, batch_size=256
    )
