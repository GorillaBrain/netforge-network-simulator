import React, { useState } from 'react';
import { X, BookOpen, Terminal, Network, ShieldCheck, Cpu, Layers } from 'lucide-react';

export default function HelpModal({ onClose }) {
  const [tab, setTab] = useState('protocols'); // 'protocols', 'cli', 'architecture'

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-xl shadow-2xl flex flex-col max-h-[85vh] text-xs select-none">
        {/* Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-cyan-600/30 text-cyan-400 border border-cyan-500/40 flex items-center justify-center">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white">NetForge Educational Guide & Reference</h2>
              <p className="text-[11px] text-slate-400">Networking models, CLI commands, and simulation architecture</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-800 bg-slate-950/60 px-4 text-xs">
          <button
            onClick={() => setTab('protocols')}
            className={`py-2.5 px-3 border-b-2 font-medium transition ${
              tab === 'protocols'
                ? 'border-cyan-500 text-cyan-400 font-semibold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Protocol Simulator Rules
          </button>
          <button
            onClick={() => setTab('cli')}
            className={`py-2.5 px-3 border-b-2 font-medium transition ${
              tab === 'cli'
                ? 'border-cyan-500 text-cyan-400 font-semibold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Cisco CLI Cheatsheet
          </button>
          <button
            onClick={() => setTab('architecture')}
            className={`py-2.5 px-3 border-b-2 font-medium transition ${
              tab === 'architecture'
                ? 'border-cyan-500 text-cyan-400 font-semibold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Engine Architecture
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4 text-slate-300 leading-relaxed">
          {tab === 'protocols' && (
            <div className="space-y-4">
              <div className="bg-slate-800/60 p-3 rounded-lg border border-slate-700/80 space-y-1">
                <h4 className="font-bold text-amber-400 text-xs">Layer 2: Ethernet Switching & MAC Learning</h4>
                <p>
                  Ethernet switches maintain a <strong>MAC Forwarding Table</strong>. When a frame arrives on a port:
                </p>
                <ul className="list-disc list-inside space-y-0.5 text-slate-300 pl-1">
                  <li>The switch inspects the <strong>Source MAC</strong> and associates it with the ingress port.</li>
                  <li>If the <strong>Destination MAC</strong> is broadcast (<code>FF:FF:FF:FF:FF:FF</code>), the switch floods it out all other active ports.</li>
                  <li>If the destination MAC is known in the table, it unicast-forwards it out that port only.</li>
                  <li>If the destination MAC is unknown (unknown unicast), it floods out all other active ports.</li>
                  <li>If the learned port is the same as the ingress port, the switch filters (drops) the frame.</li>
                </ul>
              </div>

              <div className="bg-slate-800/60 p-3 rounded-lg border border-slate-700/80 space-y-1">
                <h4 className="font-bold text-cyan-400 text-xs">Layer 3: Address Resolution Protocol (ARP)</h4>
                <p>
                  Before an IPv4 packet can be encapsulated into an Ethernet frame, the sending device must know the hardware MAC address of the next hop:
                </p>
                <ul className="list-disc list-inside space-y-0.5 text-slate-300 pl-1">
                  <li><strong>Same subnet:</strong> Host broadcasts an ARP Request for the destination's IP address.</li>
                  <li><strong>Different subnet:</strong> Host broadcasts an ARP Request for its configured <strong>Default Gateway's</strong> IP address.</li>
                  <li>The target host returns a unicast ARP Reply with its MAC address.</li>
                  <li>Both sides update their dynamic ARP caches to eliminate future broadcast overhead.</li>
                </ul>
              </div>

              <div className="bg-slate-800/60 p-3 rounded-lg border border-slate-700/80 space-y-1">
                <h4 className="font-bold text-emerald-400 text-xs">Layer 3: IPv4 Routing & TTL</h4>
                <p>
                  Routers interconnect separate broadcast domains and subnets:
                </p>
                <ul className="list-disc list-inside space-y-0.5 text-slate-300 pl-1">
                  <li><strong>Longest Prefix Match (LPM):</strong> Routers select the route with the highest prefix length (most specific mask).</li>
                  <li><strong>TTL Decrement:</strong> Routers decrement IPv4 TTL by 1. If TTL drops to 0, the router discards the packet and sends an ICMP Time Exceeded notification.</li>
                  <li><strong>L2 Re-encapsulation:</strong> Routers strip the incoming Layer 2 Ethernet frame and encapsulate the packet in a new frame with the router's egress MAC as source and the next hop's MAC as destination.</li>
                </ul>
              </div>
            </div>
          )}

          {tab === 'cli' && (
            <div className="space-y-3 font-mono text-[11px]">
              <div className="bg-slate-800/80 p-3 rounded-lg border border-slate-700 space-y-2">
                <div className="font-sans font-bold text-cyan-400 text-xs">Inspection Commands</div>
                <div><span className="text-slate-100 font-bold">show ip</span> — Display IPv4 configuration and gateway</div>
                <div><span className="text-slate-100 font-bold">show interfaces</span> — Interface status, MAC, and MTU</div>
                <div><span className="text-slate-100 font-bold">show ip int brief</span> — Summary table of ports, IPs, and operational status</div>
                <div><span className="text-slate-100 font-bold">show arp</span> — View dynamic ARP resolution table</div>
                <div><span className="text-slate-100 font-bold">show mac address-table</span> — View switch Layer 2 forwarding table</div>
                <div><span className="text-slate-100 font-bold">show ip route</span> — View router routing table (connected & static)</div>
              </div>

              <div className="bg-slate-800/80 p-3 rounded-lg border border-slate-700 space-y-2">
                <div className="font-sans font-bold text-emerald-400 text-xs">Diagnostics & Utilities</div>
                <div><span className="text-slate-100 font-bold">ping &lt;IPv4&gt;</span> — Send 4 ICMP Echo Requests</div>
                <div><span className="text-slate-100 font-bold">traceroute &lt;IPv4&gt;</span> — Trace hop-by-hop routers using incremental TTL</div>
                <div><span className="text-slate-100 font-bold">clear arp</span> — Flush ARP cache</div>
                <div><span className="text-slate-100 font-bold">clear mac address-table</span> — Flush switch MAC forwarding table</div>
                <div><span className="text-slate-100 font-bold">clear</span> — Clear terminal screen</div>
              </div>

              <div className="bg-slate-800/80 p-3 rounded-lg border border-slate-700 space-y-2">
                <div className="font-sans font-bold text-amber-400 text-xs">Cisco Configuration Commands</div>
                <div><span className="text-slate-100 font-bold">configure terminal</span> — Enter global configuration mode</div>
                <div><span className="text-slate-100 font-bold">hostname &lt;name&gt;</span> — Change device hostname</div>
                <div><span className="text-slate-100 font-bold">interface &lt;name&gt;</span> — Enter interface sub-configuration mode</div>
                <div><span className="text-slate-100 font-bold">ip address &lt;ip&gt; &lt;mask&gt;</span> — Set interface IPv4 and mask</div>
                <div><span className="text-slate-100 font-bold">shutdown / no shutdown</span> — Disable or enable interface</div>
                <div><span className="text-slate-100 font-bold">ip route &lt;net&gt; &lt;mask&gt; &lt;gw&gt;</span> — Add static IPv4 route on Router</div>
                <div><span className="text-slate-100 font-bold">no ip route &lt;net&gt; &lt;mask&gt;</span> — Remove static route</div>
              </div>
            </div>
          )}

          {tab === 'architecture' && (
            <div className="space-y-3">
              <div className="bg-slate-800/80 p-3 rounded-lg border border-slate-700 space-y-2">
                <h4 className="font-bold text-white text-xs">Systems & Simulation Engineering Architecture</h4>
                <p>
                  NetForge emphasizes genuine networking logic and algorithms:
                </p>
                <ul className="list-disc list-inside space-y-1 text-slate-300">
                  <li><strong>Core Engine:</strong> 100% deterministic Python 3 simulation engine with modular protocols, devices, links, and discrete-event queue.</li>
                  <li><strong>Browser Execution:</strong> Compiled to WebAssembly via Pyodide. The Python engine executes directly inside the user's browser with zero server lag, offline capability, and zero hosting fees.</li>
                  <li><strong>Vercel Serverless Fallback:</strong> Serverless Python endpoints (<code>/api/simulate</code>, <code>/api/cli</code>, <code>/api/subnet</code>, <code>/api/labs</code>) provide backend redundancy.</li>
                  <li><strong>Frontend:</strong> React + Canvas/SVG workspace with real-time packet animation and synchronized packet inspection.</li>
                </ul>
              </div>
            </div>
          )}
        </div>

        <div className="p-3 border-t border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-medium"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
