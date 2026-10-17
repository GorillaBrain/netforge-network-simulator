import React, { useState, useEffect } from 'react';
import { 
  Network, Play, RotateCcw, Download, Upload, 
  HelpCircle, CheckCircle2, AlertTriangle, Calculator,
  Radio, Terminal as TerminalIcon, Sparkles, Layers,
  Volume2, VolumeX, Trophy, Zap, Shield, ChevronDown
} from 'lucide-react';
import { sound } from '../utils/soundEffects.js';
import { gamification } from '../utils/gamification.js';

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
  validationResult,
  onOpenAchievements
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
          alert('Failed to parse topology JSON file: ' + err.message);
        }
      };
      reader.readAsText(file);
    }
  };

  return (
    <header className="h-14 border-b border-cyan-500/20 bg-slate-950/95 backdrop-blur px-4 flex items-center justify-between z-30 select-none shadow-xl">
      {/* Brand & Campaign Mission Selector */}
      <div className="flex items-center space-x-3">
        {/* Cyber Brand Logo */}
        <div className="flex items-center space-x-2.5">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-cyan-600 via-blue-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-cyan-500/30 border border-cyan-400/40">
            <Network className="w-4 h-4 text-white animate-pulse" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-extrabold tracking-wider text-white text-base font-mono">NETFORGE</span>
              <span className="text-[9px] font-bold uppercase tracking-widest bg-cyan-950/90 text-cyan-300 border border-cyan-500/40 px-1.5 py-0.5 rounded shadow">
                CYBER-NOC
              </span>
            </div>
          </div>
        </div>

        <div className="h-5 w-px bg-slate-800 mx-1" />

        {/* Campaign Lab Selector */}
        <div className="flex items-center space-x-1.5 bg-slate-900/90 border border-slate-800 rounded-lg px-2.5 py-1">
          <Layers className="w-3.5 h-3.5 text-cyan-400" />
          <select
            value={selectedLabId || 'custom'}
            onChange={(e) => {
              sound.playClick();
              onSelectLab(e.target.value);
            }}
            className="bg-transparent text-xs font-semibold text-slate-200 outline-none cursor-pointer"
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

      {/* Center Actions: Launch Ping, Subnet Tool, Topology Diagnostics */}
      <div className="flex items-center space-x-2">
        <button
          onClick={() => {
            sound.playClick();
            onOpenQuickPing();
          }}
          className="flex items-center space-x-1.5 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white text-xs font-bold px-3 py-1.5 rounded-lg shadow-md shadow-cyan-600/30 transition active:scale-95 border border-cyan-400/30"
          title="Dispatch simulated packet between endpoints"
        >
          <Play className="w-3 h-3 fill-current" />
          <span>Launch Ping</span>
        </button>

        <button
          onClick={() => {
            sound.playClick();
            onOpenSubnetCalc();
          }}
          className="flex items-center space-x-1.5 bg-slate-900/90 hover:bg-slate-800 text-slate-200 text-xs font-medium px-3 py-1.5 rounded-lg border border-slate-800 hover:border-cyan-500/40 transition"
          title="Open Subnetting and IP Addressing Planning Tool"
        >
          <Calculator className="w-3.5 h-3.5 text-cyan-400" />
          <span>Subnet Calculator</span>
        </button>

        <button
          onClick={() => {
            sound.playClick();
            onValidateTopology();
          }}
          className={`flex items-center space-x-1.5 text-xs font-medium px-2.5 py-1.5 rounded-lg border transition ${
            validationResult?.errors?.length > 0 
              ? 'bg-rose-950/80 text-rose-300 border-rose-700' 
              : 'bg-slate-900/90 hover:bg-slate-800 text-slate-200 border-slate-800 hover:border-cyan-500/40'
          }`}
          title="Audit topology for IP collisions and dangling connections"
        >
          {validationResult?.errors?.length > 0 ? (
            <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
          ) : (
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
          )}
          <span>Check Topology</span>
        </button>

        <button
          onClick={() => {
            sound.playClick();
            onResetLab();
          }}
          className="flex items-center space-x-1 bg-slate-900/90 hover:bg-slate-800 text-slate-300 text-xs px-2.5 py-1.5 rounded-lg border border-slate-800 hover:border-slate-700 transition"
          title="Reset current mission to initial setup"
        >
          <RotateCcw className="w-3 h-3" />
          <span>Reset</span>
        </button>
      </div>

      {/* Right Controls: Gamification XP Bar, SFX Toggle, Engine Status, File Tools */}
      <div className="flex items-center space-x-3">
        {/* Player Level & XP Badge */}
        <div 
          onClick={onOpenAchievements}
          className="flex items-center space-x-2 bg-gradient-to-r from-slate-900 to-slate-950 border border-cyan-500/30 rounded-xl px-2.5 py-1 cursor-pointer hover:border-cyan-400 transition shadow"
          title="Click to view Achievements & Rank Progression"
        >
          <span className="text-sm">{playerState.rank.badge}</span>
          <div className="flex flex-col">
            <div className="flex items-center justify-between text-[9px] font-mono">
              <span className="text-cyan-300 font-bold">LVL {playerState.rank.level} {playerState.rank.title}</span>
              <span className="text-slate-400 ml-2">{playerState.xp} XP</span>
            </div>
            {/* Progress Bar */}
            <div className="w-24 h-1.5 bg-slate-800 rounded-full overflow-hidden mt-0.5">
              <div 
                className="h-full bg-gradient-to-r from-cyan-400 to-blue-500 rounded-full transition-all duration-300"
                style={{ width: `${playerState.progress.percent}%` }}
              />
            </div>
          </div>
        </div>

        {/* Audio SFX Toggle */}
        <button
          onClick={handleToggleSound}
          className={`p-1.5 rounded-lg border transition ${
            sfxEnabled 
              ? 'bg-cyan-950/60 text-cyan-300 border-cyan-500/40 hover:bg-cyan-900/60' 
              : 'bg-slate-900 text-slate-500 border-slate-800 hover:text-slate-300'
          }`}
          title={sfxEnabled ? 'Mute Procedural Sound Effects' : 'Enable Procedural Sound Effects'}
        >
          {sfxEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
        </button>

        {/* Engine Status Badge */}
        <div 
          className="flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-[10px] font-mono border border-slate-800 bg-slate-950"
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
            {engineStatus === 'READY_WASM' ? 'Python Wasm' : engineStatus === 'READY_API' ? 'Python API' : 'Init...'}
          </span>
        </div>

        {/* File Export / Import */}
        <div className="flex items-center space-x-1 border-l border-slate-800 pl-2">
          <button
            onClick={() => {
              sound.playClick();
              onExportTopology();
            }}
            className="p-1.5 text-slate-400 hover:text-cyan-300 hover:bg-slate-800 rounded-lg transition"
            title="Export Topology as JSON"
          >
            <Download className="w-4 h-4" />
          </button>

          <button
            onClick={() => {
              sound.playClick();
              fileInputRef.current?.click();
            }}
            className="p-1.5 text-slate-400 hover:text-cyan-300 hover:bg-slate-800 rounded-lg transition"
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
            className="p-1.5 text-slate-400 hover:text-cyan-400 hover:bg-slate-800 rounded-lg transition"
            title="Documentation, Architecture, and CLI Reference"
          >
            <HelpCircle className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
}
