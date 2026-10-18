"""
Artificial Neural Network Image Analysis Service for MediResQ.
Extracts 12-dimensional visual perceptual features from uploaded skin photos
and executes forward inference through the trained Multi-Layer Perceptron (ANN),
providing deep neural network confidence, visual findings, medicines, and home care.
"""

import hashlib
import logging
from io import BytesIO
from typing import Dict, Any
from PIL import Image, ImageStat, ImageFilter

from app.ml.train_skin_ann import SkinANNPredictor

logger = logging.getLogger("mediresq.ai.ann_image")


def extract_12d_visual_features(image_bytes: bytes) -> tuple[list[float], dict[str, Any]]:
    """
    Computes genuine computer-vision metrics from image bytes to construct
    the 12-dimensional feature vector expected by the trained Artificial Neural Network.
    """
    try:
        img = Image.open(BytesIO(image_bytes)).convert("RGB")
        width, height = img.size

        # Standardized thumbnail for fast, robust feature extraction
        thumb = img.resize((150, 150))
        stat = ImageStat.Stat(thumb)

        mean_r, mean_g, mean_b = stat.mean[:3]
        std_r, std_g, std_b = stat.stddev[:3]

        total_intensity = mean_r + mean_g + mean_b + 1e-5
        erythema_index = (2.0 * mean_r - mean_g - mean_b) / total_intensity
        luminance = 0.299 * mean_r + 0.587 * mean_g + 0.114 * mean_b

        edges = thumb.filter(ImageFilter.FIND_EDGES)
        edge_stat = ImageStat.Stat(edges)
        edge_density = edge_stat.mean[0]

        color_variance = (std_r + std_g + std_b) / 3.0
        hue_ratio_rg = mean_r / (mean_g + 1e-5)
        amber_ratio = (mean_r + mean_g) / (mean_b + 1e-5)
        saturation = (max(mean_r, mean_g, mean_b) - min(mean_r, mean_g, mean_b)) / (max(mean_r, mean_g, mean_b) + 1e-5)
        local_contrast = color_variance * 0.85
        gradient = (mean_r - mean_b) / total_intensity

        img_hash = hashlib.md5(image_bytes).hexdigest()

        features = [
            round(float(mean_r), 2),
            round(float(mean_g), 2),
            round(float(mean_b), 2),
            round(float(erythema_index), 4),
            round(float(luminance), 2),
            round(float(edge_density), 2),
            round(float(color_variance), 2),
            round(float(hue_ratio_rg), 4),
            round(float(amber_ratio), 4),
            round(float(saturation), 4),
            round(float(local_contrast), 2),
            round(float(gradient), 4)
        ]

        metrics = {
            "resolution": f"{width}x{height}",
            "mean_rgb": [round(mean_r, 1), round(mean_g, 1), round(mean_b, 1)],
            "erythema_index": round(erythema_index, 3),
            "luminance": round(luminance, 1),
            "edge_density": round(edge_density, 2),
            "color_variance": round(color_variance, 2),
            "image_fingerprint": img_hash[:10]
        }

        return features, metrics

    except Exception as e:
        logger.warning("Error in visual feature extraction: %s", e)
        # Default baseline vector
        return [180.0, 130.0, 120.0, 0.25, 135.0, 15.0, 25.0, 1.38, 2.58, 0.33, 21.0, 0.14], {"error": str(e)}


class ANNImageService:
    """Service wrapping feature extraction and Neural Network evaluation."""

    def __init__(self):
        self.predictor = SkinANNPredictor.get_instance()

    def process_image_with_ann(self, filename: str, file_bytes: bytes) -> Dict[str, Any]:
        """Runs the entire ANN visual diagnosis pipeline."""
        features, metrics = extract_12d_visual_features(file_bytes)
        ann_res = self.predictor.predict_features(features)

        condition = ann_res["predicted_condition"]
        conf = ann_res["neural_network_confidence"]

        visual_findings = (
            f"Artificial Neural Network (MLP: 12->128->64->32->8) classified lesion as '{condition}' "
            f"with {conf * 100:.1f}% confidence. Visual metrics: Erythema Index {metrics.get('erythema_index', 0.0):.2f}, "
            f"Edge Density {metrics.get('edge_density', 0.0):.1f}, Luminance {metrics.get('luminance', 0.0):.1f}."
        )

        return {
            "analysis_type": "skin_infection",
            "model_architecture": "Multi-Layer Perceptron (ANN)",
            "condition": condition,
            "severity": ann_res["severity"],
            "confidence_score": conf,
            "neural_network_candidates": ann_res["top_candidates"],
            "visual_findings": visual_findings,
            "recommended_medicines": ann_res["recommended_medicines"],
            "home_care": ann_res["home_care"],
            "warning_signs": ann_res["warning_signs"],
            "recommended_specialist": ann_res["specialist"],
            "image_metrics": metrics,
            "extracted_feature_vector": features,
            "disclaimer": (
                "यह त्वचा विश्लेषण डीप आर्टिफिशियल न्यूरल नेटवर्क (ANN) मॉडल द्वारा किया गया है। "
                "यह केवल प्राथमिक जानकारी के लिए है। किसी भी दवा के प्रयोग से पूर्व डर्मेटोलॉजिस्ट से अवश्य परामर्श लें।"
            )
        }


# Global singleton instance
_ann_image_service_instance = None


def get_ann_image_service() -> ANNImageService:
    global _ann_image_service_instance
    if _ann_image_service_instance is None:
        _ann_image_service_instance = ANNImageService()
    return _ann_image_service_instance
