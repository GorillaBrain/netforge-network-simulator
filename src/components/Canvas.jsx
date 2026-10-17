import React, { useState, useRef, useEffect } from 'react';
import { 
  Monitor, Laptop, Network, Router as RouterIcon, 
  Server, Cpu, ZoomIn, ZoomOut, Maximize2, Trash2, 
  Unlink, Radio, Activity, CheckCircle2, XCircle,
  Play, Pause, SkipForward, RotateCcw, Zap, Compass,
  ChevronRight, Shield, Award, Terminal as TerminalIcon
} from 'lucide-react';
import { sound } from '../utils/soundEffects.js';

export default function Canvas({
  topology,
  selectedDeviceId,
  selectedLinkId,
  onSelectDevice,
  onSelectLink,
  onUpdateDevicePosition,
  onAddDeviceAtPosition,
  onCreateLink,
  activeEvent,
  isConnecting,
  connectingSource,
  onCancelConnecting,
  onStartConnecting,
  onOpenQuickPing,
  isPlaying,
  onPlay,
  onPause,
  onStepForward,
  onStepBackward,
  playbackSpeed,
  onChangeSpeed,
  selectedLab,
  labEvaluation,
  onOpenTerminal
}) {
  const containerRef = useRef(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [startPan, setStartPan] = useState({ x: 0, y: 0 });
  const [draggingDeviceId, setDraggingDeviceId] = useState(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [hoveredDeviceId, setHoveredDeviceId] = useState(null);
  const [isQuestCollapsed, setIsQuestCollapsed] = useState(false);
  const [mouseCoords, setMouseCoords] = useState({ x: 0, y: 0 });

  // Handle Drag Over Canvas (from Palette)
  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const dataStr = e.dataTransfer.getData('application/json');
    if (!dataStr) return;
    try {
      const data = JSON.parse(dataStr);
      const rect = containerRef.current.getBoundingClientRect();
      const canvasX = (e.clientX - rect.left - pan.x) / zoom;
      const canvasY = (e.clientY - rect.top - pan.y) / zoom;
      onAddDeviceAtPosition(data.type, Math.round(canvasX), Math.round(canvasY));
      sound.playCableConnect();
    } catch (err) {
      console.error('Drop parse error:', err);
    }
  };

  // Pan controls
  const handleMouseDown = (e) => {
    if (e.target === containerRef.current || e.target.tagName === 'svg' || e.target.id === 'canvas-background') {
      setIsPanning(true);
      setStartPan({ x: e.clientX - pan.x, y: e.clientY - pan.y });
      onSelectDevice(null);
      onSelectLink(null);
    }
  };

  const handleMouseMove = (e) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (rect) {
      const cx = Math.round((e.clientX - rect.left - pan.x) / zoom);
      const cy = Math.round((e.clientY - rect.top - pan.y) / zoom);
      setMouseCoords({ x: cx, y: cy });
    }

    if (isPanning) {
      setPan({
        x: e.clientX - startPan.x,
        y: e.clientY - startPan.y
      });
    } else if (draggingDeviceId) {
      const rect = containerRef.current.getBoundingClientRect();
      const newX = (e.clientX - rect.left - pan.x) / zoom - dragOffset.x;
      const newY = (e.clientY - rect.top - pan.y) / zoom - dragOffset.y;
      onUpdateDevicePosition(draggingDeviceId, Math.round(newX), Math.round(newY));
    }
  };

  const handleMouseUp = () => {
    setIsPanning(false);
    setDraggingDeviceId(null);
  };

  // Zoom controls
  const handleZoom = (delta) => {
    setZoom((prev) => Math.min(Math.max(0.4, prev + delta), 2.5));
    sound.playClick();
  };

  const resetView = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
    sound.playClick();
  };

  // Device Dragging start
  const handleDeviceMouseDown = (e, device) => {
    e.stopPropagation();
    if (isConnecting) return;

    sound.playClick();
    onSelectDevice(device.id);
    onSelectLink(null);
    setDraggingDeviceId(device.id);

    const rect = containerRef.current.getBoundingClientRect();
    const mouseCanvasX = (e.clientX - rect.left - pan.x) / zoom;
    const mouseCanvasY = (e.clientY - rect.top - pan.y) / zoom;

    setDragOffset({
      x: mouseCanvasX - (device.x || 0),
      y: mouseCanvasY - (device.y || 0)
    });
  };

  const devices = Object.values(topology?.devices || {});
  const links = Object.values(topology?.links || {});

  return (
    <div
      ref={containerRef}
      id="canvas-background"
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      className="relative flex-1 h-full canvas-grid overflow-hidden select-none cursor-crosshair"
    >
      {/* Top Left Sector & Coordinates HUD */}
      <div className="absolute top-4 left-4 z-20 pointer-events-none flex flex-col space-y-1">
        <div className="flex items-center space-x-2 text-[10px] font-mono uppercase tracking-wider text-cyan-400/80 bg-slate-950/80 backdrop-blur px-2.5 py-1 rounded border border-cyan-500/20 shadow">
          <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping" />
          <span>CYBER-NOC // VIRTUAL TOPO ENGINE</span>
          <span className="text-slate-600">|</span>
          <span className="text-slate-400">LOC: [{mouseCoords.x}, {mouseCoords.y}]</span>
        </div>
      </div>

      {/* Floating Campaign Quest HUD */}
      {selectedLab && (
        <div className={`absolute top-14 left-4 z-20 transition-all duration-200 ${
          isQuestCollapsed ? 'w-44' : 'w-80'
        }`}>
          <div className="cyber-panel rounded-xl overflow-hidden shadow-2xl border border-cyan-500/30">
            {/* Quest Header */}
            <div 
              onClick={() => setIsQuestCollapsed(!isQuestCollapsed)}
              className="p-3 bg-gradient-to-r from-cyan-950/90 via-slate-900/90 to-blue-950/90 border-b border-cyan-500/30 flex items-center justify-between cursor-pointer hover:bg-slate-800/60 transition"
            >
              <div className="flex items-center space-x-2">
                <div className="w-6 h-6 rounded-md bg-cyan-500/20 border border-cyan-400/40 flex items-center justify-center text-cyan-300">
                  <Award className="w-3.5 h-3.5" />
                </div>
                <div>
                  <div className="text-[10px] font-mono uppercase tracking-wider text-cyan-400 font-semibold">
                    ACTIVE MISSION
                  </div>
                  <div className="text-xs font-bold text-slate-100 truncate w-48">
                    {selectedLab.title}
                  </div>
                </div>
              </div>
              <div className="text-slate-400 hover:text-white text-xs">
                {isQuestCollapsed ? '+' : '−'}
              </div>
            </div>

            {/* Quest Objectives Body */}
            {!isQuestCollapsed && (
              <div className="p-3 space-y-2.5 text-xs">
                <div className="text-[11px] text-slate-300 leading-relaxed font-sans">
                  {selectedLab.description}
                </div>

                <div className="space-y-1.5 pt-1 border-t border-slate-800">
                  <div className="text-[10px] font-mono uppercase tracking-wider text-slate-400 flex items-center justify-between">
                    <span>Objectives</span>
                    <span className="text-cyan-400 font-bold">
                      {labEvaluation?.completed ? 'COMPLETED' : 'IN PROGRESS'}
                    </span>
                  </div>

                  {labEvaluation?.objectives?.map((obj, i) => (
                    <div 
                      key={i} 
                      className={`flex items-start space-x-2 p-1.5 rounded transition ${
                        obj.passed ? 'bg-emerald-950/40 text-emerald-200 border border-emerald-800/40' : 'bg-slate-900/60 text-slate-300'
                      }`}
                    >
                      {obj.passed ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                      ) : (
                        <div className="w-3.5 h-3.5 rounded-full border border-slate-600 flex-shrink-0 mt-0.5" />
                      )}
                      <div className="text-[11px] leading-snug">
                        {obj.desc}
                      </div>
                    </div>
                  ))}
                </div>

                {labEvaluation?.completed && (
                  <div className="p-2 bg-gradient-to-r from-emerald-950/80 to-teal-950/80 border border-emerald-500/50 rounded-lg text-center animate-pulse">
                    <span className="text-emerald-300 font-bold text-xs tracking-wide">
                      ⭐ MISSION ACCOMPLISHED! (+250 XP) ⭐
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Floating Tactical Simulation Control Bar (Bottom Center) */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 flex items-center space-x-2 bg-slate-950/90 backdrop-blur border border-cyan-500/30 rounded-2xl p-2 shadow-2xl">
        {/* Launch Ping Big Button */}
        <button
          onClick={() => {
            sound.playClick();
            onOpenQuickPing();
          }}
          className="flex items-center space-x-2 bg-gradient-to-r from-cyan-600 via-blue-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white font-bold text-xs px-4 py-2 rounded-xl shadow-lg shadow-cyan-500/25 active:scale-95 transition"
          title="Dispatch simulated ICMP Echo Request"
        >
          <Zap className="w-4 h-4 fill-current text-cyan-200" />
          <span className="tracking-wide">LAUNCH PING</span>
        </button>

        <div className="h-6 w-px bg-slate-800" />

        {/* Playback Controls */}
        <div className="flex items-center space-x-1">
          <button
            onClick={() => {
              sound.playClick();
              onStepBackward();
            }}
            className="p-2 text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition"
            title="Step Backward (Previous Hop)"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          <button
            onClick={() => {
              sound.playClick();
              isPlaying ? onPause() : onPlay();
            }}
            className="p-2 text-white bg-slate-800 hover:bg-cyan-600 rounded-lg transition"
            title={isPlaying ? "Pause Simulation" : "Continuous Playback"}
          >
            {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 fill-current" />}
          </button>

          <button
            onClick={() => {
              sound.playClick();
              onStepForward();
            }}
            className="p-2 text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition"
            title="Step Forward (Next Hop)"
          >
            <SkipForward className="w-4 h-4" />
          </button>
        </div>

        <div className="h-6 w-px bg-slate-800" />

        {/* Speed Selector */}
        <div className="flex items-center space-x-1">
          {[
            { val: 0.5, label: '0.5x' },
            { val: 1, label: '1x' },
            { val: 2, label: '2x' },
            { val: 4, label: '⚡TURBO' }
          ].map(s => (
            <button
              key={s.val}
              onClick={() => {
                sound.playClick();
                onChangeSpeed(s.val);
              }}
              className={`text-[10px] font-mono px-2 py-1 rounded transition ${
                playbackSpeed === s.val
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/50 font-bold'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* Floating Zoom & Viewport Controls (Top Right) */}
      <div className="absolute top-4 right-4 z-20 flex items-center space-x-1.5 bg-slate-950/85 backdrop-blur border border-slate-800/80 rounded-xl p-1 shadow-xl">
        <button
          onClick={() => handleZoom(0.15)}
          className="p-1.5 text-slate-300 hover:text-cyan-400 hover:bg-slate-800/80 rounded-lg transition"
          title="Zoom In"
        >
          <ZoomIn className="w-4 h-4" />
        </button>
        <span className="text-[11px] font-mono px-2 text-cyan-400 font-semibold">
          {Math.round(zoom * 100)}%
        </span>
        <button
          onClick={() => handleZoom(-0.15)}
          className="p-1.5 text-slate-300 hover:text-cyan-400 hover:bg-slate-800/80 rounded-lg transition"
          title="Zoom Out"
        >
          <ZoomOut className="w-4 h-4" />
        </button>
        <button
          onClick={resetView}
          className="p-1.5 text-slate-300 hover:text-cyan-400 hover:bg-slate-800/80 rounded-lg transition"
          title="Reset View (100%)"
        >
          <Maximize2 className="w-4 h-4" />
        </button>
      </div>

      {/* Connecting Cable Mode Banner */}
      {isConnecting && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-30 bg-cyan-950/95 text-cyan-200 border border-cyan-400/80 rounded-full px-5 py-2 text-xs flex items-center space-x-3 shadow-2xl backdrop-blur animate-pulse">
          <Activity className="w-4 h-4 text-cyan-400" />
          <span>
            Connect virtual cable to target interface from <strong className="text-white">{connectingSource?.deviceName}</strong> ({connectingSource?.ifaceName})
          </span>
          <button
            onClick={() => {
              sound.playClick();
              onCancelConnecting();
            }}
            className="ml-2 px-2 py-0.5 rounded bg-rose-900/60 text-rose-300 hover:bg-rose-800 text-[10px] font-mono font-bold"
          >
            CANCEL
          </button>
        </div>
      )}

      {/* World Space Container (Zoom + Pan) */}
      <div
        style={{
          transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
          transformOrigin: '0 0',
          width: '100%',
          height: '100%',
          position: 'absolute',
          top: 0,
          left: 0,
        }}
      >
        {/* SVG Virtual Links Layer */}
        <svg className="absolute top-0 left-0 w-[6000px] h-[6000px] pointer-events-none">
          <defs>
            {/* Linear Gradient for Laser Ethernet Cables */}
            <linearGradient id="linkLaser" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#06b6d4" />
              <stop offset="50%" stopColor="#3b82f6" />
              <stop offset="100%" stopColor="#10b981" />
            </linearGradient>
            <filter id="laserGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          {links.map((link) => {
            const devA = topology.devices[link.device_a_id];
            const devB = topology.devices[link.device_b_id];
            if (!devA || !devB) return null;

            // Compute center of hardware cards (cards are 110x90)
            const x1 = (devA.x || 0) + 55;
            const y1 = (devA.y || 0) + 45;
            const x2 = (devB.x || 0) + 55;
            const y2 = (devB.y || 0) + 45;

            const isSelected = selectedLinkId === link.id;
            const ifaceA = devA.interfaces?.[link.interface_a_name];
            const ifaceB = devB.interfaces?.[link.interface_b_name];
            const isLinkOperational = link.is_up && ifaceA?.admin_up && ifaceB?.admin_up;

            // Active simulation event check
            const isTransmitting = activeEvent?.link_id === link.id;
            const isBroadcast = activeEvent?.metadata?.is_broadcast;

            const midX = (x1 + x2) / 2;
            const midY = (y1 + y2) / 2;

            return (
              <g 
                key={link.id} 
                className="pointer-events-auto cursor-pointer group" 
                onClick={() => {
                  sound.playClick();
                  onSelectLink(link.id);
                }}
              >
                {/* Thick invisible click target */}
                <line
                  x1={x1}
                  y1={y1}
                  x2={x2}
                  y2={y2}
                  stroke="transparent"
                  strokeWidth="24"
                />

                {/* Laser Glow Background Conduit */}
                <line
                  x1={x1}
                  y1={y1}
                  x2={x2}
                  y2={y2}
                  stroke={
                    isSelected
                      ? '#38bdf8'
                      : !isLinkOperational
                      ? 'rgba(244, 63, 94, 0.4)'
                      : 'rgba(6, 182, 212, 0.25)'
                  }
                  strokeWidth={isSelected ? 6 : 4}
                  strokeLinecap="round"
                />

                {/* Main Optical Cable Line */}
                <line
                  x1={x1}
                  y1={y1}
                  x2={x2}
                  y2={y2}
                  stroke={
                    isSelected
                      ? '#38bdf8'
                      : !isLinkOperational
                      ? '#f43f5e'
                      : '#10b981'
                  }
                  strokeWidth={isSelected ? 3 : 2}
                  strokeDasharray={!isLinkOperational ? '6 6' : undefined}
                  className={
                    isTransmitting 
                      ? (isBroadcast ? 'link-arp-broadcast' : 'link-transmitting') 
                      : (isLinkOperational ? 'link-idle-glow' : 'link-down-broken')
                  }
                />

                {/* Transmitting Packet Energy Orb */}
                {isTransmitting && (
                  <g>
                    <circle
                      cx={midX}
                      cy={midY}
                      r="9"
                      fill={isBroadcast ? '#f59e0b' : '#06b6d4'}
                      stroke="#ffffff"
                      strokeWidth="2"
                      className="animate-ping"
                    />
                    <circle
                      cx={midX}
                      cy={midY}
                      r="6"
                      fill={isBroadcast ? '#fbbf24' : '#38bdf8'}
                      stroke="#ffffff"
                      strokeWidth="1.5"
                    />
                  </g>
                )}

                {/* Interface Port Chips on Cable Ends */}
                <g className="select-none pointer-events-none font-mono">
                  {/* End A */}
                  <rect
                    x={x1 + (x2 - x1) * 0.22 - 20}
                    y={y1 + (y2 - y1) * 0.22 - 16}
                    width="40"
                    height="14"
                    rx="3"
                    fill="#020617"
                    stroke={isSelected ? "#38bdf8" : "#334155"}
                    strokeWidth="1"
                  />
                  <text
                    x={x1 + (x2 - x1) * 0.22}
                    y={y1 + (y2 - y1) * 0.22 - 6}
                    fill="#94a3b8"
                    fontSize="8"
                    fontWeight="bold"
                    textAnchor="middle"
                  >
                    {link.interface_a_name}
                  </text>

                  {/* End B */}
                  <rect
                    x={x2 - (x2 - x1) * 0.22 - 20}
                    y={y2 - (y2 - y1) * 0.22 - 16}
                    width="40"
                    height="14"
                    rx="3"
                    fill="#020617"
                    stroke={isSelected ? "#38bdf8" : "#334155"}
                    strokeWidth="1"
                  />
                  <text
                    x={x2 - (x2 - x1) * 0.22}
                    y={y2 - (y2 - y1) * 0.22 - 6}
                    fill="#94a3b8"
                    fontSize="8"
                    fontWeight="bold"
                    textAnchor="middle"
                  >
                    {link.interface_b_name}
                  </text>
                </g>
              </g>
            );
          })}
        </svg>

        {/* Network Hardware Device Cards */}
        {devices.map((dev) => {
          const isSelected = selectedDeviceId === dev.id;
          const isHovered = hoveredDeviceId === dev.id;
          const ifaces = Object.values(dev.interfaces || {});
          const connectedCount = ifaces.filter(i => i.link_id).length;
          const primaryIface = ifaces[0];
          const primaryIp = primaryIface?.ip_address;
          const prefix = primaryIface?.prefix;

          // Render authentic hardware chassis based on device type
          return (
            <div
              key={dev.id}
              style={{
                left: `${dev.x || 0}px`,
                top: `${dev.y || 0}px`,
              }}
              onMouseEnter={() => setHoveredDeviceId(dev.id)}
              onMouseLeave={() => setHoveredDeviceId(null)}
              onMouseDown={(e) => handleDeviceMouseDown(e, dev)}
              onClick={() => {
                if (isConnecting && connectingSource) {
                  const availIface = ifaces.find(i => !i.link_id);
                  if (availIface) {
                    sound.playCableConnect();
                    onCreateLink(connectingSource.deviceId, connectingSource.ifaceName, dev.id, availIface.name);
                  } else {
                    sound.playPacketDrop();
                    alert(`No free interface available on ${dev.name}`);
                  }
                } else {
                  sound.playClick();
                  onSelectDevice(dev.id);
                  onSelectLink(null);
                }
              }}
              className={`absolute w-28 h-24 rounded-xl flex flex-col p-2 transition-all duration-150 select-none cursor-pointer group ${
                isSelected 
                  ? 'device-card-selected bg-slate-900 border-cyan-400' 
                  : 'bg-slate-950/95 hover:bg-slate-900 border border-slate-800 hover:border-cyan-500/50 shadow-xl'
              }`}
            >
              {/* Hardware Chassis Top Bar: Model Badge + Power LED */}
              <div className="flex items-center justify-between border-b border-slate-800/80 pb-1 mb-1">
                <div className="flex items-center space-x-1">
                  <span className={`w-1.5 h-1.5 rounded-full ${
                    connectedCount > 0 ? 'bg-emerald-400 port-led-active' : 'bg-amber-400'
                  }`} />
                  <span className="text-[8px] font-mono font-bold uppercase tracking-wider text-slate-400">
                    {dev.device_type === 'switch' ? 'CATALYST' : dev.device_type === 'router' ? 'GATEWAY' : dev.device_type.toUpperCase()}
                  </span>
                </div>

                {/* Connect Port Button */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    sound.playClick();
                    const availIface = ifaces.find(i => !i.link_id);
                    if (availIface) {
                      onStartConnecting(dev.id, dev.name, availIface.name);
                    } else {
                      sound.playPacketDrop();
                      alert(`All ports on ${dev.name} are already connected.`);
                    }
                  }}
                  className="opacity-0 group-hover:opacity-100 transition p-0.5 rounded bg-cyan-600 hover:bg-cyan-500 text-white"
                  title="Wire a virtual cable from this device"
                >
                  <Unlink className="w-2.5 h-2.5" />
                </button>
              </div>

              {/* Hardware Body with Device-Specific Visuals */}
              <div className="flex-1 flex items-center space-x-2">
                {/* Specific Device Icon Avatar */}
                {dev.device_type === 'pc' && (
                  <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-blue-600 to-cyan-700 flex items-center justify-center text-white shadow-md flex-shrink-0 relative">
                    <Monitor className="w-5 h-5" />
                    <span className="absolute bottom-0.5 right-0.5 w-1 h-1 rounded-full bg-cyan-300 animate-ping" />
                  </div>
                )}

                {dev.device_type === 'laptop' && (
                  <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-indigo-600 to-blue-700 flex items-center justify-center text-white shadow-md flex-shrink-0">
                    <Laptop className="w-5 h-5" />
                  </div>
                )}

                {dev.device_type === 'switch' && (
                  <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-amber-600 to-orange-700 flex items-center justify-center text-white shadow-md flex-shrink-0 relative">
                    <Network className="w-5 h-5" />
                    {/* Visual 8-port bay grid */}
                    <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 flex space-x-0.5 px-1 py-0.5 bg-slate-950 rounded border border-slate-700">
                      {[0,1,2,3,4,5,6,7].map(idx => (
                        <div 
                          key={idx} 
                          className={`w-1 h-1 rounded-full ${
                            ifaces[idx]?.link_id ? 'bg-emerald-400 port-led-active' : 'bg-slate-700'
                          }`} 
                        />
                      ))}
                    </div>
                  </div>
                )}

                {dev.device_type === 'router' && (
                  <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-rose-600 to-red-700 flex items-center justify-center text-white shadow-md flex-shrink-0 relative overflow-hidden">
                    <RouterIcon className="w-5 h-5 relative z-10" />
                    <div className="absolute inset-0 border border-white/20 rounded-lg orbital-ring" />
                  </div>
                )}

                {dev.device_type === 'server' && (
                  <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-emerald-600 to-teal-700 flex items-center justify-center text-white shadow-md flex-shrink-0">
                    <Server className="w-5 h-5" />
                  </div>
                )}

                {dev.device_type === 'hub' && (
                  <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-purple-600 to-violet-700 flex items-center justify-center text-white shadow-md flex-shrink-0">
                    <Cpu className="w-5 h-5" />
                  </div>
                )}

                {/* Hostname & IP Addressing Label */}
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-xs text-slate-100 truncate tracking-tight">
                    {dev.name}
                  </div>
                  {primaryIp ? (
                    <div className="text-[9px] font-mono text-cyan-400 font-semibold truncate">
                      {primaryIp}{prefix ? `/${prefix}` : ''}
                    </div>
                  ) : (
                    <div className="text-[9px] font-mono text-slate-400">
                      {connectedCount} ports up
                    </div>
                  )}
                </div>
              </div>

              {/* Hardware Bottom Status Strip */}
              <div className="mt-1 pt-1 border-t border-slate-800/80 flex items-center justify-between text-[8px] font-mono text-slate-400">
                <span className="truncate">
                  {connectedCount}/{ifaces.length} UP
                </span>
                <span className="text-cyan-400/80 font-bold">
                  {dev.device_type === 'switch' ? 'L2' : dev.device_type === 'router' ? 'L3' : 'HOST'}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
