"""
Virtual Link Model for NetForge.

Represents Ethernet links connecting interface endpoints between devices,
with administrative state, latency, and operational checks.
"""

from typing import Dict, Any, Tuple, Optional


class Link:
    def __init__(
        self,
        id: str,
        device_a_id: str,
        interface_a_name: str,
        device_b_id: str,
        interface_b_name: str,
        is_up: bool = True,
        bandwidth_mbps: int = 1000,
        delay_ms: float = 1.0
    ):
        self.id = id
        self.device_a_id = device_a_id
        self.interface_a_name = interface_a_name
        self.device_b_id = device_b_id
        self.interface_b_name = interface_b_name
        self.is_up = is_up
        self.bandwidth_mbps = bandwidth_mbps
        self.delay_ms = delay_ms

    def connects_device(self, device_id: str) -> bool:
        return self.device_a_id == device_id or self.device_b_id == device_id

    def connects_interface(self, device_id: str, iface_name: str) -> bool:
        return (
            (self.device_a_id == device_id and self.interface_a_name == iface_name) or
            (self.device_b_id == device_id and self.interface_b_name == iface_name)
        )

    def get_other_endpoint(self, device_id: str, iface_name: str) -> Optional[Tuple[str, str]]:
        if self.device_a_id == device_id and self.interface_a_name == iface_name:
            return (self.device_b_id, self.interface_b_name)
        elif self.device_b_id == device_id and self.interface_b_name == iface_name:
            return (self.device_a_id, self.interface_a_name)
        return None

    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": self.id,
            "device_a_id": self.device_a_id,
            "interface_a_name": self.interface_a_name,
            "device_b_id": self.device_b_id,
            "interface_b_name": self.interface_b_name,
            "is_up": self.is_up,
            "bandwidth_mbps": self.bandwidth_mbps,
            "delay_ms": self.delay_ms,
        }

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "Link":
        return cls(
            id=data["id"],
            device_a_id=data["device_a_id"],
            interface_a_name=data["interface_a_name"],
            device_b_id=data["device_b_id"],
            interface_b_name=data["interface_b_name"],
            is_up=data.get("is_up", True),
            bandwidth_mbps=data.get("bandwidth_mbps", 1000),
            delay_ms=data.get("delay_ms", 1.0)
        )
