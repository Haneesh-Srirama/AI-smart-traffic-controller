"""
DQN Agent for Adaptive Traffic Signal Control (ATSC)

State Space (8 features):
    [queue_N, queue_S, queue_E, queue_W,  <- vehicle counts per arm (normalized 0-1)
     wait_N, wait_S, wait_E, wait_W]      <- avg cumulative wait time per arm (normalized 0-1)

Action Space (2 discrete actions):
    0 -> NS green (North/South gets green)
    1 -> EW green (East/West gets green)

Reward:
    R = -( queue_N + queue_S + queue_E + queue_W )   <- minimize total queuing vehicles
"""

import random
import collections
import torch
import torch.nn as nn
import torch.optim as optim
import numpy as np

# ── Hyper-parameters ─────────────────────────────────────────────────────────
STATE_DIM       = 8
ACTION_DIM      = 2
HIDDEN_DIM      = 64
BATCH_SIZE      = 32
GAMMA           = 0.95          # discount factor
LR              = 1e-3          # learning-rate for Adam
REPLAY_CAPACITY = 5_000
MIN_REPLAY      = 200           # don't train until this many samples exist
TRAIN_EVERY     = 50            # train every N simulation steps
TARGET_UPDATE   = 500           # hard-copy online -> target net every N steps
EPS_START       = 1.0
EPS_END         = 0.05
EPS_DECAY       = 0.9995        # multiplicative per step

# ── Neural Network ────────────────────────────────────────────────────────────
class QNetwork(nn.Module):
    def __init__(self):
        super().__init__()
        self.net = nn.Sequential(
            nn.Linear(STATE_DIM, HIDDEN_DIM),
            nn.ReLU(),
            nn.Linear(HIDDEN_DIM, HIDDEN_DIM),
            nn.ReLU(),
            nn.Linear(HIDDEN_DIM, ACTION_DIM),
        )

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        return self.net(x)


# ── Replay Buffer ─────────────────────────────────────────────────────────────
Transition = collections.namedtuple(
    "Transition", ("state", "action", "reward", "next_state", "done")
)

class ReplayBuffer:
    def __init__(self, capacity: int = REPLAY_CAPACITY):
        self.buffer: collections.deque = collections.deque(maxlen=capacity)

    def push(self, *args):
        self.buffer.append(Transition(*args))

    def sample(self, batch_size: int) -> list[Transition]:
        return random.sample(self.buffer, batch_size)

    def __len__(self) -> int:
        return len(self.buffer)


# ── DQN Agent ─────────────────────────────────────────────────────────────────
class DQNAgent:
    def __init__(self):
        self.device = torch.device("cpu")  # CPU is fine for this scale

        self.online_net = QNetwork().to(self.device)
        self.target_net = QNetwork().to(self.device)
        self.target_net.load_state_dict(self.online_net.state_dict())
        self.target_net.eval()

        self.optimizer = optim.Adam(self.online_net.parameters(), lr=LR)
        self.loss_fn   = nn.MSELoss()
        self.buffer    = ReplayBuffer()

        self.epsilon    = EPS_START
        self.step_count = 0

        # Public metrics for broadcasting
        self.last_loss   : float = 0.0
        self.last_reward : float = 0.0

    # ── State helper ─────────────────────────────────────────────────────────
    @staticmethod
    def build_state(queues: dict, wait_times: dict) -> np.ndarray:
        """Normalize and flatten queue + wait info into an 8-d state vector."""
        max_queue = 20.0   # assume max ~20 vehicles per arm
        max_wait  = 120.0  # assume max ~120 s wait

        state = np.array([
            queues.get("north", 0)  / max_queue,
            queues.get("south", 0)  / max_queue,
            queues.get("east",  0)  / max_queue,
            queues.get("west",  0)  / max_queue,
            wait_times.get("north", 0) / max_wait,
            wait_times.get("south", 0) / max_wait,
            wait_times.get("east",  0) / max_wait,
            wait_times.get("west",  0) / max_wait,
        ], dtype=np.float32)

        return np.clip(state, 0.0, 1.0)

    # ── Action selection (ε-greedy) ───────────────────────────────────────────
    def select_action(self, state: np.ndarray) -> int:
        if random.random() < self.epsilon:
            return random.randint(0, ACTION_DIM - 1)          # explore
        with torch.no_grad():
            s = torch.tensor(state, device=self.device).unsqueeze(0)
            return int(self.online_net(s).argmax(dim=1).item())  # exploit

    # ── Store experience ──────────────────────────────────────────────────────
    def store(
        self,
        state: np.ndarray,
        action: int,
        reward: float,
        next_state: np.ndarray,
        done: bool = False,
    ) -> None:
        self.last_reward = reward
        self.buffer.push(state, action, reward, next_state, done)

        # Decay epsilon
        self.epsilon = max(EPS_END, self.epsilon * EPS_DECAY)
        self.step_count += 1

    # ── Training step ─────────────────────────────────────────────────────────
    def train_step(self) -> None:
        """Sample a mini-batch and perform one gradient update."""
        if (
            len(self.buffer) < MIN_REPLAY
            or self.step_count % TRAIN_EVERY != 0
        ):
            return

        batch = self.buffer.sample(BATCH_SIZE)
        states      = torch.tensor(np.array([t.state      for t in batch]), device=self.device)
        actions     = torch.tensor([t.action      for t in batch], device=self.device).unsqueeze(1)
        rewards     = torch.tensor([t.reward      for t in batch], device=self.device, dtype=torch.float32)
        next_states = torch.tensor(np.array([t.next_state for t in batch]), device=self.device)
        dones       = torch.tensor([t.done        for t in batch], device=self.device, dtype=torch.float32)

        # Q(s, a)
        q_values = self.online_net(states).gather(1, actions).squeeze(1)

        # Target: r + γ · max_a' Q_target(s', a')
        with torch.no_grad():
            max_next_q = self.target_net(next_states).max(dim=1).values
            targets = rewards + GAMMA * max_next_q * (1 - dones)

        loss = self.loss_fn(q_values, targets)

        self.optimizer.zero_grad()
        loss.backward()
        torch.nn.utils.clip_grad_norm_(self.online_net.parameters(), 1.0)   # gradient clip
        self.optimizer.step()

        self.last_loss = round(loss.item(), 5)

        # Periodically sync target network
        if self.step_count % TARGET_UPDATE == 0:
            self.target_net.load_state_dict(self.online_net.state_dict())

    # ── Convenience properties ────────────────────────────────────────────────
    @property
    def epsilon_pct(self) -> float:
        """Return epsilon as a percentage string value 0-100."""
        return round(self.epsilon * 100, 1)
