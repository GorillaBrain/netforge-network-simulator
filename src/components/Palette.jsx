import React from 'react';
import { 
  Monitor, Laptop, Network, Router as RouterIcon, 
  Server, Cpu, Plus, Layers
} from 'lucide-react';

const PALETTE_ITEMS = [
  {
    type: 'pc',
    name: 'PC',
    category: 'End Devices',
    icon: Monitor,
    description: 'Workstation host with single Ethernet NIC',
    color: 'from-blue-600 to-cyan-600',
    borderColor: 'border-cyan-500/30'
  },
  {
    type: 'laptop',
    name: 'Laptop',
    category: 'End Devices',
    icon: Laptop,
    description: 'Portable client host with Ethernet interface',
    color: 'from-indigo-600 to-blue-600',
    borderColor: 'border-blue-500/30'
  },
  {
    type: 'server',
    name: 'Server',
    category: 'End Devices',
    icon: Server,
    description: 'Host providing ICMP echo and HTTP services',
    color: 'from-emerald-600 to-teal-600',
    borderColor: 'border-emerald-500/30'
  },
  {
    type: 'switch',
    name: 'Switch',
    category: 'Network Infrastructure',
    icon: Network,
    description: 'Layer 2 Ethernet switch with 8 FastEthernet ports',
    color: 'from-amber-600 to-orange-600',
    borderColor: 'border-amber-500/30'
  },
  {
    type: 'router',
    name: 'Router',
    category: 'Network Infrastructure',
    icon: RouterIcon,
    description: 'Layer 3 IPv4 router with Gigabit interfaces',
    color: 'from-rose-600 to-red-600',
    borderColor: 'border-rose-500/30'
  },
  {
    type: 'hub',
    name: 'Hub',
    category: 'Network Infrastructure',
    icon: Cpu,
    description: 'Layer 1 multi-port physical repeater',
    color: 'from-purple-600 to-violet-600',
    borderColor: 'border-purple-500/30'
  }
];

export default function Palette({ onAddDevice }) {
  const handleDragStart = (e, item) => {
    e.dataTransfer.setData('application/json', JSON.stringify({ type: item.type, name: item.name }));
    e.dataTransfer.effectAllowed = 'copy';
  };

  return (
    <aside className="w-56 border-r border-slate-800 bg-slate-900/60 backdrop-blur flex flex-col z-20 select-none">
      <div className="p-3 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center space-x-1.5">
          <Layers className="w-4 h-4 text-cyan-400" />
          <span className="text-xs font-semibold tracking-wide text-slate-200 uppercase">Device Palette</span>
        </div>
        <span className="text-[10px] text-slate-500">Drag or Click</span>
      </div>

      <div className="flex-1 overflow-y-auto p-2.5 space-y-4">
        {['End Devices', 'Network Infrastructure'].map((category) => (
          <div key={category} className="space-y-1.5">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 px-1">
              {category}
            </div>
            <div className="grid grid-cols-1 gap-1.5">
              {PALETTE_ITEMS.filter((i) => i.category === category).map((item) => {
                const Icon = item.icon;
                return (
                  <div
                    key={item.type}
                    draggable
                    onDragStart={(e) => handleDragStart(e, item)}
                    onClick={() => onAddDevice(item.type)}
                    className={`group relative p-2.5 rounded-lg bg-slate-800/80 hover:bg-slate-750 border border-slate-700/80 hover:border-cyan-500/50 cursor-grab active:cursor-grabbing transition shadow-sm hover:shadow-cyan-950/20`}
                    title={`${item.description} (Drag onto canvas or click to add)`}
                  >
                    <div className="flex items-center space-x-3">
                      <div className={`w-8 h-8 rounded-md bg-gradient-to-br ${item.color} flex items-center justify-center text-white shadow-sm flex-shrink-0 group-hover:scale-105 transition`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-semibold text-slate-200 group-hover:text-cyan-300 transition truncate">
                          {item.name}
                        </div>
                        <div className="text-[10px] text-slate-400 truncate">
                          {item.type === 'switch' ? '8 Ports (L2)' : item.type === 'router' ? '3 Interfaces (L3)' : item.type === 'hub' ? '4 Ports (L1)' : 'IPv4 Host'}
                        </div>
                      </div>
                      <Plus className="w-3.5 h-3.5 text-slate-500 group-hover:text-cyan-400 opacity-0 group-hover:opacity-100 transition" />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Palette footer info */}
      <div className="p-2.5 border-t border-slate-800 text-[10px] text-slate-400 bg-slate-950/40">
        <p className="leading-tight">
          Click any device to open configuration or view interfaces. Connect ports by dragging from one device port to another.
        </p>
      </div>
    </aside>
  );
}
