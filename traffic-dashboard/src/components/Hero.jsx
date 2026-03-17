import React, { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { Shield, Cpu, Activity, ArrowRight } from 'lucide-react';

const Hero = () => {
  const heroRef = useRef(null);
  const headlineRef = useRef(null);
  const badgesRef = useRef(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.from(headlineRef.current.children, {
        y: 40,
        opacity: 0,
        duration: 1,
        stagger: 0.15,
        ease: 'power3.out',
        delay: 0.2
      });
      
      gsap.from(badgesRef.current.children, {
        x: -20,
        opacity: 0,
        duration: 0.8,
        stagger: 0.1,
        ease: 'power2.out',
        delay: 0.8
      });
    }, heroRef);

    return () => ctx.revert();
  }, []);

  return (
    <header ref={heroRef} className="w-full min-h-[70vh] flex flex-col justify-center items-center text-center px-4 py-20 relative">
      <div ref={headlineRef} className="max-w-4xl max-auto space-y-6">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass-panel text-sm text-purple-300 font-medium mb-4 overflow-hidden group">
          <span className="relative z-10 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-purple-400 animate-pulse" />
            System v2.4.0 Online
          </span>
          <div className="absolute inset-0 bg-gradient-to-r from-purple-500/0 via-purple-500/10 to-purple-500/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
        </div>
        
        <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight text-white leading-tight">
          Intelligent <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-blue-500">Traffic Node</span>
        </h1>
        
        <p className="text-xl text-gray-400 max-w-2xl mx-auto leading-relaxed">
          Dynamic multi-agent reinforcement learning powered by edge computer vision to optimize urban mobility and eradicate gridlocks.
        </p>

        <div className="flex items-center justify-center gap-4 pt-8">
          <button 
            onClick={() => {
              const el = document.getElementById('simulation');
              if (el) el.scrollIntoView({ behavior: 'smooth' });
            }}
            className="px-8 py-4 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-semibold transition-all shadow-[0_0_20px_rgba(168,85,247,0.4)] hover:shadow-[0_0_30px_rgba(168,85,247,0.6)] flex items-center gap-2"
          >
            Start Simulation <ArrowRight className="w-5 h-5" />
          </button>
          <button 
            onClick={() => {
              const el = document.getElementById('analytics');
              if (el) el.scrollIntoView({ behavior: 'smooth' });
            }}
            className="px-8 py-4 rounded-xl glass-panel hover:bg-white/5 text-white font-semibold transition-all flex items-center gap-2 border border-white/10"
          >
            View Analytics
          </button>
        </div>
      </div>

      <div ref={badgesRef} className="flex flex-wrap justify-center gap-4 mt-20 max-w-5xl">
        {[
          { icon: Cpu, label: 'RL Agent: DQN' },
          { icon: Activity, label: 'Latency: 12ms' },
          { icon: Shield, label: 'Edge Inference: YOLOv8' }
        ].map((Badge, idx) => (
          <div key={idx} className="glass-panel px-6 py-3 rounded-xl flex items-center gap-3 border border-white/5">
            <Badge.icon className="w-5 h-5 text-purple-400" />
            <span className="text-gray-300 font-medium">{Badge.label}</span>
          </div>
        ))}
      </div>
    </header>
  );
};

export default Hero;
