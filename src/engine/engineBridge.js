/**
 * Unified Engine Bridge for NetForge.
 * 
 * Provides an identical high-level interface whether running via:
 * 1. Pyodide WebAssembly (pure Python 3 engine executing 100% inside the browser)
 * 2. Vercel Serverless Python API fallback (/api/*)
 */

import { PYTHON_FILES } from './pythonSource.js';

class EngineBridge {
  constructor() {
    this.pyodide = null;
    this.status = 'INITIALIZING'; // 'INITIALIZING', 'READY_WASM', 'READY_API', 'ERROR'
    this.statusMessage = 'Initializing Python 3 Simulation Engine...';
    this.listeners = new Set();
    this.initPromise = null;
  }

  onStatusChange(fn) {
    this.listeners.add(fn);
    fn(this.status, this.statusMessage);
    return () => this.listeners.delete(fn);
  }

  _notify(status, msg) {
    this.status = status;
    this.statusMessage = msg;
    for (const fn of this.listeners) {
      fn(status, msg);
    }
  }

  async init() {
    if (this.initPromise) return this.initPromise;

    this.initPromise = (async () => {
      try {
        // Wait for Pyodide script tag if still loading
        let attempts = 0;
        while (!window.loadPyodide && attempts < 20) {
          await new Promise((r) => setTimeout(r, 150));
          attempts++;
        }

        if (window.loadPyodide) {
          this._notify('INITIALIZING', 'Loading Pyodide WebAssembly runtime...');
          this.pyodide = await window.loadPyodide({
            indexURL: 'https://cdn.jsdelivr.net/pyodide/v0.27.2/full/',
          });

          this._notify('INITIALIZING', 'Mounting NetForge Python modules...');
          // Create /netforge directory in Pyodide virtual FS
          try {
            this.pyodide.FS.mkdir('/netforge');
          } catch (e) {
            // Already exists
          }

          // Write all Python files into /netforge
          for (const [filename, content] of Object.entries(PYTHON_FILES)) {
            this.pyodide.FS.writeFile(`/netforge/${filename}`, content);
          }

          // Initialize Python runtime environment and wrapper functions
          await this.pyodide.runPythonAsync(`
import sys
import json
if '/' not in sys.path:
    sys.path.insert(0, '/')

import netforge
from netforge.topology import Topology
from netforge.engine import SimulationEngine
from netforge.cli import DeviceCLI
from netforge.addressing import calculate_subnet_info, is_same_subnet
from netforge.labs import LAB_DEFINITIONS, evaluate_lab

def py_simulate_ping(topo_json_str, source_id, target_ip, count=1):
    topo_dict = json.loads(topo_json_str)
    topo = Topology.from_dict(topo_dict)
    engine = SimulationEngine(topo)
    events = engine.ping(source_id, target_ip, count=count)
    return json.dumps({
        "success": True,
        "topology": topo.to_dict(),
        "events": [e.to_dict() for e in events],
        "validation": topo.validate()
    })

def py_execute_cli(topo_json_str, device_id, command_str, mode="PRIV_EXEC", current_iface=None):
    topo_dict = json.loads(topo_json_str)
    topo = Topology.from_dict(topo_dict)
    engine = SimulationEngine(topo)
    cli = DeviceCLI(topo, device_id)
    cli.mode = mode
    cli.current_interface = current_iface
    res = cli.execute(command_str, engine=engine)
    res["topology"] = topo.to_dict()
    res["success"] = True
    return json.dumps(res)

def py_calculate_subnet(ip_str, mask_str, compare_ip=None):
    info = calculate_subnet_info(ip_str, mask_str)
    if compare_ip:
        info["compare_result"] = {
            "compare_ip": compare_ip,
            "same_subnet": is_same_subnet(ip_str, compare_ip, info["subnet_mask"])
        }
    info["success"] = True
    return json.dumps(info)

def py_get_labs():
    labs_summary = []
    for lid, info in LAB_DEFINITIONS.items():
        labs_summary.append({
            "id": lid,
            "title": info["title"],
            "difficulty": info["difficulty"],
            "description": info["description"],
            "objectives": info["objectives"],
            "tasks": info["tasks"],
            "hints": info["hints"],
            "initial_topology": info["builder"]().to_dict()
        })
    return json.dumps({"success": True, "labs": labs_summary})

def py_evaluate_lab(lab_id, topo_json_str):
    topo_dict = json.loads(topo_json_str)
    topo = Topology.from_dict(topo_dict)
    eval_res = evaluate_lab(lab_id, topo)
    eval_res["success"] = True
    return json.dumps(eval_res)

def py_validate_topology(topo_json_str):
    topo_dict = json.loads(topo_json_str)
    topo = Topology.from_dict(topo_dict)
    return json.dumps(topo.validate())
`);

          this._notify('READY_WASM', 'Python 3 (Pyodide WebAssembly)');
          return;
        }
      } catch (err) {
        console.warn('Pyodide initialization failed or unavailable, falling back to Vercel API:', err);
      }

      // If Pyodide failed or unavailable, check API health
      this._notify('READY_API', 'Python 3 API (Vercel Serverless)');
    })();

    return this.initPromise;
  }

  // 1. Simulate Ping
  async simulatePing(topology, sourceId, targetIp, count = 1) {
    await this.init();
    const topoJson = JSON.stringify(topology);

    if (this.status === 'READY_WASM' && this.pyodide) {
      const runner = this.pyodide.globals.get('py_simulate_ping');
      const resStr = runner(topoJson, sourceId, targetIp, count);
      return JSON.parse(resStr);
    }

    // Fallback to API
    const res = await fetch('/api/simulate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'ping',
        topology,
        source_id: sourceId,
        target_ip: targetIp,
        count
      }),
    });
    return await res.json();
  }

  // 2. Execute CLI Command
  async executeCli(topology, deviceId, command, mode = 'PRIV_EXEC', currentIface = null) {
    await this.init();
    const topoJson = JSON.stringify(topology);

    if (this.status === 'READY_WASM' && this.pyodide) {
      const runner = this.pyodide.globals.get('py_execute_cli');
      const resStr = runner(topoJson, deviceId, command, mode, currentIface);
      return JSON.parse(resStr);
    }

    const res = await fetch('/api/cli', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        topology,
        device_id: deviceId,
        command,
        mode,
        current_interface: currentIface,
      }),
    });
    return await res.json();
  }

  // 3. Subnet Calculator
  async calculateSubnet(ip, mask, compareIp = null) {
    await this.init();

    if (this.status === 'READY_WASM' && this.pyodide) {
      const runner = this.pyodide.globals.get('py_calculate_subnet');
      const resStr = runner(ip, mask, compareIp);
      return JSON.parse(resStr);
    }

    const res = await fetch('/api/subnet', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ip, mask, compare_ip: compareIp }),
    });
    return await res.json();
  }

  // 4. Get Labs
  async getLabs() {
    await this.init();

    if (this.status === 'READY_WASM' && this.pyodide) {
      const runner = this.pyodide.globals.get('py_get_labs');
      const resStr = runner();
      return JSON.parse(resStr);
    }

    const res = await fetch('/api/labs');
    return await res.json();
  }

  // 5. Evaluate Lab
  async evaluateLab(labId, topology) {
    await this.init();
    const topoJson = JSON.stringify(topology);

    if (this.status === 'READY_WASM' && this.pyodide) {
      const runner = this.pyodide.globals.get('py_evaluate_lab');
      const resStr = runner(labId, topoJson);
      return JSON.parse(resStr);
    }

    const res = await fetch('/api/labs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ lab_id: labId, topology }),
    });
    return await res.json();
  }

  // 6. Validate Topology
  async validateTopology(topology) {
    await this.init();
    const topoJson = JSON.stringify(topology);

    if (this.status === 'READY_WASM' && this.pyodide) {
      const runner = this.pyodide.globals.get('py_validate_topology');
      const resStr = runner(topoJson);
      return JSON.parse(resStr);
    }

    const res = await fetch('/api/simulate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'validate', topology }),
    });
    const data = await res.json();
    return data.validation || { valid: true, errors: [], warnings: [] };
  }
}

export const engineBridge = new EngineBridge();
