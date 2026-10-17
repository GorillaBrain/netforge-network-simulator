import React, { useState } from 'react';
import { X, Play, Activity } from 'lucide-react';

export default function QuickPingModal({
  topology,
  onClose,
  onSendPing,
  initialSourceId
}) {
  const hosts = Object.values(topology?.devices || {}).filter(d => 
    ['pc', 'laptop', 'server', 'router'].includes(d.device_type)
  );

  const [sourceId, setSourceId] = useState(initialSourceId || hosts[0]?.id || '');
  const [targetIp, setTargetIp] = useState('');
  const [probeCount, setProbeCount] = useState(4);

  const handleQuickDestinationSelect = (ip) => {
    setTargetIp(ip);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!sourceId || !targetIp) {
      alert('Please select a source device and target IP address.');
      return;
    }
    onSendPing(sourceId, targetIp.trim(), probeCount);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-xl shadow-2xl p-5 space-y-4 text-xs select-none">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center space-x-2">
            <div className="w-7 h-7 rounded-lg bg-cyan-600/30 text-cyan-400 border border-cyan-500/40 flex items-center justify-center">
              <Play className="w-4 h-4 fill-current" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-white">Send Simulated Ping</h3>
              <p className="text-[10px] text-slate-400">Generate observable ICMP Echo & ARP traffic</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-white rounded"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3.5">
          <div>
            <label className="text-[11px] font-semibold text-slate-300 block mb-1">
              Source Device
            </label>
            <select
              value={sourceId}
              onChange={(e) => setSourceId(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 text-xs outline-none focus:border-cyan-500 font-mono"
            >
              {hosts.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name} ({d.device_type})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-[11px] font-semibold text-slate-300 block mb-1">
              Target IPv4 Address
            </label>
            <input
              type="text"
              placeholder="e.g. 192.168.1.20"
              value={targetIp}
              onChange={(e) => setTargetIp(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 text-xs outline-none focus:border-cyan-500 font-mono"
              autoFocus
            />
          </div>

          {/* Quick Click from other hosts */}
          <div>
            <span className="text-[10px] text-slate-400 block mb-1">
              Or pick an existing host destination:
            </span>
            <div className="flex flex-wrap gap-1.5">
              {hosts.filter(d => d.id !== sourceId).map(d => {
                const ip = Object.values(d.interfaces || {})[0]?.ip_address;
                if (!ip) return null;
                return (
                  <button
                    key={d.id}
                    type="button"
                    onClick={() => handleQuickDestinationSelect(ip)}
                    className="px-2 py-1 bg-slate-800 hover:bg-slate-750 border border-slate-700 rounded text-[10px] font-mono text-cyan-300"
                  >
                    {d.name} ({ip})
                  </button>
                );
              })}
            </div>
          </div>

          <div className="pt-2 flex justify-end space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 rounded-lg border border-slate-700 text-slate-300 hover:bg-slate-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 rounded-lg bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-semibold flex items-center space-x-1.5 shadow"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>Initiate Ping</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
