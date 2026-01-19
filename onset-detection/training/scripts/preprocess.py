"""
Preprocess onset detection training data from JSON files.
"""

import json
from pathlib import Path
import numpy as np
from sklearn.preprocessing import StandardScaler
import pickle


def load_json_file(filepath: str) -> dict:
    """Load a single JSON training file."""
    with open(filepath, "r") as f:
        return json.load(f)


def extract_features(data: dict, window_size: int = 5) -> tuple:
    """
    Extract features and labels from a single recording.

    Args:
        data: List of frame dictionaries or dict with 'manualOnsets' and
        'analysisData'
        window_size: Number of frames to include in temporal context

    Returns:
        features: numpy array of shape (n_samples, n_features)
        labels: numpy array of shape (n_samples,)
    """
    # Handle both formats: array of frames or dict with manualOnsets
    if isinstance(data, list):
        analysis_data = data
        manual_onsets = set()
    else:
        manual_onsets = set(data["manualOnsets"])
        analysis_data = data["analysisData"]

    features = []
    labels = []

    # Define onset window tolerance (e.g., ±50ms)
    onset_tolerance = 0.05

    for i, frame in enumerate(analysis_data):
        # Extract base features
        feature_vector = [
            frame["amplitude"],
            frame["spectralFlux"],
            frame["phaseDeviation"],
            frame["highFrequencyEnergy"],
            1.0 if frame["hasPitch"] else 0.0,
        ]

        # Add temporal context: features from previous frames
        for offset in range(1, window_size):
            if i >= offset:
                prev_frame = analysis_data[i - offset]
                feature_vector.extend(
                    [
                        prev_frame["amplitude"],
                        prev_frame["spectralFlux"],
                        prev_frame["phaseDeviation"],
                        prev_frame["highFrequencyEnergy"],
                        1.0 if prev_frame["hasPitch"] else 0.0,
                    ]
                )
            else:
                # Pad with zeros if not enough history
                feature_vector.extend([0.0, 0.0, 0.0, 0.0, 0.0])

        features.append(feature_vector)

        # Check if this frame is an onset
        if isinstance(data, list):
            # Use hasManualOnset field directly
            is_onset = frame.get("hasManualOnset", False)
        else:
            # Check if timestamp matches any manual onset
            timestamp = frame["timestamp"]
            is_onset = any(
                abs(timestamp - onset) <= onset_tolerance
                for onset in manual_onsets
            )
        labels.append(1 if is_onset else 0)

    return np.array(features), np.array(labels)


def preprocess_data(raw_dir: str, output_dir: str, window_size: int = 5):
    """
    Preprocess all JSON files in the raw data directory.

    Args:
        raw_dir: Directory containing raw JSON files
        output_dir: Directory to save processed data
        window_size: Temporal context window size
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

        print(f"  - Extracted {len(features)} samples, {labels.sum()} onsets")

    # Concatenate all data
    X = np.vstack(all_features)
    y = np.concatenate(all_labels)

    print(f"\nTotal samples: {len(X)}")
    print(f"Total onsets: {y.sum()} ({100*y.mean():.2f}%)")
    print(f"Feature shape: {X.shape}")

    # Normalize features
    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X)

    # Save preprocessed data
    np.save(output_path / "X.npy", X_scaled)
    np.save(output_path / "y.npy", y)

    # Save scaler for inference
    with open(output_path / "scaler.pkl", "wb") as f:
        pickle.dump(scaler, f)

    # Save metadata
    metadata = {
        "n_samples": len(X),
        "n_features": X.shape[1],
        "n_onsets": int(y.sum()),
        "onset_ratio": float(y.mean()),
        "window_size": window_size,
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
    window_size = 5  # Include 5 frames of temporal context

    preprocess_data(str(raw_dir), str(output_dir), window_size)
