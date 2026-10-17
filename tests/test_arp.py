import pytest
from netforge.topology import Topology
from netforge.devices import Host, Switch, Interface
from netforge.links import Link
from netforge.engine import SimulationEngine


def test_arp_resolution_between_two_pcs():
    topo = Topology(name="ARP Test")
    pc1 = Host("pc1", "PC1")
    pc1.add_interface(Interface("eth0", "00:50:79:66:68:01", ip_address="192.168.1.10", subnet_mask="255.255.255.0"))
    
    pc2 = Host("pc2", "PC2")
    pc2.add_interface(Interface("eth0", "00:50:79:66:68:02", ip_address="192.168.1.20", subnet_mask="255.255.255.0"))

    sw1 = Switch("sw1", "Switch1")
    sw1.add_interface(Interface("Fa0/1", "00:01:42:00:00:01"))
    sw1.add_interface(Interface("Fa0/2", "00:01:42:00:00:02"))

    topo.add_device(pc1)
    topo.add_device(pc2)
    topo.add_device(sw1)

    topo.add_link(Link("l1", "pc1", "eth0", "sw1", "Fa0/1"))
    topo.add_link(Link("l2", "pc2", "eth0", "sw1", "Fa0/2"))

    engine = SimulationEngine(topo)

    # Initial ARP cache is empty
    assert pc1.get_arp_entry("192.168.1.20") is None
    assert pc2.get_arp_entry("192.168.1.10") is None

    # Originate ping
    events = engine.ping("pc1", "192.168.1.20", count=1)

    # PC1 should now have resolved PC2's MAC
    assert pc1.get_arp_entry("192.168.1.20") == "00:50:79:66:68:02"
    # PC2 should have learned PC1's MAC via gratuitous ARP request learning
    assert pc2.get_arp_entry("192.168.1.10") == "00:50:79:66:68:01"

    # Switch should have learned both MACs
    assert sw1.lookup_mac("00:50:79:66:68:01") == "Fa0/1"
    assert sw1.lookup_mac("00:50:79:66:68:02") == "Fa0/2"

    # At least one PING_SUCCESS event
    assert any(e.event_type == "PING_SUCCESS" for e in events)
