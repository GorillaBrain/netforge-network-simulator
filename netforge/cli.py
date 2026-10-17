"""
Simulated Command-Line Interface (CLI) Parser for NetForge.

Provides a Cisco-like terminal environment with EXEC and configuration modes,
inspecting and modifying live device state, ARP caches, routing tables, and interfaces.
"""

from typing import Dict, Any, List, Optional, Tuple
from netforge.addressing import (
    is_valid_ipv4, is_valid_subnet_mask, mask_str_to_prefix, prefix_to_mask_str,
    calculate_subnet_info
)
from netforge.devices import Device, Host, Switch, Router, Hub, Interface
from netforge.topology import Topology
from netforge.engine import SimulationEngine


class DeviceCLI:
    def __init__(self, topology: Topology, device_id: str):
        self.topology = topology
        self.device_id = device_id
        self.mode = "PRIV_EXEC"  # "USER_EXEC", "PRIV_EXEC", "CONFIG", "CONFIG_IF"
        self.current_interface: Optional[str] = None

    @property
    def device(self) -> Optional[Device]:
        return self.topology.devices.get(self.device_id)

    def get_prompt(self) -> str:
        dev = self.device
        if not dev:
            return "NetForge> "
        name = dev.name
        if isinstance(dev, Host):
            return f"{name}> "
        # Switch / Router Cisco-style prompts
        if self.mode == "CONFIG":
            return f"{name}(config)# "
        elif self.mode == "CONFIG_IF":
            return f"{name}(config-if)# "
        elif self.mode == "PRIV_EXEC":
            return f"{name}# "
        return f"{name}> "

    def execute(self, command_line: str, engine: Optional[SimulationEngine] = None) -> Dict[str, Any]:
        """
        Execute a CLI command string.
        Returns a dictionary with output, prompt, mode, and any triggered simulation events.
        """
        raw = command_line.strip()
        if not raw:
            return {
                "output": "",
                "prompt": self.get_prompt(),
                "mode": self.mode,
                "events": []
            }

        dev = self.device
        if not dev:
            return {"output": "Error: Device not found.", "prompt": "NetForge> ", "mode": self.mode, "events": []}

        tokens = raw.split()
        cmd = tokens[0].lower()
        args = tokens[1:]

        output = ""
        events = []

        if cmd in ("help", "?"):
            output = self._cmd_help()

        elif cmd == "clear":
            output = "__CLEAR__"

        elif cmd in ("exit", "quit"):
            output = self._cmd_exit()

        elif cmd in ("ping",):
            output, events = self._cmd_ping(args, engine)

        elif cmd in ("traceroute", "tracert"):
            output, events = self._cmd_traceroute(args, engine)

        elif cmd == "show":
            output = self._cmd_show(args)

        elif cmd in ("ipconfig", "ifconfig"):
            output = self._cmd_ipconfig()

        elif cmd in ("arp",):
            output = self._cmd_arp(args)

        # Cisco Mode Navigation
        elif cmd in ("enable", "en"):
            self.mode = "PRIV_EXEC"
            output = ""

        elif cmd in ("disable",):
            self.mode = "USER_EXEC"
            output = ""

        elif cmd in ("configure", "conf"):
            if len(args) > 0 and args[0].lower() in ("terminal", "t"):
                if isinstance(dev, Host):
                    output = "% Configuration mode not required for PC/Host. You can use 'ip address' or 'ip default-gateway' directly."
                else:
                    self.mode = "CONFIG"
                    output = "Enter configuration commands, one per line. End with CNTL/Z or 'exit'."
            else:
                output = "% Incomplete command. Syntax: configure terminal"

        elif cmd in ("hostname", "host"):
            output = self._cmd_hostname(args)

        elif cmd in ("interface", "int"):
            output = self._cmd_interface(args)

        elif cmd == "ip":
            output = self._cmd_ip(args)

        elif cmd == "no":
            output = self._cmd_no(args)

        elif cmd == "shutdown":
            output = self._cmd_shutdown(True)

        elif cmd in ("clear-arp", "clear-mac"):
            output = self._cmd_clear_tables(cmd)

        else:
            output = f"% Unknown command or invalid syntax: '{raw}'. Type 'help' or '?' for available commands."

        return {
            "output": output,
            "prompt": self.get_prompt(),
            "mode": self.mode,
            "events": [e.to_dict() for e in events]
        }

    def _cmd_help(self) -> str:
        dev = self.device
        lines = [
            "NetForge Interactive CLI Help",
            "-----------------------------",
            "General Commands:",
            "  help / ?                     Show this help message",
            "  clear                        Clear terminal screen",
            "  ping <ip>                    Send ICMP Echo Requests to target IPv4",
            "  traceroute <ip>              Trace route hops to destination",
            "  exit                         Exit current configuration mode",
            "",
            "Inspection Commands:",
            "  show ip                      Display IP configuration and default gateway",
            "  show interfaces              Display interface status, MAC, and IP configuration",
            "  show ip int brief            Summary of interface states and IPs",
            "  show arp                     Display ARP resolution cache table",
        ]

        if isinstance(dev, Switch):
            lines.extend([
                "  show mac address-table       Display learned Layer 2 MAC forwarding table",
                "  clear mac address-table      Flush MAC address table",
            ])

        if isinstance(dev, Router):
            lines.extend([
                "  show ip route                Display IPv4 routing table",
                "",
                "Router Configuration Commands (in config mode):",
                "  configure terminal           Enter global configuration mode",
                "  hostname <name>              Set router hostname",
                "  interface <name>             Select interface to configure",
                "  ip address <ip> <mask>       Assign IPv4 address and subnet mask to interface",
                "  shutdown / no shutdown       Disable or enable the selected interface",
                "  ip route <net> <mask> <gw>   Add static IPv4 route",
                "  no ip route <net> <mask>     Remove static IPv4 route",
            ])

        if isinstance(dev, Host):
            lines.extend([
                "",
                "Host Configuration Commands:",
                "  ip address <ip> <mask>       Assign IPv4 address and mask to primary interface",
                "  ip default-gateway <ip>      Configure default gateway IPv4 address",
                "  clear arp                    Flush ARP cache table",
            ])

        return "\n".join(lines)

    def _cmd_exit(self) -> str:
        if self.mode == "CONFIG_IF":
            self.mode = "CONFIG"
            self.current_interface = None
            return ""
        elif self.mode == "CONFIG":
            self.mode = "PRIV_EXEC"
            return ""
        elif self.mode == "PRIV_EXEC":
            self.mode = "USER_EXEC"
            return ""
        return "Connection closed."

    def _cmd_ping(self, args: List[str], engine: Optional[SimulationEngine]) -> Tuple[str, List[Any]]:
        if not args:
            return "% Incomplete command. Syntax: ping <IPv4 address>", []
        target_ip = args[0]
        if not is_valid_ipv4(target_ip):
            return f"% Invalid IPv4 address: {target_ip}", []

        dev = self.device
        if not isinstance(dev, Host) and not isinstance(dev, Router):
            return "% Ping can only be originated from Hosts (PCs, Servers) or Routers.", []

        if not engine:
            engine = SimulationEngine(self.topology)

        # Run ping simulation (4 probes)
        events = []
        host_id = dev.id
        try:
            if isinstance(dev, Host):
                events = engine.ping(host_id, target_ip, count=4)
            else:
                # Ping from router interface
                op_iface = dev.get_first_operational_interface()
                if not op_iface or not op_iface.ip_address:
                    return "% No operational interface with IP configured on this router to originate ping.", []
                # Router pinging
                for seq in range(1, 5):
                    icmp = ICMPPacket(type=ICMP_ECHO_REQUEST, sequence=seq)
                    ip_pkt = IPv4Packet(src_ip=op_iface.ip_address, dst_ip=target_ip, ttl=64, protocol="ICMP", payload=icmp)
                    engine._forward_router_ip_packet(dev, ip_pkt)
                    engine.run_all(50)
                events = engine.events
        except Exception as e:
            return f"% Ping simulation error: {str(e)}", []

        # Count successful echo replies
        success_events = [e for e in events if e.event_type == "PING_SUCCESS" or (e.event_type == "ROUTER_LOCAL_ICMP_REPLY" and e.device_id != dev.id)]
        drop_events = [e for e in events if "DROP" in e.event_type or "NO_ROUTE" in e.event_type or "UNREACHABLE" in e.event_type]

        success_count = min(4, len(success_events))
        loss_pct = int(((4 - success_count) / 4) * 100)

        lines = [
            f"Pinging {target_ip} with 32 bytes of data:",
        ]
        if success_count > 0:
            for i in range(success_count):
                lines.append(f"Reply from {target_ip}: bytes=32 time=1ms TTL=64")
        if success_count < 4:
            for _ in range(4 - success_count):
                if drop_events:
                    lines.append(f"Request timed out. ({drop_events[-1].summary})")
                else:
                    lines.append("Request timed out.")

        lines.extend([
            f"\nPing statistics for {target_ip}:",
            f"    Packets: Sent = 4, Received = {success_count}, Lost = {4 - success_count} ({loss_pct}% loss)"
        ])
        return "\n".join(lines), events

    def _cmd_traceroute(self, args: List[str], engine: Optional[SimulationEngine]) -> Tuple[str, List[Any]]:
        if not args:
            return "% Incomplete command. Syntax: traceroute <IPv4 address>", []
        target_ip = args[0]
        if not is_valid_ipv4(target_ip):
            return f"% Invalid IPv4 address: {target_ip}", []

        dev = self.device
        if not isinstance(dev, Host):
            return "% Traceroute currently supported from end hosts.", []

        if not engine:
            engine = SimulationEngine(self.topology)

        iface = dev.get_first_operational_interface()
        if not iface or not iface.ip_address:
            return "% Host has no operational interface with configured IP.", []

        lines = [
            f"Tracing route to {target_ip} over a maximum of 30 hops:",
            ""
        ]
        all_events = []
        hop = 1
        reached = False

        while hop <= 15 and not reached:
            icmp = ICMPPacket(type=ICMP_ECHO_REQUEST, sequence=hop)
            ip_pkt = IPv4Packet(src_ip=iface.ip_address, dst_ip=target_ip, ttl=hop, protocol="ICMP", payload=icmp)
            engine._send_ip_packet_from_host(dev, iface, ip_pkt)
            engine.run_all(40)
            all_events.extend(engine.events)

            # Check what responded
            te_events = [e for e in engine.events if e.event_type == "ROUTER_TTL_EXPIRED" and e.step >= hop]
            succ_events = [e for e in engine.events if e.event_type == "PING_SUCCESS"]

            if succ_events:
                lines.append(f"  {hop}    1 ms    1 ms    1 ms  {target_ip}")
                reached = True
            elif te_events:
                r_dev = self.topology.devices.get(te_events[-1].device_id)
                r_ip = r_dev.get_first_operational_interface().ip_address if r_dev else "Router"
                lines.append(f"  {hop}    1 ms    1 ms    1 ms  {r_ip} [{r_dev.name if r_dev else ''}]")
            else:
                lines.append(f"  {hop}     *       *       *     Request timed out.")
                # If no response on early hop, break after 3 misses
                if hop > 3 and all("*" in l for l in lines[-3:]):
                    break

            hop += 1

        lines.append("\nTrace complete.")
        return "\n".join(lines), all_events

    def _cmd_show(self, args: List[str]) -> str:
        if not args:
            return "% Incomplete command. Syntax: show ip | interfaces | arp | mac address-table | ip route"
        sub = args[0].lower()

        if sub == "ip":
            if len(args) > 1 and args[1].lower() == "route":
                return self._show_ip_route()
            if len(args) > 2 and args[1].lower() == "int" and args[2].lower() == "brief":
                return self._show_interfaces_brief()
            return self._show_ip()

        elif sub in ("interfaces", "interface", "int"):
            return self._show_interfaces()

        elif sub == "arp":
            return self._show_arp()

        elif sub in ("mac", "mac-address-table"):
            return self._show_mac_table()

        return f"% Invalid show command: 'show {' '.join(args)}'"

    def _show_ip(self) -> str:
        dev = self.device
        lines = [f"IPv4 Configuration for {dev.name} ({dev.device_type.upper()}):", ""]
        if isinstance(dev, Host):
            lines.append(f"Default Gateway: {dev.default_gateway or 'None (Not configured)'}")
        for if_name, iface in dev.interfaces.items():
            status = "UP" if iface.admin_up else "ADMIN_DOWN"
            link_stat = "CONNECTED" if iface.is_connected else "DISCONNECTED"
            lines.append(f"Interface {if_name} ({status}, {link_stat}):")
            lines.append(f"  MAC Address : {iface.mac_address}")
            lines.append(f"  IPv4 Address: {iface.ip_address or 'Unassigned'}")
            lines.append(f"  Subnet Mask : {iface.subnet_mask or 'Unassigned'} (/{iface.get_prefix() or 'N/A'})")
            lines.append(f"  Network     : {iface.get_network_address() or 'N/A'}")
            lines.append("")
        return "\n".join(lines)

    def _show_interfaces(self) -> str:
        dev = self.device
        lines = []
        for if_name, iface in dev.interfaces.items():
            admin = "up" if iface.admin_up else "administratively down"
            proto = "up" if iface.is_operational else "down"
            lines.append(f"{if_name} is {admin}, line protocol is {proto}")
            lines.append(f"  Hardware is Ethernet, address is {iface.mac_address}")
            if iface.ip_address and iface.subnet_mask:
                lines.append(f"  Internet address is {iface.ip_address}/{iface.get_prefix()}")
            else:
                lines.append("  Internet address is not set")
            lines.append(f"  MTU {iface.mtu} bytes, BW {iface.speed_mbps}000 Kbit/sec")
            lines.append("")
        return "\n".join(lines)

    def _show_interfaces_brief(self) -> str:
        dev = self.device
        header = f"{'Interface':<18} {'IP-Address':<16} {'OK?':<5} {'Method':<8} {'Status':<22} {'Protocol'}"
        lines = [header, "-" * 75]
        for if_name, iface in dev.interfaces.items():
            status = "up" if iface.admin_up else "administratively down"
            proto = "up" if iface.is_operational else "down"
            ip = iface.ip_address or "unassigned"
            lines.append(f"{if_name:<18} {ip:<16} {'YES':<5} {'manual':<8} {status:<22} {proto}")
        return "\n".join(lines)

    def _show_arp(self) -> str:
        dev = self.device
        lines = [
            f"Protocol  Address          Age (min)  Hardware Addr   Type   Interface",
            "-" * 65
        ]
        if not dev.arp_cache:
            lines.append("ARP table is empty.")
            return "\n".join(lines)

        for ip, entry in dev.arp_cache.items():
            lines.append(f"Internet  {ip:<16} {'-':<10} {entry['mac']:<15} {entry.get('type', 'DYNAMIC'):<6} ARPA")
        return "\n".join(lines)

    def _show_mac_table(self) -> str:
        dev = self.device
        if not isinstance(dev, Switch):
            return "% MAC address table is only maintained by Layer 2 Ethernet switches."
        lines = [
            f"          Mac Address Table",
            f"-------------------------------------------",
            f"Vlan    Mac Address       Type        Ports",
            f"----    -----------       --------    -----",
        ]
        if not dev.mac_table:
            lines.append("Table is empty (no MAC addresses learned yet).")
            return "\n".join(lines)

        for mac, entry in dev.mac_table.items():
            lines.append(f"1       {mac:<17} {entry.get('type', 'DYNAMIC'):<11} {entry['port']}")
        return "\n".join(lines)

    def _show_ip_route(self) -> str:
        dev = self.device
        if not isinstance(dev, Router):
            return "% Routing table is only maintained by Layer 3 Routers."
        lines = [
            "Codes: C - connected, S - static, * - candidate default",
            "",
            "Gateway of last resort is not set",
            ""
        ]
        routes = dev.get_all_routes()
        if not routes:
            lines.append("Routing table is empty.")
            return "\n".join(lines)

        for r in routes:
            code = "C" if r.route_type == "C" else ("S*" if r.is_default_route() else "S")
            if r.route_type == "C":
                lines.append(f"{code:<3} {r.network}/{r.prefix} is directly connected, {r.interface_name}")
            else:
                via = f"via {r.next_hop}" if r.next_hop else f"is directly connected, {r.interface_name}"
                lines.append(f"{code:<3} {r.network}/{r.prefix} [{r.metric}/0] {via}")
        return "\n".join(lines)

    def _cmd_ipconfig(self) -> str:
        return self._show_ip()

    def _cmd_arp(self, args: List[str]) -> str:
        if args and args[0] in ("-a", "-g"):
            return self._show_arp()
        elif args and args[0] == "-d":
            self.device.clear_arp_cache()
            return "ARP cache successfully cleared."
        return self._show_arp()

    def _cmd_hostname(self, args: List[str]) -> str:
        if not args:
            return "% Incomplete command. Syntax: hostname <name>"
        self.device.name = args[0]
        return ""

    def _cmd_interface(self, args: List[str]) -> str:
        if not args:
            return "% Incomplete command. Syntax: interface <interface_name>"
        iface_name = args[0]
        # Match case-insensitively
        target = None
        for k in self.device.interfaces.keys():
            if k.lower() == iface_name.lower():
                target = k
                break
        if not target:
            return f"% Interface {iface_name} does not exist on this device."
        self.current_interface = target
        self.mode = "CONFIG_IF"
        return ""

    def _cmd_ip(self, args: List[str]) -> str:
        if not args:
            return "% Incomplete command."
        sub = args[0].lower()

        if sub == "address":
            # ip address <ip> <subnet_mask>
            if len(args) < 3:
                return "% Incomplete command. Syntax: ip address <IPv4> <SubnetMask>"
            ip = args[1]
            mask = args[2]
            if not is_valid_ipv4(ip):
                return f"% Invalid IPv4 address: {ip}"
            if not is_valid_subnet_mask(mask):
                return f"% Invalid subnet mask: {mask}"

            # If inside interface mode:
            if self.mode == "CONFIG_IF" and self.current_interface:
                iface = self.device.get_interface(self.current_interface)
                iface.ip_address = ip
                iface.subnet_mask = prefix_to_mask_str(mask_str_to_prefix(mask))
                return f"Interface {self.current_interface} configured with IP {ip} {iface.subnet_mask}"

            # If host:
            if isinstance(self.device, Host):
                op_iface = self.device.get_first_operational_interface() or next(iter(self.device.interfaces.values()), None)
                if op_iface:
                    op_iface.ip_address = ip
                    op_iface.subnet_mask = prefix_to_mask_str(mask_str_to_prefix(mask))
                    return f"Host {self.device.name} interface {op_iface.name} configured with IP {ip} {op_iface.subnet_mask}"
            return "% Select an interface first using 'interface <name>'"

        elif sub == "default-gateway":
            if len(args) < 2:
                return "% Incomplete command. Syntax: ip default-gateway <IPv4>"
            gw = args[1]
            if not is_valid_ipv4(gw):
                return f"% Invalid gateway IPv4: {gw}"
            if isinstance(self.device, Host):
                self.device.default_gateway = gw
                return f"Default gateway configured to {gw}"
            return "% 'ip default-gateway' is used for Host devices. For routers, use 'ip route 0.0.0.0 0.0.0.0 <next-hop>'."

        elif sub == "route":
            # ip route <network> <mask> <next_hop>
            if not isinstance(self.device, Router):
                return "% Static routes can only be configured on Routers."
            if len(args) < 4:
                return "% Incomplete command. Syntax: ip route <network> <subnet_mask> <next_hop_ip>"
            net = args[1]
            mask = args[2]
            next_hop = args[3]
            if not is_valid_ipv4(net):
                return f"% Invalid network IP: {net}"
            if not is_valid_subnet_mask(mask):
                return f"% Invalid subnet mask: {mask}"
            if not is_valid_ipv4(next_hop):
                return f"% Invalid next-hop IP: {next_hop}"

            mask_str = prefix_to_mask_str(mask_str_to_prefix(mask))
            self.device.add_static_route(net, mask_str, next_hop=next_hop)
            return f"Static route to {net}/{mask_str} via {next_hop} added."

        return f"% Unknown ip command: 'ip {' '.join(args)}'"

    def _cmd_no(self, args: List[str]) -> str:
        if not args:
            return "% Incomplete command."
        sub = args[0].lower()

        if sub == "shutdown":
            return self._cmd_shutdown(False)

        elif sub == "ip" and len(args) > 1 and args[1].lower() == "route":
            # no ip route <network> <mask>
            if len(args) < 4:
                return "% Incomplete command. Syntax: no ip route <network> <mask_or_prefix>"
            net = args[2]
            mask = args[3]
            mask_str = prefix_to_mask_str(mask_str_to_prefix(mask))
            if isinstance(self.device, Router):
                self.device.remove_static_route(net, mask_str)
                return f"Static route to {net} {mask_str} removed."
            return "% Device is not a router."

        return f"% Command not recognized: 'no {' '.join(args)}'"

    def _cmd_shutdown(self, shutdown: bool) -> str:
        if self.mode != "CONFIG_IF" or not self.current_interface:
            return "% Enter interface configuration mode first ('interface <name>')."
        iface = self.device.get_interface(self.current_interface)
        if not iface:
            return "% Interface not found."
        iface.admin_up = not shutdown
        state_str = "administratively down" if shutdown else "up"
        return f"Interface {iface.name} changed state to {state_str}"

    def _cmd_clear_tables(self, cmd: str) -> str:
        if "arp" in cmd:
            self.device.clear_arp_cache()
            return "ARP cache cleared."
        elif "mac" in cmd and isinstance(self.device, Switch):
            self.device.clear_mac_table()
            return "MAC address table cleared."
        return ""
