import pytest
from netforge.devices import Router, Interface, Route


def test_longest_prefix_match():
    r = Router("r1", "Router1")
    r.add_interface(Interface("Gi0/0", "00:AA:00:00:00:01", ip_address="10.0.0.1", subnet_mask="255.0.0.0"))
    r.add_interface(Interface("Gi0/1", "00:AA:00:00:00:02", ip_address="192.168.1.1", subnet_mask="255.255.255.0"))

    # Connected routes: 10.0.0.0/8 and 192.168.1.0/24
    # Add static routes with varying specificity:
    # 172.16.0.0/16 via 10.0.0.2 on Gi0/0
    # 172.16.5.0/24 via 10.0.0.3 on Gi0/0
    # 0.0.0.0/0 (Default route) via 10.0.0.254 on Gi0/0
    r.add_static_route("172.16.0.0", "255.255.0.0", next_hop="10.0.0.2", interface_name="Gi0/0")
    r.add_static_route("172.16.5.0", "255.255.255.0", next_hop="10.0.0.3", interface_name="Gi0/0")
    r.add_static_route("0.0.0.0", "0.0.0.0", next_hop="10.0.0.254", interface_name="Gi0/0")

    # Destination 172.16.5.50 matches /24 and /16 and /0. Longest match is /24 (next_hop 10.0.0.3)!
    best1 = r.find_best_route("172.16.5.50")
    assert best1.prefix == 24
    assert best1.next_hop == "10.0.0.3"

    # Destination 172.16.2.20 matches /16 and /0. Longest match is /16 (next_hop 10.0.0.2)!
    best2 = r.find_best_route("172.16.2.20")
    assert best2.prefix == 16
    assert best2.next_hop == "10.0.0.2"

    # Destination 8.8.8.8 matches only default route /0!
    best3 = r.find_best_route("8.8.8.8")
    assert best3.prefix == 0
    assert best3.next_hop == "10.0.0.254"

    # Destination 192.168.1.50 matches directly connected route /24 on Gi0/1
    best4 = r.find_best_route("192.168.1.50")
    assert best4.route_type == "C"
    assert best4.interface_name == "Gi0/1"
