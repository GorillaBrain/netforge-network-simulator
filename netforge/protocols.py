"""
Networking Protocol Data Models for NetForge.

Defines Layer 2 (Ethernet), Layer 3 (ARP, IPv4), and Layer 4 (ICMP)
packets, frames, headers, and protocol serialization.
"""

from dataclasses import dataclass, field, asdict
from typing import Optional, Union, Dict, Any


BROADCAST_MAC = "FF:FF:FF:FF:FF:FF"
ZERO_MAC = "00:00:00:00:00:00"

ETHERTYPE_IPV4 = "IPv4"     # 0x0800
ETHERTYPE_ARP = "ARP"       # 0x0806

ARP_OP_REQUEST = "REQUEST"  # Opcode 1
ARP_OP_REPLY = "REPLY"      # Opcode 2

IP_PROTO_ICMP = "ICMP"      # Protocol 1
IP_PROTO_TCP = "TCP"        # Protocol 6
IP_PROTO_UDP = "UDP"        # Protocol 17

ICMP_ECHO_REPLY = "ECHO_REPLY"                      # Type 0
ICMP_DEST_UNREACHABLE = "DESTINATION_UNREACHABLE"  # Type 3
ICMP_ECHO_REQUEST = "ECHO_REQUEST"                  # Type 8
ICMP_TIME_EXCEEDED = "TIME_EXCEEDED"                # Type 11

# ICMP Codes
ICMP_CODE_NET_UNREACHABLE = 0
ICMP_CODE_HOST_UNREACHABLE = 1
ICMP_CODE_PORT_UNREACHABLE = 3
ICMP_CODE_TTL_EXPIRED = 0


@dataclass
class ICMPPacket:
    type: str  # ECHO_REQUEST, ECHO_REPLY, TIME_EXCEEDED, DESTINATION_UNREACHABLE
    code: int = 0
    sequence: int = 1
    identifier: int = 100
    payload: str = "NetForge ping payload (32 bytes)"

    def to_dict(self) -> Dict[str, Any]:
        return {
            "layer": "Layer 4 (ICMP)",
            "type": self.type,
            "code": self.code,
            "sequence": self.sequence,
            "identifier": self.identifier,
            "payload": self.payload,
            "type_number": 8 if self.type == ICMP_ECHO_REQUEST else (0 if self.type == ICMP_ECHO_REPLY else (11 if self.type == ICMP_TIME_EXCEEDED else 3))
        }

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "ICMPPacket":
        return cls(
            type=data.get("type", ICMP_ECHO_REQUEST),
            code=data.get("code", 0),
            sequence=data.get("sequence", 1),
            identifier=data.get("identifier", 100),
            payload=data.get("payload", "")
        )


@dataclass
class ARPPacket:
    operation: str  # REQUEST or REPLY
    sender_mac: str
    sender_ip: str
    target_mac: str
    target_ip: str
    hardware_type: str = "Ethernet (1)"
    protocol_type: str = "IPv4 (0x0800)"

    def to_dict(self) -> Dict[str, Any]:
        return {
            "layer": "Layer 3 (ARP)",
            "operation": self.operation,
            "opcode": 1 if self.operation == ARP_OP_REQUEST else 2,
            "sender_mac": self.sender_mac,
            "sender_ip": self.sender_ip,
            "target_mac": self.target_mac,
            "target_ip": self.target_ip,
            "hardware_type": self.hardware_type,
            "protocol_type": self.protocol_type,
        }

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "ARPPacket":
        return cls(
            operation=data.get("operation", ARP_OP_REQUEST),
            sender_mac=data.get("sender_mac", ZERO_MAC),
            sender_ip=data.get("sender_ip", "0.0.0.0"),
            target_mac=data.get("target_mac", ZERO_MAC),
            target_ip=data.get("target_ip", "0.0.0.0"),
            hardware_type=data.get("hardware_type", "Ethernet (1)"),
            protocol_type=data.get("protocol_type", "IPv4 (0x0800)"),
        )


@dataclass
class IPv4Packet:
    src_ip: str
    dst_ip: str
    ttl: int = 64
    protocol: str = IP_PROTO_ICMP
    identification: int = 54321
    flags: str = "DF (Don't Fragment)"
    payload: Union[ICMPPacket, Dict[str, Any]] = field(default_factory=dict)
    header_checksum: str = "0x7a31 (verified)"

    def to_dict(self) -> Dict[str, Any]:
        payload_dict = self.payload.to_dict() if hasattr(self.payload, "to_dict") else self.payload
        return {
            "layer": "Layer 3 (IPv4)",
            "src_ip": self.src_ip,
            "dst_ip": self.dst_ip,
            "ttl": self.ttl,
            "protocol": self.protocol,
            "identification": self.identification,
            "flags": self.flags,
            "header_checksum": self.header_checksum,
            "payload": payload_dict,
        }

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "IPv4Packet":
        raw_payload = data.get("payload", {})
        if isinstance(raw_payload, dict) and "type" in raw_payload:
            payload = ICMPPacket.from_dict(raw_payload)
        else:
            payload = raw_payload
        return cls(
            src_ip=data.get("src_ip", "0.0.0.0"),
            dst_ip=data.get("dst_ip", "0.0.0.0"),
            ttl=data.get("ttl", 64),
            protocol=data.get("protocol", IP_PROTO_ICMP),
            identification=data.get("identification", 1),
            flags=data.get("flags", "DF"),
            payload=payload,
            header_checksum=data.get("header_checksum", "0x0000"),
        )


@dataclass
class EthernetFrame:
    src_mac: str
    dst_mac: str
    ethertype: str  # ETHERTYPE_IPV4 or ETHERTYPE_ARP
    payload: Union[ARPPacket, IPv4Packet, Dict[str, Any]]
    fcs: str = "0x4b7c128f (CRC valid)"

    def is_broadcast(self) -> bool:
        return self.dst_mac.upper() == BROADCAST_MAC

    def to_dict(self) -> Dict[str, Any]:
        payload_dict = self.payload.to_dict() if hasattr(self.payload, "to_dict") else self.payload
        return {
            "layer": "Layer 2 (Ethernet)",
            "src_mac": self.src_mac,
            "dst_mac": self.dst_mac,
            "ethertype": self.ethertype,
            "is_broadcast": self.is_broadcast(),
            "fcs": self.fcs,
            "payload": payload_dict,
        }

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "EthernetFrame":
        ethertype = data.get("ethertype", ETHERTYPE_IPV4)
        raw_payload = data.get("payload", {})
        if ethertype == ETHERTYPE_ARP:
            payload = ARPPacket.from_dict(raw_payload) if isinstance(raw_payload, dict) else raw_payload
        else:
            payload = IPv4Packet.from_dict(raw_payload) if isinstance(raw_payload, dict) else raw_payload

        return cls(
            src_mac=data.get("src_mac", ZERO_MAC),
            dst_mac=data.get("dst_mac", BROADCAST_MAC),
            ethertype=ethertype,
            payload=payload,
            fcs=data.get("fcs", "0x00000000"),
        )
