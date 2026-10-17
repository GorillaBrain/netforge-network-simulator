import React, { useState, useEffect } from 'react';
import { X, Calculator, CheckCircle2, AlertCircle, ArrowRight } from 'lucide-react';
import { sound } from '../utils/soundEffects.js';

export default function SubnetCalcModal({ isOpen, onClose }) {
  const [ip, setIp] = useState('192.168.1.10');
  const [prefix, setPrefix] = useState(24);
  const [compareIp, setCompareIp] = useState('192.168.1.50');
  const [calcData, setCalcData] = useState(null);

  useEffect(() => {
    try {
      const parts = ip.split('.').map(Number);
      if (parts.length === 4 && parts.every(p => !isNaN(p) && p >= 0 && p <= 255)) {
        const ipInt = ((parts[0] << 24) | (parts[1] << 16) | (parts[2] << 8) | parts[3]) >>> 0;
        const p = Number(prefix);
        const maskInt = p === 0 ? 0 : (((0xFFFFFFFF << (32 - p)) >>> 0) & 0xFFFFFFFF);
        const wildcardInt = (~maskInt) >>> 0;
        const netInt = (ipInt & maskInt) >>> 0;
        const bcastInt = (netInt | wildcardInt) >>> 0;

        const toIpStr = (n) => `${(n >>> 24) & 255}.${(n >>> 16) & 255}.${(n >>> 8) & 255}.${n & 255}`;
        const toBinStr = (n) => {
          const raw = (n >>> 0).toString(2).padStart(32, '0');
          return `${raw.slice(0, 8)}.${raw.slice(8, 16)}.${raw.slice(16, 24)}.${raw.slice(24, 32)}`;
        };

        const totalAddrs = Math.pow(2, 32 - p);
        let usable = Math.max(0, totalAddrs - 2);
        let firstUsable = toIpStr(netInt + 1);
        let lastUsable = toIpStr(bcastInt - 1);

        if (p === 31) {
          usable = 2;
          firstUsable = toIpStr(netInt);
          lastUsable = toIpStr(bcastInt);
        } else if (p === 32) {
          usable = 1;
          firstUsable = toIpStr(ipInt);
          lastUsable = toIpStr(ipInt);
        }

        let compareMatch = null;
        if (compareIp) {
          const cParts = compareIp.split('.').map(Number);
          if (cParts.length === 4 && cParts.every(cp => !isNaN(cp) && cp >= 0 && cp <= 255)) {
            const cInt = ((cParts[0] << 24) | (cParts[1] << 16) | (cParts[2] << 8) | cParts[3]) >>> 0;
            compareMatch = ((cInt & maskInt) >>> 0) === netInt;
          }
        }

        setCalcData({
          ip,
          prefix: p,
          subnet_mask: toIpStr(maskInt),
          wildcard_mask: toIpStr(wildcardInt),
          network_address: toIpStr(netInt),
          broadcast_address: toIpStr(bcastInt),
          first_usable: firstUsable,
          last_usable: lastUsable,
          usable_hosts: usable,
          total_addresses: totalAddrs,
          ip_binary: toBinStr(ipInt),
          mask_binary: toBinStr(maskInt),
          compare_match: compareMatch
        });
      }
    } catch (e) {}
  }, [ip, prefix, compareIp]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
      <div className="w-full max-w-2xl bg-slate-900 border border-slate-750 rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] animate-in fade-in zoom-in-95 duration-150">
        <div className="h-10 bg-slate-950 border-b border-slate-800 px-4 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Calculator className="w-4 h-4 text-cyan-400" />
            <h3 className="font-bold text-white text-xs font-mono uppercase tracking-wider">
              IPv4 Subnet Planning & CIDR Calculator
            </h3>
          </div>
          <button
            onClick={() => { sound.playClick(); onClose(); }}
            className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto space-y-5 bg-slate-900 text-xs font-mono">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-slate-400 text-[11px] mb-1">Host IPv4 Address</label>
              <input
                type="text"
                value={ip}
                onChange={(e) => setIp(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-1.5 text-white outline-none focus:border-cyan-500"
              />
            </div>
            <div>
              <label className="block text-slate-400 text-[11px] mb-1">Prefix Length (/{prefix})</label>
              <select
                value={prefix}
                onChange={(e) => setPrefix(Number(e.target.value))}
                className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-1.5 text-white outline-none focus:border-cyan-500 cursor-pointer"
              >
                {Array.from({ length: 33 }, (_, i) => i).map(p => (
                  <option key={p} value={p}>/{p}</option>
                ))}
              </select>
            </div>
          </div>

          {calcData && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 p-4 bg-slate-950 rounded-lg border border-slate-800">
                <div>
                  <span className="text-slate-500">Subnet Mask:</span>{' '}
                  <span className="text-cyan-300 font-bold">{calcData.subnet_mask}</span>
                </div>
                <div>
                  <span className="text-slate-500">Wildcard Mask:</span>{' '}
                  <span className="text-slate-200">{calcData.wildcard_mask}</span>
                </div>
                <div>
                  <span className="text-slate-500">Network ID:</span>{' '}
                  <span className="text-emerald-400 font-bold">{calcData.network_address}</span>
                </div>
                <div>
                  <span className="text-slate-500">Broadcast ID:</span>{' '}
                  <span className="text-amber-400 font-bold">{calcData.broadcast_address}</span>
                </div>
                <div>
                  <span className="text-slate-500">Usable Hosts:</span>{' '}
                  <span className="text-white font-bold">{calcData.usable_hosts.toLocaleString()}</span>
                </div>
                <div>
                  <span className="text-slate-500">Host Range:</span>{' '}
                  <span className="text-slate-300 text-[11px]">{calcData.first_usable} - {calcData.last_usable}</span>
                </div>
              </div>

              {/* Same Subnet Tester */}
              <div className="p-4 bg-slate-950 rounded-lg border border-slate-800 space-y-2">
                <div className="text-[11px] font-bold text-slate-300 uppercase">
                  Broadcast Domain / Same Subnet Verification
                </div>
                <div className="flex items-center space-x-2">
                  <input
                    type="text"
                    value={compareIp}
                    onChange={(e) => setCompareIp(e.target.value)}
                    placeholder="Compare with IP (e.g. 192.168.1.50)..."
                    className="flex-1 bg-slate-900 border border-slate-700 rounded px-3 py-1 text-white text-xs outline-none focus:border-cyan-500"
                  />
                  {calcData.compare_match !== null && (
                    <span className={`px-2 py-1 rounded text-xs font-bold ${
                      calcData.compare_match 
                        ? 'bg-emerald-950 text-emerald-300 border border-emerald-800' 
                        : 'bg-rose-950 text-rose-300 border border-rose-800'
                    }`}>
                      {calcData.compare_match ? '✓ SAME SUBNET' : '✗ DIFFERENT SUBNET (ROUTER REQUIRED)'}
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
