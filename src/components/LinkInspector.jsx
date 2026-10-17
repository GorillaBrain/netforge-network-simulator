import React from 'react';
import { X, Unlink, Activity, Trash2, Power } from 'lucide-react';

export default function LinkInspector({
  link,
  topology,
  onClose,
  onUpdateLink,
  onDeleteLink
}) {
  if (!link) return null;

  const devA = topology.devices[link.device_a_id];
  const devB = topology.devices[link.device_b_id];

  const handleToggleLinkState = () => {
    onUpdateLink({ ...link, is_up: !link.is_up });
  };

  return (
    <aside className="w-80 border-l border-slate-800 bg-slate-900/90 backdrop-blur flex flex-col z-20 select-none shadow-2xl">
      <div className="p-3.5 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Unlink className="w-4 h-4 text-cyan-400" />
          <span className="font-bold text-sm text-white">Virtual Ethernet Link</span>
        </div>
        <div className="flex items-center space-x-1">
          <button
            onClick={() => onDeleteLink(link.id)}
            className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-950/40 rounded transition"
            title="Delete this Link"
          >
            <Trash2 className="w-4 h-4" />
          </button>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="p-3.5 space-y-4 text-xs">
        {/* Endpoints */}
        <div className="bg-slate-800/80 p-3 rounded-lg border border-slate-700 space-y-3">
          <div className="text-[10px] font-semibold uppercase text-slate-400">
            Connected Endpoints
          </div>

          <div className="flex items-center justify-between font-mono">
            <div>
              <div className="font-bold text-cyan-300">{devA?.name || link.device_a_id}</div>
              <div className="text-slate-400 text-[10px]">{link.interface_a_name}</div>
            </div>
            <div className="text-slate-500 font-sans">⟵ Link ⟶</div>
            <div className="text-right">
              <div className="font-bold text-cyan-300">{devB?.name || link.device_b_id}</div>
              <div className="text-slate-400 text-[10px]">{link.interface_b_name}</div>
            </div>
          </div>
        </div>

        {/* Link Physical Status */}
        <div className="bg-slate-800/80 p-3 rounded-lg border border-slate-700 space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-300">Physical Cable State</span>
            <button
              onClick={handleToggleLinkState}
              className={`flex items-center space-x-1 px-2.5 py-1 rounded text-xs font-semibold transition ${
                link.is_up
                  ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                  : 'bg-rose-950 text-rose-300 border border-rose-800'
              }`}
            >
              <Power className="w-3 h-3" />
              <span>{link.is_up ? 'CONNECTED (UP)' : 'SEVERED (DOWN)'}</span>
            </button>
          </div>
          <span className="text-[10px] text-slate-500 block leading-tight">
            Toggling this cuts the virtual cable. Packets cannot traverse a severed or disconnected link.
          </span>
        </div>

        {/* Metrics */}
        <div className="bg-slate-800/80 p-3 rounded-lg border border-slate-700 space-y-2">
          <div className="text-[10px] font-semibold uppercase text-slate-400">
            Link Metrics
          </div>
          <div className="flex justify-between font-mono">
            <span className="text-slate-400">Bandwidth:</span>
            <span className="text-slate-200">{link.bandwidth_mbps || 1000} Mbps (1 Gbps)</span>
          </div>
          <div className="flex justify-between font-mono">
            <span className="text-slate-400">Propagation Delay:</span>
            <span className="text-slate-200">{link.delay_ms || 1.0} ms</span>
          </div>
        </div>
      </div>
    </aside>
  );
}
