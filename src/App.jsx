import React, { useState, useEffect, useRef } from 'react';
import PacketTracerTopBar from './components/PacketTracerTopBar.jsx';
import PacketTracerCanvas from './components/PacketTracerCanvas.jsx';
import PacketTracerBottomShelf from './components/PacketTracerBottomShelf.jsx';
import DeviceDialog from './components/DeviceDialog.jsx';
import SimulationInspectorModal from './components/SimulationInspectorModal.jsx';
import SubnetCalcModal from './components/SubnetCalcModal.jsx';
import HelpModal from './components/HelpModal.jsx';
import AchievementsModal from './components/AchievementsModal.jsx';
import { engineBridge } from './engine/engineBridge.js';
import { sound } from './utils/soundEffects.js';
import { gamification } from './utils/gamification.js';
import confetti from 'canvas-confetti';

export default function App() {
  const [topology, setTopology] = useState(null);
  const [selectedDeviceId, setSelectedDeviceId] = useState(null);
  const [selectedLinkId, setSelectedLinkId] = useState(null);
  const [selectedLabId, setSelectedLabId] = useState('lab-1');
  const [labList, setLabList] = useState([]);
  const [labEvaluation, setLabEvaluation] = useState(null);

  // Packet Tracer active tool: 'select', 'pdu', 'connect', 'delete'
  const [activeTool, setActiveTool] = useState('select');

  // Packet Tracer operational mode: 'realtime' or 'simulation'
  const [mode, setMode] = useState('realtime');

  // Simulation playback state
  const [events, setEvents] = useState([]);
  const [activeEventIndex, setActiveEventIndex] = useState(-1);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);

  // Modals
  const [activeDialogDevice, setActiveDialogDevice] = useState(null);
  const [isInspectorOpen, setIsInspectorOpen] = useState(false);
  const [isSubnetOpen, setIsSubnetOpen] = useState(false);
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [isAchievementsOpen, setIsAchievementsOpen] = useState(false);
  const [toasts, setToasts] = useState([]);

  // Terminal CLI
  const [cliOutput, setCliOutput] = useState([
    { text: 'NetForge Cisco Packet Tracer v2.0 (Engine Initialized).' },
    { text: 'Type "help" or "?" for command syntax reference.' }
  ]);
  const [currentCliPrompt, setCurrentCliPrompt] = useState('PC1> ');

  // Engine Status
  const [engineStatus, setEngineStatus] = useState('INITIALIZING');
  const [engineMessage, setEngineMessage] = useState('Initializing Python simulation engine...');

  const playbackTimerRef = useRef(null);

  // Subscribe to engine status
  useEffect(() => {
    const unsub = engineBridge.onStatusChange((status, msg) => {
      setEngineStatus(status);
      setEngineMessage(msg);
    });
    return unsub;
  }, []);

  // Subscribe to gamification events
  useEffect(() => {
    const unsub = gamification.subscribe((event) => {
      if (event.type === 'XP_GAINED') {
        const id = Date.now() + Math.random();
        setToasts(prev => [...prev.slice(-3), { id, text: `+${event.amount} XP: ${event.reason}`, type: 'xp' }]);
        setTimeout(() => {
          setToasts(prev => prev.filter(t => t.id !== id));
        }, 2500);
      } else if (event.type === 'ACHIEVEMENT_UNLOCKED') {
        sound.playLevelUp();
        const id = Date.now() + Math.random();
        setToasts(prev => [...prev.slice(-3), { id, text: `🏆 Unlocked: ${event.achievement.title}!`, type: 'ach' }]);
        setTimeout(() => {
          setToasts(prev => prev.filter(t => t.id !== id));
        }, 3500);
      }
    });
    return unsub;
  }, []);

  // Initialize Labs and default Lab 1 on startup
  useEffect(() => {
    async function loadInitial() {
      try {
        const labsData = await engineBridge.getLabs();
        if (labsData?.labs) {
          setLabList(labsData.labs);
          const lab1 = labsData.labs.find(l => l.id === 'lab-1');
          if (lab1?.initial_topology) {
            setTopology(lab1.initial_topology);
            const firstDev = Object.values(lab1.initial_topology.devices || {})[0];
            if (firstDev) setSelectedDeviceId(firstDev.id);
            const initialEval = await engineBridge.evaluateLab('lab-1', lab1.initial_topology);
            setLabEvaluation(initialEval);
          }
        }
      } catch (err) {
        console.error('Failed to load initial lab:', err);
      }
    }
    loadInitial();
  }, []);

  // Update CLI prompt when selected device changes
  useEffect(() => {
    if (topology && selectedDeviceId) {
      const dev = topology.devices?.[selectedDeviceId];
      if (dev) {
        if (['pc', 'laptop', 'server'].includes(dev.device_type)) {
          setCurrentCliPrompt(`${dev.name}> `);
        } else {
          setCurrentCliPrompt(`${dev.name}# `);
        }
      }
    }
  }, [selectedDeviceId, topology]);

  // Stepper Timer for automated simulation playback
  useEffect(() => {
    if (isPlaying) {
      const interval = 1200 / playbackSpeed;
      playbackTimerRef.current = setInterval(() => {
        setActiveEventIndex(prev => {
          if (prev < events.length - 1) {
            return prev + 1;
          } else {
            setIsPlaying(false);
            return prev;
          }
        });
      }, interval);
    } else {
      clearInterval(playbackTimerRef.current);
    }
    return () => clearInterval(playbackTimerRef.current);
  }, [isPlaying, playbackSpeed, events.length]);

  // Lab switching
  const handleSelectLab = async (labId) => {
    setSelectedLabId(labId);
    if (labId === 'custom') {
      setTopology({
        schema_version: '1.0.0',
        name: 'Custom Topology Workspace',
        description: 'User constructed custom network',
        devices: [],
        links: []
      });
      setSelectedDeviceId(null);
      setSelectedLinkId(null);
      setLabEvaluation(null);
      setEvents([]);
      return;
    }

    const lab = labList.find(l => l.id === labId);
    if (lab?.initial_topology) {
      setTopology(lab.initial_topology);
      const firstDev = Object.values(lab.initial_topology.devices || {})[0];
      if (firstDev) setSelectedDeviceId(firstDev.id);
      setSelectedLinkId(null);
      setEvents([]);
      setActiveEventIndex(-1);
      const evalRes = await engineBridge.evaluateLab(labId, lab.initial_topology);
      setLabEvaluation(evalRes);
    }
  };

  const handleResetLab = () => {
    if (selectedLabId && selectedLabId !== 'custom') {
      handleSelectLab(selectedLabId);
    } else {
      setTopology({
        schema_version: '1.0.0',
        name: 'Custom Topology',
        description: '',
        devices: [],
        links: []
      });
      setEvents([]);
      setActiveEventIndex(-1);
    }
  };

  // Device manipulation
  const handleAddDeviceAtPosition = (type, x, y) => {
    if (!topology) return;
    const existing = Object.values(topology.devices || {});
    const count = existing.filter(d => d.device_type === type).length;
    const devId = `${type}${count + 1}`;
    const devName = `${type.toUpperCase()}${count + 1}`;

    const ifaces = {};
    if (['pc', 'laptop', 'server'].includes(type)) {
      ifaces['eth0'] = {
        name: 'eth0',
        mac_address: `00:50:79:66:68:${(count + 10).toString(16).padStart(2, '0')}`,
        ip_address: null,
        subnet_mask: null,
        admin_up: true,
        link_id: null,
        is_connected: false,
        is_operational: false,
        prefix: null,
        network_address: null,
        mtu: 1500,
        speed_mbps: 1000
      };
    } else if (type === 'switch') {
      for (let i = 1; i <= 8; i++) {
        ifaces[`Fa0/${i}`] = {
          name: `Fa0/${i}`,
          mac_address: `00:01:42:55:22:${i.toString(16).padStart(2, '0')}`,
          ip_address: null,
          subnet_mask: null,
          admin_up: true,
          link_id: null,
          is_connected: false,
          is_operational: false,
          prefix: null,
          network_address: null,
          mtu: 1500,
          speed_mbps: 100
        };
      }
    } else if (type === 'router') {
      for (let i = 0; i < 3; i++) {
        ifaces[`Gi0/${i}`] = {
          name: `Gi0/${i}`,
          mac_address: `00:02:16:33:11:${i.toString(16).padStart(2, '0')}`,
          ip_address: null,
          subnet_mask: null,
          admin_up: true,
          link_id: null,
          is_connected: false,
          is_operational: false,
          prefix: null,
          network_address: null,
          mtu: 1500,
          speed_mbps: 1000
        };
      }
    } else if (type === 'hub') {
      for (let i = 1; i <= 4; i++) {
        ifaces[`Port${i}`] = {
          name: `Port${i}`,
          mac_address: `00:00:00:00:00:0${i}`,
          ip_address: null,
          subnet_mask: null,
          admin_up: true,
          link_id: null,
          is_connected: false,
          is_operational: false,
          prefix: null,
          network_address: null,
          mtu: 1500,
          speed_mbps: 10
        };
      }
    }

    const newDev = {
      id: devId,
      name: devName,
      device_type: type,
      x: Math.max(40, x),
      y: Math.max(40, y),
      interfaces: ifaces,
      arp_cache: [],
      mac_table: type === 'switch' ? [] : undefined,
      routing_table: type === 'router' ? [] : undefined,
      default_gateway: ['pc', 'laptop', 'server'].includes(type) ? null : undefined
    };

    setTopology({
      ...topology,
      devices: {
        ...(topology.devices || {}),
        [devId]: newDev
      }
    });

    setSelectedDeviceId(devId);
    gamification.addXp(15, `Placed ${devName}`);
  };

  const handleUpdateDevicePosition = (devId, x, y) => {
    if (!topology || !topology.devices?.[devId]) return;
    setTopology({
      ...topology,
      devices: {
        ...topology.devices,
        [devId]: {
          ...topology.devices[devId],
          x: Math.max(20, x),
          y: Math.max(20, y)
        }
      }
    });
  };

  const handleUpdateDevice = (updatedDev) => {
    if (!topology) return;
    setTopology({
      ...topology,
      devices: {
        ...topology.devices,
        [updatedDev.id]: updatedDev
      }
    });
    if (activeDialogDevice?.id === updatedDev.id) {
      setActiveDialogDevice(updatedDev);
    }
  };

  const handleDeleteDevice = (devId) => {
    if (!topology) return;
    const newDevices = { ...topology.devices };
    delete newDevices[devId];

    const newLinks = {};
    Object.values(topology.links || {}).forEach(link => {
      if (link.device_a_id !== devId && link.device_b_id !== devId) {
        newLinks[link.id] = link;
      }
    });

    setTopology({
      ...topology,
      devices: newDevices,
      links: newLinks
    });

    if (selectedDeviceId === devId) setSelectedDeviceId(null);
    if (activeDialogDevice?.id === devId) setActiveDialogDevice(null);
  };

  // Link management
  const handleCreateLink = (devAId, ifaceAName, devBId, ifaceBName) => {
    if (!topology) return;
    const linkId = `link_${Date.now()}`;
    const newLink = {
      id: linkId,
      device_a_id: devAId,
      interface_a_name: ifaceAName,
      device_b_id: devBId,
      interface_b_name: ifaceBName,
      is_up: true,
      bandwidth_mbps: 1000,
      delay_ms: 1.0
    };

    const newDevices = { ...topology.devices };
    if (newDevices[devAId]?.interfaces?.[ifaceAName]) {
      newDevices[devAId].interfaces[ifaceAName].link_id = linkId;
    }
    if (newDevices[devBId]?.interfaces?.[ifaceBName]) {
      newDevices[devBId].interfaces[ifaceBName].link_id = linkId;
    }

    setTopology({
      ...topology,
      devices: newDevices,
      links: {
        ...(topology.links || {}),
        [linkId]: newLink
      }
    });

    setSelectedLinkId(linkId);
    sound.playCableConnect();
    gamification.unlockAchievement('first_link');
    gamification.addXp(50, 'Connected virtual cable');
  };

  const handleDeleteLink = (linkId) => {
    if (!topology) return;
    const link = topology.links?.[linkId];
    if (!link) return;

    const newDevices = { ...topology.devices };
    if (newDevices[link.device_a_id]?.interfaces?.[link.interface_a_name]) {
      newDevices[link.device_a_id].interfaces[link.interface_a_name].link_id = null;
    }
    if (newDevices[link.device_b_id]?.interfaces?.[link.interface_b_name]) {
      newDevices[link.device_b_id].interfaces[link.interface_b_name].link_id = null;
    }

    const newLinks = { ...topology.links };
    delete newLinks[linkId];

    setTopology({
      ...topology,
      devices: newDevices,
      links: newLinks
    });
    if (selectedLinkId === linkId) setSelectedLinkId(null);
  };

  // Simulation execution: Ping (via Simple PDU Tool or CLI)
  const handleSendPing = async (sourceId, targetIp, count = 4) => {
    if (!topology) return;
    try {
      sound.playPacketLaunch();
      setMode('simulation'); // Automatically engage Simulation Mode for observable packet journey

      setCliOutput(prev => [
        ...prev,
        { command: `ping ${targetIp}`, prompt: currentCliPrompt }
      ]);

      const res = await engineBridge.simulatePing(topology, sourceId, targetIp, count);
      if (res?.topology) {
        setTopology(res.topology);
      }
      if (res?.events) {
        setEvents(res.events);
        setActiveEventIndex(0);
        setIsPlaying(true);
      }

      const successCount = res.events?.filter(e => e.event_type === 'PING_SUCCESS').length || 0;
      if (successCount > 0) {
        sound.playPingSuccess();
        gamification.unlockAchievement('first_ping');
        gamification.addXp(100, `Delivered ICMP Echo to ${targetIp}`);
      } else {
        sound.playPacketDrop();
      }

      if (res.events?.some(e => e.event_type?.includes('ARP'))) {
        gamification.unlockAchievement('arp_discovered');
      }
      if (res.events?.some(e => e.event_type?.includes('ROUTER') || e.event_type?.includes('ROUTE'))) {
        gamification.unlockAchievement('router_cross');
      }

      const textOutput = [
        `Pinging ${targetIp} with 32 bytes of data:`,
        ...Array(successCount).fill(`Reply from ${targetIp}: bytes=32 time=1ms TTL=64`),
        ...Array(Math.max(0, count - successCount)).fill('Request timed out.'),
        `\nPing statistics for ${targetIp}:`,
        `    Packets: Sent = ${count}, Received = ${successCount}, Lost = ${count - successCount} (${Math.round(((count - successCount)/count)*100)}% loss)`
      ].join('\n');

      setCliOutput(prev => [...prev, { text: textOutput }]);

      // Check lab evaluation
      if (selectedLabId && selectedLabId !== 'custom') {
        const evalRes = await engineBridge.evaluateLab(selectedLabId, res.topology || topology);
        setLabEvaluation(evalRes);
        if (evalRes?.completed) {
          sound.playMissionComplete();
          confetti({ particleCount: 150, spread: 80 });
          gamification.completeMission(selectedLabId);
        }
      }
    } catch (err) {
      sound.playPacketDrop();
      setCliOutput(prev => [...prev, { text: `% Error originating ping: ${err.message}` }]);
    }
  };

  // Run CLI Command
  const handleRunCliCommand = async (cmdStr) => {
    if (!topology || !selectedDeviceId) return;

    try {
      const res = await engineBridge.executeCli(topology, selectedDeviceId, cmdStr);

      if (res.output === '__CLEAR__') {
        setCliOutput([]);
      } else {
        setCliOutput(prev => [
          ...prev,
          { command: cmdStr, prompt: currentCliPrompt },
          { text: res.output }
        ]);
      }

      if (res.prompt) setCurrentCliPrompt(res.prompt);
      if (res.topology) setTopology(res.topology);
      if (res.events?.length > 0) {
        setEvents(res.events);
        setActiveEventIndex(0);
        setIsPlaying(true);
      }

      if (selectedLabId && selectedLabId !== 'custom') {
        const evalRes = await engineBridge.evaluateLab(selectedLabId, res.topology || topology);
        setLabEvaluation(evalRes);
        if (evalRes?.completed) {
          sound.playMissionComplete();
          confetti({ particleCount: 150, spread: 80 });
          gamification.completeMission(selectedLabId);
        }
      }
    } catch (err) {
      setCliOutput(prev => [...prev, { command: cmdStr, text: `% Execution error: ${err.message}` }]);
    }
  };

  const handleExportTopology = () => {
    if (!topology) return;
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(topology, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `netforge-topology-${topology.name.toLowerCase().replace(/\s+/g, '-')}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const handleImportTopology = (importedData) => {
    try {
      if (!importedData.devices) throw new Error("Missing 'devices' field in JSON.");
      setTopology(importedData);
      setSelectedDeviceId(null);
      setSelectedLinkId(null);
      setEvents([]);
      alert(`Loaded topology: "${importedData.name || 'Imported Network'}"`);
    } catch (err) {
      alert('Invalid topology schema: ' + err.message);
    }
  };

  const activeEvent = events && activeEventIndex >= 0 ? events[activeEventIndex] : null;

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-slate-900 font-sans select-none">
      {/* 1. Packet Tracer Top Menu & Toolbar */}
      <PacketTracerTopBar
        topology={topology}
        activeTool={activeTool}
        setActiveTool={setActiveTool}
        onResetLab={handleResetLab}
        onExportTopology={handleExportTopology}
        onImportTopology={handleImportTopology}
        onOpenSubnetCalc={() => setIsSubnetOpen(true)}
        onOpenHelp={() => setIsHelpOpen(true)}
        onSelectLab={handleSelectLab}
        selectedLabId={selectedLabId}
        engineStatus={engineStatus}
        onOpenAchievements={() => setIsAchievementsOpen(true)}
        selectedLab={labList.find(l => l.id === selectedLabId)}
        labEvaluation={labEvaluation}
      />

      {/* 2. Full-Screen Cisco Packet Tracer Engineering Canvas */}
      <PacketTracerCanvas
        topology={topology}
        selectedDeviceId={selectedDeviceId}
        selectedLinkId={selectedLinkId}
        onSelectDevice={setSelectedDeviceId}
        onSelectLink={setSelectedLinkId}
        onUpdateDevicePosition={handleUpdateDevicePosition}
        onAddDeviceAtPosition={handleAddDeviceAtPosition}
        onCreateLink={handleCreateLink}
        onDeleteDevice={handleDeleteDevice}
        onDeleteLink={handleDeleteLink}
        activeEvent={activeEvent}
        events={events}
        activeEventIndex={activeEventIndex}
        onSendPing={handleSendPing}
        activeTool={activeTool}
        setActiveTool={setActiveTool}
        onOpenDeviceDialog={(dev) => setActiveDialogDevice(dev)}
      />

      {/* 3. Packet Tracer Bottom Device Shelf (Categories + Hardware Palette + Realtime/Simulation mode) */}
      <PacketTracerBottomShelf
        onAddDevice={(type) => handleAddDeviceAtPosition(type, 300, 220)}
        activeTool={activeTool}
        setActiveTool={setActiveTool}
        mode={mode}
        setMode={setMode}
        isPlaying={isPlaying}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onStepForward={() => setActiveEventIndex(prev => Math.min(events.length - 1, prev + 1))}
        onStepBackward={() => setActiveEventIndex(prev => Math.max(0, prev - 1))}
        events={events}
        activeEventIndex={activeEventIndex}
        playbackSpeed={playbackSpeed}
        onChangeSpeed={setPlaybackSpeed}
        onOpenSimulationInspector={() => setIsInspectorOpen(true)}
      />

      {/* 4. Floating Cisco Device Dialog (Physical, Config, Desktop/CLI tabs) */}
      {activeDialogDevice && (
        <DeviceDialog
          device={activeDialogDevice}
          topology={topology}
          isOpen={Boolean(activeDialogDevice)}
          onClose={() => setActiveDialogDevice(null)}
          onUpdateDevice={handleUpdateDevice}
          onDeleteDevice={handleDeleteDevice}
          onRunCliCommand={handleRunCliCommand}
          cliOutput={cliOutput}
          currentCliPrompt={currentCliPrompt}
        />
      )}

      {/* 5. Simulation Event List & OSI PDU Inspector Modal */}
      {isInspectorOpen && (
        <SimulationInspectorModal
          isOpen={isInspectorOpen}
          onClose={() => setIsInspectorOpen(false)}
          events={events}
          activeEventIndex={activeEventIndex}
          onSelectEvent={(idx) => setActiveEventIndex(idx)}
        />
      )}

      {/* 6. Subnet Calculator Modal */}
      {isSubnetOpen && (
        <SubnetCalcModal
          isOpen={isSubnetOpen}
          onClose={() => setIsSubnetOpen(false)}
        />
      )}

      {/* 7. Operator Achievements & Progression Modal */}
      {isAchievementsOpen && (
        <AchievementsModal
          isOpen={isAchievementsOpen}
          onClose={() => setIsAchievementsOpen(false)}
        />
      )}

      {/* 8. Help & Documentation Modal */}
      {isHelpOpen && (
        <HelpModal onClose={() => setIsHelpOpen(false)} />
      )}

      {/* 9. Floating Gamification XP Toasts */}
      <div className="fixed top-20 right-6 z-50 flex flex-col space-y-2 pointer-events-none">
        {toasts.map(t => (
          <div
            key={t.id}
            className={`xp-floater px-3.5 py-2 rounded-xl text-xs font-mono font-bold shadow-2xl flex items-center space-x-2 border ${
              t.type === 'ach' 
                ? 'bg-amber-950/95 text-amber-200 border-amber-500/80' 
                : 'bg-cyan-950/95 text-cyan-200 border-cyan-400/80'
            }`}
          >
            <span>{t.text}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
