import React, { useEffect } from 'react';
import Hero from './components/Hero';
import Dashboard from './components/Dashboard';
import Simulation3D from './components/Simulation3D';
import ErrorBoundary from './components/ErrorBoundary';
import AOS from 'aos';
import 'aos/dist/aos.css';

function App() {
  useEffect(() => {
    AOS.init({
      duration: 1000,
      once: true,
      easing: 'ease-out-cubic',
    });
  }, []);

  return (
    <div className="min-h-screen bg-[#0f1115] text-gray-100 font-sans selection:bg-purple-500/30">
      {/* Background ambient lighting effects */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-purple-600/20 blur-[120px] rounded-full mix-blend-screen" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-600/20 blur-[120px] rounded-full mix-blend-screen" />
      </div>
      
      <div className="relative z-10 flex flex-col items-center">
        <Hero />
        
        <main className="w-full max-w-7xl px-4 sm:px-6 lg:px-8 pb-24 space-y-24">
          <section id="analytics" data-aos="fade-up" className="w-full">
            <h2 className="text-3xl font-bold mb-8 items-center flex gap-3 text-white">
              <span className="w-2 h-8 bg-purple-500 rounded-full inline-block"></span>
              Live Traffic Analytics
            </h2>
            <ErrorBoundary>
              <Dashboard />
            </ErrorBoundary>
          </section>

          <section id="simulation" data-aos="fade-up" className="w-full">
            <h2 className="text-3xl font-bold mb-8 items-center flex gap-3 text-white">
              <span className="w-2 h-8 bg-blue-500 rounded-full inline-block"></span>
              AI Intersection Simulation
            </h2>
            <div className="h-[600px] w-full rounded-2xl overflow-hidden glass-panel border border-white/10 relative shadow-2xl">
              <ErrorBoundary>
                <div className="absolute inset-0">
                  <Simulation3D />
                </div>
              </ErrorBoundary>
              
              <div className="absolute top-4 left-4 glass-panel px-4 py-2 rounded-xl text-sm font-mono flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                DQN Agent Active
              </div>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}

export default App;
