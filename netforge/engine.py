"""
Discrete-Event Simulation Engine for NetForge.

Executes deterministic, step-by-step network simulations for ARP,
Ethernet switching, IPv4 routing, ICMP ping, and traceroute,
generating inspectable protocol traces with pedagogical explanations.
"""

from typing import List, Dict, Optional, Any, Tuple
import copy
from netforge.addressing import is_same_subnet
from netforge.protocols import (
    BROADCAST_MAC, ZERO_MAC, EthernetFrame, ARPPacket, IPv4Packet, ICMPPacket,
    ETHERTYPE_ARP, ETHERTYPE_IPV4, ARP_OP_REQUEST, ARP_OP_REPLY,
    ICMP_ECHO_REQUEST, ICMP_ECHO_REPLY, ICMP_TIME_EXCEEDED, ICMP_DEST_UNREACHABLE,
    ICMP_CODE_TTL_EXPIRED, ICMP_CODE_NET_UNREACHABLE, ICMP_CODE_HOST_UNREACHABLE
)
from netforge.devices import Host, Switch, Router, Hub, Interface
from netforge.topology import Topology


class SimulationEvent:
    def __init__(
        self,
        event_id: int,
        step: int,
        event_type: str,
        device_id: str,
        device_name: str,
        interface_name: Optional[str] = None,
        target_device_id: Optional[str] = None,
        target_device_name: Optional[str] = None,
        target_interface_name: Optional[str] = None,
        link_id: Optional[str] = None,
        frame: Optional[EthernetFrame] = None,
        summary: str = "",
        explanation: str = "",
        status: str = "INFO",
        metadata: Optional[Dict[str, Any]] = None
    ):
        self.event_id = event_id
        self.step = step
        self.event_type = event_type
        self.device_id = device_id
        self.device_name = device_name
        self.interface_name = interface_name
        self.target_device_id = target_device_id
        self.target_device_name = target_device_name
        self.target_interface_name = target_interface_name
        self.link_id = link_id
        self.frame = frame
        self.summary = summary
        self.explanation = explanation
        self.status = status
        self.metadata = metadata or {}

    def to_dict(self) -> Dict[str, Any]:
        frame_dict = self.frame.to_dict() if self.frame else None
        return {
            "event_id": self.event_id,
            "step": self.step,
            "event_type": self.event_type,
            "device_id": self.device_id,
            "device_name": self.device_name,
            "interface_name": self.interface_name,
            "target_device_id": self.target_device_id,
            "target_device_name": self.target_device_name,
            "target_interface_name": self.target_interface_name,
            "link_id": self.link_id,
            "frame": frame_dict,
            "summary": self.summary,
            "explanation": self.explanation,
            "status": self.status,
            "metadata": self.metadata,
        }


class SimulationEngine:
    def __init__(self, topology: Topology):
        self.topology = topology
        self.events: List[SimulationEvent] = []
        self._next_event_id = 1
        self._current_step = 0
        self.queue: List[Dict[str, Any]] = []
        self.is_paused = False
        # Buffer packets waiting for ARP resolution: (device_id, next_hop_ip) -> [(iface_name, ip_pkt)]
        self.pending_arp: Dict[Tuple[str, str], List[Tuple[str, IPv4Packet]]] = {}

    def reset(self):
        """Reset the simulation event history and queue."""
        self.events.clear()
        self.queue.clear()
        self._next_event_id = 1
        self._current_step = 0
        self.is_paused = False
        self.pending_arp.clear()

    def _record_event(
        self,
        event_type: str,
        device_id: str,
        device_name: str,
        interface_name: Optional[str] = None,
        target_device_id: Optional[str] = None,
        target_device_name: Optional[str] = None,
        target_interface_name: Optional[str] = None,
        link_id: Optional[str] = None,
        frame: Optional[EthernetFrame] = None,
        summary: str = "",
        explanation: str = "",
        status: str = "INFO",
        metadata: Optional[Dict[str, Any]] = None
    ) -> SimulationEvent:
        event = SimulationEvent(
            event_id=self._next_event_id,
            step=self._current_step,
            event_type=event_type,
            device_id=device_id,
            device_name=device_name,
            interface_name=interface_name,
            target_device_id=target_device_id,
            target_device_name=target_device_name,
            target_interface_name=target_interface_name,
            link_id=link_id,
            frame=frame,
            summary=summary,
            explanation=explanation,
            status=status,
            metadata=metadata
        )
        self._next_event_id += 1
        self.events.append(event)
        return event

    def send_frame(self, source_dev_id: str, source_iface_name: str, frame: EthernetFrame):
        """Enqueue a frame transmission from a source interface over its connected link."""
        src_dev = self.topology.devices.get(source_dev_id)
        if not src_dev:
            return
        src_iface = src_dev.get_interface(source_iface_name)
        if not src_iface:
            return

        if not src_iface.admin_up:
            self._record_event(
                event_type="DROP_INTERFACE_DOWN",
                device_id=source_dev_id,
                device_name=src_dev.name,
                interface_name=source_iface_name,
                frame=frame,
                summary=f"{src_dev.name}: Interface {source_iface_name} is administratively down",
                explanation=f"Cannot transmit frame because interface {source_iface_name} is shutdown.",
                status="DROP"
            )
            return

        link = self.topology.get_link_by_interface(source_dev_id, source_iface_name)
        if not link or not link.is_up:
            self._record_event(
                event_type="DROP_LINK_DOWN",
                device_id=source_dev_id,
                device_name=src_dev.name,
                interface_name=source_iface_name,
                frame=frame,
                summary=f"{src_dev.name}: Interface {source_iface_name} cable disconnected / link down",
                explanation=f"Cannot transmit frame because virtual link on {source_iface_name} is disconnected or down.",
                status="DROP"
            )
            return

        other = link.get_other_endpoint(source_dev_id, source_iface_name)
        if not other:
            return
        dst_dev_id, dst_iface_name = other
        dst_dev = self.topology.devices.get(dst_dev_id)

        self.queue.append({
            "type": "TRANSMIT_FRAME",
            "src_dev_id": source_dev_id,
            "src_iface": source_iface_name,
            "dst_dev_id": dst_dev_id,
            "dst_iface": dst_iface_name,
            "link_id": link.id,
            "frame": frame
        })

    def step(self) -> Optional[SimulationEvent]:
        """Execute one simulation action from the discrete queue."""
        if not self.queue:
            return None

        self._current_step += 1
        task = self.queue.pop(0)
        action_type = task["type"]

        if action_type == "TRANSMIT_FRAME":
            return self._handle_transmit_frame(task)
        elif action_type == "PROCESS_FRAME":
            return self._handle_process_frame(task)

        return None

    def run_all(self, max_steps: int = 100) -> List[SimulationEvent]:
        """Run all queued simulation events until empty or max_steps reached."""
        starting_index = len(self.events)
        steps_executed = 0
        while self.queue and steps_executed < max_steps:
            self.step()
            steps_executed += 1
        return self.events[starting_index:]

    def _handle_transmit_frame(self, task: Dict[str, Any]) -> SimulationEvent:
        src_dev = self.topology.devices[task["src_dev_id"]]
        dst_dev = self.topology.devices[task["dst_dev_id"]]
        frame = task["frame"]
        link_id = task["link_id"]

        is_broadcast = frame.is_broadcast()
        frame_type = frame.ethertype

        summary = f"{src_dev.name} ({task['src_iface']}) -> {dst_dev.name} ({task['dst_iface']}): Transmitting {frame_type} frame"
        explanation = (
            f"Transmitting Layer 2 Ethernet frame across link {link_id}. "
            f"Source MAC: {frame.src_mac}, Destination MAC: {frame.dst_mac}."
        )

        event = self._record_event(
            event_type="FRAME_TRANSMIT",
            device_id=src_dev.id,
            device_name=src_dev.name,
            interface_name=task["src_iface"],
            target_device_id=dst_dev.id,
            target_device_name=dst_dev.name,
            target_interface_name=task["dst_iface"],
            link_id=link_id,
            frame=frame,
            summary=summary,
            explanation=explanation,
            status="INFO",
            metadata={"is_broadcast": is_broadcast, "ethertype": frame_type}
        )

        # Enqueue reception by destination device
        self.queue.append({
            "type": "PROCESS_FRAME",
            "dev_id": dst_dev.id,
            "ingress_iface": task["dst_iface"],
            "link_id": link_id,
            "frame": frame
        })
        return event

    def _handle_process_frame(self, task: Dict[str, Any]) -> SimulationEvent:
        dev = self.topology.devices[task["dev_id"]]
        ingress_iface_name = task["ingress_iface"]
        ingress_iface = dev.get_interface(ingress_iface_name)
        frame: EthernetFrame = task["frame"]

        if not ingress_iface or not ingress_iface.is_operational:
            return self._record_event(
                event_type="DROP_PORT_DOWN",
                device_id=dev.id,
                device_name=dev.name,
                interface_name=ingress_iface_name,
                frame=frame,
                summary=f"{dev.name}: Ingress port {ingress_iface_name} is down",
                explanation="Frame dropped because the receiving interface is shutdown or unlinked.",
                status="DROP"
            )

        if isinstance(dev, Switch):
            return self._handle_switch_frame(dev, ingress_iface_name, frame)
        elif isinstance(dev, Hub):
            return self._handle_hub_frame(dev, ingress_iface_name, frame)
        elif isinstance(dev, Router):
            return self._handle_router_frame(dev, ingress_iface_name, frame)
        elif isinstance(dev, Host):
            return self._handle_host_frame(dev, ingress_iface_name, frame)
        return None

    def _handle_switch_frame(self, switch: Switch, ingress_port: str, frame: EthernetFrame) -> SimulationEvent:
        # Step 1: MAC learning
        learned_mac = frame.src_mac.upper()
        old_port = switch.lookup_mac(learned_mac)
        switch.learn_mac(learned_mac, ingress_port)

        learn_expl = f"Switch learned that MAC {learned_mac} is reachable on port {ingress_port}."
        if old_port and old_port != ingress_port:
            learn_expl += f" (Updated from previous port {old_port})."

        # Step 2: Forwarding decision
        decision, ports = switch.get_forwarding_ports(ingress_port, frame.dst_mac)

        if decision == "FILTER_SAME_PORT":
            return self._record_event(
                event_type="SWITCH_FILTER",
                device_id=switch.id,
                device_name=switch.name,
                interface_name=ingress_port,
                frame=frame,
                summary=f"{switch.name}: Filtered frame destined to {frame.dst_mac} on same port {ingress_port}",
                explanation=f"{learn_expl} The destination MAC was learned on the ingress port {ingress_port}, so the switch filtered (dropped) the frame to avoid a loop.",
                status="INFO",
                metadata={"mac_table": list(switch.mac_table.values())}
            )

        if decision == "FORWARD_UNICAST":
            out_port = ports[0]
            self.send_frame(switch.id, out_port, frame)
            return self._record_event(
                event_type="SWITCH_FORWARD",
                device_id=switch.id,
                device_name=switch.name,
                interface_name=ingress_port,
                target_interface_name=out_port,
                frame=frame,
                summary=f"{switch.name}: Unicast forwarded frame to {frame.dst_mac} out port {out_port}",
                explanation=f"{learn_expl} Destination MAC {frame.dst_mac} was found in the forwarding table; forwarding out port {out_port} only.",
                status="SUCCESS",
                metadata={"forwarded_port": out_port, "mac_table": list(switch.mac_table.values())}
            )

        # Flooding (Broadcast or Unknown Unicast)
        for out_port in ports:
            self.send_frame(switch.id, out_port, copy.deepcopy(frame))

        flood_reason = "broadcast" if frame.is_broadcast() else "unknown unicast"
        return self._record_event(
            event_type="SWITCH_FLOOD",
            device_id=switch.id,
            device_name=switch.name,
            interface_name=ingress_port,
            frame=frame,
            summary=f"{switch.name}: Flooded {flood_reason} frame to ports: {', '.join(ports) or 'None'}",
            explanation=f"{learn_expl} Frame is a {flood_reason}; flooding out all active ports except ingress port {ingress_port}.",
            status="INFO",
            metadata={"flooded_ports": ports, "mac_table": list(switch.mac_table.values())}
        )

    def _handle_hub_frame(self, hub: Hub, ingress_port: str, frame: EthernetFrame) -> SimulationEvent:
        ports = hub.get_forwarding_ports(ingress_port)
        for out_port in ports:
            self.send_frame(hub.id, out_port, copy.deepcopy(frame))
        return self._record_event(
            event_type="HUB_FLOOD",
            device_id=hub.id,
            device_name=hub.name,
            interface_name=ingress_port,
            frame=frame,
            summary=f"{hub.name}: Physical Layer 1 repeated signal to ports: {', '.join(ports)}",
            explanation="Hubs operate at Layer 1; they do not inspect MAC addresses or maintain a MAC table. Every incoming signal is repeated to all other ports.",
            status="INFO"
        )

    def _handle_host_frame(self, host: Host, ingress_port: str, frame: EthernetFrame) -> SimulationEvent:
        iface = host.get_interface(ingress_port)
        if not iface:
            return None

        # Layer 2 MAC check: must match host MAC or broadcast
        if not frame.is_broadcast() and frame.dst_mac.upper() != iface.mac_address.upper():
            return self._record_event(
                event_type="DROP_L2_MISMATCH",
                device_id=host.id,
                device_name=host.name,
                interface_name=ingress_port,
                frame=frame,
                summary=f"{host.name}: Dropped frame; destination MAC {frame.dst_mac} != {iface.mac_address}",
                explanation=f"Network interface card (NIC) rejected frame because destination MAC {frame.dst_mac} does not match host MAC and is not broadcast.",
                status="DROP"
            )

        # Process Layer 3 Protocol
        if frame.ethertype == ETHERTYPE_ARP:
            return self._handle_host_arp(host, iface, frame)
        elif frame.ethertype == ETHERTYPE_IPV4:
            return self._handle_host_ipv4(host, iface, frame)

        return None

    def _handle_host_arp(self, host: Host, iface: Interface, frame: EthernetFrame) -> SimulationEvent:
        arp: ARPPacket = frame.payload if isinstance(frame.payload, ARPPacket) else ARPPacket.from_dict(frame.payload)
        
        # Learn sender in ARP cache
        host.update_arp_cache(arp.sender_ip, arp.sender_mac)

        if arp.operation == ARP_OP_REQUEST:
            # Check if requested target IP matches our interface IP
            if arp.target_ip == iface.ip_address:
                # Generate ARP Reply unicast
                reply_arp = ARPPacket(
                    operation=ARP_OP_REPLY,
                    sender_mac=iface.mac_address,
                    sender_ip=iface.ip_address,
                    target_mac=arp.sender_mac,
                    target_ip=arp.sender_ip
                )
                reply_frame = EthernetFrame(
                    src_mac=iface.mac_address,
                    dst_mac=arp.sender_mac,
                    ethertype=ETHERTYPE_ARP,
                    payload=reply_arp
                )
                self.send_frame(host.id, iface.name, reply_frame)
                return self._record_event(
                    event_type="ARP_REPLY_SENT",
                    device_id=host.id,
                    device_name=host.name,
                    interface_name=iface.name,
                    frame=reply_frame,
                    summary=f"{host.name}: Target IP {arp.target_ip} matched! Sending ARP Reply with MAC {iface.mac_address}",
                    explanation=f"Host verified that the ARP request matches its configured IP {iface.ip_address}. It cached sender {arp.sender_ip} -> {arp.sender_mac} and is returning a unicast ARP Reply.",
                    status="SUCCESS"
                )
            else:
                return self._record_event(
                    event_type="ARP_IGNORED",
                    device_id=host.id,
                    device_name=host.name,
                    interface_name=iface.name,
                    frame=frame,
                    summary=f"{host.name}: Ignored ARP Request for {arp.target_ip} (my IP is {iface.ip_address})",
                    explanation=f"Host learned sender {arp.sender_ip} in its ARP cache, but ignored the request because the target IP {arp.target_ip} does not match.",
                    status="INFO"
                )

        elif arp.operation == ARP_OP_REPLY:
            # Drain any buffered packets for this next-hop IP
            pending = self.pending_arp.pop((host.id, arp.sender_ip), [])
            for pending_iface, pending_pkt in pending:
                p_iface_obj = host.get_interface(pending_iface)
                if p_iface_obj:
                    fwd_frame = EthernetFrame(
                        src_mac=p_iface_obj.mac_address,
                        dst_mac=arp.sender_mac,
                        ethertype=ETHERTYPE_IPV4,
                        payload=pending_pkt
                    )
                    self.send_frame(host.id, pending_iface, fwd_frame)
                    self._record_event(
                        event_type="HOST_FRAME_TRANSMIT",
                        device_id=host.id,
                        device_name=host.name,
                        interface_name=pending_iface,
                        frame=fwd_frame,
                        summary=f"{host.name}: ARP resolved! Transmitting buffered IPv4 packet to {pending_pkt.dst_ip}",
                        explanation=f"Host received ARP resolution for next-hop {arp.sender_ip} -> {arp.sender_mac} and released the buffered IPv4 packet.",
                        status="SUCCESS"
                    )

            return self._record_event(
                event_type="ARP_REPLY_RECEIVED",
                device_id=host.id,
                device_name=host.name,
                interface_name=iface.name,
                frame=frame,
                summary=f"{host.name}: Cached ARP resolution: {arp.sender_ip} is at {arp.sender_mac}",
                explanation=f"Host received unicast ARP reply from {arp.sender_ip} and recorded MAC {arp.sender_mac} into its ARP cache.",
                status="SUCCESS",
                metadata={"arp_cache": list(host.arp_cache.values())}
            )

        return None

    def _handle_host_ipv4(self, host: Host, iface: Interface, frame: EthernetFrame) -> SimulationEvent:
        ip_pkt: IPv4Packet = frame.payload if isinstance(frame.payload, IPv4Packet) else IPv4Packet.from_dict(frame.payload)
        
        # Check IP destination
        if ip_pkt.dst_ip != iface.ip_address:
            return self._record_event(
                event_type="DROP_IP_MISMATCH",
                device_id=host.id,
                device_name=host.name,
                interface_name=iface.name,
                frame=frame,
                summary=f"{host.name}: Dropped packet; destination IP {ip_pkt.dst_ip} != {iface.ip_address}",
                explanation=f"Host received an IPv4 packet destined to {ip_pkt.dst_ip}, which does not match host interface IP {iface.ip_address}.",
                status="DROP"
            )

        # ICMP Processing
        if ip_pkt.protocol == "ICMP":
            icmp: ICMPPacket = ip_pkt.payload if isinstance(ip_pkt.payload, ICMPPacket) else ICMPPacket.from_dict(ip_pkt.payload)
            
            if icmp.type == ICMP_ECHO_REQUEST:
                # Generate ICMP Echo Reply
                reply_icmp = ICMPPacket(
                    type=ICMP_ECHO_REPLY,
                    code=0,
                    sequence=icmp.sequence,
                    identifier=icmp.identifier,
                    payload=icmp.payload
                )
                reply_ip = IPv4Packet(
                    src_ip=iface.ip_address,
                    dst_ip=ip_pkt.src_ip,
                    ttl=64,
                    protocol="ICMP",
                    payload=reply_icmp
                )
                # Next hop resolution for return path
                self._send_ip_packet_from_host(host, iface, reply_ip)
                return self._record_event(
                    event_type="ICMP_ECHO_REPLY_SENT",
                    device_id=host.id,
                    device_name=host.name,
                    interface_name=iface.name,
                    summary=f"{host.name}: Received ICMP Echo Request from {ip_pkt.src_ip}; sending Echo Reply",
                    explanation=f"Host successfully received and validated the ICMP Echo Request. It generated an ICMP Echo Reply packet destined back to {ip_pkt.src_ip}.",
                    status="SUCCESS"
                )

            elif icmp.type == ICMP_ECHO_REPLY:
                return self._record_event(
                    event_type="PING_SUCCESS",
                    device_id=host.id,
                    device_name=host.name,
                    interface_name=iface.name,
                    frame=frame,
                    summary=f"{host.name}: Ping reply received from {ip_pkt.src_ip}! (seq={icmp.sequence}, ttl={ip_pkt.ttl})",
                    explanation=f"ICMP Echo Reply arrived successfully at source host {host.name}. End-to-end network connectivity verified!",
                    status="SUCCESS",
                    metadata={"src_ip": ip_pkt.src_ip, "seq": icmp.sequence, "ttl": ip_pkt.ttl}
                )

            elif icmp.type == ICMP_TIME_EXCEEDED:
                return self._record_event(
                    event_type="ICMP_TTL_EXPIRED",
                    device_id=host.id,
                    device_name=host.name,
                    interface_name=iface.name,
                    frame=frame,
                    summary=f"{host.name}: Received ICMP Time Exceeded from {ip_pkt.src_ip}",
                    explanation=f"Router at {ip_pkt.src_ip} decremented the packet TTL to 0 and dropped the packet, returning this ICMP Time Exceeded notification.",
                    status="WARNING"
                )

            elif icmp.type == ICMP_DEST_UNREACHABLE:
                return self._record_event(
                    event_type="ICMP_UNREACHABLE",
                    device_id=host.id,
                    device_name=host.name,
                    interface_name=iface.name,
                    frame=frame,
                    summary=f"{host.name}: Received Destination Unreachable from {ip_pkt.src_ip} (Code {icmp.code})",
                    explanation=f"Gateway/router at {ip_pkt.src_ip} reported that the destination network or host could not be reached.",
                    status="ERROR"
                )

        return None

    def _handle_router_frame(self, router: Router, ingress_port: str, frame: EthernetFrame) -> SimulationEvent:
        ingress_iface = router.get_interface(ingress_port)
        if not ingress_iface:
            return None

        # Check Layer 2 destination
        if not frame.is_broadcast() and frame.dst_mac.upper() != ingress_iface.mac_address.upper():
            return self._record_event(
                event_type="DROP_ROUTER_L2_MISMATCH",
                device_id=router.id,
                device_name=router.name,
                interface_name=ingress_port,
                frame=frame,
                summary=f"{router.name}: Ingress frame destination MAC {frame.dst_mac} does not match interface {ingress_port}",
                explanation=f"Router interface {ingress_port} has MAC {ingress_iface.mac_address}; rejected frame with dst_mac {frame.dst_mac}.",
                status="DROP"
            )

        if frame.ethertype == ETHERTYPE_ARP:
            return self._handle_router_arp(router, ingress_iface, frame)
        elif frame.ethertype == ETHERTYPE_IPV4:
            return self._handle_router_ipv4(router, ingress_iface, frame)

        return None

    def _handle_router_arp(self, router: Router, ingress_iface: Interface, frame: EthernetFrame) -> SimulationEvent:
        arp: ARPPacket = frame.payload if isinstance(frame.payload, ARPPacket) else ARPPacket.from_dict(frame.payload)
        router.update_arp_cache(arp.sender_ip, arp.sender_mac)

        if arp.operation == ARP_OP_REQUEST:
            if arp.target_ip == ingress_iface.ip_address:
                reply_arp = ARPPacket(
                    operation=ARP_OP_REPLY,
                    sender_mac=ingress_iface.mac_address,
                    sender_ip=ingress_iface.ip_address,
                    target_mac=arp.sender_mac,
                    target_ip=arp.sender_ip
                )
                reply_frame = EthernetFrame(
                    src_mac=ingress_iface.mac_address,
                    dst_mac=arp.sender_mac,
                    ethertype=ETHERTYPE_ARP,
                    payload=reply_arp
                )
                self.send_frame(router.id, ingress_iface.name, reply_frame)
                return self._record_event(
                    event_type="ARP_REPLY_SENT",
                    device_id=router.id,
                    device_name=router.name,
                    interface_name=ingress_iface.name,
                    frame=reply_frame,
                    summary=f"{router.name}: Responded to ARP Request for gateway IP {ingress_iface.ip_address}",
                    explanation=f"Router confirmed that target IP {arp.target_ip} matches interface {ingress_iface.name}. Responded with MAC {ingress_iface.mac_address}.",
                    status="SUCCESS"
                )
            else:
                return self._record_event(
                    event_type="ARP_IGNORED",
                    device_id=router.id,
                    device_name=router.name,
                    interface_name=ingress_iface.name,
                    frame=frame,
                    summary=f"{router.name}: Ignored ARP Request for {arp.target_ip} on interface {ingress_iface.name}",
                    explanation=f"Router cached sender {arp.sender_ip} -> {arp.sender_mac}, but ignored request because target IP {arp.target_ip} is not configured on interface {ingress_iface.name}.",
                    status="INFO"
                )
        elif arp.operation == ARP_OP_REPLY:
            # Drain any buffered packets waiting for this next-hop IP
            pending = self.pending_arp.pop((router.id, arp.sender_ip), [])
            for pending_iface, pending_pkt in pending:
                p_iface_obj = router.get_interface(pending_iface)
                if p_iface_obj:
                    fwd_frame = EthernetFrame(
                        src_mac=p_iface_obj.mac_address,
                        dst_mac=arp.sender_mac,
                        ethertype=ETHERTYPE_IPV4,
                        payload=pending_pkt
                    )
                    self.send_frame(router.id, pending_iface, fwd_frame)
                    self._record_event(
                        event_type="ROUTER_FORWARD",
                        device_id=router.id,
                        device_name=router.name,
                        interface_name=pending_iface,
                        frame=fwd_frame,
                        summary=f"{router.name}: Transmitting buffered packet to {pending_pkt.dst_ip} via {pending_iface} now that ARP resolved {arp.sender_ip}",
                        explanation=f"Router received ARP resolution for next-hop {arp.sender_ip} -> {arp.sender_mac} and released the buffered IPv4 packet.",
                        status="SUCCESS"
                    )

            return self._record_event(
                event_type="ARP_REPLY_RECEIVED",
                device_id=router.id,
                device_name=router.name,
                interface_name=ingress_iface.name,
                frame=frame,
                summary=f"{router.name}: Cached ARP resolution: {arp.sender_ip} is at {arp.sender_mac}",
                explanation=f"Router received unicast ARP reply from {arp.sender_ip} and recorded MAC {arp.sender_mac} into its ARP cache.",
                status="SUCCESS",
                metadata={"arp_cache": list(router.arp_cache.values())}
            )

        return None

    def _handle_router_ipv4(self, router: Router, ingress_iface: Interface, frame: EthernetFrame) -> SimulationEvent:
        ip_pkt: IPv4Packet = frame.payload if isinstance(frame.payload, IPv4Packet) else IPv4Packet.from_dict(frame.payload)

        # Check if destined for one of the router's own interfaces
        for iface in router.interfaces.values():
            if iface.admin_up and iface.ip_address == ip_pkt.dst_ip:
                # Destined for router itself!
                if ip_pkt.protocol == "ICMP":
                    icmp: ICMPPacket = ip_pkt.payload if isinstance(ip_pkt.payload, ICMPPacket) else ICMPPacket.from_dict(ip_pkt.payload)
                    if icmp.type == ICMP_ECHO_REQUEST:
                        reply_icmp = ICMPPacket(type=ICMP_ECHO_REPLY, sequence=icmp.sequence, identifier=icmp.identifier, payload=icmp.payload)
                        reply_ip = IPv4Packet(src_ip=iface.ip_address, dst_ip=ip_pkt.src_ip, ttl=64, protocol="ICMP", payload=reply_icmp)
                        self._forward_router_ip_packet(router, reply_ip)
                        return self._record_event(
                            event_type="ROUTER_LOCAL_ICMP_REPLY",
                            device_id=router.id,
                            device_name=router.name,
                            interface_name=iface.name,
                            summary=f"{router.name}: Received ping for router IP {iface.ip_address}; sending Echo Reply",
                            explanation=f"Packet destination matches router's own interface IP {iface.ip_address}. Router processes request locally and replies.",
                            status="SUCCESS"
                        )

        # Packet needs to be routed / forwarded!
        # Step 1: Decrement TTL
        ip_pkt.ttl -= 1
        if ip_pkt.ttl <= 0:
            # TTL Expired!
            time_exceeded_icmp = ICMPPacket(type=ICMP_TIME_EXCEEDED, code=ICMP_CODE_TTL_EXPIRED, payload="Time to live exceeded in transit")
            te_ip = IPv4Packet(src_ip=ingress_iface.ip_address, dst_ip=ip_pkt.src_ip, ttl=64, protocol="ICMP", payload=time_exceeded_icmp)
            self._forward_router_ip_packet(router, te_ip)
            return self._record_event(
                event_type="ROUTER_TTL_EXPIRED",
                device_id=router.id,
                device_name=router.name,
                interface_name=ingress_iface.name,
                frame=frame,
                summary=f"{router.name}: Dropped packet to {ip_pkt.dst_ip}; TTL decremented to 0",
                explanation="IPv4 Time-To-Live reached 0 during router forwarding. Packet dropped to prevent infinite routing loops; sent ICMP Time Exceeded to source.",
                status="DROP"
            )

        # Step 2: Longest-Prefix-Match Route Lookup
        route = router.find_best_route(ip_pkt.dst_ip)
        if not route:
            # No route to host
            unreach_icmp = ICMPPacket(type=ICMP_DEST_UNREACHABLE, code=ICMP_CODE_NET_UNREACHABLE, payload="Destination network unreachable")
            unreach_ip = IPv4Packet(src_ip=ingress_iface.ip_address, dst_ip=ip_pkt.src_ip, ttl=64, protocol="ICMP", payload=unreach_icmp)
            self._forward_router_ip_packet(router, unreach_ip)
            return self._record_event(
                event_type="ROUTER_NO_ROUTE",
                device_id=router.id,
                device_name=router.name,
                interface_name=ingress_iface.name,
                frame=frame,
                summary=f"{router.name}: No route to destination {ip_pkt.dst_ip}; dropped packet",
                explanation=f"Router routing table has no matching route (connected or static) for destination IP {ip_pkt.dst_ip}. Dropped packet and sent ICMP Network Unreachable.",
                status="DROP",
                metadata={"routing_table": [r.to_dict() for r in router.get_all_routes()]}
            )

        # Step 3: Forward packet out egress interface
        egress_iface = router.get_interface(route.interface_name)
        if not egress_iface or not egress_iface.is_operational:
            return self._record_event(
                event_type="ROUTER_EGRESS_DOWN",
                device_id=router.id,
                device_name=router.name,
                interface_name=route.interface_name,
                frame=frame,
                summary=f"{router.name}: Egress interface {route.interface_name} is down",
                explanation=f"Route matched interface {route.interface_name}, but that interface is down or disconnected.",
                status="DROP"
            )

        # Determine next-hop IP for Layer 2 resolution
        next_hop_ip = route.next_hop if route.next_hop else ip_pkt.dst_ip

        # Check router ARP cache for next hop
        cached_mac = router.get_arp_entry(next_hop_ip)
        if not cached_mac:
            # Buffer packet to transmit once ARP resolution completes
            self.pending_arp.setdefault((router.id, next_hop_ip), []).append((egress_iface.name, copy.deepcopy(ip_pkt)))
            # Need to ARP for next hop
            arp_req = ARPPacket(
                operation=ARP_OP_REQUEST,
                sender_mac=egress_iface.mac_address,
                sender_ip=egress_iface.ip_address,
                target_mac=ZERO_MAC,
                target_ip=next_hop_ip
            )
            arp_frame = EthernetFrame(
                src_mac=egress_iface.mac_address,
                dst_mac=BROADCAST_MAC,
                ethertype=ETHERTYPE_ARP,
                payload=arp_req
            )
            self.send_frame(router.id, egress_iface.name, arp_frame)
            return self._record_event(
                event_type="ROUTER_ARP_REQUEST",
                device_id=router.id,
                device_name=router.name,
                interface_name=egress_iface.name,
                frame=arp_frame,
                summary=f"{router.name}: Route matched {route.network}/{route.prefix}; ARP cache miss for next-hop {next_hop_ip}, broadcasting ARP Request",
                explanation=f"Router matched route {route.network}/{route.prefix} via {route.interface_name}. Because next-hop {next_hop_ip} is not in router's ARP table, router broadcasts an ARP Request.",
                status="INFO",
                metadata={"route": route.to_dict()}
            )
        else:
            # Encapsulate with next hop MAC
            fwd_frame = EthernetFrame(
                src_mac=egress_iface.mac_address,
                dst_mac=cached_mac,
                ethertype=ETHERTYPE_IPV4,
                payload=ip_pkt
            )
            self.send_frame(router.id, egress_iface.name, fwd_frame)
            return self._record_event(
                event_type="ROUTER_FORWARD",
                device_id=router.id,
                device_name=router.name,
                interface_name=ingress_iface.name,
                target_interface_name=egress_iface.name,
                frame=fwd_frame,
                summary=f"{router.name}: Forwarded IPv4 packet to {ip_pkt.dst_ip} via {egress_iface.name} (next-hop {next_hop_ip}, TTL={ip_pkt.ttl})",
                explanation=f"Router selected route {route.network}/{route.prefix} (type: {route.route_type}) using Longest-Prefix-Match. Decremented TTL to {ip_pkt.ttl} and encapsulated frame to next-hop MAC {cached_mac}.",
                status="SUCCESS",
                metadata={"route": route.to_dict(), "next_hop_ip": next_hop_ip, "next_hop_mac": cached_mac}
            )

    def _forward_router_ip_packet(self, router: Router, ip_pkt: IPv4Packet):
        route = router.find_best_route(ip_pkt.dst_ip)
        if not route:
            return
        egress_iface = router.get_interface(route.interface_name)
        if not egress_iface or not egress_iface.is_operational:
            return
        next_hop_ip = route.next_hop if route.next_hop else ip_pkt.dst_ip
        cached_mac = router.get_arp_entry(next_hop_ip)
        if not cached_mac:
            self.pending_arp.setdefault((router.id, next_hop_ip), []).append((egress_iface.name, copy.deepcopy(ip_pkt)))
            arp_req = ARPPacket(operation=ARP_OP_REQUEST, sender_mac=egress_iface.mac_address, sender_ip=egress_iface.ip_address, target_mac=ZERO_MAC, target_ip=next_hop_ip)
            arp_frame = EthernetFrame(src_mac=egress_iface.mac_address, dst_mac=BROADCAST_MAC, ethertype=ETHERTYPE_ARP, payload=arp_req)
            self.send_frame(router.id, egress_iface.name, arp_frame)
        else:
            frame = EthernetFrame(src_mac=egress_iface.mac_address, dst_mac=cached_mac, ethertype=ETHERTYPE_IPV4, payload=ip_pkt)
            self.send_frame(router.id, egress_iface.name, frame)

    def _send_ip_packet_from_host(self, host: Host, iface: Interface, ip_pkt: IPv4Packet):
        """Prepare and transmit an IPv4 packet from a host, performing subnet check and ARP resolution."""
        # Determine if destination is on the local subnet or remote
        if is_same_subnet(iface.ip_address, ip_pkt.dst_ip, iface.subnet_mask):
            next_hop_ip = ip_pkt.dst_ip
            is_local = True
        else:
            if not host.default_gateway:
                self._record_event(
                    event_type="DROP_NO_GATEWAY",
                    device_id=host.id,
                    device_name=host.name,
                    interface_name=iface.name,
                    summary=f"{host.name}: Cannot reach remote destination {ip_pkt.dst_ip}; no default gateway configured",
                    explanation=f"Destination {ip_pkt.dst_ip} is outside local subnet ({iface.ip_address}/{iface.subnet_mask}), and host {host.name} has no default gateway configured.",
                    status="ERROR"
                )
                return
            next_hop_ip = host.default_gateway
            is_local = False

        cached_mac = host.get_arp_entry(next_hop_ip)
        if not cached_mac:
            # Buffer packet to transmit once ARP resolution completes
            self.pending_arp.setdefault((host.id, next_hop_ip), []).append((iface.name, copy.deepcopy(ip_pkt)))
            # Send ARP Request
            arp_req = ARPPacket(
                operation=ARP_OP_REQUEST,
                sender_mac=iface.mac_address,
                sender_ip=iface.ip_address,
                target_mac=ZERO_MAC,
                target_ip=next_hop_ip
            )
            arp_frame = EthernetFrame(
                src_mac=iface.mac_address,
                dst_mac=BROADCAST_MAC,
                ethertype=ETHERTYPE_ARP,
                payload=arp_req
            )
            self.send_frame(host.id, iface.name, arp_frame)
            dest_desc = "destination" if is_local else f"default gateway {host.default_gateway}"
            self._record_event(
                event_type="ARP_REQUEST_INITIATED",
                device_id=host.id,
                device_name=host.name,
                interface_name=iface.name,
                frame=arp_frame,
                summary=f"{host.name}: ARP cache miss for {next_hop_ip}; broadcasting ARP Request out {iface.name}",
                explanation=(
                    f"To deliver packet to {ip_pkt.dst_ip}, host must know the Layer 2 MAC address of {dest_desc}. "
                    f"Because {next_hop_ip} is not in the ARP cache, {host.name} initiates Address Resolution Protocol."
                ),
                status="INFO"
            )
        else:
            # Directly transmit IPv4 packet encapsulated in Ethernet frame
            fwd_frame = EthernetFrame(
                src_mac=iface.mac_address,
                dst_mac=cached_mac,
                ethertype=ETHERTYPE_IPV4,
                payload=ip_pkt
            )
            self.send_frame(host.id, iface.name, fwd_frame)

    def ping(self, source_host_id: str, target_ip_str: str, count: int = 1) -> List[SimulationEvent]:
        """
        Initiate an interactive ping from source host to target IP.
        Executes ARP resolution and ICMP Echo transmission step-by-step.
        """
        host = self.topology.devices.get(source_host_id)
        if not host or not isinstance(host, Host):
            raise ValueError(f"Source device {source_host_id} is not an end host (PC/Laptop/Server)")

        iface = host.get_first_operational_interface()
        if not iface:
            self._record_event(
                event_type="DROP_NO_INTERFACE",
                device_id=host.id,
                device_name=host.name,
                summary=f"{host.name}: No operational network interface found",
                explanation=f"{host.name} has no connected and enabled interface with IP configuration.",
                status="DROP"
            )
            return self.events

        if not iface.ip_address or not iface.subnet_mask:
            self._record_event(
                event_type="DROP_NO_IP",
                device_id=host.id,
                device_name=host.name,
                interface_name=iface.name,
                summary=f"{host.name}: Interface {iface.name} has no IP address configured",
                explanation="Cannot originate ping because interface has no IPv4 configuration.",
                status="DROP"
            )
            return self.events

        for seq in range(1, count + 1):
            icmp = ICMPPacket(type=ICMP_ECHO_REQUEST, sequence=seq, payload="NetForge Ping 32 bytes")
            ip_pkt = IPv4Packet(src_ip=iface.ip_address, dst_ip=target_ip_str, ttl=64, protocol="ICMP", payload=icmp)
            self._send_ip_packet_from_host(host, iface, ip_pkt)
            self.run_all(max_steps=50)

        return self.events
