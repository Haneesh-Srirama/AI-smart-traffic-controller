import os
from ultralytics import YOLO
import cv2
import numpy as np

class TrafficDetector:
    """
    YOLOv8-based vehicle detector.
    Filters for specific traffic classes: car, truck, bus, motorcycle.
    """
    def __init__(self, model_name: str = "yolov8n.pt"):
        # This will download the weights on first run
        self.model = YOLO(model_name)
        # COCO classes for vehicles: 2: car, 3: motorcycle, 5: bus, 7: truck
        self.target_classes = [2, 3, 5, 7]

    def detect(self, frame):
        """
        Runs inference on a single frame.
        Returns: list of detections [x1, y1, x2, y2, confidence, class_id]
        """
        results = self.model(frame, verbose=False)[0]
        detections = []
        
        for box in results.boxes:
            cls = int(box.cls[0])
            if cls in self.target_classes:
                x1, y1, x2, y2 = box.xyxy[0].tolist()
                conf = float(box.conf[0])
                detections.append([x1, y1, x2, y2, conf, cls])
                
        return detections

# Singleton
detector = TrafficDetector()
