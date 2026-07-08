import os
import sys
import cv2
import numpy as np

# Adjust system path to import from backend
sys.path.append(os.path.join(os.path.dirname(__file__), "..", "backend"))

from app.services.ml_service import get_prediction

def test_inference_pipeline():
    """
    Validates local ML prediction and Grad-CAM generation.
    - Creates a mock fundus image on disk if not present.
    - Runs prediction pipeline.
    - Asserts that outputs contain expected schema fields.
    """
    test_image_path = "test_retina.jpg"
    test_heatmap_path = "test_heatmap.jpg"
    
    # 1. Create a dummy retinal fundus scan (solid dark circle with a bright optic disk)
    print("Generating simulated retinal fundus image for validation...")
    canvas = np.zeros((400, 400, 3), dtype=np.uint8)
    
    # Retinal background (dark red/orange)
    cv2.circle(canvas, (200, 200), 180, (15, 35, 120), -1)
    
    # Optic disc (bright yellow/orange circle on the right side of retina)
    cv2.circle(canvas, (250, 200), 40, (120, 220, 255), -1)
    
    # Save the dummy retina image
    cv2.imwrite(test_image_path, canvas)
    print(f"Saved dummy retina scan to {test_image_path}")

    # 2. Run prediction pipeline
    print("Executing ML prediction & Grad-CAM visual simulation...")
    result = get_prediction(test_image_path, test_heatmap_path)
    
    print("\nInference Results:")
    print(f"- Is Glaucoma: {result['is_glaucoma']}")
    print(f"- Probability: {result['probability']}%")
    print(f"- Confidence: {result['confidence_score']}%")
    print(f"- Risk Level: {result['risk_level']}")
    print(f"- Heatmap Path: {result['heatmap_path']}")
    
    # 3. Assertions
    assert "is_glaucoma" in result, "Schema missing 'is_glaucoma'"
    assert "probability" in result, "Schema missing 'probability'"
    assert "risk_level" in result, "Schema missing 'risk_level'"
    assert os.path.exists(test_heatmap_path), "Grad-CAM Heatmap file was not generated"
    
    print("\nSuccess: ML prediction pipeline validation complete.")
    
    # Cleanup files
    try:
        os.remove(test_image_path)
        os.remove(test_heatmap_path)
        print("Cleaned up validation outputs.")
    except Exception:
        pass

if __name__ == "__main__":
    test_inference_pipeline()
