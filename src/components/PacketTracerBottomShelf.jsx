import React, { useState } from 'react';
import CiscoDeviceIcon from './CiscoDeviceIcon.jsx';
import { sound } from '../utils/soundEffects.js';
import { 
  Network, Monitor, Zap, Clock, Play, Pause, 
  SkipForward, RotateCcw, ListFilter, Activity
} from 'lucide-react';

export default function PacketTracerBottomShelf({
  onAddDevice,
  activeTool,
  setActiveTool,
  mode, // 'realtime' or 'simulation'
  setMode,
  isPlaying,
  onPlay,
  onPause,
  onStepForward,
  onStepBackward,
  events,
  activeEventIndex,
  playbackSpeed,
  onChangeSpeed,
  onOpenSimulationInspector
}) {
  const [selectedCategory, setSelectedCategory] = useState('network'); // 'network', 'end_devices', 'connections'

  const handleDeviceDragStart = (e, type, name) => {
    sound.playClick();
    e.dataTransfer.setData('application/json', JSON.stringify({ type, name }));
    e.dataTransfer.effectAllowed = 'copy';
  };

  return (
    <footer className="border-t border-slate-800 bg-slate-950 select-none shadow-2xl flex flex-col">
      {/* Simulation Playback Strip (Visible when in Simulation mode or during active playback) */}
      {mode === 'simulation' && (
        <div className="h-10 border-b border-cyan-500/20 bg-slate-900/90 px-4 flex items-center justify-between text-xs font-sans">
          <div className="flex items-center space-x-2">
            <span className="font-bold text-cyan-400 font-mono text-[11px] uppercase tracking-wider flex items-center space-x-1.5">
              <Activity className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
              <span>Simulation Playback (Event List)</span>
            </span>

            <div className="h-4 w-px bg-slate-700 mx-2" />

            {/* Stepper controls */}
            <div className="flex items-center space-x-1">
              <button
                onClick={() => {
                  sound.playClick();
                  onStepBackward();
                }}
                disabled={activeEventIndex <= 0}
                className="p-1 rounded text-slate-300 hover:text-white hover:bg-slate-800 disabled:opacity-30 transition"
                title="Back (Previous Hop)"
              >
                <SkipForward className="w-3.5 h-3.5 rotate-180" />
              </button>

              <button
                onClick={() => {
                  sound.playClick();
                  isPlaying ? onPause() : onPlay();
                }}
                className="p-1 px-2.5 rounded bg-cyan-600 hover:bg-cyan-500 text-white font-bold flex items-center space-x-1 transition shadow"
                title={isPlaying ? "Pause Simulation" : "Auto Capture / Play"}
              >
                {isPlaying ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3 fill-current" />}
                <span className="text-[10px] uppercase font-mono">{isPlaying ? 'Pause' : 'Play'}</span>
              </button>

              <button
                onClick={() => {
                  sound.playClick();
                  onStepForward();
                }}
                disabled={events.length === 0 || activeEventIndex >= events.length - 1}
                className="p-1 rounded text-slate-300 hover:text-white hover:bg-slate-800 disabled:opacity-30 transition"
                title="Capture / Forward (Advance One Hop)"
              >
                <SkipForward className="w-3.5 h-3.5" />
              </button>
            </div>

            <span className="text-[11px] font-mono text-slate-400 pl-2">
              Event {events.length > 0 ? `${activeEventIndex + 1} of ${events.length}` : '0 of 0'}
            </span>
          </div>

          <div className="flex items-center space-x-3">
            {/* Speed slider buttons */}
            <div className="flex items-center space-x-1 bg-slate-800/80 p-0.5 rounded border border-slate-700">
              {[0.5, 1, 2, 4].map(s => (
                <button
                  key={s}
                  onClick={() => {
                    sound.playClick();
                    onChangeSpeed(s);
                  }}
                  className={`px-1.5 py-0.5 text-[9px] font-mono rounded transition ${
                    playbackSpeed === s
                      ? 'bg-cyan-500 text-slate-950 font-bold'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {s}x
                </button>
              ))}
            </div>

            <button
              onClick={() => {
                sound.playClick();
                onOpenSimulationInspector();
              }}
              className="flex items-center space-x-1 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-750 px-2 py-0.5 rounded text-[11px] transition"
            >
              <ListFilter className="w-3.5 h-3.5 text-cyan-400" />
              <span>Event List / PDU Inspector</span>
            </button>
          </div>
        </div>
      )}

      {/* Main Packet Tracer Bottom Shelf */}
      <div className="h-20 flex items-stretch divide-x divide-slate-800">
        {/* Category Picker (Left) */}
        <div className="w-48 bg-slate-900/90 p-1.5 flex flex-col justify-between">
          <div className="space-y-1">
            <button
              onClick={() => {
                sound.playClick();
                setSelectedCategory('network');
              }}
              className={`w-full flex items-center space-x-2 px-2 py-1 rounded text-xs font-semibold transition ${
                selectedCategory === 'network'
                  ? 'bg-cyan-600/30 text-cyan-300 border border-cyan-500/50'
                  : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
              }`}
            >
              <Network className="w-3.5 h-3.5" />
              <span>Network Devices</span>
            </button>

            <button
              onClick={() => {
                sound.playClick();
                setSelectedCategory('end_devices');
              }}
              className={`w-full flex items-center space-x-2 px-2 py-1 rounded text-xs font-semibold transition ${
                selectedCategory === 'end_devices'
                  ? 'bg-cyan-600/30 text-cyan-300 border border-cyan-500/50'
                  : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
              }`}
            >
              <Monitor className="w-3.5 h-3.5" />
              <span>End Devices</span>
            </button>

            <button
              onClick={() => {
                sound.playClick();
                setSelectedCategory('connections');
                setActiveTool('connect');
              }}
              className={`w-full flex items-center space-x-2 px-2 py-1 rounded text-xs font-semibold transition ${
                selectedCategory === 'connections'
                  ? 'bg-cyan-600/30 text-cyan-300 border border-cyan-500/50'
                  : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
              }`}
            >
              <Zap className="w-3.5 h-3.5" />
              <span>Connections</span>
            </button>
          </div>
        </div>

        {/* Hardware Shelf List (Center) */}
        <div className="flex-1 bg-slate-950 p-2 overflow-x-auto flex items-center space-x-3">
          {selectedCategory === 'network' && (
            <>
              {/* Router 2911 */}
              <div
                draggable
                onDragStart={(e) => handleDeviceDragStart(e, 'router', 'Router')}
                onClick={() => {
                  sound.playClick();
                  onAddDevice('router');
                }}
                className="flex flex-col items-center justify-center p-1.5 px-3 rounded-lg hover:bg-slate-900 border border-transparent hover:border-cyan-500/40 cursor-grab active:cursor-grabbing transition text-center flex-shrink-0"
                title="Cisco 2911 Integrated Services Router (Drag or Click to add)"
              >
                <CiscoDeviceIcon type="router" size={38} />
                <span className="text-[10px] font-bold text-slate-200 mt-1 font-mono">2911 Router</span>
              </div>

              {/* Switch 2960 */}
              <div
                draggable
                onDragStart={(e) => handleDeviceDragStart(e, 'switch', 'Switch')}
                onClick={() => {
                  sound.playClick();
                  onAddDevice('switch');
                }}
                className="flex flex-col items-center justify-center p-1.5 px-3 rounded-lg hover:bg-slate-900 border border-transparent hover:border-cyan-500/40 cursor-grab active:cursor-grabbing transition text-center flex-shrink-0"
                title="Cisco Catalyst 2960-24TT Switch (Drag or Click to add)"
              >
                <CiscoDeviceIcon type="switch" size={38} />
                <span className="text-[10px] font-bold text-slate-200 mt-1 font-mono">2960 Switch</span>
              </div>

              {/* Hub */}
              <div
                draggable
                onDragStart={(e) => handleDeviceDragStart(e, 'hub', 'Hub')}
                onClick={() => {
                  sound.playClick();
                  onAddDevice('hub');
                }}
                className="flex flex-col items-center justify-center p-1.5 px-3 rounded-lg hover:bg-slate-900 border border-transparent hover:border-cyan-500/40 cursor-grab active:cursor-grabbing transition text-center flex-shrink-0"
                title="Multiport Physical Layer Repeater Hub (Drag or Click to add)"
              >
                <CiscoDeviceIcon type="hub" size={38} />
                <span className="text-[10px] font-bold text-slate-200 mt-1 font-mono">Hub-PT</span>
              </div>
            </>
          )}

          {selectedCategory === 'end_devices' && (
            <>
              {/* PC-PT */}
              <div
                draggable
                onDragStart={(e) => handleDeviceDragStart(e, 'pc', 'PC')}
                onClick={() => {
                  sound.playClick();
                  onAddDevice('pc');
                }}
                className="flex flex-col items-center justify-center p-1.5 px-3 rounded-lg hover:bg-slate-900 border border-transparent hover:border-cyan-500/40 cursor-grab active:cursor-grabbing transition text-center flex-shrink-0"
                title="PC-PT Workstation Host (Drag or Click to add)"
              >
                <CiscoDeviceIcon type="pc" size={38} />
                <span className="text-[10px] font-bold text-slate-200 mt-1 font-mono">PC-PT</span>
              </div>

              {/* Laptop-PT */}
              <div
                draggable
                onDragStart={(e) => handleDeviceDragStart(e, 'laptop', 'Laptop')}
                onClick={() => {
                  sound.playClick();
                  onAddDevice('laptop');
                }}
                className="flex flex-col items-center justify-center p-1.5 px-3 rounded-lg hover:bg-slate-900 border border-transparent hover:border-cyan-500/40 cursor-grab active:cursor-grabbing transition text-center flex-shrink-0"
                title="Laptop-PT Wireless/Ethernet Client (Drag or Click to add)"
              >
                <CiscoDeviceIcon type="laptop" size={38} />
                <span className="text-[10px] font-bold text-slate-200 mt-1 font-mono">Laptop-PT</span>
              </div>

              {/* Server-PT */}
              <div
                draggable
                onDragStart={(e) => handleDeviceDragStart(e, 'server', 'Server')}
                onClick={() => {
                  sound.playClick();
                  onAddDevice('server');
                }}
                className="flex flex-col items-center justify-center p-1.5 px-3 rounded-lg hover:bg-slate-900 border border-transparent hover:border-cyan-500/40 cursor-grab active:cursor-grabbing transition text-center flex-shrink-0"
                title="Server-PT HTTP/ICMP Enterprise Server (Drag or Click to add)"
              >
                <CiscoDeviceIcon type="server" size={38} />
                <span className="text-[10px] font-bold text-slate-200 mt-1 font-mono">Server-PT</span>
              </div>
            </>
          )}

          {selectedCategory === 'connections' && (
            <>
              {/* Auto Connect */}
              <div
                onClick={() => {
                  sound.playClick();
                  setActiveTool('connect');
                }}
                className="flex flex-col items-center justify-center p-2 px-3 rounded-lg bg-cyan-950/40 border border-cyan-500/50 cursor-pointer text-center flex-shrink-0"
                title="Automatically Choose Connection Type (Lightning Bolt)"
              >
                <div className="w-8 h-8 rounded-full bg-cyan-500 flex items-center justify-center text-slate-950 shadow">
                  <Zap className="w-5 h-5 fill-current" />
                </div>
                <span className="text-[9px] font-bold text-cyan-300 mt-1 font-mono">Auto Cable</span>
              </div>

              {/* Copper Straight-Through */}
              <div
                onClick={() => {
                  sound.playClick();
                  setActiveTool('connect');
                }}
                className="flex flex-col items-center justify-center p-2 px-3 rounded-lg hover:bg-slate-900 border border-transparent hover:border-cyan-500/40 cursor-pointer text-center flex-shrink-0"
                title="Copper Straight-Through Ethernet Cable (Solid Line)"
              >
                <div className="w-10 h-1 bg-slate-300 rounded my-3" />
                <span className="text-[9px] font-bold text-slate-300 font-mono">Straight-Thru</span>
              </div>

              {/* Copper Cross-Over */}
              <div
                onClick={() => {
                  sound.playClick();
                  setActiveTool('connect');
                }}
                className="flex flex-col items-center justify-center p-2 px-3 rounded-lg hover:bg-slate-900 border border-transparent hover:border-cyan-500/40 cursor-pointer text-center flex-shrink-0"
                title="Copper Cross-Over Cable (Dashed Line)"
              >
                <div className="w-10 h-1 border-t-2 border-dashed border-rose-400 my-3" />
                <span className="text-[9px] font-bold text-slate-300 font-mono">Cross-Over</span>
              </div>
            </>
          )}
        </div>

        {/* Realtime vs Simulation Mode Selector (Right Corner - Exactly like Packet Tracer!) */}
        <div className="w-44 bg-slate-900/90 p-2 flex flex-col justify-center space-y-1 text-xs">
          <div className="text-[9px] font-mono text-slate-400 font-bold uppercase tracking-wider text-center">
            OPERATIONAL MODE
          </div>
          <div className="grid grid-cols-2 gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800">
            <button
              onClick={() => {
                sound.playClick();
                setMode('realtime');
              }}
              className={`py-1 rounded text-[10px] font-bold font-mono transition flex items-center justify-center space-x-1 ${
                mode === 'realtime'
                  ? 'bg-cyan-600 text-white shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Clock className="w-3 h-3" />
              <span>Realtime</span>
            </button>

            <button
              onClick={() => {
                sound.playClick();
                setMode('simulation');
              }}
              className={`py-1 rounded text-[10px] font-bold font-mono transition flex items-center justify-center space-x-1 ${
                mode === 'simulation'
                  ? 'bg-amber-500 text-slate-950 shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Activity className="w-3 h-3" />
              <span>Sim</span>
            </button>
          </div>
        </div>
      </div>
    </footer>
  );
}
