# NetForge CLI Reference Manual

NetForge provides an interactive, terminal-based CLI for all simulated network devices, matching common Cisco IOS syntax and command patterns.

---

## 1. Command Execution Modes

| Mode | Prompt Example | Accessible By | Purpose |
| :--- | :--- | :--- | :--- |
| **User EXEC** | `PC1>` or `Router>` | All devices | Basic inspection and connectivity testing |
| **Privileged EXEC** | `Switch#` or `Router#` | Switches, Routers | Full table inspection and diagnostic access |
| **Global Config** | `Router(config)#` | Routers, Switches | Changing hostnames, static routes, and system parameters |
| **Interface Config** | `Router(config-if)#` | Routers, Switches | Configuring interface IP addresses, masks, and administrative states |

---

## 2. Command Reference by Category

### General & Diagnostics
```bash
help                # Display contextual command help
?                   # Shorthand for help
clear               # Clear terminal screen buffer
exit                # Return to previous mode or close session
```

### Connectivity & Troubleshooting
```bash
ping <IPv4>
# Example: ping 192.168.1.20
# Sends 4 ICMP Echo Requests and reports round-trip time, sequence, and packet loss.

traceroute <IPv4>
# Shorthand: tracert <IPv4>
# Example: traceroute 192.168.20.20
# Probes hop-by-hop intermediate routers by incrementally increasing IPv4 TTL from 1.
```

### Inspection Commands
```bash
show ip
# Displays configured IP addresses, subnet masks, and default gateways.

show interfaces
# Displays detailed physical interface state, hardware MAC address, and MTU.

show ip int brief
# Summary table of all interfaces, assigned IPs, and operational line protocols.

show arp
# Displays the Address Resolution Protocol cache table (IP to MAC mappings).

show mac address-table
# Shorthand: show mac-address-table (Switches only)
# Displays learned Layer 2 MAC addresses, types, and corresponding ports.

show ip route
# (Routers only)
# Displays the IPv4 routing table, including connected ("C") and static ("S") routes.
```

### Table Management
```bash
clear arp
# Flush the device's dynamic ARP cache table.

clear mac address-table
# Flush the switch's learned MAC forwarding table.
```

### Configuration Commands
```bash
# Enter Global Configuration Mode (from Privileged EXEC):
configure terminal   # Shorthand: conf t

# Hostname configuration:
hostname <name>

# Select interface to configure:
interface <iface_name>   # Example: interface Gi0/0 or int Fa0/1

# Interface Configuration Mode:
ip address <ip> <subnet_mask>   # Example: ip address 192.168.10.1 255.255.255.0
shutdown                        # Administratively disable interface
no shutdown                     # Enable and bring interface UP
exit                            # Return to Global Config

# Static Routing (Routers only):
ip route <network> <subnet_mask> <next_hop_ip>
# Example: ip route 192.168.20.0 255.255.255.0 10.0.0.2

# Default Route (Candidate default):
ip route 0.0.0.0 0.0.0.0 <gateway_ip>

# Remove static route:
no ip route <network> <subnet_mask> [next_hop_ip]

# Host Default Gateway (PCs and Servers):
ip default-gateway <IPv4>       # Example: ip default-gateway 192.168.10.1
```
