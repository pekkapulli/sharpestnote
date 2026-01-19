"""
Preprocess onset detection training data from JSON files.

DATA FORMAT REQUIREMENTS:
- Fixed hop size: ~10ms (100 Hz frame rate)
- Causal windowing: 5 frames of history (50ms context)
- Onset tolerance: ±10ms (±1 frame at 10ms hop)
- Per-frame binary classification
- No future lookahead

Each input sample consists of:
- 5 consecutive frames: [t-4, t-3, t-2, t-1, t]
- Each frame has 5 features: amplitude, spectralFlux, phaseDeviation,
  highFrequencyEnergy, hasPitch
- Total input size: 5 frames × 5 features = 25 features
- Label: 1 if frame t is within ±1 frame of an onset, 0 otherwise
"""

import json
from pathlib import Path
import numpy as np
from sklearn.preprocessing import StandardScaler
import pickle


def load_json_file(filepath: str) -> list:
    """Load a single JSON training file."""
    with open(filepath, "r") as f:
        return json.load(f)


def extract_features(data: list, window_size: int = 5) -> tuple:
    """
    Extract features and labels using causal windowing.

    Creates sliding windows of consecutive frames, where each window contains
    the HISTORY leading up to and including the current frame.

    Args:
        data: List of frame dictionaries with format:
            {
                'timestamp': float,
                'amplitude': float,
                'spectralFlux': float,
                'phaseDeviation': float,
                'highFrequencyEnergy': float,
                'hasPitch': bool,
                'hasManualOnset': bool  # Expanded to ±1 frame
            }
        window_size: Number of frames in causal window (default 5)
                    Frame at index t uses frames [t-4, t-3, t-2, t-1, t]

    Returns:
        features: numpy array of shape (n_samples, window_size * 5)
        labels: numpy array of shape (n_samples,)
    """
    if not isinstance(data, list):
        raise ValueError("Data must be a list of frame dictionaries")

    # FILTER OUT SILENT/EMPTY SECTIONS
    # Remove frames where all features are zero or near-zero
    # This prevents the model from learning on empty space
    MIN_AMPLITUDE = 0.001
    MIN_ACTIVITY = 0.01  # Minimum flux or phase deviation

    filtered_data = []
    for frame in data:
        # Keep frame if it has any significant activity
        has_activity = (
            frame["amplitude"] > MIN_AMPLITUDE
            or frame["spectralFlux"] > MIN_ACTIVITY
            or frame["phaseDeviation"] > MIN_ACTIVITY
            or frame.get("hasManualOnset", False)  # Always keep onset frames
        )
        if has_activity:
            filtered_data.append(frame)

    if len(filtered_data) < window_size:
        print(
            f"  Warning: Only {len(filtered_data)} active frames "
            f"after filtering"
        )
        return np.array([]), np.array([])

    print(
        f"  Filtered {len(data)} -> {len(filtered_data)} frames "
        f"({len(filtered_data)/max(1, len(data))*100:.1f}%)"
    )

    features = []
    labels = []

    # Start from frame (window_size - 1) to have full history
    # For window_size=5, start from frame 4 (index 4)
    for t in range(window_size - 1, len(filtered_data)):
        # Build causal window: [t-4, t-3, t-2, t-1, t]
        window_features = []

        for offset in range(window_size - 1, -1, -1):
            frame_idx = t - offset
            frame = filtered_data[frame_idx]

            # Extract 5 features per frame
            window_features.extend(
                [
                    frame["amplitude"],
                    frame["spectralFlux"],
                    frame["phaseDeviation"],
                    frame["highFrequencyEnergy"],
                    1.0 if frame["hasPitch"] else 0.0,
                ]
            )

        features.append(window_features)

        # Label is from the CURRENT frame (t), not future
        current_frame = filtered_data[t]
        labels.append(1 if current_frame.get("hasManualOnset", False) else 0)

    return np.array(features), np.array(labels)


def preprocess_data(
    raw_dir: str,
    output_dir: str,
    window_size: int = 5,
    target_positive_ratio: float = 0.20,
):
    """
    Preprocess all JSON files in the raw data directory.

    Args:
        raw_dir: Directory containing raw JSON files
        output_dir: Directory to save processed data
        window_size: Temporal context window size (default 5 frames = 50ms)
        target_positive_ratio: Minimum positive ratio (default 0.20 = 20%)
                             If below this, negatives are downsampled
    """
    raw_path = Path(raw_dir)
    output_path = Path(output_dir)
    output_path.mkdir(parents=True, exist_ok=True)

    all_features = []
    all_labels = []

    json_files = list(raw_path.glob("*.json"))
    print(f"Found {len(json_files)} JSON files")

    for json_file in json_files:
        print(f"Processing {json_file.name}...")
        data = load_json_file(str(json_file))
        features, labels = extract_features(data, window_size)

        all_features.append(features)
        all_labels.append(labels)

        onset_pct = 100 * labels.mean()
        print(
            f"  - Extracted {len(features)} samples, "
            f"{labels.sum()} onsets ({onset_pct:.2f}%)"
        )

    # Concatenate all data
    X = np.vstack(all_features)
    y = np.concatenate(all_labels)

    print("\nBefore balancing:")
    print(f"  Total samples: {len(X)}")
    print(f"  Total onsets: {y.sum()} ({100*y.mean():.2f}%)")
    print(f"  Feature shape: {X.shape}")

    # Warn if we don't have enough data
    if len(X) < 1000:
        print(
            f"\n⚠️  WARNING: Only {len(X)} samples - need more training data!"
        )
        print("   Recommendation: Record more files with onset annotations")
    if y.sum() < 100:
        print(
            f"\n⚠️  WARNING: Only {int(y.sum())} onset samples - "
            f"need more onsets!"
        )
        print("   Recommendation: Add more onset markers when recording")

    # Balance data if positive ratio is too low
    positive_ratio = y.mean()
    if positive_ratio < target_positive_ratio:
        print(
            f"\nPositive ratio ({positive_ratio:.3f}) is below "
            f"target ({target_positive_ratio:.3f})"
        )
        print("Downsampling negatives...")

        # Get indices of positive and negative samples
        pos_indices = np.where(y == 1)[0]
        neg_indices = np.where(y == 0)[0]

        n_positives = len(pos_indices)
        # Calculate how many negatives we need to reach target ratio
        # target_ratio = n_pos / (n_pos + n_neg_kept)
        # n_neg_kept = n_pos * (1 - target_ratio) / target_ratio
        n_negatives_keep = int(
            n_positives * (1 - target_positive_ratio) / target_positive_ratio
        )

        # Randomly sample negatives
        np.random.seed(42)
        neg_indices_keep = np.random.choice(
            neg_indices, size=n_negatives_keep, replace=False
        )

        # Combine and shuffle
        keep_indices = np.concatenate([pos_indices, neg_indices_keep])
        np.random.shuffle(keep_indices)

        X = X[keep_indices]
        y = y[keep_indices]

        print(
            f"  Kept {len(pos_indices)} positives + "
            f"{n_negatives_keep} negatives"
        )
        print(f"  New ratio: {y.mean():.3f}")

    print("\nAfter balancing:")
    print(f"  Total samples: {len(X)}")
    print(f"  Total onsets: {y.sum()} ({100*y.mean():.2f}%)")
    print(f"  Feature shape: {X.shape}")

    # Normalize features
    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X)

    # Save preprocessed data
    np.save(output_path / "X.npy", X_scaled)
    np.save(output_path / "y.npy", y)

    # Save scaler for inference
    # (both pickle and JSON for browser compatibility)
    with open(output_path / "scaler.pkl", "wb") as f:
        pickle.dump(scaler, f)

    # Export scaler as JSON for browser/TypeScript use
    assert scaler.mean_ is not None
    assert scaler.scale_ is not None
    scaler_data = {
        "mean": scaler.mean_.tolist(),
        "std": scaler.scale_.tolist(),  # sklearn uses scale_ (1/std_dev)
        "n_features": len(scaler.mean_),
        "feature_names": [
            "amplitude",
            "spectralFlux",
            "phaseDeviation",
            "highFrequencyEnergy",
            "hasPitch",
        ]
        * 5,  # Repeated for each of 5 frames
    }
    with open(output_path / "scaler.json", "w") as f:
        json.dump(scaler_data, f, indent=2)

    # Save metadata
    metadata = {
        "n_samples": len(X),
        "n_features": X.shape[1],
        "n_onsets": int(y.sum()),
        "onset_ratio": float(y.mean()),
        "window_size": window_size,
        "features_per_frame": 5,
        "total_frames_per_window": window_size,
    }
    with open(output_path / "metadata.json", "w") as f:
        json.dump(metadata, f, indent=2)

    print(f"\nPreprocessed data saved to {output_path}")


if __name__ == "__main__":
    # Get the directory where this script is located
    script_dir = Path(__file__).parent.resolve()
    training_dir = script_dir.parent

    raw_dir = training_dir / "data" / "raw"
    output_dir = training_dir / "data" / "processed"

    # Configuration matching the requirements:
    # - Fixed hop: ~10ms (measured from data)
    # - 5-frame causal window (50ms of history)
    # - Onsets labeled across ±1 frame (±10ms)
    # - Binary classification per frame
    window_size = 5

    print("=" * 60)
    print("Onset Detection Training Data Preprocessing")
    print("=" * 60)
    print("\nConfiguration:")
    print(f"  Window size: {window_size} frames (causal)")
    print("  Features per frame: 5")
    print(f"  Total input features: {window_size * 5}")
    print("  Onset tolerance: ±1 frame (~±10ms)")
    print("  Target positive ratio: ≥20%")
    print("=" * 60)

    preprocess_data(str(raw_dir), str(output_dir), window_size)
