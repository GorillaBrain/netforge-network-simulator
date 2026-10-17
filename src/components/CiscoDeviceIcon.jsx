import React from 'react';

// Iconic Cisco Packet Tracer hardware symbols
// Handcrafted vector graphics faithful to Cisco networking diagrams

export function CiscoRouterIcon({ size = 52, className = '' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      {/* 3D Cylinder Base */}
      <ellipse cx="32" cy="44" rx="26" ry="12" fill="#0284c7" stroke="#0369a1" strokeWidth="2" />
      <path d="M6 24V44C6 50.6 17.6 56 32 56C46.4 56 58 50.6 58 44V24" fill="#0284c7" stroke="#0369a1" strokeWidth="2" />
      {/* Top Face */}
      <ellipse cx="32" cy="24" rx="26" ry="12" fill="#38bdf8" stroke="#0284c7" strokeWidth="2" />
      
      {/* Cisco Iconic 4-Way Routing Arrows (Inward & Outward) */}
      <g stroke="#ffffff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        {/* Left-to-Center Inward Arrow */}
        <line x1="16" y1="24" x2="26" y2="24" />
        <polyline points="22,21 26,24 22,27" />

        {/* Right-to-Center Inward Arrow */}
        <line x1="48" y1="24" x2="38" y2="24" />
        <polyline points="42,21 38,24 42,27" />

        {/* Center-to-Top Outward Arrow */}
        <line x1="32" y1="23" x2="32" y2="17" />
        <polyline points="29,20 32,17 35,20" />

        {/* Center-to-Bottom Outward Arrow */}
        <line x1="32" y1="25" x2="32" y2="31" />
        <polyline points="29,28 32,31 35,28" />
      </g>
    </svg>
  );
}

export function CiscoSwitchIcon({ size = 52, className = '' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      {/* 3D Rectangular Chassis Base */}
      <path d="M8 26L32 16L56 26V40L32 50L8 40V26Z" fill="#1d4ed8" stroke="#1e40af" strokeWidth="2" />
      {/* Top Face */}
      <polygon points="8,26 32,16 56,26 32,36" fill="#3b82f6" stroke="#1d4ed8" strokeWidth="2" />
      {/* Left & Right Bevels */}
      <polygon points="8,26 32,36 32,50 8,40" fill="#1e40af" />
      <polygon points="32,36 56,26 56,40 32,50" fill="#1d4ed8" />

      {/* Cisco Iconic Horizontal Switching Arrows */}
      <g stroke="#ffffff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        {/* Top pair */}
        <line x1="22" y1="24" x2="36" y2="21" />
        <polyline points="33,19 36,21 34,23" />
        <line x1="42" y1="27" x2="28" y2="30" />
        <polyline points="31,28 28,30 30,32" />
      </g>
    </svg>
  );
}

export function CiscoPCIcon({ size = 52, className = '' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      {/* Monitor Display Bezel */}
      <rect x="12" y="10" width="40" height="28" rx="3" fill="#334155" stroke="#1e293b" strokeWidth="2" />
      {/* Screen Glass */}
      <rect x="15" y="13" width="34" height="22" rx="1.5" fill="#0284c7" />
      {/* Screen Glare */}
      <polygon points="16,14 36,14 26,34 16,34" fill="#38bdf8" opacity="0.3" />
      
      {/* Monitor Stand */}
      <path d="M28 38H36V45H28V38Z" fill="#64748b" />
      <ellipse cx="32" cy="46" rx="12" ry="3" fill="#475569" />

      {/* Keyboard Tray */}
      <polygon points="14,52 50,52 46,57 18,57" fill="#64748b" stroke="#334155" strokeWidth="1" />
      {/* Power LED */}
      <circle cx="48" cy="35" r="1.5" fill="#10b981" />
    </svg>
  );
}

export function CiscoLaptopIcon({ size = 52, className = '' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      {/* Open Screen Lid */}
      <path d="M16 16L48 16L45 42L19 42L16 16Z" fill="#334155" stroke="#1e293b" strokeWidth="2" />
      {/* Screen Glass */}
      <polygon points="18,18 46,18 43,40 21,40" fill="#0284c7" />
      <polygon points="19,19 32,19 25,39 19,39" fill="#38bdf8" opacity="0.35" />

      {/* Clamshell Base */}
      <polygon points="10,44 54,44 48,53 16,53" fill="#64748b" stroke="#334155" strokeWidth="2" />
      {/* Trackpad */}
      <rect x="28" y="47" width="8" height="4" rx="0.5" fill="#475569" />
      {/* WiFi LED */}
      <circle cx="48" cy="45.5" r="1.2" fill="#10b981" />
    </svg>
  );
}

export function CiscoServerIcon({ size = 52, className = '' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      {/* Server Tower / Blade */}
      <rect x="18" y="8" width="28" height="48" rx="2" fill="#334155" stroke="#1e293b" strokeWidth="2" />
      {/* Drive Bays */}
      <rect x="22" y="14" width="20" height="7" rx="1" fill="#1e293b" stroke="#475569" strokeWidth="1" />
      <rect x="22" y="24" width="20" height="7" rx="1" fill="#1e293b" stroke="#475569" strokeWidth="1" />
      <rect x="22" y="34" width="20" height="7" rx="1" fill="#1e293b" stroke="#475569" strokeWidth="1" />

      {/* Status LEDs */}
      <circle cx="26" cy="46" r="1.8" fill="#10b981" />
      <circle cx="32" cy="46" r="1.8" fill="#38bdf8" />
      <circle cx="38" cy="46" r="1.8" fill="#f59e0b" />
    </svg>
  );
}

export function CiscoHubIcon({ size = 52, className = '' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      {/* Hub Chassis */}
      <rect x="12" y="20" width="40" height="24" rx="3" fill="#7c3aed" stroke="#5b21b6" strokeWidth="2" />
      {/* Multi-port broadcast single arrows */}
      <g stroke="#ffffff" strokeWidth="2" strokeLinecap="round">
        <line x1="20" y1="32" x2="44" y2="32" />
        <polyline points="40,29 44,32 40,35" />
        <line x1="32" y1="24" x2="32" y2="40" />
        <polyline points="29,28 32,24 35,28" />
      </g>
    </svg>
  );
}

export default function CiscoDeviceIcon({ type, size = 52, className = '' }) {
  switch (type) {
    case 'router':
      return <CiscoRouterIcon size={size} className={className} />;
    case 'switch':
      return <CiscoSwitchIcon size={size} className={className} />;
    case 'pc':
      return <CiscoPCIcon size={size} className={className} />;
    case 'laptop':
      return <CiscoLaptopIcon size={size} className={className} />;
    case 'server':
      return <CiscoServerIcon size={size} className={className} />;
    case 'hub':
      return <CiscoHubIcon size={size} className={className} />;
    default:
      return <CiscoPCIcon size={size} className={className} />;
  }
}
