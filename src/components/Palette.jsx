import React, { useState } from 'react';
import { 
  Monitor, Laptop, Network, Router as RouterIcon, 
  Server, Cpu, Plus, Layers, ChevronLeft, ChevronRight, Zap
} from 'lucide-react';
import { sound } from '../utils/soundEffects.js';

const PALETTE_ITEMS = [
  {
    type: 'pc',
    name: 'PC Station',
    category: 'End Devices',
    tier: 'IPv4 Host',
    icon: Monitor,
    description: 'Cyberdeck workstation with FastEthernet NIC',
    color: 'from-blue-600 to-cyan-600',
    borderColor: 'border-cyan-500/40'
  },
  {
    type: 'laptop',
    name: 'Field Laptop',
    category: 'End Devices',
    tier: 'Mobile Client',
    icon: Laptop,
    description: 'Portable client terminal with Ethernet interface',
    color: 'from-indigo-600 to-blue-600',
    borderColor: 'border-blue-500/40'
  },
  {
    type: 'server',
    name: 'App Server',
    category: 'End Devices',
    tier: 'HTTP/ICMP Server',
    icon: Server,
    description: 'Enterprise blade server providing ICMP and Web services',
    color: 'from-emerald-600 to-teal-600',
    borderColor: 'border-emerald-500/40'
  },
  {
    type: 'switch',
    name: 'Catalyst Switch',
    category: 'Network Core',
    tier: 'Layer 2 (8-Port)',
    icon: Network,
    description: 'Hardware switch with dynamic MAC learning & filtering',
    color: 'from-amber-600 to-orange-600',
    borderColor: 'border-amber-500/40'
  },
  {
    type: 'router',
    name: 'Core Router',
    category: 'Network Core',
    tier: 'Layer 3 Gateway',
    icon: RouterIcon,
    description: 'Multihomed IPv4 router with Longest Prefix Match routing',
    color: 'from-rose-600 to-red-600',
    borderColor: 'border-rose-500/40'
  },
  {
    type: 'hub',
    name: 'Repeater Hub',
    category: 'Network Core',
    tier: 'Layer 1 Multiport',
    icon: Cpu,
    description: 'Physical layer broadcast repeater for educational comparison',
    color: 'from-purple-600 to-violet-600',
    borderColor: 'border-purple-500/40'
  }
];

export default function Palette({ onAddDevice }) {
  const [isCollapsed, setIsCollapsed] = useState(false);

  const handleDragStart = (e, item) => {
    sound.playClick();
    e.dataTransfer.setData('application/json', JSON.stringify({ type: item.type, name: item.name }));
    e.dataTransfer.effectAllowed = 'copy';
  };

  return (
    <aside className={`border-r border-cyan-500/20 bg-slate-950/90 backdrop-blur flex flex-col z-20 select-none transition-all duration-200 ${
      isCollapsed ? 'w-14' : 'w-60'
    }`}>
      {/* Header with Collapse Button */}
      <div className="p-3 border-b border-slate-800/80 flex items-center justify-between">
        {!isCollapsed && (
          <div className="flex items-center space-x-1.5">
            <Layers className="w-4 h-4 text-cyan-400" />
            <span className="text-xs font-bold tracking-wider text-slate-200 uppercase font-mono">
              HARDWARE DEPOT
            </span>
          </div>
        )}
        <button
          onClick={() => {
            sound.playClick();
            setIsCollapsed(!isCollapsed);
          }}
          className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition mx-auto"
          title={isCollapsed ? 'Expand Hardware Depot' : 'Collapse Depot'}
        >
          {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>

      {/* Palette Items List */}
      <div className="flex-1 overflow-y-auto p-2 space-y-4">
        {['End Devices', 'Network Core'].map((category) => (
          <div key={category} className="space-y-1.5">
            {!isCollapsed && (
              <div className="text-[9px] font-mono font-bold uppercase tracking-wider text-cyan-400/80 px-1">
                {category}
              </div>
            )}
            <div className="grid grid-cols-1 gap-1.5">
              {PALETTE_ITEMS.filter((i) => i.category === category).map((item) => {
                const Icon = item.icon;
                return (
                  <div
                    key={item.type}
                    draggable
                    onDragStart={(e) => handleDragStart(e, item)}
                    onClick={() => {
                      sound.playClick();
                      onAddDevice(item.type);
                    }}
                    className={`group relative rounded-xl bg-slate-900/80 hover:bg-slate-850 border border-slate-800 hover:border-cyan-400/60 cursor-grab active:cursor-grabbing transition-all duration-150 shadow-md hover:shadow-cyan-500/10 ${
                      isCollapsed ? 'p-2 flex justify-center' : 'p-2.5'
                    }`}
                    title={`${item.name} (${item.tier}) - Drag onto canvas or click to add`}
                  >
                    <div className="flex items-center space-x-2.5">
                      <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${item.color} flex items-center justify-center text-white shadow flex-shrink-0 group-hover:scale-110 transition duration-150 border border-white/20`}>
                        <Icon className="w-4 h-4" />
                      </div>

                      {!isCollapsed && (
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-xs text-slate-100 group-hover:text-cyan-300 transition truncate">
                              {item.name}
                            </span>
                            <span className="text-[8px] font-mono text-cyan-400 bg-cyan-950/80 px-1 rounded border border-cyan-800/60">
                              {item.tier}
                            </span>
                          </div>
                          <p className="text-[10px] text-slate-400 truncate mt-0.5 font-sans">
                            {item.description}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </aside>
  );
}
