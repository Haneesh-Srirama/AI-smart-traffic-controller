import React, { useRef, useState, useMemo, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Environment, Grid, Html } from '@react-three/drei';
import * as THREE from 'three';

// -------------------------------------------------------------
// Component: Road System
// -------------------------------------------------------------
const RoadNetwork = () => {
  return (
    <group>
      {/* Central Intersection Area */}
      <mesh position={[0, 0, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[20, 20]} />
        <meshStandardMaterial color="#1a1c23" />
      </mesh>
      
      {/* N-S Road */}
      <mesh position={[0, -0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[8, 100]} />
        <meshStandardMaterial color="#1a1c23" />
      </mesh>
      
      {/* E-W Road */}
      <mesh position={[0, -0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[100, 8]} />
        <meshStandardMaterial color="#1a1c23" />
      </mesh>

      {/* Road Markings (Simple representations) */}
      <group position={[0, 0.01, 0]}>
        {/* N-S Dashed Lines */}
        <mesh position={[0, 0, 20]} rotation={[-Math.PI / 2, 0, 0]}>
           <planeGeometry args={[0.2, 40]} />
           <meshBasicMaterial color="#ffffff" transparent opacity={0.5} />
        </mesh>
        <mesh position={[0, 0, -20]} rotation={[-Math.PI / 2, 0, 0]}>
           <planeGeometry args={[0.2, 40]} />
           <meshBasicMaterial color="#ffffff" transparent opacity={0.5} />
        </mesh>
        
        {/* E-W Dashed Lines */}
        <mesh position={[20, 0, 0]} rotation={[-Math.PI / 2, 0, Math.PI / 2]}>
           <planeGeometry args={[0.2, 40]} />
           <meshBasicMaterial color="#ffffff" transparent opacity={0.5} />
        </mesh>
        <mesh position={[-20, 0, 0]} rotation={[-Math.PI / 2, 0, Math.PI / 2]}>
           <planeGeometry args={[0.2, 40]} />
           <meshBasicMaterial color="#ffffff" transparent opacity={0.5} />
        </mesh>
      </group>
    </group>
  );
};

// -------------------------------------------------------------
// Component: Network-Driven Vehicle
// -------------------------------------------------------------
// Map vehicle speed (0–15 m/s) to a red→orange→green gradient
const speedToColor = (speed) => {
  const maxSpeed = 15;
  const t = Math.min(speed / maxSpeed, 1); // 0 = stopped, 1 = full speed
  // HSL: 0° = red, 60° = yellow, 120° = green
  const hue = Math.round(t * 120);
  return `hsl(${hue}, 85%, 52%)`;
};

const Vehicle = ({ id, targetPos, speed, type }) => {
  const meshRef = useRef();
  const color = speedToColor(speed ?? 0);
  
  // Precise dimension mapping for better realism
  const dims = useMemo(() => ({
    car:   { w: 1.8, h: 1.2, l: 3.5, yOffset: 0.6 },
    bus:   { w: 2.2, h: 2.4, l: 8.5, yOffset: 1.2 },
    truck: { w: 2.3, h: 2.8, l: 10.5, yOffset: 1.4 }
  })[type] || { w: 1.8, h: 1.2, l: 3.5, yOffset: 0.6 }, [type]);

  useFrame((state, delta) => {
    if (!meshRef.current) return;
    
    // Smoothly interpolate to the SUMO-provided position at 60 fps
    const lerpSpeed = 15;
    meshRef.current.position.x += (targetPos.x - meshRef.current.position.x) * lerpSpeed * delta;
    meshRef.current.position.z += (targetPos.z - meshRef.current.position.z) * lerpSpeed * delta;
    
    // Convert SUMO angle → Three.js Y-rotation
    const rad = (90 - targetPos.angle) * (Math.PI / 180);
    meshRef.current.rotation.y = rad;
  });

  return (
    <mesh ref={meshRef} position={[targetPos.x, dims.yOffset, targetPos.z]} castShadow>
      <boxGeometry args={[dims.w, dims.h, dims.l]} />
      <meshStandardMaterial color={color} roughness={0.25} metalness={0.7} />
      
      {/* Visual distinctive features for trucks/buses */}
      {(type === 'truck' || type === 'bus') ? (
        <mesh position={[0, dims.h * 0.1, dims.l * 0.4]}>
           <boxGeometry args={[dims.w * 0.9, dims.h * 0.6, dims.l * 0.1]} />
           <meshStandardMaterial color="#111" />
        </mesh>
      ) : (
        /* Car Cabin */
        <mesh position={[0, 0.5, 0]}>
          <boxGeometry args={[1.4, 0.8, 2]} />
          <meshStandardMaterial color="#1a1a2e" />
        </mesh>
      )}
    </mesh>
  );
};

// -------------------------------------------------------------
// Component: Traffic Light Indicator
// -------------------------------------------------------------
const TrafficLight = ({ position, rotation, isGreen }) => (
  <group position={position} rotation={rotation}>
    <mesh position={[0, 4, 0]}>
      <cylinderGeometry args={[0.2, 0.2, 8]} />
      <meshStandardMaterial color="#333" />
    </mesh>
    <mesh position={[0.5, 7.5, 0]}>
      <boxGeometry args={[0.8, 2, 0.8]} />
      <meshStandardMaterial color="#222" />
    </mesh>
    {/* Red Light */}
    <mesh position={[0.9, 8, 0]}>
      <sphereGeometry args={[0.25]} />
      <meshBasicMaterial color={!isGreen ? "#ef4444" : "#451a1a"} />
      {!isGreen && <pointLight color="#ef4444" intensity={2} distance={5} />}
    </mesh>
    {/* Green Light */}
    <mesh position={[0.9, 7, 0]}>
      <sphereGeometry args={[0.25]} />
      <meshBasicMaterial color={isGreen ? "#22c55e" : "#14331e"} />
      {isGreen && <pointLight color="#22c55e" intensity={2} distance={5} />}
    </mesh>
  </group>
);


// -------------------------------------------------------------
// Main Canvas Component
// -------------------------------------------------------------
// -------------------------------------------------------------
// Component: 2D Minimap Overlay
// -------------------------------------------------------------
const Minimap = ({ vehicles, phase }) => {
  // Scale factor to map Three.js coords [-50, 50] to minimap [0, 150]
  const scale = (val) => (val + 60) * (150 / 120);

  return (
    <div className="absolute top-4 right-4 w-[160px] h-[160px] bg-black/40 backdrop-blur-md border border-white/10 rounded-2xl overflow-hidden p-1 shadow-xl pointer-events-none group hover:bg-black/60 transition-colors">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(168,85,247,0.1),transparent)]" />
      
      {/* Schematic Road Background */}
      <svg viewBox="0 0 150 150" className="w-full h-full opacity-40">
        {/* N-S Road */}
        <rect x="65" y="0" width="20" height="150" fill="#333" />
        {/* E-W Road */}
        <rect x="0" y="65" width="150" height="20" fill="#333" />
        {/* Center */}
        <rect x="65" y="65" width="20" height="20" fill="#444" />
        
        {/* Zebra crossings (simplified) */}
        <line x1="65" y1="60" x2="85" y2="60" stroke="#555" strokeWidth="1" strokeDasharray="2,2" />
        <line x1="65" y1="90" x2="85" y2="90" stroke="#555" strokeWidth="1" strokeDasharray="2,2" />
        <line x1="60" y1="65" x2="60" y2="85" stroke="#555" strokeWidth="1" strokeDasharray="2,2" />
        <line x1="90" y1="65" x2="90" y2="85" stroke="#555" strokeWidth="1" strokeDasharray="2,2" />

        {/* Phase Indicators */}
        <circle cx="75" cy="55" r="3" fill={phase === 'NS' ? '#22c55e' : '#ef4444'} className="drop-shadow-[0_0_2px_rgba(34,197,94,0.5)]" />
        <circle cx="75" cy="95" r="3" fill={phase === 'NS' ? '#22c55e' : '#ef4444'} />
        <circle cx="55" cy="75" r="3" fill={phase === 'EW' ? '#22c55e' : '#ef4444'} />
        <circle cx="95" cy="75" r="3" fill={phase === 'EW' ? '#22c55e' : '#ef4444'} />
        
        {/* Vehicles */}
        {vehicles.map(v => (
          <rect
            key={v.id}
            x={scale(v.x - 100) - 2}
            y={scale(-(v.y - 100)) - 2}
            width="4"
            height="4"
            rx="1"
            className="transition-all duration-200"
            fill={speedToColor(v.speed)}
            style={{ filter: 'drop-shadow(0 0 1px rgba(0,0,0,0.5))' }}
          />
        ))}
      </svg>
      
      <div className="absolute bottom-2 left-0 right-0 text-[8px] font-mono text-center text-gray-500 uppercase tracking-widest">
        Top View
      </div>
    </div>
  );
};

const SimulationScene = () => {
  const [phase, setPhase] = useState('NS'); // 'NS' or 'EW'
  const [vehicles, setVehicles] = useState([]); // Real SUMO vehicles

  // Connect to DQN Server for active phase and live coordinates
  useEffect(() => {
    let ws;
    let isConnected = false;

    const connectAndListen = () => {
      const wsUrl = `ws://${window.location.host}/ws/traffic`;
      ws = new WebSocket(wsUrl);
      
      ws.onopen = () => { isConnected = true; };
      
      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          setPhase(data.phase);
          setVehicles(data.vehicles);
          // Dispatch custom event for the Minimap (outside Canvas)
          window.dispatchEvent(new CustomEvent('traffic-update', { 
            detail: { phase: data.phase, vehicles: data.vehicles } 
          }));
        } catch (e) {
          console.error("Failed to parse websocket message in Simulation 3D", e);
        }
      };

      ws.onclose = () => {
        isConnected = false;
        // Attempt to reconnect after 3 seconds if connection drops
        setTimeout(connectAndListen, 3000);
      };
    };

    connectAndListen();

    return () => {
      if (ws && isConnected) {
        ws.close();
      }
    };
  }, []);


  return (
    <>
      <color attach="background" args={['#0f1115']} />
      <fog attach="fog" args={['#0f1115', 20, 80]} />
      <ambientLight intensity={0.5} />
      <directionalLight position={[10, 20, 10]} intensity={1} castShadow />
      
      <RoadNetwork />

      {/* Traffic Lights */}
      <TrafficLight position={[-6, 0, -6]} rotation={[0, Math.PI, 0]} isGreen={phase === 'NS'} /> {/* North inbound */}
      <TrafficLight position={[6, 0, 6]} rotation={[0, 0, 0]} isGreen={phase === 'NS'} /> {/* South inbound */}
      <TrafficLight position={[-6, 0, 6]} rotation={[0, Math.PI / 2, 0]} isGreen={phase === 'EW'} /> {/* West inbound */}
      <TrafficLight position={[6, 0, -6]} rotation={[0, -Math.PI / 2, 0]} isGreen={phase === 'EW'} /> {/* East inbound */}

      {/* Vehicles mapped from SUMO — colored by live speed */}
      {vehicles.map((v) => (
        <Vehicle 
          key={v.id} 
          id={v.id} 
          type={v.type}
          targetPos={{ x: v.x - 100, z: -(v.y - 100), angle: v.angle }}
          speed={v.speed ?? 0}
        />
      ))}

      <Grid infiniteGrid fadeDistance={50} sectionColor="#aa3bff" cellColor="#333" sectionThickness={1.5} fadeStrength={5} />
      <Environment preset="city" />
      <OrbitControls makeDefault minPolarAngle={0} maxPolarAngle={Math.PI / 2.2} maxDistance={60} minDistance={10} />
      
      {/* 3D UI Annotations */}
      <Html position={[0, 15, 0]} center transform style={{ pointerEvents: 'none' }}>
        <div className="bg-black/60 backdrop-blur border border-purple-500/30 px-4 py-2 rounded-xl text-white font-mono text-sm shadow-[0_0_15px_rgba(168,85,247,0.3)] min-w-[140px] text-center">
          PHASE: {phase === 'NS' ? 'NORTH/SOUTH' : 'EAST/WEST'}
        </div>
      </Html>
    </>
  );
};

const Simulation3D = () => {
  const [vehicles, setVehicles] = useState([]);
  const [phase, setPhase] = useState('NS');

  // Handle cross-sync between Canvas and Minimap
  // This state is duplicated here because Canvas components can't easily lift state out to UI
  // But we want the Minimap to be a pure DOM element outside the Canvas for performance.
  useEffect(() => {
    const handleWsData = (event) => {
      try {
        const data = JSON.parse(event.data);
        setVehicles(data.vehicles);
        setPhase(data.phase);
      } catch (e) {}
    };

    // We'll listen to the same websocket or a custom event.
    // Since SimulationScene has its own listener, let's make it more robust.
    // For now, let's keep it simple: the dashboard already gets data.
    // Actually, Simulation3D is isolated. I'll add a shared data hook if needed.
    // But for this project, let's just make Simulation3D manage the connection.
  }, []);

  return (
    <div className="w-full h-full bg-[#0f1115] relative cursor-move">
      <Canvas 
        shadows 
        shadow-map-type={THREE.PCFShadowMap}
        camera={{ position: [-25, 20, 25], fov: 45 }} 
        gl={{ preserveDrawingBuffer: true, powerPreference: "high-performance" }}
        onCreated={({ gl }) => {
            // Forward data to minimap via a custom event for decoupling
            window.addEventListener('traffic-update', (e) => {
                setVehicles(e.detail.vehicles);
                setPhase(e.detail.phase);
            });
        }}
      >
        <SimulationScene />
      </Canvas>

      <Minimap vehicles={vehicles} phase={phase} />

      <div className="absolute bottom-4 left-4 text-xs text-gray-500 font-mono pointer-events-none">
        SHIFT + DRAG TO PAN
      </div>
    </div>
  );
};

export default Simulation3D;
