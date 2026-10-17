import React, { useState, useRef, useEffect } from 'react';
import CiscoDeviceIcon from './CiscoDeviceIcon.jsx';
import { sound } from '../utils/soundEffects.js';
import { 
  ZoomIn, ZoomOut, Maximize2, Trash2, Zap, 
  Mail, MousePointer, Activity, Play, Pause, SkipForward, RotateCcw
} from 'lucide-react';

export default function PacketTracerCanvas({
  topology,
  selectedDeviceId,
  selectedLinkId,
  onSelectDevice,
  onSelectLink,
  onUpdateDevicePosition,
  onAddDeviceAtPosition,
  onCreateLink,
  onDeleteDevice,
  onDeleteLink,
  activeEvent,
  events,
  activeEventIndex,
  onSendPing,
  activeTool, // 'select', 'pdu', 'connect', 'delete'
  setActiveTool,
  onOpenDeviceDialog
}) {
  const containerRef = useRef(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [startPan, setStartPan] = useState({ x: 0, y: 0 });
  const [draggingDeviceId, setDraggingDeviceId] = useState(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  // PDU tool selection state (Source -> Destination)
  const [pduSourceId, setPduSourceId] = useState(null);
  // Connect cable state (Device A -> Device B)
  const [cableSourceId, setCableSourceId] = useState(null);

  // Drag-and-drop from bottom shelf
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
    if (e.target === containerRef.current || e.target.tagName === 'svg' || e.target.id === 'canvas-surface') {
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

  const handleZoom = (delta) => {
    setZoom((prev) => Math.min(Math.max(0.4, prev + delta), 2.5));
    sound.playClick();
  };

  const resetView = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
    sound.playClick();
  };

  // Device interaction dispatcher
  const handleDeviceClick = (e, dev) => {
    e.stopPropagation();

    // 1. Delete tool active
    if (activeTool === 'delete') {
      sound.playPacketDrop();
      onDeleteDevice(dev.id);
      setActiveTool('select');
      return;
    }

    // 2. Simple PDU Ping tool active
    if (activeTool === 'pdu') {
      if (!pduSourceId) {
        // Pick source device
        sound.playClick();
        setPduSourceId(dev.id);
      } else {
        // Pick destination device
        if (pduSourceId === dev.id) {
          setPduSourceId(null);
          return;
        }
        // Find destination IP
        const targetIface = Object.values(dev.interfaces || {}).find(i => i.ip_address);
        if (targetIface && targetIface.ip_address) {
          sound.playPacketLaunch();
          onSendPing(pduSourceId, targetIface.ip_address);
        } else {
          sound.playPacketDrop();
          alert(`Device ${dev.name} does not have an IP address configured!`);
        }
        setPduSourceId(null);
        setActiveTool('select');
      }
      return;
    }

    // 3. Connect cable tool active
    if (activeTool === 'connect') {
      if (!cableSourceId) {
        sound.playClick();
        setCableSourceId(dev.id);
      } else {
        if (cableSourceId === dev.id) {
          setCableSourceId(null);
          return;
        }
        // Auto connect first available ports
        const devA = topology.devices[cableSourceId];
        const ifaceA = Object.values(devA?.interfaces || {}).find(i => !i.link_id);
        const ifaceB = Object.values(dev?.interfaces || {}).find(i => !i.link_id);

        if (ifaceA && ifaceB) {
          sound.playCableConnect();
          onCreateLink(cableSourceId, ifaceA.name, dev.id, ifaceB.name);
        } else {
          sound.playPacketDrop();
          alert('No free interface available to connect these devices.');
        }
        setCableSourceId(null);
        setActiveTool('select');
      }
      return;
    }

    // 4. Default Select Tool: open device configuration dialog!
    sound.playClick();
    onSelectDevice(dev.id);
    onOpenDeviceDialog(dev);
  };

  const handleDeviceMouseDown = (e, dev) => {
    e.stopPropagation();
    if (activeTool !== 'select') return;

    onSelectDevice(dev.id);
    setDraggingDeviceId(dev.id);

    const rect = containerRef.current.getBoundingClientRect();
    const mouseCanvasX = (e.clientX - rect.left - pan.x) / zoom;
    const mouseCanvasY = (e.clientY - rect.top - pan.y) / zoom;

    setDragOffset({
      x: mouseCanvasX - (dev.x || 0),
      y: mouseCanvasY - (dev.y || 0)
    });
  };

  const devices = Object.values(topology?.devices || {});
  const links = Object.values(topology?.links || {});

  return (
    <div
      ref={containerRef}
      id="canvas-surface"
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      className={`relative flex-1 h-full overflow-hidden select-none bg-slate-900 canvas-grid ${
        activeTool === 'pdu' ? 'cursor-copy' : activeTool === 'connect' ? 'cursor-cell' : activeTool === 'delete' ? 'cursor-not-allowed' : 'cursor-default'
      }`}
    >
      {/* Active Tool Status Banner (Top Center) */}
      {activeTool === 'pdu' && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-30 bg-amber-500 text-slate-950 font-bold px-4 py-1.5 rounded-full shadow-lg flex items-center space-x-2 text-xs border border-white/50 animate-bounce">
          <Mail className="w-4 h-4 fill-current" />
          <span>
            {pduSourceId 
              ? `Select TARGET device to ping from ${topology.devices[pduSourceId]?.name}`
              : `Click SOURCE device to initiate Simple PDU Ping`}
          </span>
          <button 
            onClick={() => { setActiveTool('select'); setPduSourceId(null); }}
            className="ml-2 text-xs underline hover:text-white"
          >
            Cancel
          </button>
        </div>
      )}

      {activeTool === 'connect' && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-30 bg-cyan-500 text-slate-950 font-bold px-4 py-1.5 rounded-full shadow-lg flex items-center space-x-2 text-xs border border-white/50 animate-pulse">
          <Zap className="w-4 h-4 fill-current" />
          <span>
            {cableSourceId 
              ? `Select second device to connect cable from ${topology.devices[cableSourceId]?.name}`
              : `Click FIRST device to plug in virtual cable`}
          </span>
          <button 
            onClick={() => { setActiveTool('select'); setCableSourceId(null); }}
            className="ml-2 text-xs underline hover:text-white"
          >
            Cancel
          </button>
        </div>
      )}

      {activeTool === 'delete' && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-30 bg-rose-600 text-white font-bold px-4 py-1.5 rounded-full shadow-lg flex items-center space-x-2 text-xs border border-white/50">
          <Trash2 className="w-4 h-4" />
          <span>Click any device or wire to delete it</span>
          <button 
            onClick={() => setActiveTool('select')}
            className="ml-2 text-xs underline hover:text-white"
          >
            Done
          </button>
        </div>
      )}

      {/* Floating Zoom Controls (Top Right) */}
      <div className="absolute top-4 right-4 z-20 flex items-center space-x-1 bg-slate-950/80 backdrop-blur border border-slate-700 rounded-lg p-1 shadow-md">
        <button
          onClick={() => handleZoom(0.15)}
          className="p-1 text-slate-300 hover:text-cyan-400 rounded"
          title="Zoom In"
        >
          <ZoomIn className="w-4 h-4" />
        </button>
        <span className="text-[11px] font-mono px-1.5 text-slate-300 font-bold">
          {Math.round(zoom * 100)}%
        </span>
        <button
          onClick={() => handleZoom(-0.15)}
          className="p-1 text-slate-300 hover:text-cyan-400 rounded"
          title="Zoom Out"
        >
          <ZoomOut className="w-4 h-4" />
        </button>
        <button
          onClick={resetView}
          className="p-1 text-slate-300 hover:text-cyan-400 rounded"
          title="Reset View"
        >
          <Maximize2 className="w-4 h-4" />
        </button>
      </div>

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
        <svg className="absolute top-0 left-0 w-[8000px] h-[8000px] pointer-events-none">
          {links.map((link) => {
            const devA = topology.devices[link.device_a_id];
            const devB = topology.devices[link.device_b_id];
            if (!devA || !devB) return null;

            // Compute center of Cisco hardware devices (64x64)
            const x1 = (devA.x || 0) + 32;
            const y1 = (devA.y || 0) + 32;
            const x2 = (devB.x || 0) + 32;
            const y2 = (devB.y || 0) + 32;

            const isSelected = selectedLinkId === link.id;
            const ifaceA = devA.interfaces?.[link.interface_a_name];
            const ifaceB = devB.interfaces?.[link.interface_b_name];
            const isLinkOperational = link.is_up && ifaceA?.admin_up && ifaceB?.admin_up;

            const isTransmitting = activeEvent?.link_id === link.id;
            const isBroadcast = activeEvent?.metadata?.is_broadcast;

            const midX = (x1 + x2) / 2;
            const midY = (y1 + y2) / 2;

            // Unit vector for port LED triangles positioning
            const dx = x2 - x1;
            const dy = y2 - y1;
            const dist = Math.sqrt(dx * dx + dy * dy) || 1;
            const ux = dx / dist;
            const uy = dy / dist;

            // Coordinates for port triangles (28px away from center)
            const ledAx = x1 + ux * 36;
            const ledAy = y1 + uy * 36;
            const ledBx = x2 - ux * 36;
            const ledBy = y2 - uy * 36;

            return (
              <g 
                key={link.id} 
                className="pointer-events-auto cursor-pointer"
                onClick={(e) => {
                  e.stopPropagation();
                  if (activeTool === 'delete') {
                    sound.playPacketDrop();
                    onDeleteLink(link.id);
                    setActiveTool('select');
                  } else {
                    sound.playClick();
                    onSelectLink(link.id);
                  }
                }}
              >
                {/* Thick invisible click target */}
                <line
                  x1={x1}
                  y1={y1}
                  x2={x2}
                  y2={y2}
                  stroke="transparent"
                  strokeWidth="20"
                />

                {/* Main Physical Ethernet Cable (Classic Packet Tracer Solid Black / Dark Slate) */}
                <line
                  x1={x1}
                  y1={y1}
                  x2={x2}
                  y2={y2}
                  stroke={isSelected ? '#38bdf8' : isLinkOperational ? '#1e293b' : '#991b1b'}
                  strokeWidth={isSelected ? 3.5 : 2.5}
                  strokeDasharray={!isLinkOperational ? '6 6' : undefined}
                />

                {/* Packet Tracer Iconic Port Link LED Triangles (▲ / ▼) */}
                {/* Port A Link Light */}
                <polygon
                  points={`${ledAx},${ledAy - 5} ${ledAx + 5},${ledAy + 5} ${ledAx - 5},${ledAy + 5}`}
                  fill={ifaceA?.admin_up && isLinkOperational ? '#10b981' : '#ef4444'}
                  stroke="#0f172a"
                  strokeWidth="1"
                  className={isTransmitting ? 'animate-ping' : ''}
                />

                {/* Port B Link Light */}
                <polygon
                  points={`${ledBx},${ledBy - 5} ${ledBx + 5},${ledBy + 5} ${ledBx - 5},${ledBy + 5}`}
                  fill={ifaceB?.admin_up && isLinkOperational ? '#10b981' : '#ef4444'}
                  stroke="#0f172a"
                  strokeWidth="1"
                  className={isTransmitting ? 'animate-ping' : ''}
                />

                {/* Port Names */}
                <text
                  x={ledAx + uy * 10}
                  y={ledAy - ux * 10}
                  fill="#94a3b8"
                  fontSize="9"
                  fontFamily="monospace"
                  textAnchor="middle"
                  className="select-none pointer-events-none"
                >
                  {link.interface_a_name}
                </text>
                <text
                  x={ledBx + uy * 10}
                  y={ledBy - ux * 10}
                  fill="#94a3b8"
                  fontSize="9"
                  fontFamily="monospace"
                  textAnchor="middle"
                  className="select-none pointer-events-none"
                >
                  {link.interface_b_name}
                </text>

                {/* Packet Tracer Iconic Flying PDU Envelope ✉️ */}
                {isTransmitting && (
                  <g className="animate-in fade-in duration-100">
                    {/* Envelope Icon Body */}
                    <rect
                      x={midX - 14}
                      y={midY - 10}
                      width="28"
                      height="20"
                      rx="3"
                      fill={isBroadcast ? "#fef08a" : "#bae6fd"}
                      stroke={isBroadcast ? "#ca8a04" : "#0284c7"}
                      strokeWidth="1.5"
                      className="shadow-lg"
                    />
                    {/* Envelope Flap Lines */}
                    <polyline
                      points={`${midX - 14},${midY - 10} ${midX},${midY + 2} ${midX + 14},${midY - 10}`}
                      fill="none"
                      stroke={isBroadcast ? "#ca8a04" : "#0284c7"}
                      strokeWidth="1.5"
                    />
                    {/* Protocol Badge Tag */}
                    <rect
                      x={midX - 12}
                      y={midY - 19}
                      width="24"
                      height="8"
                      rx="2"
                      fill={isBroadcast ? "#ca8a04" : "#0369a1"}
                    />
                    <text
                      x={midX}
                      y={midY - 13}
                      fill="#ffffff"
                      fontSize="7"
                      fontWeight="bold"
                      fontFamily="monospace"
                      textAnchor="middle"
                    >
                      {isBroadcast ? "ARP" : "ICMP"}
                    </text>
                  </g>
                )}
              </g>
            );
          })}
        </svg>

        {/* Cisco Packet Tracer Devices Layer */}
        {devices.map((dev) => {
          const isSelected = selectedDeviceId === dev.id;
          const isPduSource = pduSourceId === dev.id;
          const isCableSource = cableSourceId === dev.id;

          // Primary IP address
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
              onClick={(e) => handleDeviceClick(e, dev)}
              className={`absolute flex flex-col items-center justify-center p-1 select-none cursor-pointer group transition-transform ${
                isSelected ? 'scale-105' : 'hover:scale-102'
              }`}
            >
              {/* PDU Pick Indicator */}
              {isPduSource && (
                <div className="absolute -top-7 px-2 py-0.5 bg-amber-400 text-slate-950 font-bold text-[9px] rounded-full shadow animate-bounce font-mono">
                  SOURCE ✉️
                </div>
              )}

              {/* Cable Pick Indicator */}
              {isCableSource && (
                <div className="absolute -top-7 px-2 py-0.5 bg-cyan-400 text-slate-950 font-bold text-[9px] rounded-full shadow animate-pulse font-mono">
                  CABLE PLUG 🔌
                </div>
              )}

              {/* Iconic Cisco Vector Graphic */}
              <div className={`p-1 rounded-xl transition ${
                isSelected 
                  ? 'ring-2 ring-cyan-400 bg-cyan-950/30' 
                  : 'hover:bg-slate-800/40'
              }`}>
                <CiscoDeviceIcon type={dev.device_type} size={54} />
              </div>

              {/* Device Hostname (Classic Packet Tracer Bold Centered Label) */}
              <div className="mt-1 text-center font-bold text-xs text-slate-100 tracking-tight drop-shadow">
                {dev.name}
              </div>

              {/* IP Address Sub-Label */}
              {primaryIp && (
                <div className="text-[10px] font-mono font-medium text-cyan-400/90 text-center drop-shadow">
                  {primaryIp}{prefix ? `/${prefix}` : ''}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
