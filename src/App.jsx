import React, { useState, useEffect, useRef } from 'react';
import Navbar from './components/Navbar.jsx';
import Palette from './components/Palette.jsx';
import Canvas from './components/Canvas.jsx';
import ConfigPanel from './components/ConfigPanel.jsx';
import LinkInspector from './components/LinkInspector.jsx';
import BottomDock from './components/BottomDock.jsx';
import QuickPingModal from './components/QuickPingModal.jsx';
import HelpModal from './components/HelpModal.jsx';
import { engineBridge } from './engine/engineBridge.js';

export default function App() {
  const [topology, setTopology] = useState(null);
  const [selectedDeviceId, setSelectedDeviceId] = useState(null);
  const [selectedLinkId, setSelectedLinkId] = useState(null);
  const [selectedLabId, setSelectedLabId] = useState('lab-1');
  const [labList, setLabList] = useState([]);
  const [labEvaluation, setLabEvaluation] = useState(null);

  // Simulation playback state
  const [events, setEvents] = useState([]);
  const [activeEventIndex, setActiveEventIndex] = useState(-1);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);

  // Connecting cable mode
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectingSource, setConnectingSource] = useState(null);

  // Modals
  const [isQuickPingOpen, setIsQuickPingOpen] = useState(false);
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [validationResult, setValidationResult] = useState(null);

  // Terminal CLI
  const [cliOutput, setCliOutput] = useState([
    { text: 'NetForge Simulator v1.0.0 (Python 3 Engine initialized).' },
    { text: 'Select a device and run commands (e.g. "ping 192.168.1.20", "show ip", "show arp", "help").' }
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
            // Initial lab evaluation
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

  // Stepper Timer for automated playback
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
        name: 'Empty Workspace',
        description: '',
        devices: [],
        links: []
      });
      setEvents([]);
    }
  };

  // Device CRUD
  const handleAddDeviceAtPosition = (type, x, y) => {
    if (!topology) return;
    const existing = Object.values(topology.devices || {});
    const count = existing.filter(d => d.device_type === type).length + 1;
    const id = `${type}_${Date.now()}`;
    const name = `${type.toUpperCase()}${count}`;

    const newDev = {
      id,
      name,
      device_type: type,
      x,
      y,
      interfaces: {},
      arp_cache: []
    };

    if (type === 'switch') {
      newDev.mac_table = [];
      for (let i = 1; i <= 8; i++) {
        const ifName = `Fa0/${i}`;
        newDev.interfaces[ifName] = {
          name: ifName,
          mac_address: `00:01:42:${count < 10 ? '0' + count : count}:00:0${i}`,
          admin_up: true,
          link_id: null
        };
      }
    } else if (type === 'router') {
      newDev.static_routes = [];
      newDev.routing_table = [];
      for (let i = 0; i <= 2; i++) {
        const ifName = `Gi0/${i}`;
        newDev.interfaces[ifName] = {
          name: ifName,
          mac_address: `00:AA:BB:${count < 10 ? '0' + count : count}:00:0${i}`,
          ip_address: null,
          subnet_mask: null,
          admin_up: true,
          link_id: null
        };
      }
    } else if (type === 'hub') {
      for (let i = 1; i <= 4; i++) {
        const ifName = `Port${i}`;
        newDev.interfaces[ifName] = {
          name: ifName,
          mac_address: `00:00:00:00:00:0${i}`,
          admin_up: true,
          link_id: null
        };
      }
    } else {
      // Host: PC, Laptop, Server
      newDev.default_gateway = null;
      if (type === 'server') newDev.services = { http: true };
      newDev.interfaces['eth0'] = {
        name: 'eth0',
        mac_address: `00:50:79:66:${count < 10 ? '0' + count : count}:01`,
        ip_address: `192.168.1.${10 * count}`,
        subnet_mask: '255.255.255.0',
        admin_up: true,
        link_id: null
      };
    }

    const updated = {
      ...topology,
      devices: {
        ...topology.devices,
        [id]: newDev
      }
    };
    setTopology(updated);
    setSelectedDeviceId(id);
  };

  const handleUpdateDevice = (updatedDevice) => {
    if (!topology) return;
    const updated = {
      ...topology,
      devices: {
        ...topology.devices,
        [updatedDevice.id]: updatedDevice
      }
    };
    setTopology(updated);
  };

  const handleDeleteDevice = (deviceId) => {
    if (!topology) return;
    const newDevices = { ...topology.devices };
    delete newDevices[deviceId];

    // Remove attached links
    const newLinks = {};
    for (const [lid, l] of Object.entries(topology.links || {})) {
      if (l.device_a_id !== deviceId && l.device_b_id !== deviceId) {
        newLinks[lid] = l;
      }
    }

    setTopology({
      ...topology,
      devices: newDevices,
      links: newLinks
    });
    if (selectedDeviceId === deviceId) setSelectedDeviceId(null);
  };

  const handleUpdateDevicePosition = (deviceId, newX, newY) => {
    if (!topology || !topology.devices?.[deviceId]) return;
    const dev = topology.devices[deviceId];
    handleUpdateDevice({ ...dev, x: newX, y: newY });
  };

  // Link CRUD
  const handleStartConnecting = (devId, devName, ifaceName) => {
    setIsConnecting(true);
    setConnectingSource({ deviceId: devId, deviceName: devName, ifaceName: ifaceName });
  };

  const handleCancelConnecting = () => {
    setIsConnecting(false);
    setConnectingSource(null);
  };

  const handleCreateLink = (devAId, ifaceAName, devBId, ifaceBName) => {
    if (devAId === devBId) {
      alert('Cannot connect an interface to the same device.');
      setIsConnecting(false);
      setConnectingSource(null);
      return;
    }

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

    setIsConnecting(false);
    setConnectingSource(null);
    setSelectedLinkId(linkId);
  };

  const handleUpdateLink = (updatedLink) => {
    if (!topology) return;
    setTopology({
      ...topology,
      links: {
        ...topology.links,
        [updatedLink.id]: updatedLink
      }
    });
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

  const handleDisconnectInterface = (devId, ifaceName) => {
    const link = Object.values(topology?.links || {}).find(l => 
      (l.device_a_id === devId && l.interface_a_name === ifaceName) ||
      (l.device_b_id === devId && l.interface_b_name === ifaceName)
    );
    if (link) handleDeleteLink(link.id);
  };

  // Simulation execution: Ping
  const handleSendPing = async (sourceId, targetIp, count = 4) => {
    if (!topology) return;
    try {
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

      // Format ping output in terminal
      const successCount = res.events?.filter(e => e.event_type === 'PING_SUCCESS').length || 0;
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
      }
    } catch (err) {
      setCliOutput(prev => [...prev, { text: `% Error originating ping: ${err.message}` }]);
    }
  };

  // Run CLI Command
  const handleRunCliCommand = async (cmdStr) => {
    if (!topology || !selectedDeviceId) {
      alert('Please select a device on the canvas first to execute commands.');
      return;
    }

    try {
      const dev = topology.devices?.[selectedDeviceId];
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

      // Check lab progress
      if (selectedLabId && selectedLabId !== 'custom') {
        const evalRes = await engineBridge.evaluateLab(selectedLabId, res.topology || topology);
        setLabEvaluation(evalRes);
      }
    } catch (err) {
      setCliOutput(prev => [...prev, { command: cmdStr, text: `% Execution error: ${err.message}` }]);
    }
  };

  // Validate Topology
  const handleValidateTopology = async () => {
    if (!topology) return;
    const res = await engineBridge.validateTopology(topology);
    setValidationResult(res);
    if (!res.valid) {
      alert(`Topology Validation Found ${res.errors.length} Issue(s):\n\n• ` + res.errors.join('\n• '));
    } else {
      alert('✓ Topology Validation Passed! No IP collisions or broken link references detected.');
    }
  };

  // Verify Guided Lab
  const handleVerifyLab = async () => {
    if (!selectedLabId || selectedLabId === 'custom' || !topology) return;
    const evalRes = await engineBridge.evaluateLab(selectedLabId, topology);
    setLabEvaluation(evalRes);
    if (evalRes.completed) {
      confetti({ particleCount: 120, spread: 80 });
    }
  };

  // Save / Load JSON
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
      alert(`Successfully loaded topology: "${importedData.name || 'Imported Network'}"`);
    } catch (err) {
      alert('Invalid topology schema: ' + err.message);
    }
  };

  const selectedDev = topology?.devices?.[selectedDeviceId];
  const selectedLink = topology?.links?.[selectedLinkId];
  const activeEvent = events && activeEventIndex >= 0 ? events[activeEventIndex] : null;

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-slate-950 font-sans">
      {/* Top Navbar */}
      <Navbar
        topology={topology}
        onResetLab={handleResetLab}
        onExportTopology={handleExportTopology}
        onImportTopology={handleImportTopology}
        onOpenQuickPing={() => setIsQuickPingOpen(true)}
        onOpenSubnetCalc={() => {
          // Bottom dock switch to subnet
        }}
        onOpenHelp={() => setIsHelpOpen(true)}
        onSelectLab={handleSelectLab}
        selectedLabId={selectedLabId}
        engineStatus={engineStatus}
        engineMessage={engineMessage}
        onValidateTopology={handleValidateTopology}
        validationResult={validationResult}
      />

      {/* Main Workspace (Palette + Canvas + Config Panel) */}
      <div className="flex flex-1 overflow-hidden relative">
        <Palette onAddDevice={(type) => handleAddDeviceAtPosition(type, 240, 180)} />

        <Canvas
          topology={topology}
          selectedDeviceId={selectedDeviceId}
          selectedLinkId={selectedLinkId}
          onSelectDevice={(id) => {
            setSelectedDeviceId(id);
            setSelectedLinkId(null);
          }}
          onSelectLink={(id) => {
            setSelectedLinkId(id);
            setSelectedDeviceId(null);
          }}
          onUpdateDevicePosition={handleUpdateDevicePosition}
          onAddDeviceAtPosition={handleAddDeviceAtPosition}
          onCreateLink={handleCreateLink}
          activeEvent={activeEvent}
          isConnecting={isConnecting}
          connectingSource={connectingSource}
          onCancelConnecting={handleCancelConnecting}
          onStartConnecting={handleStartConnecting}
        />

        {/* Right Inspector Panel */}
        {selectedDev && (
          <ConfigPanel
            device={selectedDev}
            topology={topology}
            onClose={() => setSelectedDeviceId(null)}
            onUpdateDevice={handleUpdateDevice}
            onDeleteDevice={handleDeleteDevice}
            onDisconnectInterface={handleDisconnectInterface}
          />
        )}

        {selectedLink && (
          <LinkInspector
            link={selectedLink}
            topology={topology}
            onClose={() => setSelectedLinkId(null)}
            onUpdateLink={handleUpdateLink}
            onDeleteLink={handleDeleteLink}
          />
        )}
      </div>

      {/* Bottom Dock (Terminal, Events, Inspector, Subnet, Labs) */}
      <BottomDock
        topology={topology}
        selectedDeviceId={selectedDeviceId}
        onSelectDevice={setSelectedDeviceId}
        events={events}
        activeEventIndex={activeEventIndex}
        onStepForward={() => setActiveEventIndex(prev => Math.min(events.length - 1, prev + 1))}
        onStepBackward={() => setActiveEventIndex(prev => Math.max(0, prev - 1))}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        isPlaying={isPlaying}
        playbackSpeed={playbackSpeed}
        onChangeSpeed={setPlaybackSpeed}
        onResetSimulation={() => {
          setEvents([]);
          setActiveEventIndex(-1);
          setIsPlaying(false);
        }}
        onRunCliCommand={handleRunCliCommand}
        cliHistory={[]}
        cliOutput={cliOutput}
        currentCliPrompt={currentCliPrompt}
        selectedLab={labList.find(l => l.id === selectedLabId)}
        labEvaluation={labEvaluation}
        onVerifyLab={handleVerifyLab}
        onSelectLab={handleSelectLab}
      />

      {/* Quick Ping Modal */}
      {isQuickPingOpen && (
        <QuickPingModal
          topology={topology}
          onClose={() => setIsQuickPingOpen(false)}
          onSendPing={handleSendPing}
          initialSourceId={selectedDeviceId}
        />
      )}

      {/* Documentation & Help Modal */}
      {isHelpOpen && (
        <HelpModal onClose={() => setIsHelpOpen(false)} />
      )}
    </div>
  );
}
