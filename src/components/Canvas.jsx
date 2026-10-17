import React, { useState, useRef, useEffect } from 'react';
import { 
  Monitor, Laptop, Network, Router as RouterIcon, 
  Server, Cpu, ZoomIn, ZoomOut, Maximize2, Trash2, 
  Unlink, Radio, Activity, CheckCircle2, XCircle
} from 'lucide-react';

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
  onStartConnecting
}) {
  const containerRef = useRef(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [startPan, setStartPan] = useState({ x: 0, y: 0 });
  const [draggingDeviceId, setDraggingDeviceId] = useState(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

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
  };

  const resetView = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  // Device Dragging start
  const handleDeviceMouseDown = (e, device) => {
    e.stopPropagation();
    if (isConnecting) return;

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

  const getDeviceIcon = (type) => {
    switch (type) {
      case 'pc': return Monitor;
      case 'laptop': return Laptop;
      case 'switch': return Network;
      case 'router': return RouterIcon;
      case 'server': return Server;
      case 'hub': return Cpu;
      default: return Monitor;
    }
  };

  const getDeviceColor = (type) => {
    switch (type) {
      case 'pc': return 'from-blue-600 to-cyan-600 border-cyan-500';
      case 'laptop': return 'from-indigo-600 to-blue-600 border-blue-500';
      case 'switch': return 'from-amber-600 to-orange-600 border-amber-500';
      case 'router': return 'from-rose-600 to-red-600 border-rose-500';
      case 'server': return 'from-emerald-600 to-teal-600 border-emerald-500';
      case 'hub': return 'from-purple-600 to-violet-600 border-purple-500';
      default: return 'from-slate-600 to-slate-700 border-slate-500';
    }
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
      className="relative flex-1 h-full canvas-grid overflow-hidden select-none cursor-grab active:cursor-grabbing"
    >
      {/* Zoom / View Control Floating Bar */}
      <div className="absolute top-4 right-4 z-20 flex items-center space-x-1.5 bg-slate-900/90 backdrop-blur border border-slate-800 rounded-lg p-1 shadow-lg">
        <button
          onClick={() => handleZoom(0.15)}
          className="p-1.5 text-slate-300 hover:text-white hover:bg-slate-800 rounded transition"
          title="Zoom In (+)"
        >
          <ZoomIn className="w-4 h-4" />
        </button>
        <span className="text-[11px] font-mono px-1.5 text-slate-400">
          {Math.round(zoom * 100)}%
        </span>
        <button
          onClick={() => handleZoom(-0.15)}
          className="p-1.5 text-slate-300 hover:text-white hover:bg-slate-800 rounded transition"
          title="Zoom Out (-)"
        >
          <ZoomOut className="w-4 h-4" />
        </button>
        <button
          onClick={resetView}
          className="p-1.5 text-slate-300 hover:text-white hover:bg-slate-800 rounded transition"
          title="Reset View (100%)"
        >
          <Maximize2 className="w-4 h-4" />
        </button>
      </div>

      {/* Connecting Mode Banner */}
      {isConnecting && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 bg-cyan-950/90 text-cyan-200 border border-cyan-500/50 rounded-full px-4 py-1.5 text-xs flex items-center space-x-2 shadow-lg backdrop-blur">
          <Activity className="w-4 h-4 animate-spin text-cyan-400" />
          <span>
            Select target device to complete virtual Ethernet link from <strong>{connectingSource?.deviceName}</strong> ({connectingSource?.ifaceName})
          </span>
          <button
            onClick={onCancelConnecting}
            className="ml-2 underline text-cyan-400 hover:text-white"
          >
            Cancel
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
        <svg className="absolute top-0 left-0 w-[5000px] h-[5000px] pointer-events-none">
          {links.map((link) => {
            const devA = topology.devices[link.device_a_id];
            const devB = topology.devices[link.device_b_id];
            if (!devA || !devB) return null;

            const x1 = (devA.x || 0) + 40;
            const y1 = (devA.y || 0) + 40;
            const x2 = (devB.x || 0) + 40;
            const y2 = (devB.y || 0) + 40;

            const isSelected = selectedLinkId === link.id;
            const ifaceA = devA.interfaces?.[link.interface_a_name];
            const ifaceB = devB.interfaces?.[link.interface_b_name];
            const isLinkOperational = link.is_up && ifaceA?.admin_up && ifaceB?.admin_up;

            // Check if active simulation event is on this link
            const isTransmitting = activeEvent?.link_id === link.id;
            const isBroadcast = activeEvent?.metadata?.is_broadcast;

            // Middle coordinate for label
            const midX = (x1 + x2) / 2;
            const midY = (y1 + y2) / 2;

            return (
              <g key={link.id} className="pointer-events-auto cursor-pointer" onClick={() => onSelectLink(link.id)}>
                {/* Thick invisible click target */}
                <line
                  x1={x1}
                  y1={y1}
                  x2={x2}
                  y2={y2}
                  stroke="transparent"
                  strokeWidth="20"
                />

                {/* Main Link Line */}
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
                  strokeWidth={isSelected ? 3.5 : 2}
                  strokeDasharray={!isLinkOperational ? '6 6' : undefined}
                  className={isTransmitting ? (isBroadcast ? 'link-arp-broadcast' : 'link-transmitting') : ''}
                />

                {/* Packet Simulation Marker (Travels along link) */}
                {isTransmitting && (
                  <circle
                    cx={midX}
                    cy={midY}
                    r="7"
                    fill={isBroadcast ? '#f59e0b' : '#38bdf8'}
                    stroke="#ffffff"
                    strokeWidth="2"
                    className="animate-ping"
                  />
                )}

                {/* Link Interface Badges */}
                <text
                  x={x1 + (x2 - x1) * 0.18}
                  y={y1 + (y2 - y1) * 0.18 - 8}
                  fill="#94a3b8"
                  fontSize="9"
                  fontFamily="monospace"
                  textAnchor="middle"
                  className="bg-slate-950 px-1 select-none pointer-events-none"
                >
                  {link.interface_a_name}
                </text>
                <text
                  x={x2 - (x2 - x1) * 0.18}
                  y={y2 - (y2 - y1) * 0.18 - 8}
                  fill="#94a3b8"
                  fontSize="9"
                  fontFamily="monospace"
                  textAnchor="middle"
                  className="bg-slate-950 px-1 select-none pointer-events-none"
                >
                  {link.interface_b_name}
                </text>
              </g>
            );
          })}
        </svg>

        {/* Network Devices Layer */}
        {devices.map((dev) => {
          const Icon = getDeviceIcon(dev.device_type);
          const isSelected = selectedDeviceId === dev.id;
          const colorClasses = getDeviceColor(dev.device_type);

          // Get primary operational IP if exists
          const primaryIface = Object.values(dev.interfaces || {})[0];
          const primaryIp = primaryIface?.ip_address;
          const prefix = primaryIface?.prefix;

          return (
            <div
              key={dev.id}
              style={{
                left: `${dev.x || 0}px`,
                top: `${dev.y || 0}px`,
              }}
              onMouseDown={(e) => handleDeviceMouseDown(e, dev)}
              onClick={() => {
                if (isConnecting && connectingSource) {
                  // Connect to first available port on target device
                  const availIface = Object.values(dev.interfaces || {}).find(i => !i.link_id);
                  if (availIface) {
                    onCreateLink(connectingSource.deviceId, connectingSource.ifaceName, dev.id, availIface.name);
                  } else {
                    alert(`No free interface available on ${dev.name}`);
                  }
                } else {
                  onSelectDevice(dev.id);
                  onSelectLink(null);
                }
              }}
              className={`absolute w-20 h-20 rounded-xl flex flex-col items-center justify-center p-2 transition shadow-lg select-none cursor-pointer ${
                isSelected ? 'device-selected ring-2 ring-cyan-400 bg-slate-900' : 'bg-slate-900/95 hover:bg-slate-850'
              } border border-slate-700/80`}
            >
              {/* Device Icon Avatar */}
              <div className={`w-10 h-10 rounded-lg bg-gradient-to-tr ${colorClasses} flex items-center justify-center text-white shadow-md relative group`}>
                <Icon className="w-5 h-5" />

                {/* Port Connector Button on hover */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    const availIface = Object.values(dev.interfaces || {}).find(i => !i.link_id);
                    if (availIface) {
                      onStartConnecting(dev.id, dev.name, availIface.name);
                    } else {
                      alert(`All ports on ${dev.name} are already connected.`);
                    }
                  }}
                  className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-cyan-600 hover:bg-cyan-500 text-white flex items-center justify-center shadow opacity-0 group-hover:opacity-100 transition"
                  title="Connect Virtual Cable from this device"
                >
                  <Unlink className="w-3 h-3" />
                </button>
              </div>

              {/* Device Name Label */}
              <div className="mt-1 text-center font-semibold text-[11px] text-slate-100 truncate w-full">
                {dev.name}
              </div>

              {/* IP Address Label (if host/router has IP) */}
              {primaryIp && (
                <div className="text-[9px] font-mono text-cyan-400 truncate w-full text-center">
                  {primaryIp}{prefix ? `/${prefix}` : ''}
                </div>
              )}

              {/* Port count indicator for switches/routers */}
              {dev.device_type === 'switch' && (
                <div className="text-[8px] text-slate-400">
                  {Object.values(dev.interfaces || {}).filter(i => i.link_id).length}/8 Ports
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
