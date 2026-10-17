"""
Topology Model and Schema Validation for NetForge.

Manages the network graph, device inventory, virtual links,
and validates configuration consistency and schema versioning.
"""

from typing import Dict, List, Optional, Any, Union, Tuple
import uuid
from netforge.addressing import (
    is_valid_ipv4, is_valid_subnet_mask, mask_str_to_prefix,
    is_same_subnet, ip_to_int
)
from netforge.devices import Device, Host, Switch, Router, Hub, Interface
from netforge.links import Link

TOPOLOGY_SCHEMA_VERSION = "1.0.0"
Tuple_DevIface = Tuple[Device, Interface]


class Topology:
    def __init__(
        self,
        id: Optional[str] = None,
        name: str = "NetForge Lab Topology",
        description: str = "Interactive network simulation topology",
        version: str = TOPOLOGY_SCHEMA_VERSION
    ):
        self.id = id or str(uuid.uuid4())
        self.name = name
        self.description = description
        self.version = version
        self.devices: Dict[str, Device] = {}
        self.links: Dict[str, Link] = {}

    def add_device(self, device: Device):
        self.devices[device.id] = device

    def remove_device(self, device_id: str):
        if device_id in self.devices:
            # First remove all links attached to this device
            attached_links = [
                lid for lid, link in self.links.items()
                if link.connects_device(device_id)
            ]
            for lid in attached_links:
                self.remove_link(lid)
            del self.devices[device_id]

    def add_link(self, link: Link):
        # Validate that endpoints exist
        dev_a = self.devices.get(link.device_a_id)
        dev_b = self.devices.get(link.device_b_id)
        if not dev_a or not dev_b:
            raise ValueError("Both devices must exist in topology before creating a link")
        
        iface_a = dev_a.get_interface(link.interface_a_name)
        iface_b = dev_b.get_interface(link.interface_b_name)
        if not iface_a or not iface_b:
            raise ValueError("Interfaces must exist on devices before creating a link")

        # Disconnect any prior links on these interfaces
        if iface_a.link_id and iface_a.link_id in self.links:
            self.remove_link(iface_a.link_id)
        if iface_b.link_id and iface_b.link_id in self.links:
            self.remove_link(iface_b.link_id)

        iface_a.link_id = link.id
        iface_b.link_id = link.id
        self.links[link.id] = link

    def remove_link(self, link_id: str):
        link = self.links.get(link_id)
        if link:
            dev_a = self.devices.get(link.device_a_id)
            if dev_a:
                iface_a = dev_a.get_interface(link.interface_a_name)
                if iface_a and iface_a.link_id == link_id:
                    iface_a.link_id = None

            dev_b = self.devices.get(link.device_b_id)
            if dev_b:
                iface_b = dev_b.get_interface(link.interface_b_name)
                if iface_b and iface_b.link_id == link_id:
                    iface_b.link_id = None

            del self.links[link_id]

    def get_link_by_interface(self, device_id: str, iface_name: str) -> Optional[Link]:
        for link in self.links.values():
            if link.connects_interface(device_id, iface_name):
                return link
        return None

    def get_device_by_ip(self, ip_str: str) -> Optional[Tuple_DevIface]:
        for dev in self.devices.values():
            for iface in dev.interfaces.values():
                if iface.ip_address == ip_str:
                    return dev, iface
        return None

    def get_device_by_mac(self, mac_str: str) -> Optional[Tuple_DevIface]:
        mac_clean = mac_str.upper()
        for dev in self.devices.values():
            for iface in dev.interfaces.values():
                if iface.mac_address == mac_clean:
                    return dev, iface
        return None

    def validate(self) -> Dict[str, Any]:
        """
        Validate topology consistency, detecting address collisions,
        unreachable gateways, dangling links, and malformed subnet masks.
        """
        errors = []
        warnings = []

        configured_ips: Dict[str, List[str]] = {}

        for dev_id, dev in self.devices.items():
            for if_name, iface in dev.interfaces.items():
                if iface.ip_address:
                    if not is_valid_ipv4(iface.ip_address):
                        errors.append(f"Device {dev.name} interface {if_name} has invalid IPv4: {iface.ip_address}")
                    else:
                        configured_ips.setdefault(iface.ip_address, []).append(f"{dev.name}:{if_name}")

                if iface.subnet_mask and not is_valid_subnet_mask(iface.subnet_mask):
                    errors.append(f"Device {dev.name} interface {if_name} has invalid subnet mask: {iface.subnet_mask}")

                if iface.link_id and iface.link_id not in self.links:
                    errors.append(f"Device {dev.name} interface {if_name} references missing link {iface.link_id}")

            if isinstance(dev, Host) and dev.default_gateway:
                if not is_valid_ipv4(dev.default_gateway):
                    errors.append(f"Device {dev.name} has invalid default gateway IP: {dev.default_gateway}")
                else:
                    # Check if default gateway is in the same subnet as host interface
                    op_iface = dev.get_first_operational_interface()
                    if op_iface and op_iface.ip_address and op_iface.subnet_mask:
                        if not is_same_subnet(op_iface.ip_address, dev.default_gateway, op_iface.subnet_mask):
                            warnings.append(
                                f"Device {dev.name} default gateway {dev.default_gateway} is outside local subnet "
                                f"({op_iface.ip_address}/{op_iface.subnet_mask})"
                            )

        # Detect IP Address Collisions
        for ip, locations in configured_ips.items():
            if len(locations) > 1:
                errors.append(f"Duplicate IPv4 address conflict detected: {ip} is configured on multiple interfaces: {', '.join(locations)}")

        # Validate Link Endpoints
        for link_id, link in self.links.items():
            dev_a = self.devices.get(link.device_a_id)
            dev_b = self.devices.get(link.device_b_id)
            if not dev_a or not dev_b:
                errors.append(f"Link {link_id} references non-existent device: {link.device_a_id} or {link.device_b_id}")
                continue
            if not dev_a.get_interface(link.interface_a_name):
                errors.append(f"Link {link_id} endpoint {dev_a.name} lacks interface {link.interface_a_name}")
            if not dev_b.get_interface(link.interface_b_name):
                errors.append(f"Link {link_id} endpoint {dev_b.name} lacks interface {link.interface_b_name}")

        return {
            "valid": len(errors) == 0,
            "errors": errors,
            "warnings": warnings,
            "device_count": len(self.devices),
            "link_count": len(self.links)
        }

    def to_dict(self) -> Dict[str, Any]:
        return {
            "schema_version": self.version,
            "id": self.id,
            "name": self.name,
            "description": self.description,
            "devices": [dev.to_dict() for dev in self.devices.values()],
            "links": [link.to_dict() for link in self.links.values()]
        }

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "Topology":
        if "devices" not in data or "links" not in data:
            raise ValueError("Malformed topology JSON: missing 'devices' or 'links' keys")

        topo = cls(
            id=data.get("id"),
            name=data.get("name", "Imported Topology"),
            description=data.get("description", ""),
            version=data.get("schema_version", TOPOLOGY_SCHEMA_VERSION)
        )

        for dev_data in data["devices"]:
            dtype = dev_data.get("device_type", "pc")
            if dtype in ("pc", "laptop", "server"):
                dev = Host.from_dict(dev_data)
            elif dtype == "switch":
                dev = Switch.from_dict(dev_data)
            elif dtype == "router":
                dev = Router.from_dict(dev_data)
            elif dtype == "hub":
                dev = Hub.from_dict(dev_data)
            else:
                dev = Host.from_dict(dev_data)
            topo.add_device(dev)

        for link_data in data["links"]:
            link = Link.from_dict(link_data)
            topo.add_link(link)

        return topo


Tuple_DevIface = tuple[Device, Interface]
