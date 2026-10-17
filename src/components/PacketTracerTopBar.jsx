import React, { useState, useEffect } from 'react';
import { 
  MousePointer, Mail, Zap, Trash2, Calculator, RotateCcw, 
  Download, Upload, HelpCircle, Volume2, VolumeX, Trophy,
  CheckCircle2, AlertTriangle, Layers, Play, Award, ChevronDown
} from 'lucide-react';
import { sound } from '../utils/soundEffects.js';
import { gamification } from '../utils/gamification.js';

export default function PacketTracerTopBar({
  topology,
  activeTool,
  setActiveTool,
  onResetLab,
  onExportTopology,
  onImportTopology,
  onOpenSubnetCalc,
  onOpenHelp,
  onSelectLab,
  selectedLabId,
  engineStatus,
  onOpenAchievements,
  selectedLab,
  labEvaluation
}) {
  const fileInputRef = React.useRef(null);
  const [sfxEnabled, setSfxEnabled] = useState(sound.isEnabled());
  const [playerState, setPlayerState] = useState(gamification.getState());

  useEffect(() => {
    const unsub = gamification.subscribe((event, newState) => {
      setPlayerState(newState);
      if (event.type === 'XP_GAINED' && event.leveledUp) {
        sound.playLevelUp();
      }
    });
    return unsub;
  }, []);

  const handleToggleSound = () => {
    const newState = sound.toggleSound();
    setSfxEnabled(newState);
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const parsed = JSON.parse(event.target?.result);
          onImportTopology(parsed);
          sound.playCableConnect();
        } catch (err) {
          alert('Failed to parse topology JSON: ' + err.message);
        }
      };
      reader.readAsText(file);
    }
  };

  return (
    <header className="border-b border-slate-800 bg-slate-950 select-none shadow-md">
      {/* 1. Classic Packet Tracer Menu Bar */}
      <div className="h-7 border-b border-slate-800/80 px-3 flex items-center justify-between text-xs text-slate-300 bg-slate-900/60 font-sans">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-1.5 font-bold text-white tracking-wide font-mono text-[11px]">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
            <span>CISCO PACKET TRACER // NETFORGE ARCADE</span>
          </div>

          <div className="h-3.5 w-px bg-slate-700 mx-1" />

          {/* Campaign Mission Dropdown */}
          <div className="flex items-center space-x-1.5 text-[11px]">
            <Award className="w-3.5 h-3.5 text-cyan-400" />
            <select
              value={selectedLabId || 'custom'}
              onChange={(e) => {
                sound.playClick();
                onSelectLab(e.target.value);
              }}
              className="bg-slate-800 text-slate-200 border border-slate-700 rounded px-2 py-0.5 text-[11px] font-semibold outline-none cursor-pointer"
            >
              <option value="lab-1">Mission 01: First Network (Switch & ARP)</option>
              <option value="lab-2">Mission 02: Fix the Subnet Mask</option>
              <option value="lab-3">Mission 03: Route Between Networks</option>
              <option value="lab-4">Mission 04: Troubleshoot Connectivity</option>
              <option value="lab-5">Mission 05: Observe ARP and Routing</option>
              <option value="custom">-- Custom Topology Sandbox --</option>
            </select>
          </div>
        </div>

        {/* Right Header Status: Operator Level & SFX */}
        <div className="flex items-center space-x-3 text-xs">
          {/* Operator Rank Badge */}
          <button
            onClick={() => {
              sound.playClick();
              onOpenAchievements();
            }}
            className="flex items-center space-x-1.5 px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition"
            title="Click to view Achievements & Rank"
          >
            <span className="text-xs">{playerState.rank.badge}</span>
            <span className="text-[10px] font-mono font-bold text-cyan-300">
              LVL {playerState.rank.level} {playerState.rank.title}
            </span>
            <span className="text-[10px] font-mono text-slate-400">
              ({playerState.xp} XP)
            </span>
          </button>

          {/* Sound Toggle */}
          <button
            onClick={handleToggleSound}
            className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition"
            title={sfxEnabled ? "Mute Sound Effects" : "Enable Sound Effects"}
          >
            {sfxEnabled ? <Volume2 className="w-3.5 h-3.5 text-cyan-400" /> : <VolumeX className="w-3.5 h-3.5" />}
          </button>

          {/* Engine indicator */}
          <div className="flex items-center space-x-1 text-[10px] font-mono text-slate-400">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span>Wasm Engine</span>
          </div>
        </div>
      </div>

      {/* 2. Packet Tracer Iconic Primary Toolbar */}
      <div className="h-10 px-3 flex items-center justify-between bg-slate-900/90">
        {/* Left Interactive Tools */}
        <div className="flex items-center space-x-1">
          {/* Select Tool */}
          <button
            onClick={() => {
              sound.playClick();
              setActiveTool('select');
            }}
            className={`p-1.5 rounded-md flex items-center space-x-1 text-xs font-semibold transition ${
              activeTool === 'select'
                ? 'bg-cyan-600 text-white shadow-sm'
                : 'text-slate-300 hover:bg-slate-800'
            }`}
            title="Select & Move Tool (ESC)"
          >
            <MousePointer className="w-4 h-4" />
            <span className="hidden sm:inline">Select</span>
          </button>

          {/* Simple PDU Envelope (Ping) Tool */}
          <button
            onClick={() => {
              sound.playClick();
              setActiveTool('pdu');
            }}
            className={`p-1.5 rounded-md flex items-center space-x-1 text-xs font-semibold transition ${
              activeTool === 'pdu'
                ? 'bg-amber-500 text-slate-950 font-bold shadow-md shadow-amber-500/20'
                : 'text-slate-300 hover:bg-slate-800'
            }`}
            title="Add Simple PDU (Ping between two devices)"
          >
            <Mail className="w-4 h-4 fill-current" />
            <span className="hidden sm:inline">Add Simple PDU (Ping)</span>
          </button>

          {/* Auto Connect Cable Tool */}
          <button
            onClick={() => {
              sound.playClick();
              setActiveTool('connect');
            }}
            className={`p-1.5 rounded-md flex items-center space-x-1 text-xs font-semibold transition ${
              activeTool === 'connect'
                ? 'bg-cyan-500 text-slate-950 font-bold shadow-md shadow-cyan-500/20'
                : 'text-slate-300 hover:bg-slate-800'
            }`}
            title="Automatically Connect Cable between two devices"
          >
            <Zap className="w-4 h-4 fill-current" />
            <span className="hidden sm:inline">Connect Cable</span>
          </button>

          {/* Delete Tool */}
          <button
            onClick={() => {
              sound.playClick();
              setActiveTool('delete');
            }}
            className={`p-1.5 rounded-md flex items-center space-x-1 text-xs font-semibold transition ${
              activeTool === 'delete'
                ? 'bg-rose-600 text-white shadow-md shadow-rose-600/20'
                : 'text-slate-300 hover:bg-slate-800'
            }`}
            title="Delete Tool (Click any device or wire)"
          >
            <Trash2 className="w-4 h-4" />
            <span className="hidden sm:inline">Delete</span>
          </button>

          <div className="h-4 w-px bg-slate-800 mx-2" />

          {/* Subnet Calculator */}
          <button
            onClick={() => {
              sound.playClick();
              onOpenSubnetCalc();
            }}
            className="p-1.5 rounded-md text-slate-300 hover:bg-slate-800 flex items-center space-x-1 text-xs font-medium transition"
            title="Open Subnet Calculator"
          >
            <Calculator className="w-4 h-4 text-cyan-400" />
            <span className="hidden md:inline">Subnet Calc</span>
          </button>

          {/* Power Cycle / Reset */}
          <button
            onClick={() => {
              sound.playClick();
              onResetLab();
            }}
            className="p-1.5 rounded-md text-slate-300 hover:bg-slate-800 flex items-center space-x-1 text-xs font-medium transition"
            title="Reset Network Topology"
          >
            <RotateCcw className="w-4 h-4" />
            <span className="hidden md:inline">Reset</span>
          </button>
        </div>

        {/* Right File & Help Controls */}
        <div className="flex items-center space-x-1">
          <button
            onClick={() => {
              sound.playClick();
              onExportTopology();
            }}
            className="p-1.5 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition"
            title="Export Topology JSON"
          >
            <Download className="w-4 h-4" />
          </button>

          <button
            onClick={() => {
              sound.playClick();
              fileInputRef.current?.click();
            }}
            className="p-1.5 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition"
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
            onClick={() => {
              sound.playClick();
              onOpenHelp();
            }}
            className="p-1.5 rounded text-slate-400 hover:text-cyan-400 hover:bg-slate-800 transition"
            title="Help & Reference Guide"
          >
            <HelpCircle className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
}
