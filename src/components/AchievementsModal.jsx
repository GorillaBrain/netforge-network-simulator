import React, { useState, useEffect } from 'react';
import { Trophy, Award, X, Zap, CheckCircle2, Lock, Star } from 'lucide-react';
import { gamification, ACHIEVEMENTS, RANKS } from '../utils/gamification.js';
import { sound } from '../utils/soundEffects.js';

export default function AchievementsModal({ isOpen, onClose }) {
  const [state, setState] = useState(gamification.getState());

  useEffect(() => {
    if (isOpen) {
      sound.playClick();
      setState(gamification.getState());
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
      <div className="w-full max-w-2xl bg-slate-950 border border-cyan-500/40 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-4 bg-gradient-to-r from-cyan-950 via-slate-900 to-indigo-950 border-b border-cyan-500/30 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-500 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-cyan-500/30">
              <Trophy className="w-5 h-5 text-yellow-300" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white font-mono flex items-center space-x-2">
                <span>OPERATOR PROFILE & ACHIEVEMENTS</span>
              </h2>
              <p className="text-xs text-cyan-300/80">
                Level up your network engineering rank through hands-on simulation
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Player Rank Card */}
        <div className="p-4 bg-slate-900/60 border-b border-slate-800">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <span className="text-3xl">{state.rank.badge}</span>
              <div>
                <div className="text-[10px] font-mono uppercase tracking-wider text-cyan-400">
                  Current Rank (Tier {state.rank.level})
                </div>
                <div className="text-lg font-extrabold text-white font-mono">
                  {state.rank.title}
                </div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-2xl font-black text-cyan-400 font-mono">
                {state.xp} <span className="text-xs text-slate-400 font-normal">XP</span>
              </div>
              <div className="text-[11px] text-slate-400">
                Next: {state.progress.nextTitle || 'MAX RANK'}
              </div>
            </div>
          </div>

          {/* XP Progress Bar */}
          <div className="mt-3">
            <div className="flex justify-between text-[10px] font-mono text-slate-400 mb-1">
              <span>Level Progress</span>
              <span>{state.progress.percent}%</span>
            </div>
            <div className="w-full h-2.5 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
              <div 
                className="h-full bg-gradient-to-r from-cyan-400 via-blue-500 to-indigo-500 rounded-full transition-all duration-500"
                style={{ width: `${state.progress.percent}%` }}
              />
            </div>
          </div>
        </div>

        {/* Achievements Grid */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          <div className="text-xs font-mono uppercase tracking-wider text-slate-400 font-bold flex items-center justify-between">
            <span>Network Ops Badges ({state.achievements.filter(a => a.unlocked).length} / {state.achievements.length})</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {state.achievements.map((ach) => (
              <div
                key={ach.id}
                className={`p-3 rounded-xl border transition flex items-start space-x-3 ${
                  ach.unlocked
                    ? 'bg-slate-900/90 border-cyan-500/50 shadow-md shadow-cyan-950/20'
                    : 'bg-slate-950/60 border-slate-850 opacity-60'
                }`}
              >
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-lg flex-shrink-0 ${
                  ach.unlocked ? 'bg-cyan-950/80 border border-cyan-500/40 text-white' : 'bg-slate-900 border border-slate-800'
                }`}>
                  {ach.unlocked ? ach.icon : <Lock className="w-4 h-4 text-slate-500" />}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className={`text-xs font-bold ${ach.unlocked ? 'text-white' : 'text-slate-400'}`}>
                      {ach.title}
                    </span>
                    <span className="text-[10px] font-mono text-cyan-400 font-semibold bg-cyan-950/80 px-1.5 py-0.5 rounded border border-cyan-800/60">
                      +{ach.xp} XP
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 leading-snug mt-0.5">
                    {ach.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* Campaign Missions Summary */}
          <div className="pt-2 border-t border-slate-800">
            <div className="text-xs font-mono uppercase tracking-wider text-slate-400 font-bold mb-2">
              Campaign Mission Progress ({state.completedMissions.length} / 5 Completed)
            </div>
            <div className="flex space-x-2">
              {[1, 2, 3, 4, 5].map((num) => {
                const isDone = state.completedMissions.includes(`lab-${num}`);
                return (
                  <div
                    key={num}
                    className={`flex-1 p-2 rounded-lg border text-center transition ${
                      isDone 
                        ? 'bg-emerald-950/60 border-emerald-500/50 text-emerald-300' 
                        : 'bg-slate-900/60 border-slate-800 text-slate-500'
                    }`}
                  >
                    <div className="text-[10px] font-mono font-bold">M-{num}</div>
                    <div className="text-xs mt-0.5">
                      {isDone ? '⭐⭐⭐' : '🔒'}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-3 bg-slate-950 border-t border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold font-mono transition"
          >
            DISMISS
          </button>
        </div>
      </div>
    </div>
  );
}
