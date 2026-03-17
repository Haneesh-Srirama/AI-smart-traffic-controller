import cv2
import yt_dlp
import os
import time
from .detector import detector
from .tracker import tracker
from .logic import TrafficAnalyzer, SignalController
from .visualization import annotator, visualizer
from .explainer import explainer

class Engine:
    """
    Main Pipeline Orchestrator for Real-World CV Traffic Management.
    """
    def __init__(self):
        self.analyzer = TrafficAnalyzer()
        self.controller = SignalController()
        self.is_running = False
        self.current_frame_id = 0
        self.output_dir = "backend/output"
        os.makedirs(self.output_dir, exist_ok=True)

    def process_youtube(self, url: str):
        """
        Streams a YouTube video and processes it via the AI pipeline.
        """
        ydl_opts = {
            'format': 'best[height<=720]',
            'quiet': True,
            'no_warnings': True
        }
        
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(url, download=False)
            video_url = info['url']

        cap = cv2.VideoCapture(video_url)
        self.is_running = True
        
        # Video writer setup
        fourcc = cv2.VideoWriter_fourcc(*'mp4v')
        out_path = os.path.join(self.output_dir, "annotated_traffic.mp4")
        fps = int(cap.get(cv2.CAP_PROP_FPS))
        w = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
        h = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
        video_out = cv2.VideoWriter(out_path, fourcc, fps, (w, h))

        try:
            while cap.isOpened() and self.is_running:
                ret, frame = cap.read()
                if not ret: break
                
                self.current_frame_id += 1
                
                # 1. Detection
                detections = detector.detect(frame)
                
                # 2. Tracking
                rects = [d[:4] for d in detections]
                tracked_objects = tracker.update(rects)
                
                # 3. Analytics
                counts = self.analyzer.analyze(tracked_objects, frame.shape)
                
                # 4. Logic & Control
                scores = self.controller.compute_scores(counts, {})
                emergency = counts.get("emergency_detected", False)
                phase = self.controller.select_phase(scores, emergency)
                
                # 5. Reasoning (every 100 frames)
                if self.current_frame_id % 100 == 0:
                    explanation = explainer.explain_decision({
                        "phase": phase,
                        "metrics": counts,
                        "wait_times": "Simulated",
                        "emergency": emergency
                    })
                    print(f"AI Reasoning: {explanation}")

                # 6. Visualization
                annotated_frame = annotator.draw(frame, detections, tracked_objects, counts, emergency)
                video_out.write(annotated_frame)
                
                # Update diagnostic plot history
                visualizer.update_history(counts, self.current_frame_id)

                if self.current_frame_id % 500 == 0:
                    visualizer.generate_chart(os.path.join(self.output_dir, f"plot_{self.current_frame_id}.png"))

            print(f"Processing Complete. File saved to: {out_path}")
        finally:
            self.is_running = False
            cap.release()
            video_out.release()

engine = Engine()
