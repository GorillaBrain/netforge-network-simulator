import React, { useState, useRef, useEffect } from 'react';
import { 
  Terminal as TerminalIcon, Activity, Search, Calculator, 
  BookOpen, Play, Pause, SkipForward, RotateCcw, ChevronUp, 
  ChevronDown, CheckCircle2, AlertCircle, XCircle, Info, 
  Sparkles, Layers, ShieldCheck, ArrowRight, CornerDownLeft
} from 'lucide-react';
import confetti from 'canvas-confetti';

export default function BottomDock({
  topology,
  selectedDeviceId,
  onSelectDevice,
  events,
  activeEventIndex,
  onStepForward,
  onStepBackward,
  onPlay,
  onPause,
  isPlaying,
  playbackSpeed,
  onChangeSpeed,
  onResetSimulation,
  onRunCliCommand,
  cliHistory,
  cliOutput,
  currentCliPrompt,
  selectedLab,
  labEvaluation,
  onVerifyLab,
  onSelectLab
}) {
  const [activeTab, setActiveTab] = useState('terminal'); // 'terminal', 'events', 'inspector', 'subnet', 'labs'
  const [isMinimized, setIsMinimized] = useState(false);
  const [cliInput, setCliInput] = useState('');
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [localHistory, setLocalHistory] = useState([]);
  const terminalEndRef = useRef(null);

  // Subnet Calc internal state
  const [calcIp, setCalcIp] = useState('192.168.1.10');
  const [calcPrefix, setCalcPrefix] = useState(24);
  const [calcCompareIp, setCalcCompareIp] = useState('192.168.1.50');
  const [calcData, setCalcData] = useState(null);

  // Filter events
  const [eventFilter, setEventFilter] = useState('ALL'); // 'ALL', 'ARP', 'SWITCH', 'ROUTE', 'ICMP', 'DROP'

  // Auto scroll terminal to bottom
  useEffect(() => {
    if (activeTab === 'terminal') {
      terminalEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [cliOutput, activeTab]);

  // Trigger confetti on lab completion
  useEffect(() => {
    if (labEvaluation?.completed) {
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 }
      });
    }
  }, [labEvaluation?.completed]);

  // Recalculate subnet info locally for instant response
  useEffect(() => {
    try {
      const parts = calcIp.split('.').map(Number);
      if (parts.length === 4 && parts.every(p => !isNaN(p) && p >= 0 && p <= 255)) {
        const ipInt = ((parts[0] << 24) | (parts[1] << 16) | (parts[2] << 8) | parts[3]) >>> 0;
        const prefix = Number(calcPrefix);
        const maskInt = prefix === 0 ? 0 : (((0xFFFFFFFF << (32 - prefix)) >>> 0) & 0xFFFFFFFF);
        const wildcardInt = (~maskInt) >>> 0;
        const netInt = (ipInt & maskInt) >>> 0;
        const bcastInt = (netInt | wildcardInt) >>> 0;

        const toIpStr = (n) => `${(n >>> 24) & 255}.${(n >>> 16) & 255}.${(n >>> 8) & 255}.${n & 255}`;
        const toBinStr = (n) => {
          const raw = (n >>> 0).toString(2).padStart(32, '0');
          return `${raw.slice(0, 8)}.${raw.slice(8, 16)}.${raw.slice(16, 24)}.${raw.slice(24, 32)}`;
        };

        const totalAddrs = Math.pow(2, 32 - prefix);
        let usable = Math.max(0, totalAddrs - 2);
        let firstUsable = toIpStr(netInt + 1);
        let lastUsable = toIpStr(bcastInt - 1);

        if (prefix === 31) {
          usable = 2;
          firstUsable = toIpStr(netInt);
          lastUsable = toIpStr(bcastInt);
        } else if (prefix === 32) {
          usable = 1;
          firstUsable = toIpStr(ipInt);
          lastUsable = toIpStr(ipInt);
        }

        // Compare IP
        let compareMatch = null;
        if (calcCompareIp) {
          const cParts = calcCompareIp.split('.').map(Number);
          if (cParts.length === 4 && cParts.every(p => !isNaN(p) && p >= 0 && p <= 255)) {
            const cInt = ((cParts[0] << 24) | (cParts[1] << 16) | (cParts[2] << 8) | cParts[3]) >>> 0;
            const cNet = (cInt & maskInt) >>> 0;
            compareMatch = (cNet === netInt);
          }
        }

        setCalcData({
          ip: calcIp,
          prefix,
          subnet_mask: toIpStr(maskInt),
          wildcard_mask: toIpStr(wildcardInt),
          network_address: toIpStr(netInt),
          broadcast_address: toIpStr(bcastInt),
          first_usable: firstUsable,
          last_usable: lastUsable,
          usable_hosts: usable,
          total_addresses: totalAddrs,
          ip_binary: toBinStr(ipInt),
          mask_binary: toBinStr(maskInt),
          network_binary: toBinStr(netInt),
          compare_match: compareMatch
        });
      }
    } catch (e) {
      // Ignored
    }
  }, [calcIp, calcPrefix, calcCompareIp]);

  const handleCliSubmit = (e) => {
    e.preventDefault();
    if (!cliInput.trim()) return;
    onRunCliCommand(cliInput.trim());
    setLocalHistory(prev => [...prev, cliInput.trim()]);
    setHistoryIndex(-1);
    setCliInput('');
  };

  const handleKeyDown = (e) => {
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (localHistory.length > 0) {
        const nextIdx = historyIndex + 1 < localHistory.length ? historyIndex + 1 : historyIndex;
        setHistoryIndex(nextIdx);
        setCliInput(localHistory[localHistory.length - 1 - nextIdx]);
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (historyIndex > 0) {
        const nextIdx = historyIndex - 1;
        setHistoryIndex(nextIdx);
        setCliInput(localHistory[localHistory.length - 1 - nextIdx]);
      } else if (historyIndex === 0) {
        setHistoryIndex(-1);
        setCliInput('');
      }
    }
  };

  const activeEvent = events && activeEventIndex >= 0 ? events[activeEventIndex] : null;

  const filteredEvents = (events || []).filter(e => {
    if (eventFilter === 'ALL') return true;
    if (eventFilter === 'ARP') return e.event_type.includes('ARP');
    if (eventFilter === 'SWITCH') return e.event_type.includes('SWITCH');
    if (eventFilter === 'ROUTE') return e.event_type.includes('ROUTER') || e.event_type.includes('ROUTE');
    if (eventFilter === 'ICMP') return e.event_type.includes('ICMP') || e.event_type.includes('PING');
    if (eventFilter === 'DROP') return e.event_type.includes('DROP') || e.status === 'DROP' || e.status === 'ERROR';
    return true;
  });

  const selectedDev = topology?.devices?.[selectedDeviceId];

  return (
    <footer className={`border-t border-slate-800 bg-slate-900/95 backdrop-blur z-20 flex flex-col transition-all duration-200 select-none ${
      isMinimized ? 'h-10' : 'h-72'
    }`}>
      {/* Dock Bar Header (Tabs & Playback Controls) */}
      <div className="h-10 px-3 border-b border-slate-800 flex items-center justify-between bg-slate-950/80">
        {/* Navigation Tabs */}
        <div className="flex items-center space-x-1">
          <button
            onClick={() => { setActiveTab('terminal'); setIsMinimized(false); }}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition ${
              activeTab === 'terminal' && !isMinimized
                ? 'bg-slate-800 text-cyan-400 border border-slate-700 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-850'
            }`}
          >
            <TerminalIcon className="w-3.5 h-3.5" />
            <span>Terminal CLI</span>
            {selectedDev && (
              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-900 text-slate-300 border border-slate-700/80">
                {selectedDev.name}
              </span>
            )}
          </button>

          <button
            onClick={() => { setActiveTab('events'); setIsMinimized(false); }}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition ${
              activeTab === 'events' && !isMinimized
                ? 'bg-slate-800 text-cyan-400 border border-slate-700 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-850'
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            <span>Simulation Events</span>
            {events?.length > 0 && (
              <span className="text-[10px] font-mono px-1.5 rounded-full bg-cyan-950 text-cyan-300 border border-cyan-800">
                {events.length}
              </span>
            )}
          </button>

          <button
            onClick={() => { setActiveTab('inspector'); setIsMinimized(false); }}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition ${
              activeTab === 'inspector' && !isMinimized
                ? 'bg-slate-800 text-cyan-400 border border-slate-700 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-850'
            }`}
          >
            <Search className="w-3.5 h-3.5" />
            <span>Packet Inspector</span>
          </button>

          <button
            onClick={() => { setActiveTab('subnet'); setIsMinimized(false); }}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition ${
              activeTab === 'subnet' && !isMinimized
                ? 'bg-slate-800 text-cyan-400 border border-slate-700 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-850'
            }`}
          >
            <Calculator className="w-3.5 h-3.5" />
            <span>Subnet Calculator</span>
          </button>

          <button
            onClick={() => { setActiveTab('labs'); setIsMinimized(false); }}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition ${
              activeTab === 'labs' && !isMinimized
                ? 'bg-slate-800 text-cyan-400 border border-slate-700 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-850'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>Guided Lab</span>
            {labEvaluation?.completed && (
              <span className="text-[10px] text-emerald-400 font-bold">✓ Complete</span>
            )}
          </button>
        </div>

        {/* Playback Controls (Discrete Simulation Stepper) */}
        <div className="flex items-center space-x-2">
          {events?.length > 0 && (
            <div className="flex items-center space-x-1 bg-slate-900 border border-slate-800 rounded-lg p-0.5">
              <button
                onClick={onStepBackward}
                disabled={activeEventIndex <= 0}
                className="p-1 text-slate-400 hover:text-white disabled:opacity-30 rounded transition"
                title="Step Backward"
              >
                <SkipForward className="w-3.5 h-3.5 rotate-180" />
              </button>

              <button
                onClick={isPlaying ? onPause : onPlay}
                className="p-1 text-cyan-400 hover:text-cyan-300 rounded transition"
                title={isPlaying ? 'Pause Simulation' : 'Play Simulation'}
              >
                {isPlaying ? <Pause className="w-3.5 h-3.5 fill-current" /> : <Play className="w-3.5 h-3.5 fill-current" />}
              </button>

              <button
                onClick={onStepForward}
                disabled={activeEventIndex >= events.length - 1}
                className="p-1 text-slate-400 hover:text-white disabled:opacity-30 rounded transition"
                title="Step Forward (advance one event)"
              >
                <SkipForward className="w-3.5 h-3.5" />
              </button>

              <div className="h-3.5 w-px bg-slate-800 mx-1" />

              <span className="text-[10px] font-mono text-slate-400 px-1">
                Step {activeEventIndex + 1}/{events.length}
              </span>

              <select
                value={playbackSpeed}
                onChange={(e) => onChangeSpeed(Number(e.target.value))}
                className="bg-transparent text-[10px] font-mono text-slate-400 border-none outline-none cursor-pointer pr-1"
                title="Simulation speed"
              >
                <option value={0.5} className="bg-slate-900">0.5x</option>
                <option value={1} className="bg-slate-900">1x</option>
                <option value={2} className="bg-slate-900">2x</option>
              </select>

              <button
                onClick={onResetSimulation}
                className="p-1 text-slate-400 hover:text-rose-400 rounded transition"
                title="Clear simulation trace"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Minimize / Maximize Dock Button */}
          <button
            onClick={() => setIsMinimized(!isMinimized)}
            className="p-1 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded transition"
            title={isMinimized ? 'Expand Dock' : 'Collapse Dock'}
          >
            {isMinimized ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Dock Content Body */}
      {!isMinimized && (
        <div className="flex-1 overflow-hidden">
          {/* 1. CLI TERMINAL TAB */}
          {activeTab === 'terminal' && (
            <div className="h-full flex flex-col bg-slate-950 font-mono text-xs">
              {/* Device Selector Subbar */}
              <div className="h-7 border-b border-slate-850 px-3 flex items-center justify-between text-[11px] text-slate-400 bg-slate-900/40">
                <div className="flex items-center space-x-2">
                  <span>Connected Device:</span>
                  <select
                    value={selectedDeviceId || ''}
                    onChange={(e) => onSelectDevice(e.target.value)}
                    className="bg-slate-800 text-slate-200 border border-slate-700 rounded px-1.5 py-0.5 text-[11px] outline-none"
                  >
                    {Object.values(topology?.devices || {}).map(d => (
                      <option key={d.id} value={d.id}>{d.name} ({d.device_type})</option>
                    ))}
                  </select>
                </div>
                <div className="flex items-center space-x-2 text-[10px] text-slate-500">
                  <span>Supported: ping, traceroute, show ip, show interfaces, show arp, show mac, show ip route, conf t</span>
                </div>
              </div>

              {/* Terminal Screen */}
              <div className="flex-1 overflow-y-auto p-3 space-y-1 text-slate-200">
                <div className="text-slate-400 text-[11px]">
                  NetForge Simulated Cisco IOS Terminal — Type 'help' or '?' for command reference.
                </div>
                {cliOutput.map((item, idx) => (
                  <div key={idx} className="space-y-0.5">
                    {item.command && (
                      <div className="text-cyan-400 flex items-center space-x-1.5">
                        <span className="text-slate-500">{item.prompt || '>'}</span>
                        <span className="font-semibold">{item.command}</span>
                      </div>
                    )}
                    {item.text && (
                      <pre className="text-slate-300 font-mono text-xs whitespace-pre-wrap pl-2 leading-relaxed">
                        {item.text}
                      </pre>
                    )}
                  </div>
                ))}
                <div ref={terminalEndRef} />
              </div>

              {/* CLI Input Form */}
              <form onSubmit={handleCliSubmit} className="h-9 border-t border-slate-800 px-3 flex items-center space-x-2 bg-slate-900/60">
                <span className="text-cyan-400 font-semibold">{currentCliPrompt || 'NetForge>'}</span>
                <input
                  type="text"
                  value={cliInput}
                  onChange={(e) => setCliInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Enter network command (e.g. 'ping 192.168.1.20', 'show ip', 'conf t')..."
                  className="flex-1 bg-transparent text-slate-100 font-mono text-xs outline-none"
                  autoFocus
                />
                <button
                  type="submit"
                  className="p-1 text-slate-400 hover:text-cyan-400"
                  title="Execute command"
                >
                  <CornerDownLeft className="w-3.5 h-3.5" />
                </button>
              </form>
            </div>
          )}

          {/* 2. SIMULATION EVENTS TAB */}
          {activeTab === 'events' && (
            <div className="h-full flex flex-col bg-slate-950 font-sans text-xs">
              {/* Event Filter Bar */}
              <div className="h-7 border-b border-slate-850 px-3 flex items-center space-x-2 bg-slate-900/40">
                <span className="text-[10px] font-semibold text-slate-400 uppercase">Filter:</span>
                {['ALL', 'ARP', 'SWITCH', 'ROUTE', 'ICMP', 'DROP'].map(f => (
                  <button
                    key={f}
                    onClick={() => setEventFilter(f)}
                    className={`px-2 py-0.5 rounded text-[10px] font-semibold transition ${
                      eventFilter === f
                        ? 'bg-cyan-950 text-cyan-300 border border-cyan-800'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {f}
                  </button>
                ))}
              </div>

              {/* Event List */}
              <div className="flex-1 overflow-y-auto divide-y divide-slate-850">
                {filteredEvents.length === 0 ? (
                  <div className="p-8 text-center text-slate-500 text-xs">
                    No simulation events recorded yet. Click 'Send Ping' or run 'ping' in the terminal to observe traffic!
                  </div>
                ) : (
                  filteredEvents.map((ev, idx) => {
                    const isSelected = activeEventIndex === ev.step - 1 || activeEvent?.event_id === ev.event_id;
                    const isSuccess = ev.status === 'SUCCESS';
                    const isDrop = ev.status === 'DROP' || ev.status === 'ERROR';

                    return (
                      <div
                        key={ev.event_id || idx}
                        onClick={() => {
                          // Select event and switch to inspector
                          setActiveTab('inspector');
                        }}
                        className={`p-2.5 px-4 flex items-start space-x-3 cursor-pointer transition ${
                          isSelected ? 'bg-cyan-950/40 border-l-2 border-cyan-500' : 'hover:bg-slate-900/60'
                        }`}
                      >
                        <div className="mt-0.5">
                          {isDrop ? (
                            <XCircle className="w-4 h-4 text-rose-400" />
                          ) : isSuccess ? (
                            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                          ) : (
                            <Info className="w-4 h-4 text-cyan-400" />
                          )}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-2">
                            <span className="font-mono text-[10px] text-slate-400">Step {ev.step}</span>
                            <span className={`px-1.5 py-0.2 rounded text-[9px] font-mono font-semibold ${
                              isDrop ? 'bg-rose-950 text-rose-300 border border-rose-800' : 'bg-slate-800 text-slate-300'
                            }`}>
                              {ev.event_type}
                            </span>
                            <span className="text-[11px] font-semibold text-slate-200 truncate">
                              {ev.device_name}
                            </span>
                          </div>
                          <div className="text-xs text-slate-300 mt-0.5 leading-snug">
                            {ev.summary}
                          </div>
                          {ev.explanation && (
                            <div className="text-[11px] text-cyan-400/90 mt-1 italic leading-normal">
                              {ev.explanation}
                            </div>
                          )}
                        </div>

                        <span className="text-[10px] text-slate-400 hover:text-cyan-300 underline font-mono flex-shrink-0">
                          Inspect &rarr;
                        </span>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {/* 3. PACKET INSPECTOR TAB */}
          {activeTab === 'inspector' && (
            <div className="h-full overflow-y-auto p-4 bg-slate-950 text-xs space-y-4">
              {!activeEvent ? (
                <div className="p-8 text-center text-slate-500">
                  Select a simulation event from the Events tab or run a ping to inspect frame headers and protocol payloads.
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Event Summary & Educational Explanation */}
                  <div className="bg-slate-900/90 p-3 rounded-lg border border-slate-800 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <span className="font-mono font-bold text-cyan-400 text-xs">
                          {activeEvent.event_type}
                        </span>
                        <span className="text-slate-400 text-[11px]">
                          Device: <strong>{activeEvent.device_name}</strong> {activeEvent.interface_name && `(${activeEvent.interface_name})`}
                        </span>
                      </div>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        activeEvent.status === 'SUCCESS' ? 'bg-emerald-950 text-emerald-400' : activeEvent.status === 'DROP' ? 'bg-rose-950 text-rose-400' : 'bg-cyan-950 text-cyan-400'
                      }`}>
                        {activeEvent.status}
                      </span>
                    </div>

                    <div className="text-slate-200 font-medium">
                      {activeEvent.summary}
                    </div>

                    {activeEvent.explanation && (
                      <div className="p-2.5 rounded bg-cyan-950/30 border border-cyan-800/60 text-cyan-200 text-[11px] leading-relaxed">
                        <span className="font-semibold block text-cyan-400 mb-0.5">Networking Protocol Explanation:</span>
                        {activeEvent.explanation}
                      </div>
                    )}
                  </div>

                  {/* Protocol Layers Breakdown */}
                  {activeEvent.frame && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      {/* Layer 2: Ethernet Header */}
                      <div className="bg-slate-900 p-3 rounded-lg border border-slate-800 space-y-1.5 font-mono text-[11px]">
                        <div className="font-sans font-bold text-amber-400 text-xs border-b border-slate-800 pb-1 flex justify-between">
                          <span>Layer 2 (Ethernet Frame)</span>
                          <span className="text-[10px] text-slate-500">802.3</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">Src MAC:</span>
                          <span className="text-slate-200">{activeEvent.frame.src_mac}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">Dst MAC:</span>
                          <span className={activeEvent.frame.is_broadcast ? 'text-amber-400 font-bold' : 'text-slate-200'}>
                            {activeEvent.frame.dst_mac}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">EtherType:</span>
                          <span className="text-cyan-400 font-semibold">{activeEvent.frame.ethertype}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">FCS Checksum:</span>
                          <span className="text-emerald-400 text-[10px]">{activeEvent.frame.fcs}</span>
                        </div>
                      </div>

                      {/* Layer 3: ARP or IPv4 Header */}
                      {activeEvent.frame.payload && (
                        <div className="bg-slate-900 p-3 rounded-lg border border-slate-800 space-y-1.5 font-mono text-[11px]">
                          <div className="font-sans font-bold text-blue-400 text-xs border-b border-slate-800 pb-1 flex justify-between">
                            <span>{activeEvent.frame.ethertype === 'ARP' ? 'Layer 3 (ARP Packet)' : 'Layer 3 (IPv4 Header)'}</span>
                            <span className="text-[10px] text-slate-500">RFC 791 / 826</span>
                          </div>

                          {activeEvent.frame.ethertype === 'ARP' ? (
                            <>
                              <div className="flex justify-between">
                                <span className="text-slate-400">Operation:</span>
                                <span className="text-cyan-400 font-bold">{activeEvent.frame.payload.operation} ({activeEvent.frame.payload.opcode})</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-slate-400">Sender IP:</span>
                                <span className="text-slate-200">{activeEvent.frame.payload.sender_ip}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-slate-400">Target IP:</span>
                                <span className="text-amber-400 font-bold">{activeEvent.frame.payload.target_ip}</span>
                              </div>
                            </>
                          ) : (
                            <>
                              <div className="flex justify-between">
                                <span className="text-slate-400">Source IP:</span>
                                <span className="text-slate-200">{activeEvent.frame.payload.src_ip}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-slate-400">Destination IP:</span>
                                <span className="text-cyan-400 font-bold">{activeEvent.frame.payload.dst_ip}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-slate-400">Time-To-Live (TTL):</span>
                                <span className="text-emerald-400 font-bold">{activeEvent.frame.payload.ttl}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-slate-400">Protocol:</span>
                                <span className="text-purple-400">{activeEvent.frame.payload.protocol} (1)</span>
                              </div>
                            </>
                          )}
                        </div>
                      )}

                      {/* Layer 4: ICMP / Transport Header */}
                      {activeEvent.frame.payload?.payload && (
                        <div className="bg-slate-900 p-3 rounded-lg border border-slate-800 space-y-1.5 font-mono text-[11px]">
                          <div className="font-sans font-bold text-emerald-400 text-xs border-b border-slate-800 pb-1 flex justify-between">
                            <span>Layer 4 (ICMP Message)</span>
                            <span className="text-[10px] text-slate-500">RFC 792</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-400">ICMP Type:</span>
                            <span className="text-emerald-300 font-bold">{activeEvent.frame.payload.payload.type} ({activeEvent.frame.payload.payload.type_number})</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-400">Code:</span>
                            <span className="text-slate-200">{activeEvent.frame.payload.payload.code}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-400">Sequence:</span>
                            <span className="text-slate-200">{activeEvent.frame.payload.payload.sequence}</span>
                          </div>
                          <div className="text-[10px] text-slate-400 truncate mt-1">
                            Payload: {activeEvent.frame.payload.payload.payload || '32 bytes of test data'}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* 4. SUBNET CALCULATOR TAB */}
          {activeTab === 'subnet' && (
            <div className="h-full overflow-y-auto p-4 bg-slate-950 text-xs space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Inputs */}
                <div className="bg-slate-900 p-3 rounded-lg border border-slate-800 space-y-3">
                  <div className="font-bold text-slate-200 text-xs">IPv4 Subnet Planning</div>
                  <div>
                    <label className="text-[11px] text-slate-400 block mb-1">IP Address</label>
                    <input
                      type="text"
                      value={calcIp}
                      onChange={(e) => setCalcIp(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700 rounded px-2.5 py-1.5 font-mono text-slate-100 outline-none focus:border-cyan-500"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between text-[11px] text-slate-400 mb-1">
                      <span>Prefix Length: /{calcPrefix}</span>
                      <span className="font-mono text-cyan-400">{calcData?.subnet_mask || '255.255.255.0'}</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="32"
                      value={calcPrefix}
                      onChange={(e) => setCalcPrefix(Number(e.target.value))}
                      className="w-full accent-cyan-500 cursor-pointer"
                    />
                  </div>

                  <div className="pt-2 border-t border-slate-800">
                    <label className="text-[11px] text-slate-400 block mb-1">Test Second IP (Same Subnet?)</label>
                    <input
                      type="text"
                      value={calcCompareIp}
                      onChange={(e) => setCalcCompareIp(e.target.value)}
                      placeholder="e.g. 192.168.1.50"
                      className="w-full bg-slate-950 border border-slate-700 rounded px-2.5 py-1 font-mono text-slate-100 outline-none focus:border-cyan-500 text-xs"
                    />
                    {calcData?.compare_match !== null && (
                      <div className={`mt-1.5 text-[11px] font-semibold flex items-center space-x-1 ${
                        calcData?.compare_match ? 'text-emerald-400' : 'text-rose-400'
                      }`}>
                        {calcData?.compare_match ? (
                          <><span>✓ In the same subnet!</span></>
                        ) : (
                          <><span>✕ Different subnets (Router required)</span></>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Subnet Metrics Breakdown */}
                {calcData && (
                  <>
                    <div className="bg-slate-900 p-3 rounded-lg border border-slate-800 space-y-2 font-mono text-[11px]">
                      <div className="font-sans font-bold text-cyan-400 text-xs border-b border-slate-800 pb-1">
                        Subnet Boundaries
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Network Address:</span>
                        <span className="text-slate-100 font-bold">{calcData.network_address}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Broadcast Address:</span>
                        <span className="text-slate-100 font-bold">{calcData.broadcast_address}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">First Usable Host:</span>
                        <span className="text-emerald-400">{calcData.first_usable || 'None'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Last Usable Host:</span>
                        <span className="text-emerald-400">{calcData.last_usable || 'None'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Usable Host Count:</span>
                        <span className="text-cyan-300 font-bold">{calcData.usable_hosts.toLocaleString()} hosts</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Wildcard Mask:</span>
                        <span className="text-slate-300">{calcData.wildcard_mask}</span>
                      </div>
                    </div>

                    <div className="bg-slate-900 p-3 rounded-lg border border-slate-800 space-y-2 font-mono text-[11px]">
                      <div className="font-sans font-bold text-purple-400 text-xs border-b border-slate-800 pb-1">
                        Bitwise Binary Representation
                      </div>
                      <div>
                        <div className="text-[10px] text-slate-400">IP Binary:</div>
                        <div className="text-cyan-300 text-[10px]">{calcData.ip_binary}</div>
                      </div>
                      <div>
                        <div className="text-[10px] text-slate-400">Mask Binary:</div>
                        <div className="text-slate-300 text-[10px]">{calcData.mask_binary}</div>
                      </div>
                      <div>
                        <div className="text-[10px] text-slate-400">Network Binary (Bitwise AND):</div>
                        <div className="text-emerald-300 text-[10px]">{calcData.network_binary}</div>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          {/* 5. GUIDED LABS TAB */}
          {activeTab === 'labs' && (
            <div className="h-full overflow-y-auto p-4 bg-slate-950 text-xs space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center space-x-2">
                    <span>{selectedLab?.title || 'Guided Networking Lab'}</span>
                    <span className="text-[10px] font-semibold bg-cyan-950 text-cyan-300 border border-cyan-800 px-2 py-0.5 rounded">
                      {selectedLab?.difficulty || 'Lab'}
                    </span>
                  </h3>
                  <p className="text-slate-400 text-xs mt-0.5">
                    {selectedLab?.description}
                  </p>
                </div>

                <button
                  onClick={onVerifyLab}
                  className="bg-cyan-600 hover:bg-cyan-500 text-white font-semibold text-xs px-3.5 py-1.5 rounded-md shadow transition"
                >
                  Verify Progress
                </button>
              </div>

              {/* Tasks Checklist */}
              <div className="bg-slate-900 p-3 rounded-lg border border-slate-800 space-y-2">
                <div className="text-[11px] font-semibold uppercase text-slate-400">
                  Lab Tasks ({labEvaluation?.tasks?.filter(t => t.completed).length || 0}/{labEvaluation?.tasks?.length || 0})
                </div>

                <div className="space-y-1.5">
                  {(labEvaluation?.tasks || []).map((t, idx) => (
                    <div
                      key={t.id || idx}
                      className={`p-2 rounded flex items-center space-x-2.5 border transition ${
                        t.completed
                          ? 'bg-emerald-950/40 text-emerald-300 border-emerald-800/80'
                          : 'bg-slate-800/60 text-slate-300 border-slate-700/60'
                      }`}
                    >
                      <CheckCircle2 className={`w-4 h-4 flex-shrink-0 ${t.completed ? 'text-emerald-400' : 'text-slate-600'}`} />
                      <span className="flex-1 font-medium">{t.text}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Lab Completion Concept Summary */}
              {labEvaluation?.completed && (
                <div className="bg-emerald-950/60 border border-emerald-800 p-3.5 rounded-lg text-emerald-200 space-y-1.5">
                  <div className="font-bold flex items-center space-x-1.5 text-emerald-300">
                    <Sparkles className="w-4 h-4" />
                    <span>Lab Complete! Core Networking Takeaway:</span>
                  </div>
                  <p className="text-xs leading-relaxed text-emerald-100">
                    {labEvaluation.concept_summary}
                  </p>
                </div>
              )}

              {/* Hints dropdown */}
              {selectedLab?.hints && (
                <details className="bg-slate-900/60 p-2.5 rounded-lg border border-slate-800 text-xs">
                  <summary className="cursor-pointer font-semibold text-cyan-400">Need a Hint?</summary>
                  <ul className="list-disc list-inside mt-2 space-y-1 text-slate-300 pl-1 text-[11px]">
                    {selectedLab.hints.map((hint, i) => (
                      <li key={i}>{hint}</li>
                    ))}
                  </ul>
                </details>
              )}
            </div>
          )}
        </div>
      )}
    </footer>
  );
}
