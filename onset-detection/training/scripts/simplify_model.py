#!/usr/bin/env python3
"""Simplify Keras 3.x model format to TFJS-compatible Keras 2.x format"""

import json
from pathlib import Path

model_path = (
    Path(__file__).parent.parent.parent.parent
    / "static/models/onset-model-v1/model.json"
)

# Load the current model
with open(model_path) as f:
    model = json.load(f)


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


# Simplify the model topology
simplified_layers = [
    simplify_layer_config(layer)
    for layer in model["modelTopology"]["config"]["layers"]
]

simplified_topology = {
    "class_name": "Sequential",
    "config": {"name": "sequential", "layers": simplified_layers},
    "keras_version": "2.11.0",  # Claim to be Keras 2.x for TFJS compatibility
    "backend": "tensorflow",
}

model["modelTopology"] = simplified_topology

# Save simplified model
with open(model_path, "w") as f:
    json.dump(model, f, indent=2)

print(f"Simplified model saved to {model_path}")
print(
    "Layers:",
    [
        f"{layer['class_name']}:{layer['config']['name']}"
        for layer in simplified_layers
    ],
)
print("Weights:", [w["name"] for w in model["weightsManifest"][0]["weights"]])
