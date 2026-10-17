import pytest
from netforge.protocols import (
    EthernetFrame, ARPPacket, IPv4Packet, ICMPPacket,
    BROADCAST_MAC, ZERO_MAC, ETHERTYPE_ARP, ETHERTYPE_IPV4,
    ARP_OP_REQUEST, ARP_OP_REPLY, ICMP_ECHO_REQUEST, ICMP_ECHO_REPLY
)


def test_arp_packet_dict():
    arp = ARPPacket(
        operation=ARP_OP_REQUEST,
        sender_mac="00:11:22:33:44:55",
        sender_ip="192.168.1.1",
        target_mac=ZERO_MAC,
        target_ip="192.168.1.2"
    )
    d = arp.to_dict()
    assert d["operation"] == ARP_OP_REQUEST
    assert d["opcode"] == 1
    assert d["sender_mac"] == "00:11:22:33:44:55"

    rebuilt = ARPPacket.from_dict(d)
    assert rebuilt.sender_ip == "192.168.1.1"
    assert rebuilt.target_ip == "192.168.1.2"


def test_icmp_packet_dict():
    icmp = ICMPPacket(type=ICMP_ECHO_REQUEST, sequence=1, identifier=100)
    d = icmp.to_dict()
    assert d["type"] == ICMP_ECHO_REQUEST
    assert d["type_number"] == 8

    rebuilt = ICMPPacket.from_dict(d)
    assert rebuilt.sequence == 1
    assert rebuilt.identifier == 100


def test_ethernet_frame_nested():
    icmp = ICMPPacket(type=ICMP_ECHO_REQUEST, sequence=2)
    ip_pkt = IPv4Packet(src_ip="10.0.0.1", dst_ip="10.0.0.2", ttl=64, payload=icmp)
    frame = EthernetFrame(
        src_mac="00:AA:BB:CC:DD:01",
        dst_mac="00:AA:BB:CC:DD:02",
        ethertype=ETHERTYPE_IPV4,
        payload=ip_pkt
    )
    d = frame.to_dict()
    assert d["src_mac"] == "00:AA:BB:CC:DD:01"
    assert d["payload"]["src_ip"] == "10.0.0.1"
    assert d["payload"]["payload"]["sequence"] == 2

    rebuilt = EthernetFrame.from_dict(d)
    assert rebuilt.src_mac == "00:AA:BB:CC:DD:01"
    assert rebuilt.payload.src_ip == "10.0.0.1"
