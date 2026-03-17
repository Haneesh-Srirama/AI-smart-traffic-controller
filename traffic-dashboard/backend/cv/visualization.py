import cv2
import matplotlib.pyplot as plt
import numpy as np
import io

class FrameAnnotator:
    """
    Visualizes detections, tracks, and traffic status on video frames.
    """
    def draw(self, frame, detections, tracked_objects, counts, emergency=False):
        annotated = frame.copy()
        
        # 1. Draw Bounding Boxes
        for det in detections:
            x1, y1, x2, y2, conf, cls = det
            cv2.rectangle(annotated, (int(x1), int(y1)), (int(x2), int(y2)), (0, 255, 0), 2)
            cv2.putText(annotated, f"Conf: {conf:.2f}", (int(x1), int(y1) - 10),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 255, 0), 2)

        # 2. Draw Track IDs & Path
        for obj_id, centroid in tracked_objects.items():
            cv2.circle(annotated, (centroid[0], centroid[1]), 4, (255, 0, 0), -1)
            cv2.putText(annotated, f"ID: {obj_id}", (centroid[0] - 10, centroid[1] - 10),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255, 0, 0), 2)

        # 3. Draw Traffic Dashboard OSD
        overlay = annotated.copy()
        cv2.rectangle(overlay, (10, 10), (250, 150), (0, 0, 0), -1)
        cv2.addWeighted(overlay, 0.5, annotated, 0.5, 0, annotated)
        
        y_offset = 40
        for lane, count in counts.items():
            cv2.putText(annotated, f"{lane}: {count} veh", (20, y_offset),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255, 255, 255), 2)
            y_offset += 25

        # 4. Emergency Banner
        if emergency:
            cv2.rectangle(annotated, (0, 0), (annotated.shape[1], 50), (0, 0, 255), -1)
            cv2.putText(annotated, "PRIORITY: EMERGENCY VEHICLE DETECTED", (frame.shape[1] // 4, 35),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.8, (255, 255, 255), 3)

        return annotated

class DiagnosticVisualizer:
    """
    Generates time-series plots for traffic metrics.
    """
    def __init__(self):
        self.history = {"time": [], "N": [], "S": [], "E": [], "W": []}

    def update_history(self, counts, t):
        self.history["time"].append(t)
        self.history["N"].append(counts.get("North", 0))
        self.history["S"].append(counts.get("South", 0))
        self.history["E"].append(counts.get("East", 0))
        self.history["W"].append(counts.get("West", 0))

    def generate_chart(self, save_path="backend/output/diagnostic_plot.png"):
        plt.figure(figsize=(10, 6))
        plt.plot(self.history["time"], self.history["N"], label="North")
        plt.plot(self.history["time"], self.history["S"], label="South")
        plt.plot(self.history["time"], self.history["E"], label="East")
        plt.plot(self.history["time"], self.history["W"], label="West")
        plt.title("Vehicle Density Over Time")
        plt.xlabel("Time (frames/steps)")
        plt.ylabel("Vehicle Count")
        plt.legend()
        plt.style.use('dark_background')
        plt.savefig(save_path)
        plt.close()

visualizer = DiagnosticVisualizer()
annotator = FrameAnnotator()
