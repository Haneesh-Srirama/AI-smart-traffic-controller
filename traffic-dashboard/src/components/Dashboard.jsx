import React, { useState, useEffect } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Camera, AlertTriangle, Clock, TrafficCone, Users, Cpu, Zap, Activity, Brain } from 'lucide-react';

const MetricCard = ({ title, value, unit, icon: Icon, trend, colorClass }) => (
  <div className="glass-panel p-6 rounded-2xl border border-white/5 relative overflow-hidden group">
    <div className={`absolute top-0 right-0 w-24 h-24 bg-gradient-to-br ${colorClass} opacity-10 rounded-bl-[100px] blur-xl group-hover:opacity-20 transition-opacity`} />
    <div className="flex justify-between items-start mb-4">
      <div className="p-3 bg-white/5 rounded-xl border border-white/10">
        <Icon className={`w-6 h-6 ${colorClass.split(' ')[0].replace('from-', 'text-')}`} />
      </div>
      <span className={`text-sm font-medium px-2 py-1 rounded-full ${trend > 0 ? 'bg-red-500/20 text-red-400' : 'bg-green-500/20 text-green-400'}`}>
        {trend > 0 ? '+' : ''}{trend}%
      </span>
    </div>
    <h3 className="text-gray-400 text-sm font-medium mb-1">{title}</h3>
    <div className="flex items-baseline gap-2">
      <span className="text-3xl font-bold text-white">{value}</span>
      <span className="text-gray-500 text-sm">{unit}</span>
    </div>
  </div>
);

const CameraFeed = ({ lane, count }) => {
  const [timestamp, setTimestamp] = useState(new Date().toLocaleTimeString());
  
  useEffect(() => {
    const timer = setInterval(() => {
      setTimestamp(new Date().toLocaleTimeString());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const camId = `CAM_${lane.toUpperCase()}_0${Math.floor(Math.random() * 9) + 1}`;
  const imgPath = `/assets/cctv/${lane.toLowerCase()}.png`;

  return (
    <div className="relative rounded-xl overflow-hidden glass-panel border border-white/10 aspect-video group bg-black shadow-2xl">
      {/* 1. Base Image with Pan Animation */}
      <div className="absolute inset-0 overflow-hidden">
        <img 
          src={imgPath} 
          alt={lane}
          className="w-full h-full object-cover opacity-80 mix-blend-screen grayscale-[0.3] contrast-[1.2] brightness-[1.1] cctv-pan"
        />
      </div>

      {/* 2. Visual Overlays (Noise, Scanlines, Vignette) */}
      <div className="cctv-overlay cctv-noise" />
      <div className="cctv-overlay cctv-scanline" />
      <div className="cctv-overlay cctv-vignette" />

      {/* 3. OSD Header */}
      <div className="absolute top-3 left-3 right-3 flex justify-between items-start z-10">
        <div className="px-2 py-0.5 bg-black/40 backdrop-blur-sm rounded border border-white/10 flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-red-600 cctv-rec-dot" />
          <span className="text-[10px] font-mono font-bold text-white/90 tracking-tighter">REC</span>
        </div>
        <div className="text-right">
          <div className="text-[10px] font-mono text-white/70 leading-none">{camId}</div>
          <div className="text-[10px] font-mono text-white/50 leading-none mt-1">{timestamp}</div>
        </div>
      </div>

      {/* 4. OSD Bottom Left - Location */}
      <div className="absolute bottom-3 left-3 z-10">
        <div className="flex items-center gap-2 text-white/40 mb-1">
          <Camera className="w-3 h-3" />
          <span className="text-[10px] font-mono uppercase tracking-widest">{lane} ARM INTERSECTION</span>
        </div>
      </div>
      
      {/* 5. Detection Metric OSD */}
      <div className="absolute bottom-3 right-3 px-3 py-1.5 bg-purple-500/10 backdrop-blur-md rounded border border-purple-500/30 z-10 text-right">
        <div className="text-[8px] text-purple-300/70 uppercase tracking-widest font-bold mb-0.5">CV_COUNT</div>
        <div className="text-xl font-mono font-bold text-white leading-none tabular-nums">
          {count.toString().padStart(2, '0')}
        </div>
      </div>

      {/* 6. Mock YOLO boxes (kept for flavor) */}
      {Array.from({ length: Math.min(count, 3) }).map((_, i) => (
        <div 
          key={i} 
          className="absolute border border-green-500/40 bg-green-500/5 transition-all duration-1000 z-1"
          style={{
            top: `${20 + (i * 15)}%`,
            left: `${25 + (i * 20)}%`,
            width: `${50 + (i * 10)}px`,
            height: `${35 + (i * 5)}px`,
          }}
        >
          <span className="absolute top-[-10px] left-0 text-[7px] bg-green-500/60 text-black px-1 font-mono uppercase font-bold">VEH_0{i}</span>
        </div>
      ))}
    </div>
  );
};

// ── AI Agent Stats Panel ──────────────────────────────────────────────────────
const AgentStatRow = ({ label, value, unit, icon: Icon, color, children }) => (
  <div className="flex items-center gap-4">
    <div className={`p-2 rounded-lg bg-white/5 border border-white/10 shrink-0`}>
      <Icon className={`w-4 h-4 ${color}`} />
    </div>
    <div className="flex-1 min-w-0">
      <div className="flex justify-between items-baseline mb-1">
        <span className="text-xs text-gray-400 uppercase tracking-wider">{label}</span>
        <span className={`text-sm font-mono font-bold ${color}`}>{value}{unit}</span>
      </div>
      {children}
    </div>
  </div>
);

const AgentPanel = ({ agent }) => {
  const epsilonPct = agent?.epsilon ?? 100;
  const reward     = agent?.reward  ?? 0;
  const loss       = agent?.loss    ?? 0;
  const trained    = agent?.trained ?? false;
  const actionLabel = agent?.action === 0 ? 'NS 🟢' : 'EW 🟢';

  return (
    <div className="glass-panel p-5 rounded-2xl border border-purple-500/20 bg-purple-950/10 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Brain className="w-5 h-5 text-purple-400" />
          <h3 className="text-sm font-semibold text-white">DQN Agent</h3>
        </div>
        <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-mono border ${trained ? 'bg-green-500/10 text-green-400 border-green-500/30' : 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30'}`}>
          <div className={`w-1.5 h-1.5 rounded-full ${trained ? 'bg-green-500 animate-pulse' : 'bg-yellow-500 animate-bounce'}`} />
          {trained ? 'Training' : 'Warming up'}
        </div>
      </div>

      {/* Epsilon — exploration rate */}
      <AgentStatRow
        label="Exploration (ε)"
        value={epsilonPct.toFixed(1)}
        unit="%"
        icon={Zap}
        color="text-yellow-400"
      >
        <div className="w-full bg-white/5 rounded-full h-1.5 overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width: `${epsilonPct}%`,
              background: `hsl(${(1 - epsilonPct / 100) * 120}, 80%, 55%)`,
            }}
          />
        </div>
      </AgentStatRow>

      {/* Reward */}
      <AgentStatRow
        label="Last Reward"
        value={reward}
        unit=""
        icon={Activity}
        color={reward >= 0 ? 'text-green-400' : 'text-red-400'}
      >
        <div className="w-full bg-white/5 rounded-full h-1.5 overflow-hidden">
          <div
            className="h-full bg-blue-500 rounded-full transition-all duration-300"
            style={{ width: `${Math.min(100, Math.abs(reward / 20) * 100)}%` }}
          />
        </div>
      </AgentStatRow>

      {/* Loss */}
      <AgentStatRow
        label="Training Loss"
        value={loss.toFixed(4)}
        unit=""
        icon={Cpu}
        color="text-cyan-400"
      >
        <div className="w-full bg-white/5 rounded-full h-1.5 overflow-hidden">
          <div
            className="h-full bg-cyan-500/60 rounded-full transition-all duration-300"
            style={{ width: `${Math.min(100, loss * 1000)}%` }}
          />
        </div>
      </AgentStatRow>

      {/* Current decision */}
      <div className="pt-2 border-t border-white/5 flex justify-between items-center">
        <span className="text-xs text-gray-500">Last Decision</span>
        <span className="text-xs font-mono font-bold text-white bg-white/5 px-3 py-1 rounded-full border border-white/10">
          {actionLabel}
        </span>
      </div>
    </div>
  );
};

// ── History Panel ─────────────────────────────────────────────────────────────
const HistoryPanel = () => {
  const [history, setHistory] = useState([]);
  const [agentHistory, setAgentHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const [hRes, aRes] = await Promise.all([
          fetch('/api/history?limit=20'),
          fetch('/api/agent-history?limit=20')
        ]);
        const hData = await hRes.json();
        const aData = await aRes.json();
        setHistory(hData);
        setAgentHistory(aData);
      } catch (e) {
        console.error("Failed to fetch history", e);
      } finally {
        setLoading(false);
      }
    };
    fetchHistory();
  }, []);

  if (loading) return (
    <div className="flex items-center justify-center p-20 glass-panel rounded-2xl border border-white/5">
      <div className="flex flex-col items-center gap-4">
        <div className="w-8 h-8 border-4 border-purple-500/30 border-t-purple-500 rounded-full animate-spin" />
        <span className="text-gray-400 font-mono text-sm">Fetching MongoDB Logs...</span>
      </div>
    </div>
  );

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Simulation Logs */}
      <div className="glass-panel p-6 rounded-2xl border border-white/5">
        <h3 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
          <Activity className="w-5 h-5 text-blue-400" />
          Simulation Snapshots
        </h3>
        <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
          {history.map((entry, i) => (
            <div key={i} className="p-4 rounded-xl bg-white/5 border border-white/10 flex justify-between items-center group hover:bg-white/10 transition-colors">
              <div>
                <div className="text-xs text-gray-500 font-mono mb-1">
                  {new Date(entry.timestamp).toLocaleString()}
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-bold text-white">{entry.vehicle_count} Vehicles</span>
                  <span className="text-xs text-gray-400">Phase: {entry.phase}</span>
                </div>
              </div>
              <div className="text-right">
                <div className="text-[10px] text-gray-500 uppercase">Wait Time</div>
                <div className="text-sm font-mono text-blue-400">{entry.metrics.avg_wait_time}s</div>
              </div>
            </div>
          ))}
          {history.length === 0 && <div className="text-center p-10 text-gray-500 italic">No historical data found.</div>}
        </div>
      </div>

      {/* Agent History */}
      <div className="glass-panel p-6 rounded-2xl border border-white/5">
        <h3 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
          <Brain className="w-5 h-5 text-purple-400" />
          DQN Training History
        </h3>
        <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
          {agentHistory.map((entry, i) => (
            <div key={i} className="p-4 rounded-xl bg-purple-500/5 border border-purple-500/10 flex justify-between items-center group hover:bg-purple-500/10 transition-colors">
              <div>
                <div className="text-xs text-gray-500 font-mono mb-1">
                  {new Date(entry.timestamp).toLocaleString()}
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-bold text-purple-300">Reward: {entry.reward}</span>
                  <span className="text-xs text-gray-400">Action: {entry.action === 0 ? 'NS' : 'EW'}</span>
                </div>
              </div>
              <div className="text-right">
                <div className="text-[10px] text-gray-500 uppercase">Exploration ε</div>
                <div className="text-sm font-mono text-yellow-400">{entry.epsilon?.toFixed(1)}%</div>
              </div>
            </div>
          ))}
          {agentHistory.length === 0 && <div className="text-center p-10 text-gray-500 italic">No agent history found.</div>}
        </div>
      </div>
    </div>
  );
};


// ── Main Dashboard Component ──────────────────────────────────────────────────
const Dashboard = () => {
  const [activeTab, setActiveTab] = useState('live');
  const [connectionStatus, setConnectionStatus] = useState('Connecting...');
  
  const [metrics, setMetrics] = useState({
    avgWaitTime: 0,
    throughput: 0,
    congestionIndex: 0
  });
  
  const [agentStats, setAgentStats] = useState({
    epsilon: 100,
    reward: 0,
    loss: 0,
    action: 0,
    trained: false,
  });

  const [currentCounts, setCurrentCounts] = useState({ north: 0, south: 0, east: 0, west: 0 });
  const [currentPhase, setCurrentPhase] = useState('NS');
  
  const [chartData, setChartData] = useState(
    Array.from({ length: 20 }, (_, i) => ({ time: i, north: 0, east: 0 }))
  );

  useEffect(() => {
    let ws;
    let reconnectTimer;

    const connect = () => {
      const wsUrl = `ws://${window.location.host}/ws/traffic`;
      ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        setConnectionStatus('Online (DQN Active)');
        clearTimeout(reconnectTimer);
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          
          setMetrics({
            avgWaitTime: data.metrics.avg_wait_time,
            throughput: data.metrics.throughput,
            congestionIndex: data.metrics.congestion_index
          });

          setCurrentCounts({
            north: data.queues.north.count,
            south: data.queues.south.count,
            east: data.queues.east.count,
            west: data.queues.west.count
          });

          setCurrentPhase(data.phase);

          if (data.agent) {
            setAgentStats(data.agent);
          }

          setChartData(prev => {
            const nsTotal = data.queues.north.count + data.queues.south.count;
            const ewTotal = data.queues.east.count  + data.queues.west.count;
            const timeLabel = new Date().toLocaleTimeString([], { hour12: false }).slice(0, 5);
            return [...prev.slice(1), { time: timeLabel, north: nsTotal, east: ewTotal }];
          });
        } catch (e) {
          console.error("Error parsing websocket data", e);
        }
      };

      ws.onerror = () => {
        setConnectionStatus('Connection Error');
      };

      ws.onclose = () => {
        setConnectionStatus('Disconnected');
        reconnectTimer = setTimeout(connect, 3000);
      };
    };

    connect();
    return () => {
      clearTimeout(reconnectTimer);
      if (ws) ws.close();
    };
  }, []);

  const isOnline = connectionStatus.includes('Online');

  return (
    <div className="space-y-6">
      {/* Tab Switcher */}
      <div className="flex items-center justify-between glass-panel p-2 rounded-2xl border border-white/5 inline-flex">
        <button
          onClick={() => setActiveTab('live')}
          className={`flex items-center gap-2 px-6 py-2 rounded-xl transition-all duration-300 ${activeTab === 'live' ? 'bg-purple-500 text-white shadow-lg shadow-purple-500/20' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
        >
          <Activity className="w-4 h-4" />
          <span className="text-sm font-semibold">Live Simulation</span>
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`flex items-center gap-2 px-6 py-2 rounded-xl transition-all duration-300 ${activeTab === 'history' ? 'bg-purple-500 text-white shadow-lg shadow-purple-500/20' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
        >
          <Clock className="w-4 h-4" />
          <span className="text-sm font-semibold">History Logs</span>
        </button>
      </div>

      {activeTab === 'live' ? (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Metrics Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard title="Avg Wait Time"     value={metrics.avgWaitTime}                        unit="s"       icon={Clock}        trend={-24} colorClass="from-blue-500 to-cyan-400" />
        <MetricCard title="Total Throughput"  value={metrics.throughput}                          unit="veh/hr"  icon={Users}        trend={-5}  colorClass="from-purple-500 to-pink-500" />
        <MetricCard title="Congestion Index"  value={(metrics.congestionIndex / 100).toFixed(2)}  unit="/ 1.0"   icon={TrafficCone}  trend={-12} colorClass="from-orange-500 to-red-500" />
        <MetricCard title="Server Status"     value={isOnline ? 'OK' : 'OFF'}                     unit={isOnline ? 'Connected' : 'Waiting'} icon={AlertTriangle} trend={0} colorClass="from-indigo-500 to-blue-500" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Chart */}
        <div className="lg:col-span-2 glass-panel p-6 rounded-2xl border border-white/5">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-semibold text-white">Intersection Density Trends</h3>
            <div className={`px-4 py-1.5 rounded-full text-xs font-mono font-medium border flex items-center gap-2 ${isOnline ? 'bg-green-500/10 text-green-400 border-green-500/30' : 'bg-red-500/10 text-red-400 border-red-500/30'}`}>
              <div className={`w-2 h-2 rounded-full ${isOnline ? 'bg-green-500 animate-[pulse_2s_ease-in-out_infinite]' : 'bg-red-500'}`} />
              {connectionStatus}
            </div>
          </div>
            <div className="h-[300px] w-full relative">
              <ResponsiveContainer width="100%" height="100%" minHeight={300} debounce={1}>
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorNorth" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#aa3bff" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#aa3bff" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorEast" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#3b82f6" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                <XAxis dataKey="time" stroke="#4b5563" fontSize={12} tickMargin={10} />
                <YAxis stroke="#4b5563" fontSize={12} tickMargin={10} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#16171d', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }}
                  itemStyle={{ color: '#e5e7eb' }}
                />
                <Area type="monotone" dataKey="north" stroke="#aa3bff" strokeWidth={2} fillOpacity={1} fill="url(#colorNorth)" name="North/South Queue" />
                <Area type="monotone" dataKey="east"  stroke="#3b82f6" strokeWidth={2} fillOpacity={1} fill="url(#colorEast)"  name="East/West Queue" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Right Column – Camera Feeds + Phase */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-white px-2">Edge Vision Feeds</h3>
          <div className="grid grid-cols-2 gap-4">
            <CameraFeed lane="North" count={currentCounts.north} />
            <CameraFeed lane="South" count={currentCounts.south} />
            <CameraFeed lane="East"  count={currentCounts.east}  />
            <CameraFeed lane="West"  count={currentCounts.west}  />
          </div>
          
          <div className="glass-panel p-4 rounded-xl border border-white/5">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium text-gray-300">Active Phase</span>
              <span className="text-xs bg-purple-500/20 text-purple-300 px-2 py-0.5 rounded-full border border-purple-500/30">
                Current: {currentPhase}
              </span>
            </div>
            <p className="text-xs text-gray-500">Phase streamed from the DQN agent via WebSockets.</p>
          </div>
        </div>
      </div>

      {/* ── AI Agent Stats ──────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Agent panel takes 1 col */}
        <AgentPanel agent={agentStats} />

        {/* Explainer spans 2 cols */}
        <div className="lg:col-span-2 glass-panel p-6 rounded-2xl border border-white/5 flex flex-col justify-between">
          <div>
            <h3 className="text-lg font-semibold text-white mb-1 flex items-center gap-2">
              <Brain className="w-5 h-5 text-purple-400" />
              How the DQN Agent Works
            </h3>
            <p className="text-sm text-gray-400 mb-4">
              A Deep Q-Network trains <em>live</em> during simulation. It observes the current state of the intersection and 
              learns which traffic-light phase minimises total vehicle queuing.
            </p>
          </div>
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: 'State',   desc: '8 features: queue lengths and average wait times per arm (N/S/E/W)', color: 'border-purple-500/30 bg-purple-500/5' },
              { label: 'Action',  desc: '2 choices: grant green to N/S or E/W corridor',                      color: 'border-blue-500/30   bg-blue-500/5'   },
              { label: 'Reward',  desc: 'Negative total queue length — the agent learns to keep roads clear',  color: 'border-green-500/30  bg-green-500/5'  },
            ].map(({ label, desc, color }) => (
              <div key={label} className={`p-4 rounded-xl border ${color}`}>
                <p className="text-xs font-mono font-bold text-white mb-1 uppercase tracking-wider">{label}</p>
                <p className="text-xs text-gray-400 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
          </div>
        </div>
      </div>
      ) : (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
          <HistoryPanel />
        </div>
      )}
    </div>
  );
};

export default Dashboard;
