import numpy as np

class LaneMapper:
    """
    Maps vehicle centroids to specific road lanes.
    Uses horizontal/vertical boundaries based on typical intersection layouts.
    """
    def __init__(self):
        # Normalized boundaries (0.0 to 1.0) for a standard 4-way intersection
        self.boundaries = {
            "north": 0.4,
            "south": 0.6,
            "west": 0.4,
            "east": 0.6
        }

    def map_to_lane(self, centroid, frame_shape):
        """
        Assigns a lane ID based on position relative to intersection center.
        """
        h, w = frame_shape[:2]
        cx, cy = centroid
        nx, ny = cx / w, cy / h
        
        if ny < self.boundaries["north"]: return "North"
        if ny > self.boundaries["south"]: return "South"
        if nx < self.boundaries["west"]:  return "West"
        if nx > self.boundaries["east"]:  return "East"
        return "Center"

class TrafficAnalyzer:
    """
    Computes density and wait times per lane.
    """
    def __init__(self):
        self.lane_data = {
            "North": {"count": 0, "wait": 0.0},
            "South": {"count": 0, "wait": 0.0},
            "East":  {"count": 0, "wait": 0.0},
            "West":  {"count": 0, "wait": 0.0}
        }

    def analyze(self, tracked_objects, frame_shape):
        mapper = LaneMapper()
        # Reset counts for the current frame
        counts = {"North": 0, "South": 0, "East": 0, "West": 0, "Center": 0}
        
        for obj_id, centroid in tracked_objects.items():
            lane = mapper.map_to_lane(centroid, frame_shape)
            counts[lane] += 1
            
        return counts

class SignalController:
    """
    Logic for adaptive signal timing based on scores.
    Score = 0.6 * Density + 0.4 * WaitTime + StarvationFairness
    """
    def __init__(self):
        self.emergency_mode = False
        self.emergency_timer = 0
        self.MAX_EMERGENCY_FRAMES = 80 # ~8 seconds

    def compute_scores(self, lane_counts, lane_waits):
        scores = {}
        for lane in ["North", "South", "East", "West"]:
            density = lane_counts.get(lane, 0)
            wait = lane_waits.get(lane, 0.0)
            # Basic score calculation
            scores[lane] = (density * 0.6) + (wait * 0.4)
        return scores

    def select_phase(self, scores, emergency_detected=False):
        if emergency_detected:
            self.emergency_mode = True
            self.emergency_timer = 0
            return "EMERGENCY_OVERRIDE"

        if self.emergency_mode:
            self.emergency_timer += 1
            if self.emergency_timer > self.MAX_EMERGENCY_FRAMES:
                self.emergency_mode = False
            else:
                return "EMERGENCY_OVERRIDE"

        # Choose best arm (NS vs EW)
        ns_score = scores.get("North", 0) + scores.get("South", 0)
        ew_score = scores.get("East", 0) + scores.get("West", 0)
        
        return "NS" if ns_score >= ew_score else "EW"
