"""
Guided Networking Labs and Verification Engine for NetForge.

Defines 5 interactive lab scenarios with starting topologies, learning objectives,
tasks, hints, automated validation rules, and educational conclusions.
"""

from typing import Dict, List, Any, Optional
import copy
from netforge.topology import Topology
from netforge.devices import Host, Switch, Router, Interface
from netforge.links import Link
from netforge.engine import SimulationEngine
from netforge.addressing import is_same_subnet


def build_lab_1_topology() -> Topology:
    """Lab 1: First Network — 2 PCs and 1 Switch."""
    topo = Topology(id="lab-1", name="Lab 1: First Network", description="Connect two PCs to a switch and configure IP addressing.")
    
    pc1 = Host("pc1", "PC1", "pc", x=120, y=200)
    pc1.add_interface(Interface("eth0", "00:50:79:66:68:01"))
    
    pc2 = Host("pc2", "PC2", "pc", x=520, y=200)
    pc2.add_interface(Interface("eth0", "00:50:79:66:68:02"))

    sw1 = Switch("sw1", "Switch1", x=320, y=200)
    for i in range(1, 9):
        sw1.add_interface(Interface(f"Fa0/{i}", f"00:01:42:33:55:0{i}"))

    topo.add_device(pc1)
    topo.add_device(pc2)
    topo.add_device(sw1)

    topo.add_link(Link("link1", "pc1", "eth0", "sw1", "Fa0/1"))
    topo.add_link(Link("link2", "pc2", "eth0", "sw1", "Fa0/2"))

    return topo


def build_lab_2_topology() -> Topology:
    """Lab 2: Fix the Subnet Mask — Misconfigured /25 vs /24 mask."""
    topo = Topology(id="lab-2", name="Lab 2: Fix the Subnet Mask", description="Diagnose and resolve an addressing subnet mask mismatch.")
    
    pc1 = Host("pc1", "PC1", "pc", x=140, y=200)
    pc1.add_interface(Interface("eth0", "00:50:79:66:68:01", ip_address="192.168.1.50", subnet_mask="255.255.255.0"))
    
    # PC2 has /25 mask (255.255.255.128) with IP 192.168.1.200.
    # In /25, 192.168.1.200 is in network 192.168.1.128/25, while 192.168.1.50 is in 192.168.1.0/25!
    pc2 = Host("pc2", "PC2", "pc", x=500, y=200)
    pc2.add_interface(Interface("eth0", "00:50:79:66:68:02", ip_address="192.168.1.200", subnet_mask="255.255.255.128"))

    sw1 = Switch("sw1", "Switch1", x=320, y=200)
    for i in range(1, 9):
        sw1.add_interface(Interface(f"Fa0/{i}", f"00:01:42:33:55:0{i}"))

    topo.add_device(pc1)
    topo.add_device(pc2)
    topo.add_device(sw1)

    topo.add_link(Link("link1", "pc1", "eth0", "sw1", "Fa0/1"))
    topo.add_link(Link("link2", "pc2", "eth0", "sw1", "Fa0/2"))

    return topo


def build_lab_3_topology() -> Topology:
    """Lab 3: Route Between Networks — 2 LANs connected by a Router."""
    topo = Topology(id="lab-3", name="Lab 3: Route Between Networks", description="Configure router interfaces and default gateways to interconnect two distinct subnets.")
    
    pc1 = Host("pc1", "PC1", "pc", x=100, y=140)
    pc1.add_interface(Interface("eth0", "00:50:79:66:68:01", ip_address="192.168.10.10", subnet_mask="255.255.255.0"))

    sw1 = Switch("sw1", "Switch1", x=240, y=140)
    for i in range(1, 9):
        sw1.add_interface(Interface(f"Fa0/{i}", f"00:01:42:11:11:0{i}"))

    r1 = Router("r1", "Router1", x=400, y=220)
    r1.add_interface(Interface("Gi0/0", "00:AA:BB:CC:DD:01"))
    r1.add_interface(Interface("Gi0/1", "00:AA:BB:CC:DD:02"))

    sw2 = Switch("sw2", "Switch2", x=560, y=300)
    for i in range(1, 9):
        sw2.add_interface(Interface(f"Fa0/{i}", f"00:01:42:22:22:0{i}"))

    pc2 = Host("pc2", "PC2", "pc", x=700, y=300)
    pc2.add_interface(Interface("eth0", "00:50:79:66:68:02", ip_address="192.168.20.20", subnet_mask="255.255.255.0"))

    topo.add_device(pc1)
    topo.add_device(sw1)
    topo.add_device(r1)
    topo.add_device(sw2)
    topo.add_device(pc2)

    topo.add_link(Link("link1", "pc1", "eth0", "sw1", "Fa0/1"))
    topo.add_link(Link("link2", "sw1", "Fa0/2", "r1", "Gi0/0"))
    topo.add_link(Link("link3", "r1", "Gi0/1", "sw2", "Fa0/1"))
    topo.add_link(Link("link4", "sw2", "Fa0/2", "pc2", "eth0"))

    return topo


def build_lab_4_topology() -> Topology:
    """Lab 4: Troubleshoot Connectivity — Broken network with 3 deliberate faults."""
    topo = Topology(id="lab-4", name="Lab 4: Troubleshoot Connectivity", description="Identify and fix multiple misconfigurations to restore end-to-end communication.")
    
    pc1 = Host("pc1", "PC1", "pc", x=100, y=160, default_gateway="10.0.1.1")
    pc1.add_interface(Interface("eth0", "00:50:79:66:68:01", ip_address="10.0.1.10", subnet_mask="255.255.255.0"))

    sw1 = Switch("sw1", "Switch1", x=240, y=160)
    for i in range(1, 9):
        sw1.add_interface(Interface(f"Fa0/{i}", f"00:01:42:11:33:0{i}"))

    r1 = Router("r1", "Router1", x=400, y=220)
    # Fault 1: Gi0/0 is administratively shut down!
    r1.add_interface(Interface("Gi0/0", "00:AA:BB:CC:11:01", ip_address="10.0.1.1", subnet_mask="255.255.255.0", admin_up=False))
    r1.add_interface(Interface("Gi0/1", "00:AA:BB:CC:11:02", ip_address="10.0.2.1", subnet_mask="255.255.255.0", admin_up=True))

    sw2 = Switch("sw2", "Switch2", x=560, y=280)
    for i in range(1, 9):
        sw2.add_interface(Interface(f"Fa0/{i}", f"00:01:42:22:33:0{i}"))

    # Fault 2: PC2 has invalid default gateway pointing to 10.0.2.99 instead of 10.0.2.1!
    pc2 = Host("pc2", "PC2", "pc", x=700, y=280, default_gateway="10.0.2.99")
    pc2.add_interface(Interface("eth0", "00:50:79:66:68:02", ip_address="10.0.2.20", subnet_mask="255.255.255.0"))

    topo.add_device(pc1)
    topo.add_device(sw1)
    topo.add_device(r1)
    topo.add_device(sw2)
    topo.add_device(pc2)

    topo.add_link(Link("link1", "pc1", "eth0", "sw1", "Fa0/1"))
    topo.add_link(Link("link2", "sw1", "Fa0/2", "r1", "Gi0/0"))
    topo.add_link(Link("link3", "r1", "Gi0/1", "sw2", "Fa0/1"))
    # Fault 3: Link 4 is administratively disconnected!
    topo.add_link(Link("link4", "sw2", "Fa0/2", "pc2", "eth0", is_up=False))

    return topo


def build_lab_5_topology() -> Topology:
    """Lab 5: Observe ARP and Routing — Cross-network multi-hop observation."""
    topo = Topology(id="lab-5", name="Lab 5: Observe ARP and Routing", description="Observe how ARP operates locally vs across routed boundaries.")
    
    pc1 = Host("pc1", "PC1", "pc", x=120, y=160, default_gateway="172.16.1.1")
    pc1.add_interface(Interface("eth0", "00:50:79:66:68:01", ip_address="172.16.1.10", subnet_mask="255.255.255.0"))

    sw1 = Switch("sw1", "Switch1", x=260, y=160)
    for i in range(1, 9):
        sw1.add_interface(Interface(f"Fa0/{i}", f"00:01:42:55:11:0{i}"))

    r1 = Router("r1", "Router1", x=400, y=220)
    r1.add_interface(Interface("Gi0/0", "00:AA:BB:55:11:01", ip_address="172.16.1.1", subnet_mask="255.255.255.0"))
    r1.add_interface(Interface("Gi0/1", "00:AA:BB:55:11:02", ip_address="172.16.2.1", subnet_mask="255.255.255.0"))

    sw2 = Switch("sw2", "Switch2", x=540, y=280)
    for i in range(1, 9):
        sw2.add_interface(Interface(f"Fa0/{i}", f"00:01:42:55:22:0{i}"))

    srv1 = Host("srv1", "WebServer", "server", x=680, y=280, default_gateway="172.16.2.1")
    srv1.add_interface(Interface("eth0", "00:50:79:66:68:99", ip_address="172.16.2.100", subnet_mask="255.255.255.0"))

    topo.add_device(pc1)
    topo.add_device(sw1)
    topo.add_device(r1)
    topo.add_device(sw2)
    topo.add_device(srv1)

    topo.add_link(Link("link1", "pc1", "eth0", "sw1", "Fa0/1"))
    topo.add_link(Link("link2", "sw1", "Fa0/2", "r1", "Gi0/0"))
    topo.add_link(Link("link3", "r1", "Gi0/1", "sw2", "Fa0/1"))
    topo.add_link(Link("link4", "sw2", "Fa0/2", "srv1", "eth0"))

    return topo


LAB_DEFINITIONS: Dict[str, Dict[str, Any]] = {
    "lab-1": {
        "id": "lab-1",
        "title": "Lab 1: First Network",
        "difficulty": "Beginner",
        "description": "Build foundational networking knowledge by assigning IPv4 addresses to two PCs on a switch and observing ARP and ICMP echo.",
        "objectives": [
            "Configure IPv4 addresses and subnet masks on both PCs within the same subnet (e.g., 192.168.1.10/24 and 192.168.1.20/24).",
            "Verify that interfaces are administratively UP.",
            "Originate a ping from PC1 to PC2.",
            "Observe the initial broadcast ARP Request and unicast ARP Reply, followed by ICMP Echo Request and Reply."
        ],
        "tasks": [
            {"id": "t1", "text": "Assign PC1 an IP address (e.g., 192.168.1.10) with subnet mask 255.255.255.0"},
            {"id": "t2", "text": "Assign PC2 an IP address in the same subnet (e.g., 192.168.1.20) with mask 255.255.255.0"},
            {"id": "t3", "text": "Successfully ping PC2 from PC1"}
        ],
        "hints": [
            "Click on PC1, open its Interface Config, and enter 192.168.1.10 with mask 255.255.255.0.",
            "Click on PC2 and enter 192.168.1.20 with the same mask 255.255.255.0.",
            "Open the CLI on PC1 and type 'ping 192.168.1.20' or click 'Send Ping' in the control dock."
        ],
        "concept_summary": (
            "Because both hosts share the same subnet prefix (192.168.1.0/24), no router is required. "
            "PC1 uses ARP to find PC2's MAC address, and Switch1 learns both MAC addresses to forward unicast frames."
        ),
        "builder": build_lab_1_topology
    },
    "lab-2": {
        "id": "lab-2",
        "title": "Lab 2: Fix the Subnet Mask",
        "difficulty": "Beginner",
        "description": "Diagnose an addressing mismatch where PC1 and PC2 cannot communicate due to inconsistent subnet masks.",
        "objectives": [
            "Inspect PC1 (192.168.1.50/24) and PC2 (192.168.1.200/25).",
            "Understand why PC2 calculates 192.168.1.50 as belonging to a different subnet.",
            "Correct PC2's subnet mask to 255.255.255.0 (/24).",
            "Verify successful two-way ICMP communication."
        ],
        "tasks": [
            {"id": "t1", "text": "Identify the incorrect subnet mask on PC2"},
            {"id": "t2", "text": "Change PC2's subnet mask to 255.255.255.0 (/24)"},
            {"id": "t3", "text": "Verify successful ping from PC1 to 192.168.1.200"}
        ],
        "hints": [
            "Use the Subnet Calculator panel to inspect 192.168.1.200 with mask 255.255.255.128 (/25). Notice that /25 creates two subnets: .0-.127 and .128-.255.",
            "Since 192.168.1.50 is in the lower range and .200 is in the upper range, PC2 believes PC1 is remote and drops packets without a gateway.",
            "Change PC2's mask to 255.255.255.0."
        ],
        "concept_summary": (
            "Subnet masks define the boundary between network bits and host bits. "
            "When masks disagree, one host may consider a destination local while the other considers it remote, causing asymmetric communication failures."
        ),
        "builder": build_lab_2_topology
    },
    "lab-3": {
        "id": "lab-3",
        "title": "Lab 3: Route Between Networks",
        "difficulty": "Intermediate",
        "description": "Connect two distinct LANs across a router, configure default gateways, and observe router forwarding.",
        "objectives": [
            "Configure Router1 Gi0/0 with IP 192.168.10.1 and mask 255.255.255.0.",
            "Configure Router1 Gi0/1 with IP 192.168.20.1 and mask 255.255.255.0.",
            "Configure PC1's default gateway as 192.168.10.1.",
            "Configure PC2's default gateway as 192.168.20.1.",
            "Ping from PC1 (192.168.10.10) to PC2 (192.168.20.20)."
        ],
        "tasks": [
            {"id": "t1", "text": "Configure Router1 Gi0/0 IP to 192.168.10.1 /24 and enable interface"},
            {"id": "t2", "text": "Configure Router1 Gi0/1 IP to 192.168.20.1 /24 and enable interface"},
            {"id": "t3", "text": "Set PC1 default gateway to 192.168.10.1"},
            {"id": "t4", "text": "Set PC2 default gateway to 192.168.20.1"},
            {"id": "t5", "text": "Successfully ping PC2 (192.168.20.20) from PC1"}
        ],
        "hints": [
            "On Router1 CLI: 'int Gi0/0' -> 'ip address 192.168.10.1 255.255.255.0' -> 'no shutdown'.",
            "Do the same for Gi0/1 with 192.168.20.1 255.255.255.0.",
            "Set PC1 default gateway to 192.168.10.1 and PC2 default gateway to 192.168.20.1.",
            "Type 'ping 192.168.20.20' on PC1."
        ],
        "concept_summary": (
            "Routers connect disparate broadcast domains. When PC1 sends traffic to 192.168.20.20, "
            "it recognizes that the destination is outside its local subnet and ARPs for its default gateway. "
            "The router receives the frame, decrements TTL, looks up the route, and forwards the packet out Gi0/1."
        ),
        "builder": build_lab_3_topology
    },
    "lab-4": {
        "id": "lab-4",
        "title": "Lab 4: Troubleshoot Connectivity",
        "difficulty": "Intermediate",
        "description": "A production network is failing. Use diagnostic CLI commands to uncover 3 deliberate faults and restore connectivity.",
        "objectives": [
            "Use 'show interfaces' on Router1 to find an administratively disabled port.",
            "Use 'no shutdown' to bring Router1 Gi0/0 UP.",
            "Inspect PC2 configuration to find the incorrect default gateway (10.0.2.99).",
            "Correct PC2 default gateway to 10.0.2.1.",
            "Inspect the physical links to identify the disconnected cable on PC2 and enable it.",
            "Verify restored ping between PC1 and PC2."
        ],
        "tasks": [
            {"id": "t1", "text": "Enable Router1 Gi0/0 (currently shutdown)"},
            {"id": "t2", "text": "Fix PC2 default gateway (change 10.0.2.99 to 10.0.2.1)"},
            {"id": "t3", "text": "Reconnect the virtual link between Switch2 and PC2"},
            {"id": "t4", "text": "Achieve 100% ping success from PC1 to PC2"}
        ],
        "hints": [
            "Check Router1 interfaces using 'show ip int brief'. Notice that Gi0/0 is administratively down.",
            "Click on PC2 and check its default gateway. The router interface on that subnet is 10.0.2.1, but PC2 was set to 10.0.2.99.",
            "Select the link between Switch2 and PC2 and toggle it UP.",
            "Test with 'ping 10.0.2.20' from PC1."
        ],
        "concept_summary": (
            "Systematic network troubleshooting requires checking Layer 1 (cable/link status), "
            "Layer 2 (interface administrative state and MAC learning), and Layer 3 (IP configuration and gateways)."
        ),
        "builder": build_lab_4_topology
    },
    "lab-5": {
        "id": "lab-5",
        "title": "Lab 5: Observe ARP and Routing",
        "difficulty": "Advanced",
        "description": "Deeply observe how Address Resolution Protocol operates differently when accessing local hosts versus remote destinations across a router.",
        "objectives": [
            "Inspect the ARP tables on PC1, Router1, and WebServer prior to sending traffic.",
            "Send an ICMP ping from PC1 (172.16.1.10) to WebServer (172.16.2.100).",
            "Observe that PC1 broadcasts an ARP Request for Router1 (172.16.1.1), NOT for WebServer.",
            "Observe Router1 receiving the packet, checking its routing table, and broadcasting an ARP Request for WebServer (172.16.2.100).",
            "Inspect the populated ARP tables and verify MAC resolution differences."
        ],
        "tasks": [
            {"id": "t1", "text": "Verify initial empty ARP tables using 'show arp' on PC1 and Router1"},
            {"id": "t2", "text": "Ping WebServer (172.16.2.100) from PC1"},
            {"id": "t3", "text": "Verify PC1 ARP table contains Router1's MAC address, not WebServer's MAC"}
        ],
        "hints": [
            "On PC1, type 'show arp' to see that the ARP cache is empty.",
            "Run 'ping 172.16.2.100' on PC1.",
            "Inspect the simulation event trace step-by-step. Notice that PC1 never ARPs for 172.16.2.100 because it is outside PC1's subnet."
        ],
        "concept_summary": (
            "A host only ARPs for IP addresses located on its own local subnet. "
            "For all remote traffic, the host ARPs for its next-hop default gateway. "
            "The router decapsulates the Layer 2 frame and re-encapsulates it with a new source and destination MAC on each hop!"
        ),
        "builder": build_lab_5_topology
    }
}


def evaluate_lab(lab_id: str, topology: Topology) -> Dict[str, Any]:
    """
    Validate the current state of a topology against lab criteria.
    Returns task status, overall completion boolean, and feedback.
    """
    if lab_id not in LAB_DEFINITIONS:
        return {"completed": False, "tasks": [], "message": f"Unknown lab ID: {lab_id}"}

    lab_info = LAB_DEFINITIONS[lab_id]
    tasks = copy.deepcopy(lab_info["tasks"])

    if lab_id == "lab-1":
        pc1 = topology.devices.get("pc1")
        pc2 = topology.devices.get("pc2")
        sw1 = topology.devices.get("sw1")

        if1 = pc1.get_interface("eth0") if pc1 else None
        if2 = pc2.get_interface("eth0") if pc2 else None

        # Task 1: PC1 IP & mask configured
        t1_done = bool(if1 and if1.ip_address and if1.subnet_mask and if1.admin_up)
        # Task 2: PC2 IP in same subnet
        t2_done = bool(
            if1 and if2 and if1.ip_address and if2.ip_address and
            if1.subnet_mask and if2.subnet_mask and
            if1.ip_address != if2.ip_address and
            is_same_subnet(if1.ip_address, if2.ip_address, if1.subnet_mask)
        )
        # Task 3: Ping succeeds
        t3_done = False
        if t1_done and t2_done:
            eng = SimulationEngine(topology)
            evs = eng.ping("pc1", if2.ip_address, count=1)
            t3_done = any(e.event_type == "PING_SUCCESS" for e in evs)

        tasks[0]["completed"] = t1_done
        tasks[1]["completed"] = t2_done
        tasks[2]["completed"] = t3_done

    elif lab_id == "lab-2":
        pc1 = topology.devices.get("pc1")
        pc2 = topology.devices.get("pc2")
        if1 = pc1.get_interface("eth0") if pc1 else None
        if2 = pc2.get_interface("eth0") if pc2 else None

        t1_done = True
        t2_done = bool(if2 and if2.subnet_mask in ("255.255.255.0", "/24"))
        t3_done = False
        if t2_done and if1 and if2:
            eng = SimulationEngine(topology)
            evs = eng.ping("pc1", if2.ip_address, count=1)
            t3_done = any(e.event_type == "PING_SUCCESS" for e in evs)

        tasks[0]["completed"] = t1_done
        tasks[1]["completed"] = t2_done
        tasks[2]["completed"] = t3_done

    elif lab_id == "lab-3":
        r1 = topology.devices.get("r1")
        pc1 = topology.devices.get("pc1")
        pc2 = topology.devices.get("pc2")

        r_gi0 = r1.get_interface("Gi0/0") if r1 else None
        r_gi1 = r1.get_interface("Gi0/1") if r1 else None
        pc1_if = pc1.get_interface("eth0") if pc1 else None
        pc2_if = pc2.get_interface("eth0") if pc2 else None

        t1_done = bool(r_gi0 and r_gi0.admin_up and r_gi0.ip_address == "192.168.10.1")
        t2_done = bool(r_gi1 and r_gi1.admin_up and r_gi1.ip_address == "192.168.20.1")
        t3_done = bool(isinstance(pc1, Host) and pc1.default_gateway == "192.168.10.1")
        t4_done = bool(isinstance(pc2, Host) and pc2.default_gateway == "192.168.20.1")

        t5_done = False
        if t1_done and t2_done and t3_done and t4_done and pc2_if:
            eng = SimulationEngine(topology)
            evs = eng.ping("pc1", pc2_if.ip_address, count=1)
            t5_done = any(e.event_type == "PING_SUCCESS" for e in evs)

        tasks[0]["completed"] = t1_done
        tasks[1]["completed"] = t2_done
        tasks[2]["completed"] = t3_done
        tasks[3]["completed"] = t4_done
        tasks[4]["completed"] = t5_done

    elif lab_id == "lab-4":
        r1 = topology.devices.get("r1")
        pc2 = topology.devices.get("pc2")
        link4 = topology.links.get("link4")

        r_gi0 = r1.get_interface("Gi0/0") if r1 else None

        t1_done = bool(r_gi0 and r_gi0.admin_up)
        t2_done = bool(isinstance(pc2, Host) and pc2.default_gateway == "10.0.2.1")
        t3_done = bool(link4 and link4.is_up)

        t4_done = False
        if t1_done and t2_done and t3_done and pc2:
            eng = SimulationEngine(topology)
            evs = eng.ping("pc1", "10.0.2.20", count=1)
            t4_done = any(e.event_type == "PING_SUCCESS" for e in evs)

        tasks[0]["completed"] = t1_done
        tasks[1]["completed"] = t2_done
        tasks[2]["completed"] = t3_done
        tasks[3]["completed"] = t4_done

    elif lab_id == "lab-5":
        pc1 = topology.devices.get("pc1")
        srv1 = topology.devices.get("srv1")
        r1 = topology.devices.get("r1")

        t1_done = True
        t2_done = False
        t3_done = False

        if pc1 and srv1 and r1:
            eng = SimulationEngine(topology)
            evs = eng.ping("pc1", "172.16.2.100", count=1)
            t2_done = any(e.event_type == "PING_SUCCESS" for e in evs)
            
            # Check PC1 ARP table contains Router1 IP (172.16.1.1)
            t3_done = "172.16.1.1" in pc1.arp_cache and "172.16.2.100" not in pc1.arp_cache

        tasks[0]["completed"] = t1_done
        tasks[1]["completed"] = t2_done
        tasks[2]["completed"] = t3_done

    all_done = all(t.get("completed", False) for t in tasks)

    return {
        "lab_id": lab_id,
        "title": lab_info["title"],
        "completed": all_done,
        "tasks": tasks,
        "concept_summary": lab_info["concept_summary"] if all_done else None,
        "message": "Congratulations! You have completed all lab tasks!" if all_done else "Work in progress. Complete all tasks to pass the lab."
    }
