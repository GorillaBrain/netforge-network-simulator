"""
NetForge — Interactive Network Simulation Engine.
"""

__version__ = "1.0.0"

from netforge.addressing import (
    ip_to_int, int_to_ip, mask_str_to_prefix, prefix_to_mask_str,
    calculate_subnet_info, is_same_subnet, is_valid_ipv4, is_valid_subnet_mask
)
from netforge.protocols import (
    EthernetFrame, ARPPacket, IPv4Packet, ICMPPacket,
    BROADCAST_MAC, ZERO_MAC
)
from netforge.devices import Host, Switch, Router, Hub, Interface, Route
from netforge.links import Link
from netforge.topology import Topology
from netforge.engine import SimulationEngine, SimulationEvent
from netforge.cli import DeviceCLI
from netforge.labs import LAB_DEFINITIONS, evaluate_lab
