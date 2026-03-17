import asyncio
import json
import random
import os
from pathlib import Path
import traci
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from dqn_agent import DQNAgent
from database import save_simulation_snapshot, save_agent_metrics, get_recent_history, get_agent_history

app = FastAPI(title="AI Traffic Node Backend")

# Allow React frontend to connect
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class ConnectionManager:
    def __init__(self):
        self.active_connections: list[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)

    async def broadcast(self, message: str):
        for connection in self.active_connections:
            try:
                await connection.send_text(message)
            except Exception as e:
                print(f"Error broadcasting: {e}")

manager = ConnectionManager()

# ── Global Simulation State ───────────────────────────────────────────────────
simulation_state = {
    "phase": "NS",
    "metrics": {
        "avg_wait_time": 0,
        "throughput": 0,
        "congestion_index": 0,
    },
    "queues": {
        "north": {"count": 0, "avg_speed": 0},
        "south": {"count": 0, "avg_speed": 0},
        "east":  {"count": 0, "avg_speed": 0},
        "west":  {"count": 0, "avg_speed": 0},
    },
    "vehicles": [],   # [{id, x, y, angle, speed}]
    "agent": {        # live DQN training metrics
        "epsilon":  100.0,   # percentage 0-100
        "reward":   0.0,
        "loss":     0.0,
        "action":   0,
        "trained":  False,   # becomes True once first gradient step fires
    },
}

veh_id_counter = 0


async def traffic_simulation_loop():
    """Background task: advances SUMO, queries DQN, broadcasts state."""
    global veh_id_counter

    # ── Initialise SUMO ───────────────────────────────────────────────────────
    sumo_cmd = [
        "sumo",
        "-c", "sumo_config/intersection.sumocfg",
        "--no-step-log", "true",
        "--no-warnings",
    ]
    traci.start(sumo_cmd)

    # ── Initialise DQN Agent ──────────────────────────────────────────────────
    agent = DQNAgent()
    prev_state  = None
    prev_action = 0
    current_phase = "NS"

    steps = 0
    # Keep the phase locked for a minimum number of steps before allowing change
    # This prevents oscillation and gives vehicles time to clear the intersection
    MIN_PHASE_DURATION = 80  # steps  (~8 s at 100ms tick)
    steps_since_phase_change = 0

    while True:
        steps += 1
        steps_since_phase_change += 1
        traci.simulationStep()

        # ── 1. Randomly spawn vehicles ────────────────────────────────────────
        if random.random() < 0.25:
            # Pick from all routes (Straight + Turns)
            routes = [
                "NS", "SN", "EW", "WE",  # Straight
                "NE", "NW", "SE", "SW",  # N/S Turns
                "EN", "ES", "WN", "WS"   # E/W Turns
            ]
            route = random.choice(routes)
            
            # Weighted choice for type: 80% car, 10% truck, 10% bus
            v_type = random.choices(["car", "truck", "bus"], weights=[80, 10, 10])[0]
            
            veh_id = f"veh_{veh_id_counter}"
            try:
                traci.vehicle.add(vehID=veh_id, routeID=route, typeID=v_type)
                veh_id_counter += 1
            except traci.exceptions.TraCIException:
                pass

        # ── 2. Collect live SUMO data ─────────────────────────────────────────
        active_vehicles = traci.vehicle.getIDList()
        frontend_vehicles = []

        raw_queues  = {"north": 0, "south": 0, "east": 0, "west": 0}
        wait_times  = {"north": 0.0, "south": 0.0, "east": 0.0, "west": 0.0}
        total_speed = 0.0

        edge_to_arm = {
            "N2C": "north", "S2C": "south",
            "E2C": "east",  "W2C": "west",
        }

        for v in active_vehicles:
            x, y      = traci.vehicle.getPosition(v)
            angle     = traci.vehicle.getAngle(v)
            speed     = traci.vehicle.getSpeed(v)
            edge      = traci.vehicle.getRoadID(v)
            wait      = traci.vehicle.getWaitingTime(v)

            type_id   = traci.vehicle.getTypeID(v)
            
            total_speed += speed

            arm = edge_to_arm.get(edge)
            if arm:
                raw_queues[arm] += 1
                wait_times[arm] = max(wait_times[arm], wait)

            frontend_vehicles.append({
                "id":    v,
                "x":     x,
                "y":     y,
                "angle": angle,
                "speed": round(speed, 2),
                "type":  type_id,
            })

        total_cars = len(active_vehicles)
        avg_speed  = (total_speed / total_cars) if total_cars > 0 else 0.0

        # ── 3. Build DQN state & select action (every MIN_PHASE_DURATION steps) ─
        current_state = agent.build_state(raw_queues, wait_times)

        # Train on previous transition whenever we have one
        if prev_state is not None:
            reward = -(raw_queues["north"] + raw_queues["south"]
                       + raw_queues["east"]  + raw_queues["west"])
            agent.store(prev_state, prev_action, reward, current_state)
            agent.train_step()

        # Only allow the agent to switch phase after minimum duration
        if steps_since_phase_change >= MIN_PHASE_DURATION:
            action = agent.select_action(current_state)
            new_phase = "NS" if action == 0 else "EW"

            if new_phase != current_phase:
                current_phase = new_phase
                steps_since_phase_change = 0
                try:
                    tl_phase = 0 if current_phase == "NS" else 2
                    traci.trafficlight.setPhase("center", tl_phase)
                except traci.exceptions.TraCIException:
                    pass

            prev_state  = current_state
            prev_action = action

        # ── 4. Update global simulation_state ────────────────────────────────
        simulation_state["phase"]    = current_phase
        simulation_state["vehicles"] = frontend_vehicles

        simulation_state["queues"] = {
            "north": {"count": raw_queues["north"],  "avg_speed": round(avg_speed, 1)},
            "south": {"count": raw_queues["south"],  "avg_speed": round(avg_speed, 1)},
            "east":  {"count": raw_queues["east"],   "avg_speed": round(avg_speed, 1)},
            "west":  {"count": raw_queues["west"],   "avg_speed": round(avg_speed, 1)},
        }

        simulation_state["metrics"] = {
            "congestion_index": min(100, int((total_cars / 20) * 100)),
            "avg_wait_time":    round(sum(wait_times.values()) / 4, 1),
            "throughput":       1200 + (total_cars * 10),
        }

        simulation_state["agent"] = {
            "epsilon": agent.epsilon_pct,
            "reward":  round(agent.last_reward, 2),
            "loss":    agent.last_loss,
            "action":  prev_action,
            "trained": len(agent.buffer) >= 200,
        }

        # ── 5. Broadcast to all clients at ~10 Hz ─────────────────────────────
        await manager.broadcast(json.dumps(simulation_state))
        
        # ── 6. Persist to MongoDB every 100 steps (~10s) ───────────────────
        if steps % 100 == 0:
            asyncio.create_task(save_simulation_snapshot(simulation_state))
            asyncio.create_task(save_agent_metrics(simulation_state["agent"]))

        await asyncio.sleep(0.1)


@app.on_event("startup")
async def startup_event():
    asyncio.create_task(traffic_simulation_loop())


@app.websocket("/ws/traffic")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        await websocket.send_text(json.dumps(simulation_state))
        while True:
            data = await websocket.receive_text()
            print(f"Received from client: {data}")
    except WebSocketDisconnect:
        manager.disconnect(websocket)


@app.get("/api/history")
async def get_simulation_history(limit: int = 50):
    """Returns recent simulation snapshots from MongoDB."""
    return await get_recent_history(limit)

@app.get("/api/agent-history")
async def get_dqn_history(limit: int = 50):
    """Returns recent agent training metrics from MongoDB."""
    return await get_agent_history(limit)


# ── Serve built React frontend ────────────────────────────────────────────────
DIST_DIR = Path(__file__).parent.parent / "dist"

if DIST_DIR.exists():
    # Serve static assets (JS, CSS, images)
    app.mount("/assets", StaticFiles(directory=str(DIST_DIR / "assets")), name="assets")

    @app.get("/")
    async def serve_index():
        return FileResponse(str(DIST_DIR / "index.html"))

    @app.get("/{full_path:path}")
    async def serve_spa(full_path: str):
        """Catch-all: return index.html for any unknown path (React Router)."""
        file_path = DIST_DIR / full_path
        if file_path.exists() and file_path.is_file():
            return FileResponse(str(file_path))
        return FileResponse(str(DIST_DIR / "index.html"))
else:
    print("\n⚠️  No 'dist/' folder found. Run 'npm run build' in traffic-dashboard/ first.\n")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=False)
