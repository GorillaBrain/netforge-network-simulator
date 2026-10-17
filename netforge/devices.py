"""
Device Models and Interfaces for NetForge.

Implements PCs, Laptops, Servers, Ethernet Switches, Routers, and Hubs,
with interface state, MAC tables, ARP caches, and routing tables.
"""

from typing import Dict, List, Optional, Any, Tuple
import time
from netforge.addressing import (
    ip_to_int, int_to_ip, mask_str_to_prefix, prefix_to_mask_int,
    get_network_int, is_same_subnet, prefix_to_mask_str
)
from netforge.protocols import (
    BROADCAST_MAC, ZERO_MAC, EthernetFrame, ARPPacket, IPv4Packet, ICMPPacket,
    ETHERTYPE_ARP, ETHERTYPE_IPV4, ARP_OP_REQUEST, ARP_OP_REPLY
)

Tuple_Ports = Tuple[str, List[str]]


class Interface:
    def __init__(
        self,
        name: str,
        mac_address: str,
        ip_address: Optional[str] = None,
        subnet_mask: Optional[str] = None,
        admin_up: bool = True,
        link_id: Optional[str] = None,
        mtu: int = 1500,
        speed_mbps: int = 1000
    ):
        self.name = name
        self.mac_address = mac_address.upper()
        self.ip_address = ip_address
        self.subnet_mask = subnet_mask
        self.admin_up = admin_up
        self.link_id = link_id
        self.mtu = mtu
        self.speed_mbps = speed_mbps

    @property
    def is_connected(self) -> bool:
        return self.link_id is not None

    @property
    def is_operational(self) -> bool:
        return self.admin_up and self.is_connected

    def get_prefix(self) -> Optional[int]:
        if not self.subnet_mask:
            return None
        return mask_str_to_prefix(self.subnet_mask)

    def get_network_address(self) -> Optional[str]:
        if not self.ip_address or not self.subnet_mask:
            return None
        ip_i = ip_to_int(self.ip_address)
        prefix = self.get_prefix()
        mask_i = prefix_to_mask_int(prefix)
        return int_to_ip(get_network_int(ip_i, mask_i))

    def to_dict(self) -> Dict[str, Any]:
        return {
            "name": self.name,
            "mac_address": self.mac_address,
            "ip_address": self.ip_address,
            "subnet_mask": self.subnet_mask,
            "admin_up": self.admin_up,
            "link_id": self.link_id,
            "is_connected": self.is_connected,
            "is_operational": self.is_operational,
            "prefix": self.get_prefix(),
            "network_address": self.get_network_address(),
            "mtu": self.mtu,
            "speed_mbps": self.speed_mbps,
        }

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "Interface":
        return cls(
            name=data["name"],
            mac_address=data["mac_address"],
            ip_address=data.get("ip_address"),
            subnet_mask=data.get("subnet_mask"),
            admin_up=data.get("admin_up", True),
            link_id=data.get("link_id"),
            mtu=data.get("mtu", 1500),
            speed_mbps=data.get("speed_mbps", 1000),
        )


class Route:
    def __init__(
        self,
        network: str,
        mask: str,
        next_hop: Optional[str] = None,
        interface_name: Optional[str] = None,
        metric: int = 1,
        route_type: str = "S"  # "C" for Connected, "S" for Static
    ):
        self.network = network
        self.mask = mask
        self.prefix = mask_str_to_prefix(mask)
        self.network_int = ip_to_int(network)
        self.mask_int = prefix_to_mask_int(self.prefix)
        self.next_hop = next_hop
        self.interface_name = interface_name
        self.metric = metric
        self.route_type = route_type

    def matches(self, dest_ip_str: str) -> bool:
        dest_int = ip_to_int(dest_ip_str)
        return (dest_int & self.mask_int) == (self.network_int & self.mask_int)

    def is_default_route(self) -> bool:
        return self.network == "0.0.0.0" and self.prefix == 0

    def to_dict(self) -> Dict[str, Any]:
        return {
            "network": self.network,
            "mask": self.mask,
            "prefix": self.prefix,
            "cidr": f"{self.network}/{self.prefix}",
            "next_hop": self.next_hop,
            "interface_name": self.interface_name,
            "metric": self.metric,
            "route_type": self.route_type,
            "is_default": self.is_default_route()
        }

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "Route":
        return cls(
            network=data["network"],
            mask=data["mask"],
            next_hop=data.get("next_hop"),
            interface_name=data.get("interface_name"),
            metric=data.get("metric", 1),
            route_type=data.get("route_type", "S")
        )


class Device:
    def __init__(
        self,
        id: str,
        name: str,
        device_type: str,
        x: float = 0.0,
        y: float = 0.0
    ):
        self.id = id
        self.name = name
        self.device_type = device_type
        self.x = x
        self.y = y
        self.interfaces: Dict[str, Interface] = {}
        # ARP cache: ip -> {"mac": str, "timestamp": float, "type": "DYNAMIC"}
        self.arp_cache: Dict[str, Dict[str, Any]] = {}

    def add_interface(self, iface: Interface):
        self.interfaces[iface.name] = iface

    def get_interface(self, name: str) -> Optional[Interface]:
        return self.interfaces.get(name)

    def get_interface_by_ip(self, ip_str: str) -> Optional[Interface]:
        for iface in self.interfaces.values():
            if iface.ip_address == ip_str:
                return iface
        return None

    def get_first_operational_interface(self) -> Optional[Interface]:
        for iface in self.interfaces.values():
            if iface.is_operational:
                return iface
        return None

    def update_arp_cache(self, ip_str: str, mac_str: str, arp_type: str = "DYNAMIC"):
        if ip_str and mac_str and mac_str.upper() != BROADCAST_MAC:
            self.arp_cache[ip_str] = {
                "ip": ip_str,
                "mac": mac_str.upper(),
                "type": arp_type,
                "timestamp": time.time(),
                "age_seconds": 0
            }

    def clear_arp_cache(self):
        self.arp_cache.clear()

    def get_arp_entry(self, ip_str: str) -> Optional[str]:
        entry = self.arp_cache.get(ip_str)
        if entry:
            return entry["mac"]
        return None

    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": self.id,
            "name": self.name,
            "device_type": self.device_type,
            "x": self.x,
            "y": self.y,
            "interfaces": {k: v.to_dict() for k, v in self.interfaces.items()},
            "arp_cache": list(self.arp_cache.values())
        }


class Host(Device):
    """Represents an End Device: PC, Laptop, or Server."""
    def __init__(
        self,
        id: str,
        name: str,
        device_type: str = "pc",
        x: float = 0.0,
        y: float = 0.0,
        default_gateway: Optional[str] = None
    ):
        super().__init__(id, name, device_type, x, y)
        self.default_gateway = default_gateway
        self.services = {"http": True} if device_type == "server" else {}

    def to_dict(self) -> Dict[str, Any]:
        res = super().to_dict()
        res["default_gateway"] = self.default_gateway
        res["services"] = self.services
        return res

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "Host":
        host = cls(
            id=data["id"],
            name=data["name"],
            device_type=data.get("device_type", "pc"),
            x=data.get("x", 0.0),
            y=data.get("y", 0.0),
            default_gateway=data.get("default_gateway")
        )
        for iface_data in data.get("interfaces", {}).values():
            host.add_interface(Interface.from_dict(iface_data))
        for arp in data.get("arp_cache", []):
            host.update_arp_cache(arp["ip"], arp["mac"], arp.get("type", "DYNAMIC"))
        host.services = data.get("services", {})
        return host


class Switch(Device):
    """Represents a Layer 2 Ethernet Switch."""
    def __init__(
        self,
        id: str,
        name: str,
        x: float = 0.0,
        y: float = 0.0
    ):
        super().__init__(id, name, "switch", x, y)
        # MAC forwarding table: mac -> {"port": str, "timestamp": float, "type": "DYNAMIC"}
        self.mac_table: Dict[str, Dict[str, Any]] = {}

    def learn_mac(self, mac_str: str, port_name: str):
        mac_clean = mac_str.upper()
        if mac_clean not in (BROADCAST_MAC, ZERO_MAC):
            self.mac_table[mac_clean] = {
                "mac": mac_clean,
                "port": port_name,
                "timestamp": time.time(),
                "type": "DYNAMIC",
                "age_seconds": 0
            }

    def clear_mac_table(self):
        self.mac_table.clear()

    def lookup_mac(self, mac_str: str) -> Optional[str]:
        entry = self.mac_table.get(mac_str.upper())
        if entry:
            return entry["port"]
        return None

    def get_forwarding_ports(self, ingress_port: str, dst_mac: str) -> Tuple_Ports:
        """
        Determine forwarding decision according to Layer 2 Ethernet switching rules:
        - If broadcast (FF:FF:FF:FF:FF:FF): flood to all active ports EXCEPT ingress.
        - If learned destination MAC:
          - If learned port == ingress: filter/drop (do not send back out ingress port).
          - If learned port != ingress: forward unicast out that specific port.
        - If unknown unicast: flood to all active ports EXCEPT ingress.
        """
        dst_clean = dst_mac.upper()
        active_ports = [
            iface.name for iface in self.interfaces.values()
            if iface.is_operational and iface.name != ingress_port
        ]

        if dst_clean == BROADCAST_MAC:
            return "FLOOD_BROADCAST", active_ports

        learned_port = self.lookup_mac(dst_clean)
        if learned_port:
            if learned_port == ingress_port:
                # Filter: same segment
                return "FILTER_SAME_PORT", []
            target_iface = self.get_interface(learned_port)
            if target_iface and target_iface.is_operational:
                return "FORWARD_UNICAST", [learned_port]
            else:
                return "DROP_PORT_DOWN", []
        
        # Unknown Unicast Flooding
        return "FLOOD_UNKNOWN_UNICAST", active_ports

    def to_dict(self) -> Dict[str, Any]:
        res = super().to_dict()
        res["mac_table"] = list(self.mac_table.values())
        return res

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "Switch":
        sw = cls(
            id=data["id"],
            name=data["name"],
            x=data.get("x", 0.0),
            y=data.get("y", 0.0)
        )
        for iface_data in data.get("interfaces", {}).values():
            sw.add_interface(Interface.from_dict(iface_data))
        for entry in data.get("mac_table", []):
            sw.mac_table[entry["mac"].upper()] = {
                "mac": entry["mac"].upper(),
                "port": entry["port"],
                "timestamp": entry.get("timestamp", time.time()),
                "type": entry.get("type", "DYNAMIC"),
                "age_seconds": 0
            }
        return sw


Tuple_Ports = tuple[str, List[str]]


class Router(Device):
    """Represents a Layer 3 IPv4 Router."""
    def __init__(
        self,
        id: str,
        name: str,
        x: float = 0.0,
        y: float = 0.0
    ):
        super().__init__(id, name, "router", x, y)
        self.static_routes: List[Route] = []

    def add_static_route(self, network: str, mask: str, next_hop: Optional[str] = None, interface_name: Optional[str] = None, metric: int = 1):
        # Prevent exact duplicate route
        self.static_routes = [
            r for r in self.static_routes
            if not (r.network == network and r.mask == mask and r.next_hop == next_hop)
        ]
        self.static_routes.append(Route(network, mask, next_hop, interface_name, metric, "S"))

    def remove_static_route(self, network: str, mask: str, next_hop: Optional[str] = None):
        self.static_routes = [
            r for r in self.static_routes
            if not (r.network == network and r.mask == mask and (next_hop is None or r.next_hop == next_hop))
        ]

    def get_all_routes(self) -> List[Route]:
        """
        Dynamically synthesize routing table containing:
        1. Directly connected routes ("C") for operational interfaces with IP.
        2. Configured static routes ("S") and default routes ("S*").
        """
        routes: List[Route] = []
        
        # Directly Connected Routes
        for iface in self.interfaces.values():
            if iface.admin_up and iface.ip_address and iface.subnet_mask:
                net_addr = iface.get_network_address()
                if net_addr:
                    routes.append(Route(
                        network=net_addr,
                        mask=iface.subnet_mask,
                        next_hop=None,
                        interface_name=iface.name,
                        metric=0,
                        route_type="C"
                    ))

        # Static Routes
        routes.extend(self.static_routes)
        return routes

    def find_best_route(self, dest_ip_str: str) -> Optional[Route]:
        """
        Perform Longest-Prefix-Match (LPM) routing table lookup.
        Matches against all connected and static routes.
        Returns the route with the highest prefix length.
        Ties are broken by lowest administrative metric.
        """
        matching_routes = [r for r in self.get_all_routes() if r.matches(dest_ip_str)]
        if not matching_routes:
            return None

        # Sort descending by prefix length, then ascending by metric
        matching_routes.sort(key=lambda r: (r.prefix, -r.metric), reverse=True)
        return matching_routes[0]

    def to_dict(self) -> Dict[str, Any]:
        res = super().to_dict()
        res["static_routes"] = [r.to_dict() for r in self.static_routes]
        res["routing_table"] = [r.to_dict() for r in self.get_all_routes()]
        return res

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "Router":
        router = cls(
            id=data["id"],
            name=data["name"],
            x=data.get("x", 0.0),
            y=data.get("y", 0.0)
        )
        for iface_data in data.get("interfaces", {}).values():
            router.add_interface(Interface.from_dict(iface_data))
        for r_data in data.get("static_routes", []):
            router.add_static_route(
                network=r_data["network"],
                mask=r_data["mask"],
                next_hop=r_data.get("next_hop"),
                interface_name=r_data.get("interface_name"),
                metric=r_data.get("metric", 1)
            )
        for arp in data.get("arp_cache", []):
            router.update_arp_cache(arp["ip"], arp["mac"], arp.get("type", "DYNAMIC"))
        return router


class Hub(Device):
    """Represents a Physical Layer 1 Multi-port Repeater."""
    def __init__(
        self,
        id: str,
        name: str,
        x: float = 0.0,
        y: float = 0.0
    ):
        super().__init__(id, name, "hub", x, y)

    def get_forwarding_ports(self, ingress_port: str) -> List[str]:
        """Floods received signal to all operational ports except the ingress port."""
        return [
            iface.name for iface in self.interfaces.values()
            if iface.is_operational and iface.name != ingress_port
        ]

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "Hub":
        hub = cls(
            id=data["id"],
            name=data["name"],
            x=data.get("x", 0.0),
            y=data.get("y", 0.0)
        )
        for iface_data in data.get("interfaces", {}).values():
            hub.add_interface(Interface.from_dict(iface_data))
        return hub
