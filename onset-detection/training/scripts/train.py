"""
Train the onset detection neural network.
"""

import json
import numpy as np
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
    data_dir = "../data/processed"
    output_dir = "../models/saved"

    train_model(
        data_dir=data_dir, output_dir=output_dir, epochs=100, batch_size=256
    )
