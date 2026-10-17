import pytest
from netforge.topology import Topology
from netforge.devices import Host, Switch, Router, Interface
from netforge.links import Link
from netforge.engine import SimulationEngine
from netforge.labs import build_lab_3_topology


def test_cross_subnet_ping_through_router():
    topo = build_lab_3_topology()
    r1 = topo.devices["r1"]
    pc1 = topo.devices["pc1"]
    pc2 = topo.devices["pc2"]

    # Configure Router1 interfaces
    r1.get_interface("Gi0/0").ip_address = "192.168.10.1"
    r1.get_interface("Gi0/0").subnet_mask = "255.255.255.0"
    r1.get_interface("Gi0/0").admin_up = True

    r1.get_interface("Gi0/1").ip_address = "192.168.20.1"
    r1.get_interface("Gi0/1").subnet_mask = "255.255.255.0"
    r1.get_interface("Gi0/1").admin_up = True

    # Configure Default Gateways
    pc1.default_gateway = "192.168.10.1"
    pc2.default_gateway = "192.168.20.1"

    engine = SimulationEngine(topo)
    events = engine.ping("pc1", "192.168.20.20", count=1)

    # Verify router forward and ping success
    forward_events = [e for e in events if e.event_type == "ROUTER_FORWARD"]
    assert len(forward_events) >= 1

    success_events = [e for e in events if e.event_type == "PING_SUCCESS"]
    assert len(success_events) >= 1
    # Check that TTL was decremented from 64 to 63 during transit through the router
    assert success_events[0].metadata["ttl"] == 63


def test_missing_default_gateway_failure():
    topo = build_lab_3_topology()
    pc1 = topo.devices["pc1"]
    pc1.default_gateway = None  # No gateway configured!

    engine = SimulationEngine(topo)
    events = engine.ping("pc1", "192.168.20.20", count=1)

    assert any(e.event_type == "DROP_NO_GATEWAY" for e in events)
    assert not any(e.event_type == "PING_SUCCESS" for e in events)


def test_interface_down_failure():
    topo = build_lab_3_topology()
    r1 = topo.devices["r1"]
    pc1 = topo.devices["pc1"]
    pc2 = topo.devices["pc2"]

    r1.get_interface("Gi0/0").ip_address = "192.168.10.1"
    r1.get_interface("Gi0/0").subnet_mask = "255.255.255.0"
    r1.get_interface("Gi0/0").admin_up = False  # Shutdown!

    pc1.default_gateway = "192.168.10.1"
    pc2.default_gateway = "192.168.20.1"

    engine = SimulationEngine(topo)
    events = engine.ping("pc1", "192.168.20.20", count=1)

    # Ingress interface on router is down, so frame dropped
    assert any("DROP" in e.event_type for e in events)
    assert not any(e.event_type == "PING_SUCCESS" for e in events)
