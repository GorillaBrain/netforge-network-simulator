"""
NetForge CLI interactive session entrypoint.
Allows running NetForge directly from terminal: python -m netforge
"""

import sys
from netforge.topology import Topology
from netforge.cli import DeviceCLI
from netforge.engine import SimulationEngine
from netforge.labs import build_lab_1_topology, build_lab_3_topology, LAB_DEFINITIONS


def main():
    print("=" * 60)
    print("  NetForge — Interactive Educational Network Simulator")
    print("  Version 1.0.0 (Python Simulation Engine)")
    print("=" * 60)
    print("\nSelect starting lab topology:")
    print("  1) Lab 1: First Network (Two PCs on a Switch)")
    print("  2) Lab 3: Route Between Networks (Two LANs + Router)")
    print("  3) Empty Topology")
    print("  q) Quit\n")

    choice = input("Enter choice [1-3, q]: ").strip()
    if choice == "1":
        topo = build_lab_1_topology()
    elif choice == "2":
        topo = build_lab_3_topology()
    elif choice == "3":
        topo = Topology(name="Custom Network")
    else:
        print("Exiting NetForge.")
        sys.exit(0)

    engine = SimulationEngine(topo)
    active_dev_id = list(topo.devices.keys())[0] if topo.devices else None

    print(f"\nLoaded topology: {topo.name}")
    print(f"Devices in network: {', '.join(d.name for d in topo.devices.values())}")
    if active_dev_id:
        print(f"Currently connected console: {topo.devices[active_dev_id].name}")
    print("Type 'help' for command list, 'switch <device_name>' to change console, or 'exit' to quit.\n")

    while True:
        if not active_dev_id or active_dev_id not in topo.devices:
            print("No active device console. Use 'switch <name>' to connect to a device.")
            cmd_line = input("NetForge> ").strip()
        else:
            cli = DeviceCLI(topo, active_dev_id)
            prompt = cli.get_prompt()
            try:
                cmd_line = input(prompt).strip()
            except (EOFError, KeyboardInterrupt):
                print("\nExiting.")
                break

        if not cmd_line:
            continue

        if cmd_line.lower() in ("exit", "quit"):
            print("Exiting NetForge session.")
            break

        if cmd_line.lower().startswith("switch "):
            target_name = cmd_line.split()[1].lower()
            found = None
            for dev in topo.devices.values():
                if dev.name.lower() == target_name:
                    found = dev.id
                    break
            if found:
                active_dev_id = found
                print(f"Connected to console of {topo.devices[found].name}")
            else:
                print(f"% Device '{target_name}' not found in topology.")
            continue

        res = cli.execute(cmd_line, engine=engine)
        if res["output"] == "__CLEAR__":
            print("\033[H\033[J", end="")
        elif res["output"]:
            print(res["output"])


if __name__ == "__main__":
    main()
