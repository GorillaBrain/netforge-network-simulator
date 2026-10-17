import React, { useState, useRef, useEffect } from 'react';
import CiscoDeviceIcon from './CiscoDeviceIcon.jsx';
import { sound } from '../utils/soundEffects.js';
import { gamification } from '../utils/gamification.js';
import { 
  X, Terminal as TerminalIcon, Settings, HardDrive, 
  CornerDownLeft, Play, RefreshCw, CheckCircle2, Shield
} from 'lucide-react';

export default function DeviceDialog({
  device,
  topology,
  isOpen,
  onClose,
  onUpdateDevice,
  onDeleteDevice,
  onRunCliCommand,
  cliOutput,
  currentCliPrompt
}) {
  const [activeTab, setActiveTab] = useState('desktop'); // 'physical', 'config', 'desktop'
  const [selectedIfaceName, setSelectedIfaceName] = useState(null);
  const [cliInput, setCliInput] = useState('');
  const terminalEndRef = useRef(null);

  // Form state
  const [nameInput, setNameInput] = useState(device?.name || '');
  const [gwInput, setGwInput] = useState(device?.default_gateway || '');
  const [ifaceIp, setIfaceIp] = useState('');
  const [ifaceMask, setIfaceMask] = useState('');
  const [ifaceAdminUp, setIfaceAdminUp] = useState(true);

  useEffect(() => {
    if (device) {
      setNameInput(device.name || '');
      setGwInput(device.default_gateway || '');
      const firstIface = Object.values(device.interfaces || {})[0];
      if (firstIface) {
        setSelectedIfaceName(firstIface.name);
        setIfaceIp(firstIface.ip_address || '');
        setIfaceMask(firstIface.subnet_mask || '255.255.255.0');
        setIfaceAdminUp(firstIface.admin_up !== false);
      }
    }
  }, [device]);

  useEffect(() => {
    if (selectedIfaceName && device?.interfaces?.[selectedIfaceName]) {
      const iface = device.interfaces[selectedIfaceName];
      setIfaceIp(iface.ip_address || '');
      setIfaceMask(iface.subnet_mask || '255.255.255.0');
      setIfaceAdminUp(iface.admin_up !== false);
    }
  }, [selectedIfaceName, device]);

  useEffect(() => {
    if (activeTab === 'desktop') {
      terminalEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [cliOutput, activeTab]);

  if (!isOpen || !device) return null;

  const isHost = ['pc', 'laptop', 'server'].includes(device.device_type);

  const handleSaveConfig = () => {
    sound.playClick();
    const updated = {
      ...device,
      name: nameInput.trim() || device.name,
      default_gateway: gwInput.trim() || null
    };

    if (selectedIfaceName && updated.interfaces?.[selectedIfaceName]) {
      updated.interfaces[selectedIfaceName] = {
        ...updated.interfaces[selectedIfaceName],
        ip_address: ifaceIp.trim() || null,
        subnet_mask: ifaceMask.trim() || null,
        admin_up: ifaceAdminUp
      };
    }

    onUpdateDevice(updated);
    gamification.addXp(25, `Configured ${device.name}`);
  };

  const handleCliSubmit = (e) => {
    e.preventDefault();
    if (!cliInput.trim()) return;
    sound.playClick();
    onRunCliCommand(cliInput.trim());
    gamification.addXp(20, `Executed CLI: ${cliInput.trim().slice(0, 15)}`);
    gamification.unlockAchievement('cisco_ninja');
    setCliInput('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="w-full max-w-3xl bg-slate-900 border border-slate-750 rounded-xl shadow-2xl overflow-hidden flex flex-col h-[560px] animate-in fade-in zoom-in-95 duration-150">
        {/* Packet Tracer Window Header */}
        <div className="h-9 bg-slate-950 border-b border-slate-800 px-3 flex items-center justify-between select-none">
          <div className="flex items-center space-x-2">
            <CiscoDeviceIcon type={device.device_type} size={20} />
            <span className="font-bold text-white text-xs font-mono">{device.name}</span>
            <span className="text-[10px] text-slate-400 font-mono">({device.device_type.toUpperCase()})</span>
          </div>

          {/* Window Tabs (Physical, Config, Desktop/CLI) */}
          <div className="flex items-center space-x-1">
            <button
              onClick={() => { sound.playClick(); setActiveTab('physical'); }}
              className={`px-3 py-1 text-xs font-semibold rounded-t transition ${
                activeTab === 'physical'
                  ? 'bg-slate-800 text-cyan-400 border-t-2 border-cyan-400'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Physical
            </button>
            <button
              onClick={() => { sound.playClick(); setActiveTab('config'); }}
              className={`px-3 py-1 text-xs font-semibold rounded-t transition ${
                activeTab === 'config'
                  ? 'bg-slate-800 text-cyan-400 border-t-2 border-cyan-400'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Config
            </button>
            <button
              onClick={() => { sound.playClick(); setActiveTab('desktop'); }}
              className={`px-3 py-1 text-xs font-semibold rounded-t transition ${
                activeTab === 'desktop'
                  ? 'bg-slate-800 text-cyan-400 border-t-2 border-cyan-400'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {isHost ? 'Desktop / Command Prompt' : 'CLI (Cisco IOS)'}
            </button>
          </div>

          <button
            onClick={() => { sound.playClick(); onClose(); }}
            className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab 1: Physical View */}
        {activeTab === 'physical' && (
          <div className="flex-1 p-6 bg-slate-950 flex flex-col items-center justify-center space-y-4 text-center">
            <CiscoDeviceIcon type={device.device_type} size={120} />
            <div>
              <h3 className="font-bold text-white text-base">{device.name}</h3>
              <p className="text-xs text-slate-400 font-mono mt-1">
                Interfaces: {Object.keys(device.interfaces || {}).join(', ')}
              </p>
            </div>
            <div className="p-3 bg-slate-900 border border-slate-800 rounded-lg max-w-md text-xs text-slate-300">
              Cisco simulated hardware unit initialized. Switch to the <strong>Config</strong> tab to adjust IP addressing and port states, or the <strong>{isHost ? 'Desktop' : 'CLI'}</strong> tab to run commands.
            </div>
          </div>
        )}

        {/* Tab 2: Config View */}
        {activeTab === 'config' && (
          <div className="flex-1 flex overflow-hidden divide-x divide-slate-800 bg-slate-900">
            {/* Interface selector list */}
            <div className="w-48 bg-slate-950/80 p-3 space-y-2 overflow-y-auto">
              <div className="text-[10px] font-mono font-bold uppercase text-slate-400">
                Interfaces
              </div>
              <div className="space-y-1">
                {Object.values(device.interfaces || {}).map((iface) => (
                  <button
                    key={iface.name}
                    onClick={() => { sound.playClick(); setSelectedIfaceName(iface.name); }}
                    className={`w-full text-left px-2 py-1.5 rounded text-xs font-mono font-semibold transition flex items-center justify-between ${
                      selectedIfaceName === iface.name
                        ? 'bg-cyan-600/30 text-cyan-300 border border-cyan-500/50'
                        : 'text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    <span>{iface.name}</span>
                    <span className={`w-2 h-2 rounded-full ${iface.admin_up && iface.link_id ? 'bg-emerald-400' : 'bg-slate-600'}`} />
                  </button>
                ))}
              </div>
            </div>

            {/* Interface Settings Editor */}
            <div className="flex-1 p-6 space-y-4 overflow-y-auto bg-slate-900">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <h4 className="font-bold text-white text-sm font-mono flex items-center space-x-2">
                  <span>Interface: {selectedIfaceName}</span>
                </h4>

                {/* Port Status Toggle (On/Off) */}
                <div className="flex items-center space-x-2">
                  <span className="text-xs font-mono text-slate-400">Port Status:</span>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={ifaceAdminUp}
                      onChange={(e) => setIfaceAdminUp(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-600"></div>
                  </label>
                  <span className={`text-xs font-mono font-bold ${ifaceAdminUp ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {ifaceAdminUp ? 'On' : 'Off'}
                  </span>
                </div>
              </div>

              {/* IP Configuration (Only relevant if device supports Layer 3 / Interface IP) */}
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-mono text-slate-300 mb-1">
                    IPv4 Address
                  </label>
                  <input
                    type="text"
                    value={ifaceIp}
                    onChange={(e) => setIfaceIp(e.target.value)}
                    placeholder="e.g. 192.168.1.10"
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white font-mono outline-none focus:border-cyan-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-mono text-slate-300 mb-1">
                    Subnet Mask
                  </label>
                  <input
                    type="text"
                    value={ifaceMask}
                    onChange={(e) => setIfaceMask(e.target.value)}
                    placeholder="e.g. 255.255.255.0"
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white font-mono outline-none focus:border-cyan-500"
                  />
                </div>

                {isHost && (
                  <div>
                    <label className="block text-xs font-mono text-slate-300 mb-1">
                      Default Gateway
                    </label>
                    <input
                      type="text"
                      value={gwInput}
                      onChange={(e) => setGwInput(e.target.value)}
                      placeholder="e.g. 192.168.1.1"
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white font-mono outline-none focus:border-cyan-500"
                    />
                  </div>
                )}
              </div>

              <div className="pt-4 border-t border-slate-800 flex justify-end">
                <button
                  onClick={handleSaveConfig}
                  className="px-4 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs font-mono transition shadow"
                >
                  Apply Configuration
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Tab 3: Desktop / Cisco IOS CLI */}
        {activeTab === 'desktop' && (
          <div className="flex-1 flex flex-col bg-slate-950 font-mono text-xs">
            {/* Terminal Screen */}
            <div className="flex-1 overflow-y-auto p-4 space-y-1 text-slate-200">
              <div className="text-slate-400 text-[11px] pb-2 border-b border-slate-800/80 mb-2">
                NetForge {isHost ? 'PC Command Prompt' : 'Cisco IOS Software Console'} — Type 'help' or '?' for command list.
              </div>
              {cliOutput.map((item, idx) => (
                <div key={idx} className="space-y-0.5">
                  {item.command && (
                    <div className="text-cyan-400 flex items-center space-x-1">
                      <span className="text-slate-500">{item.prompt || '>'}</span>
                      <span className="font-bold">{item.command}</span>
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

            {/* Quick Action Chips */}
            <div className="h-7 border-t border-slate-800 px-3 flex items-center space-x-1.5 bg-slate-900/60 overflow-x-auto text-[10px]">
              <span className="text-slate-500 font-mono text-[9px] uppercase tracking-wider flex-shrink-0">
                Quick:
              </span>
              {[
                'ping 192.168.1.20',
                'show ip',
                'show interfaces',
                'show arp',
                'show mac',
                'show ip route',
                'conf t'
              ].map(cmd => (
                <button
                  key={cmd}
                  type="button"
                  onClick={() => {
                    sound.playClick();
                    onRunCliCommand(cmd);
                  }}
                  className="px-2 py-0.5 rounded bg-slate-800 hover:bg-cyan-900/50 hover:text-cyan-300 text-slate-300 font-mono transition border border-slate-700/60 whitespace-nowrap flex-shrink-0"
                >
                  {cmd}
                </button>
              ))}
            </div>

            {/* Terminal Command Prompt Input */}
            <form onSubmit={handleCliSubmit} className="h-9 border-t border-slate-800 px-3 flex items-center space-x-2 bg-slate-900">
              <span className="text-cyan-400 font-bold">{currentCliPrompt || `${device.name}> `}</span>
              <input
                type="text"
                value={cliInput}
                onChange={(e) => setCliInput(e.target.value)}
                placeholder="Enter command (e.g. ping 192.168.1.20, show ip)..."
                className="flex-1 bg-transparent text-white font-mono text-xs outline-none"
                autoFocus
              />
              <button
                type="submit"
                className="p-1 text-slate-400 hover:text-cyan-400"
              >
                <CornerDownLeft className="w-4 h-4" />
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
