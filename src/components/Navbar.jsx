import React from 'react';
import { 
  Network, Play, RotateCcw, Download, Upload, 
  HelpCircle, CheckCircle2, AlertTriangle, Calculator,
  Radio, Terminal as TerminalIcon, Sparkles, Layers
} from 'lucide-react';

export default function Navbar({
  topology,
  onResetLab,
  onExportTopology,
  onImportTopology,
  onOpenQuickPing,
  onOpenSubnetCalc,
  onOpenHelp,
  onSelectLab,
  selectedLabId,
  engineStatus,
  engineMessage,
  onValidateTopology,
  validationResult
}) {
  const fileInputRef = React.useRef(null);

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const parsed = JSON.parse(event.target?.result);
          onImportTopology(parsed);
        } catch (err) {
          alert('Failed to parse topology JSON file: ' + err.message);
        }
      };
      reader.readAsText(file);
    }
  };

  return (
    <header className="h-14 border-b border-slate-800 bg-slate-900/90 backdrop-blur px-4 flex items-center justify-between z-30 select-none">
      {/* Brand & Mode */}
      <div className="flex items-center space-x-3">
        <div className="flex items-center space-x-2.5">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-cyan-600 to-blue-500 flex items-center justify-center shadow-lg shadow-cyan-500/20">
            <Network className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-bold tracking-tight text-white text-base">NetForge</span>
              <span className="text-[10px] font-semibold uppercase tracking-wider bg-cyan-950 text-cyan-400 border border-cyan-800/80 px-1.5 py-0.5 rounded">
                Simulator
              </span>
            </div>
            <div className="text-[11px] text-slate-400 flex items-center space-x-1.5">
              <span>Observable Networking Lab</span>
            </div>
          </div>
        </div>

        <div className="h-5 w-px bg-slate-800 mx-2" />

        {/* Guided Lab Selector */}
        <div className="flex items-center space-x-2">
          <Layers className="w-4 h-4 text-slate-400" />
          <select
            value={selectedLabId || 'custom'}
            onChange={(e) => onSelectLab(e.target.value)}
            className="bg-slate-800 hover:bg-slate-750 text-xs font-medium text-slate-200 border border-slate-700 rounded-md px-2.5 py-1.5 outline-none focus:border-cyan-500 transition"
          >
            <option value="lab-1">Lab 1: First Network (Switch & ARP)</option>
            <option value="lab-2">Lab 2: Fix the Subnet Mask</option>
            <option value="lab-3">Lab 3: Route Between Networks</option>
            <option value="lab-4">Lab 4: Troubleshoot Connectivity</option>
            <option value="lab-5">Lab 5: Observe ARP and Routing</option>
            <option value="custom">-- Custom Topology Workspace --</option>
          </select>
        </div>
      </div>

      {/* Center Actions */}
      <div className="flex items-center space-x-2">
        <button
          onClick={onOpenQuickPing}
          className="flex items-center space-x-1.5 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white text-xs font-semibold px-3 py-1.5 rounded-md shadow-md shadow-cyan-600/20 transition active:scale-95"
          title="Send ICMP Echo packet between two endpoints"
        >
          <Play className="w-3.5 h-3.5 fill-current" />
          <span>Send Ping</span>
        </button>

        <button
          onClick={onOpenSubnetCalc}
          className="flex items-center space-x-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium px-3 py-1.5 rounded-md border border-slate-700 transition"
          title="Open Subnetting and IP Addressing Planning Tool"
        >
          <Calculator className="w-3.5 h-3.5 text-cyan-400" />
          <span>Subnet Calculator</span>
        </button>

        <button
          onClick={onValidateTopology}
          className={`flex items-center space-x-1.5 text-xs font-medium px-2.5 py-1.5 rounded-md border transition ${
            validationResult?.errors?.length > 0 
              ? 'bg-rose-950/60 text-rose-300 border-rose-800' 
              : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
          }`}
          title="Validate topology configuration for IP conflicts and errors"
        >
          {validationResult?.errors?.length > 0 ? (
            <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
          ) : (
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
          )}
          <span>Check Topology</span>
        </button>

        <button
          onClick={onResetLab}
          className="flex items-center space-x-1 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs px-2.5 py-1.5 rounded-md border border-slate-700 transition"
          title="Reset current lab topology to default state"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Reset</span>
        </button>
      </div>

      {/* Right Controls: Save/Load, Engine Status, Help */}
      <div className="flex items-center space-x-3">
        {/* Engine Status Badge */}
        <div 
          className="flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-[11px] font-mono border border-slate-800 bg-slate-950"
          title={engineMessage}
        >
          <div className={`w-2 h-2 rounded-full ${
            engineStatus === 'READY_WASM' 
              ? 'bg-emerald-400 animate-pulse' 
              : engineStatus === 'READY_API' 
              ? 'bg-cyan-400' 
              : 'bg-amber-400 animate-spin'
          }`} />
          <span className="text-slate-300">
            {engineStatus === 'READY_WASM' ? 'Python 3 Wasm' : engineStatus === 'READY_API' ? 'Python 3 API' : 'Initializing...'}
          </span>
        </div>

        {/* File Export / Import */}
        <div className="flex items-center space-x-1 border-l border-slate-800 pl-3">
          <button
            onClick={onExportTopology}
            className="p-1.5 text-slate-400 hover:text-slate-100 hover:bg-slate-800 rounded transition"
            title="Export Topology as JSON"
          >
            <Download className="w-4 h-4" />
          </button>

          <button
            onClick={() => fileInputRef.current?.click()}
            className="p-1.5 text-slate-400 hover:text-slate-100 hover:bg-slate-800 rounded transition"
            title="Import Topology JSON"
          >
            <Upload className="w-4 h-4" />
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            onChange={handleFileChange}
            className="hidden"
          />

          <button
            onClick={onOpenHelp}
            className="p-1.5 text-slate-400 hover:text-cyan-400 hover:bg-slate-800 rounded transition"
            title="Documentation, Architecture, and CLI Reference"
          >
            <HelpCircle className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
}
