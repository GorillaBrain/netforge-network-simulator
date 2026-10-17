import React, { useState } from 'react';
import { 
  X, Server, Network, Router as RouterIcon, 
  Trash2, Plus, ShieldCheck, Power, Globe, 
  RefreshCw, Layers, Cpu, CornerDownRight
} from 'lucide-react';

export default function ConfigPanel({
  device,
  topology,
  onClose,
  onUpdateDevice,
  onDeleteDevice,
  onDisconnectInterface
}) {
  if (!device) return null;

  const [activeTab, setActiveTab] = useState('interfaces'); // 'interfaces', 'routing', 'mac_table', 'arp'
  const [newRoute, setNewRoute] = useState({ network: '', mask: '255.255.255.0', next_hop: '' });

  const isRouter = device.device_type === 'router';
  const isSwitch = device.device_type === 'switch';
  const isHost = ['pc', 'laptop', 'server'].includes(device.device_type);

  const handleNameChange = (newName) => {
    onUpdateDevice({ ...device, name: newName });
  };

  const handleGatewayChange = (newGw) => {
    onUpdateDevice({ ...device, default_gateway: newGw });
  };

  const handleInterfaceChange = (ifaceName, key, value) => {
    const updatedInterfaces = { ...device.interfaces };
    if (updatedInterfaces[ifaceName]) {
      updatedInterfaces[ifaceName] = {
        ...updatedInterfaces[ifaceName],
        [key]: value
      };
      onUpdateDevice({ ...device, interfaces: updatedInterfaces });
    }
  };

  const handleAddStaticRoute = (e) => {
    e.preventDefault();
    if (!newRoute.network || !newRoute.mask || !newRoute.next_hop) {
      alert('Please fill in all static route fields (Network, Mask, Next-hop)');
      return;
    }
    const currentRoutes = device.static_routes || [];
    const updated = [
      ...currentRoutes.filter(r => !(r.network === newRoute.network && r.mask === newRoute.mask)),
      {
        network: newRoute.network,
        mask: newRoute.mask,
        next_hop: newRoute.next_hop,
        metric: 1,
        route_type: 'S'
      }
    ];
    onUpdateDevice({ ...device, static_routes: updated });
    setNewRoute({ network: '', mask: '255.255.255.0', next_hop: '' });
  };

  const handleRemoveStaticRoute = (net, mask) => {
    const currentRoutes = device.static_routes || [];
    const updated = currentRoutes.filter(r => !(r.network === net && r.mask === mask));
    onUpdateDevice({ ...device, static_routes: updated });
  };

  const handleClearArp = () => {
    onUpdateDevice({ ...device, arp_cache: [] });
  };

  const handleClearMacTable = () => {
    onUpdateDevice({ ...device, mac_table: [] });
  };

  const interfaces = Object.values(device.interfaces || {});

  return (
    <aside className="w-80 border-l border-slate-800 bg-slate-900/90 backdrop-blur flex flex-col z-20 select-none shadow-2xl">
      {/* Header */}
      <div className="p-3.5 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center space-x-2.5">
          <div className="w-7 h-7 rounded-md bg-cyan-600/30 text-cyan-400 border border-cyan-500/40 flex items-center justify-center font-bold text-xs uppercase">
            {device.device_type.substring(0, 2)}
          </div>
          <div>
            <input
              type="text"
              value={device.name}
              onChange={(e) => handleNameChange(e.target.value)}
              className="bg-transparent text-sm font-bold text-white border-b border-transparent hover:border-slate-700 focus:border-cyan-500 outline-none w-40 transition"
              title="Click to rename device"
            />
            <div className="text-[10px] text-slate-400 capitalize">
              {device.device_type} Configuration
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-1">
          <button
            onClick={() => onDeleteDevice(device.id)}
            className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-950/40 rounded transition"
            title="Delete this device and its connections"
          >
            <Trash2 className="w-4 h-4" />
          </button>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded transition"
            title="Close Panel"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-800 bg-slate-950/60 px-2 text-xs">
        <button
          onClick={() => setActiveTab('interfaces')}
          className={`py-2 px-2.5 border-b-2 font-medium transition ${
            activeTab === 'interfaces'
              ? 'border-cyan-500 text-cyan-400 font-semibold'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          Interfaces
        </button>

        {isRouter && (
          <button
            onClick={() => setActiveTab('routing')}
            className={`py-2 px-2.5 border-b-2 font-medium transition ${
              activeTab === 'routing'
                ? 'border-cyan-500 text-cyan-400 font-semibold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Routing Table
          </button>
        )}

        {isSwitch && (
          <button
            onClick={() => setActiveTab('mac_table')}
            className={`py-2 px-2.5 border-b-2 font-medium transition ${
              activeTab === 'mac_table'
                ? 'border-cyan-500 text-cyan-400 font-semibold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            MAC Table
          </button>
        )}

        {(isHost || isRouter) && (
          <button
            onClick={() => setActiveTab('arp')}
            className={`py-2 px-2.5 border-b-2 font-medium transition ${
              activeTab === 'arp'
                ? 'border-cyan-500 text-cyan-400 font-semibold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            ARP Cache
          </button>
        )}
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto p-3 space-y-4 text-xs">
        {/* INTERFACES TAB */}
        {activeTab === 'interfaces' && (
          <div className="space-y-4">
            {/* Host Default Gateway */}
            {isHost && (
              <div className="bg-slate-800/60 p-2.5 rounded-lg border border-slate-700/80 space-y-1.5">
                <label className="text-[11px] font-semibold text-slate-300 block">
                  Default Gateway (IPv4)
                </label>
                <input
                  type="text"
                  placeholder="e.g. 192.168.1.1"
                  value={device.default_gateway || ''}
                  onChange={(e) => handleGatewayChange(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-slate-100 font-mono text-xs focus:border-cyan-500 outline-none"
                />
                <span className="text-[10px] text-slate-500 block">
                  Next-hop router interface on the local subnet.
                </span>
              </div>
            )}

            {/* List of Device Interfaces */}
            <div className="space-y-3">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                Configured Interfaces ({interfaces.length})
              </div>

              {interfaces.map((iface) => (
                <div
                  key={iface.name}
                  className="bg-slate-800/80 rounded-lg border border-slate-700 p-2.5 space-y-2.5 shadow-sm"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <div className={`w-2 h-2 rounded-full ${iface.admin_up && iface.is_connected ? 'bg-emerald-400 dot-online' : 'bg-rose-500 dot-offline'}`} />
                      <span className="font-bold text-slate-100">{iface.name}</span>
                    </div>

                    {/* Admin UP/DOWN toggle */}
                    <button
                      onClick={() => handleInterfaceChange(iface.name, 'admin_up', !iface.admin_up)}
                      className={`flex items-center space-x-1 px-2 py-0.5 rounded text-[10px] font-semibold transition ${
                        iface.admin_up 
                          ? 'bg-emerald-950 text-emerald-300 border border-emerald-800' 
                          : 'bg-rose-950 text-rose-300 border border-rose-800'
                      }`}
                      title={iface.admin_up ? 'Interface is Administratively UP. Click to Shutdown.' : 'Interface is SHUTDOWN. Click to Enable.'}
                    >
                      <Power className="w-3 h-3" />
                      <span>{iface.admin_up ? 'UP' : 'SHUTDOWN'}</span>
                    </button>
                  </div>

                  {/* MAC Address info */}
                  <div className="text-[10px] font-mono text-slate-400 flex justify-between">
                    <span>MAC:</span>
                    <span className="text-slate-300">{iface.mac_address}</span>
                  </div>

                  {/* IP and Subnet Config (Not applicable to pure L2 switch ports) */}
                  {!isSwitch && (
                    <div className="grid grid-cols-2 gap-2 pt-1">
                      <div>
                        <label className="text-[10px] text-slate-400 block mb-0.5">IPv4 Address</label>
                        <input
                          type="text"
                          placeholder="192.168.1.10"
                          value={iface.ip_address || ''}
                          onChange={(e) => handleInterfaceChange(iface.name, 'ip_address', e.target.value)}
                          className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-100 font-mono text-[11px] focus:border-cyan-500 outline-none"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-slate-400 block mb-0.5">Subnet Mask</label>
                        <input
                          type="text"
                          placeholder="255.255.255.0"
                          value={iface.subnet_mask || ''}
                          onChange={(e) => handleInterfaceChange(iface.name, 'subnet_mask', e.target.value)}
                          className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-100 font-mono text-[11px] focus:border-cyan-500 outline-none"
                        />
                      </div>
                    </div>
                  )}

                  {/* Connected Link Status */}
                  <div className="pt-1.5 border-t border-slate-700/60 flex items-center justify-between text-[10px]">
                    <span className="text-slate-400">
                      Link: {iface.link_id ? (
                        <span className="text-emerald-400 font-medium">Connected</span>
                      ) : (
                        <span className="text-slate-500">Unconnected</span>
                      )}
                    </span>
                    {iface.link_id && (
                      <button
                        onClick={() => onDisconnectInterface(device.id, iface.name)}
                        className="text-rose-400 hover:underline"
                      >
                        Disconnect
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ROUTING TABLE TAB (Routers) */}
        {activeTab === 'routing' && isRouter && (
          <div className="space-y-4">
            <div className="text-[11px] text-slate-400">
              Active IPv4 routing table calculated via Longest-Prefix-Match.
            </div>

            {/* Existing Routes */}
            <div className="space-y-2">
              {(device.routing_table || []).map((r, idx) => (
                <div key={idx} className="bg-slate-800/80 p-2 rounded border border-slate-700 font-mono text-[11px]">
                  <div className="flex items-center justify-between font-bold text-slate-200">
                    <span className="flex items-center space-x-1.5">
                      <span className={`px-1 py-0.2 rounded text-[9px] ${r.route_type === 'C' ? 'bg-emerald-950 text-emerald-400' : 'bg-blue-950 text-blue-400'}`}>
                        {r.route_type}
                      </span>
                      <span>{r.network}/{r.prefix}</span>
                    </span>
                    {r.route_type === 'S' && (
                      <button
                        onClick={() => handleRemoveStaticRoute(r.network, r.mask)}
                        className="text-rose-400 hover:text-rose-300"
                        title="Delete Static Route"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                  <div className="text-[10px] text-slate-400 mt-1">
                    {r.route_type === 'C' ? `Directly connected, ${r.interface_name}` : `via ${r.next_hop}`}
                  </div>
                </div>
              ))}
            </div>

            {/* Add Static Route Form */}
            <form onSubmit={handleAddStaticRoute} className="bg-slate-800/60 p-2.5 rounded-lg border border-slate-700 space-y-2">
              <div className="font-semibold text-slate-200 text-xs">Add Static Route</div>
              <input
                type="text"
                placeholder="Destination Network (e.g. 192.168.2.0)"
                value={newRoute.network}
                onChange={(e) => setNewRoute({ ...newRoute, network: e.target.value })}
                className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-100 font-mono text-[11px] outline-none"
              />
              <input
                type="text"
                placeholder="Subnet Mask (e.g. 255.255.255.0)"
                value={newRoute.mask}
                onChange={(e) => setNewRoute({ ...newRoute, mask: e.target.value })}
                className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-100 font-mono text-[11px] outline-none"
              />
              <input
                type="text"
                placeholder="Next-Hop IPv4 (e.g. 10.0.0.2)"
                value={newRoute.next_hop}
                onChange={(e) => setNewRoute({ ...newRoute, next_hop: e.target.value })}
                className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-100 font-mono text-[11px] outline-none"
              />
              <button
                type="submit"
                className="w-full bg-cyan-600 hover:bg-cyan-500 text-white font-semibold py-1 rounded text-xs transition"
              >
                Add Route
              </button>
            </form>
          </div>
        )}

        {/* MAC ADDRESS TABLE TAB (Switches) */}
        {activeTab === 'mac_table' && isSwitch && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-semibold uppercase text-slate-400">
                Learned MAC Addresses ({device.mac_table?.length || 0})
              </span>
              <button
                onClick={handleClearMacTable}
                className="text-[10px] text-rose-400 hover:underline flex items-center space-x-1"
              >
                <RefreshCw className="w-3 h-3" />
                <span>Flush Table</span>
              </button>
            </div>

            {(!device.mac_table || device.mac_table.length === 0) ? (
              <div className="text-center py-6 text-slate-500 text-xs">
                MAC table is empty. Send traffic through the switch to observe MAC learning!
              </div>
            ) : (
              <div className="space-y-1.5 font-mono text-[10px]">
                {device.mac_table.map((m, idx) => (
                  <div key={idx} className="bg-slate-800/80 p-2 rounded border border-slate-700 flex justify-between items-center">
                    <div>
                      <div className="text-cyan-300 font-semibold">{m.mac}</div>
                      <div className="text-slate-400 text-[9px]">Type: {m.type || 'DYNAMIC'}</div>
                    </div>
                    <div className="bg-slate-900 px-2 py-0.5 rounded text-slate-200 border border-slate-700">
                      {m.port}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ARP CACHE TAB */}
        {activeTab === 'arp' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-semibold uppercase text-slate-400">
                Resolved ARP Entries ({device.arp_cache?.length || 0})
              </span>
              <button
                onClick={handleClearArp}
                className="text-[10px] text-rose-400 hover:underline flex items-center space-x-1"
              >
                <RefreshCw className="w-3 h-3" />
                <span>Clear Cache</span>
              </button>
            </div>

            {(!device.arp_cache || device.arp_cache.length === 0) ? (
              <div className="text-center py-6 text-slate-500 text-xs">
                ARP cache is empty. Run a ping to trigger Address Resolution Protocol!
              </div>
            ) : (
              <div className="space-y-1.5 font-mono text-[10px]">
                {device.arp_cache.map((entry, idx) => (
                  <div key={idx} className="bg-slate-800/80 p-2 rounded border border-slate-700 flex justify-between items-center">
                    <div>
                      <div className="text-emerald-400 font-semibold">{entry.ip}</div>
                      <div className="text-slate-400 text-[9px]">{entry.mac}</div>
                    </div>
                    <span className="bg-slate-900 px-1.5 py-0.5 rounded text-[9px] text-slate-400 border border-slate-700">
                      DYNAMIC
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </aside>
  );
}
