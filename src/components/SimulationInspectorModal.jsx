import React, { useState } from 'react';
import { X, Search, Activity, Layers, CheckCircle2, AlertCircle, ArrowRight } from 'lucide-react';
import { sound } from '../utils/soundEffects.js';

export default function SimulationInspectorModal({
  isOpen,
  onClose,
  events,
  activeEventIndex,
  onSelectEvent
}) {
  const [selectedEventIdx, setSelectedEventIdx] = useState(activeEventIndex >= 0 ? activeEventIndex : 0);

  if (!isOpen) return null;

  const currentEvent = events?.[selectedEventIdx] || events?.[0];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
      <div className="w-full max-w-4xl bg-slate-900 border border-slate-750 rounded-xl shadow-2xl overflow-hidden flex flex-col h-[580px] animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="h-10 bg-slate-950 border-b border-slate-800 px-4 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Activity className="w-4 h-4 text-cyan-400" />
            <h3 className="font-bold text-white text-xs font-mono uppercase tracking-wider">
              Simulation Panel — Event List & PDU Packet Inspector
            </h3>
          </div>
          <button
            onClick={() => { sound.playClick(); onClose(); }}
            className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content: Left Event List, Right PDU Layer Inspector */}
        <div className="flex-1 flex overflow-hidden divide-x divide-slate-800">
          {/* Left Event List Table (Exact Packet Tracer Event List) */}
          <div className="w-80 flex flex-col bg-slate-950/70">
            <div className="p-2 border-b border-slate-800 text-[10px] font-mono text-slate-400 font-bold uppercase tracking-wider bg-slate-900/60">
              Event List ({events?.length || 0} Packets)
            </div>

            <div className="flex-1 overflow-y-auto divide-y divide-slate-850">
              {(!events || events.length === 0) ? (
                <div className="p-6 text-center text-xs text-slate-500 font-mono">
                  No simulation packets captured yet. Send a ping with the ✉️ PDU tool to observe traffic!
                </div>
              ) : (
                events.map((ev, idx) => {
                  const isSelected = idx === selectedEventIdx;
                  const isDrop = ev.status === 'DROP' || ev.status === 'ERROR';
                  return (
                    <div
                      key={ev.event_id || idx}
                      onClick={() => {
                        sound.playClick();
                        setSelectedEventIdx(idx);
                        onSelectEvent(idx);
                      }}
                      className={`p-2 px-3 cursor-pointer text-xs transition ${
                        isSelected 
                          ? 'bg-cyan-950/60 border-l-2 border-cyan-400 text-white' 
                          : 'hover:bg-slate-900/60 text-slate-300'
                      }`}
                    >
                      <div className="flex items-center justify-between text-[10px] font-mono mb-1">
                        <span className="text-slate-400 font-bold">Step #{ev.step || idx + 1}</span>
                        <span className={`px-1.5 py-0.2 rounded font-bold ${
                          isDrop 
                            ? 'bg-rose-950 text-rose-300 border border-rose-800' 
                            : ev.event_type.includes('ARP') 
                            ? 'bg-amber-950 text-amber-300 border border-amber-800' 
                            : 'bg-cyan-950 text-cyan-300 border border-cyan-800'
                        }`}>
                          {ev.event_type.includes('ARP') ? 'ARP' : ev.event_type.includes('PING') || ev.event_type.includes('ICMP') ? 'ICMP' : 'L2'}
                        </span>
                      </div>
                      <div className="text-[11px] font-semibold truncate">
                        {ev.device_id} &rarr; {ev.next_device_id || 'Self'}
                      </div>
                      <div className="text-[10px] text-slate-400 truncate mt-0.5 font-mono">
                        {ev.details}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Right PDU Layer Inspector (OSI Model 7-Layer View) */}
          <div className="flex-1 p-6 overflow-y-auto space-y-4 bg-slate-900">
            {currentEvent ? (
              <div className="space-y-4">
                <div>
                  <h4 className="font-bold text-white text-sm font-mono flex items-center space-x-2">
                    <span>PDU Details at Device: {currentEvent.device_id}</span>
                  </h4>
                  <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                    {currentEvent.details}
                  </p>
                </div>

                {/* Packet Inspection Layers */}
                <div className="space-y-2.5">
                  {/* Layer 2: Ethernet Frame */}
                  <div className="p-3 bg-slate-950 border border-slate-800 rounded-lg">
                    <div className="text-[10px] font-mono uppercase tracking-wider text-cyan-400 font-bold mb-2">
                      OSI Layer 2 — Ethernet II Frame
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                      <div>
                        <span className="text-slate-500">Source MAC:</span>{' '}
                        <span className="text-slate-200">{currentEvent.frame?.source_mac || '00:50:79:66:68:01'}</span>
                      </div>
                      <div>
                        <span className="text-slate-500">Dest MAC:</span>{' '}
                        <span className="text-slate-200">{currentEvent.frame?.destination_mac || 'FF:FF:FF:FF:FF:FF'}</span>
                      </div>
                    </div>
                  </div>

                  {/* Layer 3: IPv4 Packet or ARP */}
                  {currentEvent.arp ? (
                    <div className="p-3 bg-slate-950 border border-slate-800 rounded-lg">
                      <div className="text-[10px] font-mono uppercase tracking-wider text-amber-400 font-bold mb-2">
                        Address Resolution Protocol (ARP)
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                        <div>
                          <span className="text-slate-500">Opcode:</span>{' '}
                          <span className="text-amber-300 font-bold">{currentEvent.arp.opcode === 1 ? '1 (Request)' : '2 (Reply)'}</span>
                        </div>
                        <div>
                          <span className="text-slate-500">Target IP:</span>{' '}
                          <span className="text-slate-200">{currentEvent.arp.target_ip}</span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="p-3 bg-slate-950 border border-slate-800 rounded-lg">
                      <div className="text-[10px] font-mono uppercase tracking-wider text-blue-400 font-bold mb-2">
                        OSI Layer 3 — IPv4 Packet
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                        <div>
                          <span className="text-slate-500">Source IP:</span>{' '}
                          <span className="text-slate-200">{currentEvent.packet?.source_ip || '192.168.1.10'}</span>
                        </div>
                        <div>
                          <span className="text-slate-500">Dest IP:</span>{' '}
                          <span className="text-slate-200">{currentEvent.packet?.destination_ip || '192.168.1.20'}</span>
                        </div>
                        <div>
                          <span className="text-slate-500">TTL:</span>{' '}
                          <span className="text-slate-200">{currentEvent.packet?.ttl || 64}</span>
                        </div>
                        <div>
                          <span className="text-slate-500">Protocol:</span>{' '}
                          <span className="text-slate-200">1 (ICMP)</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Layer 4: ICMP */}
                  {currentEvent.icmp && (
                    <div className="p-3 bg-slate-950 border border-slate-800 rounded-lg">
                      <div className="text-[10px] font-mono uppercase tracking-wider text-emerald-400 font-bold mb-2">
                        OSI Layer 4 — ICMP Message
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                        <div>
                          <span className="text-slate-500">Type / Code:</span>{' '}
                          <span className="text-emerald-300 font-bold">
                            {currentEvent.icmp.type === 8 ? 'Type 8, Code 0 (Echo Request)' : 'Type 0, Code 0 (Echo Reply)'}
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-500">Sequence:</span>{' '}
                          <span className="text-slate-200">{currentEvent.icmp.sequence || 1}</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="text-center text-slate-500 text-xs font-mono py-12">
                Select an event from the list to inspect packet headers.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
