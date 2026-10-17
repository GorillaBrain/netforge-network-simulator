import pytest
from netforge.devices import Switch, Interface
from netforge.protocols import BROADCAST_MAC


def test_mac_learning_and_unicast():
    sw = Switch("sw1", "Switch1")
    sw.add_interface(Interface("Fa0/1", "00:00:00:00:01:01"))
    sw.add_interface(Interface("Fa0/2", "00:00:00:00:01:02"))
    sw.add_interface(Interface("Fa0/3", "00:00:00:00:01:03"))

    # Initially empty
    assert sw.lookup_mac("AA:BB:CC:DD:EE:01") is None

    # Learn AA:BB:CC:DD:EE:01 on Fa0/1
    sw.learn_mac("AA:BB:CC:DD:EE:01", "Fa0/1")
    assert sw.lookup_mac("AA:BB:CC:DD:EE:01") == "Fa0/1"

    # Forward to learned MAC from Fa0/2
    # Since sw interfaces are not linked yet, is_operational checks if link_id is set.
    # Let's set link_id for active simulation
    sw.get_interface("Fa0/1").link_id = "link1"
    sw.get_interface("Fa0/2").link_id = "link2"
    sw.get_interface("Fa0/3").link_id = "link3"

    decision, ports = sw.get_forwarding_ports("Fa0/2", "AA:BB:CC:DD:EE:01")
    assert decision == "FORWARD_UNICAST"
    assert ports == ["Fa0/1"]


def test_mac_unknown_unicast_flood():
    sw = Switch("sw1", "Switch1")
    sw.add_interface(Interface("Fa0/1", "00:00:00:00:01:01", link_id="l1"))
    sw.add_interface(Interface("Fa0/2", "00:00:00:00:01:02", link_id="l2"))
    sw.add_interface(Interface("Fa0/3", "00:00:00:00:01:03", link_id="l3"))

    # Unknown unicast received on Fa0/1 -> floods to Fa0/2 and Fa0/3
    decision, ports = sw.get_forwarding_ports("Fa0/1", "99:99:99:99:99:99")
    assert decision == "FLOOD_UNKNOWN_UNICAST"
    assert set(ports) == {"Fa0/2", "Fa0/3"}


def test_mac_broadcast_flood():
    sw = Switch("sw1", "Switch1")
    sw.add_interface(Interface("Fa0/1", "00:00:00:00:01:01", link_id="l1"))
    sw.add_interface(Interface("Fa0/2", "00:00:00:00:01:02", link_id="l2"))
    sw.add_interface(Interface("Fa0/3", "00:00:00:00:01:03", link_id="l3"))

    decision, ports = sw.get_forwarding_ports("Fa0/1", BROADCAST_MAC)
    assert decision == "FLOOD_BROADCAST"
    assert set(ports) == {"Fa0/2", "Fa0/3"}


def test_mac_same_port_filter():
    sw = Switch("sw1", "Switch1")
    sw.add_interface(Interface("Fa0/1", "00:00:00:00:01:01", link_id="l1"))
    sw.add_interface(Interface("Fa0/2", "00:00:00:00:01:02", link_id="l2"))

    sw.learn_mac("AA:BB:CC:DD:EE:01", "Fa0/1")
    # Ingress port is Fa0/1 and destination was learned on Fa0/1
    decision, ports = sw.get_forwarding_ports("Fa0/1", "AA:BB:CC:DD:EE:01")
    assert decision == "FILTER_SAME_PORT"
    assert ports == []
