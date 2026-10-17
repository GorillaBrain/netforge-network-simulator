# NetForge Networking Model

NetForge implements a rigorous networking model based on IEEE 802.3 Ethernet, IETF RFC standards, and Cisco IOS switching/routing semantics.

---

## 1. Device Architecture

### End Devices (PC, Laptop, Server)
- **Primary Role:** Originates and sinks network traffic.
- **Components:**
  - Network Interface Card (NIC) with hardware MAC address.
  - Configurable IPv4 address and subnet mask.
  - Configurable Default Gateway.
  - Dynamic Address Resolution Protocol (ARP) cache with automatic entry aging and learning.
  - ARP Wait Buffer: Holds pending IPv4 packets while awaiting resolution of the target hardware MAC.
- **Server Extensions:**
  - Responds to simulated HTTP GET requests on TCP port 80.
  - Provides diagnostic ICMP echo listener.

### Layer 2 Ethernet Switch
- **Primary Role:** Multi-port hardware bridging and frame switching.
- **Components:**
  - 8 FastEthernet ports (`Fa0/1` through `Fa0/8`).
  - Dynamic MAC Address Table mapping 48-bit MAC addresses to physical ingress ports.
  - Port Administrative State (`admin_up: true/false`).
- **Forwarding Rules:**
  1. **Source Learning:** Records `(source_mac, ingress_port)` into the MAC table on every frame arrival.
  2. **Broadcast Forwarding:** Frames destined for `FF:FF:FF:FF:FF:FF` are flooded out all active operational ports *except* the ingress port.
  3. **Known Unicast:** If the destination MAC is present in the MAC table:
     - If `learned_port == ingress_port`: Filter (drop) frame to avoid sending traffic back onto the same physical collision domain.
     - If `learned_port != ingress_port`: Unicast forward out `learned_port`.
  4. **Unknown Unicast Flooding:** If the destination unicast MAC is absent from the MAC table, flood out all active ports except the ingress port.

### Layer 3 IPv4 Router
- **Primary Role:** Interconnecting disparate broadcast domains and IP subnets.
- **Components:**
  - Multiple GigabitEthernet routed interfaces (`Gi0/0`, `Gi0/1`, `Gi0/2`).
  - Dual IP/MAC address bindings per interface.
  - Forwarding Information Base (FIB) / Routing Table.
- **Routing Engine:**
  - **Connected Routes ("C"):** Automatically injected whenever an interface is administratively UP and assigned an IPv4 address and subnet mask.
  - **Static Routes ("S"):** Manually configured via `ip route <network> <mask/prefix> <next_hop>`.
  - **Default Route ("S*"):** Candidate default route (`0.0.0.0/0`).
  - **Longest Prefix Match (LPM):** Matches destination IPv4 against all route entries using bitwise AND (`dest_ip & route.mask == route.network`). Sorts descending by prefix length (most specific / longest match), then ascending by administrative metric.
  - **TTL Decrement:** Decrements IPv4 TTL field by 1 during transit. If TTL reaches 0, drops packet and generates an ICMP Time Exceeded (Type 11, Code 0) notification back to source.
  - **No Route Handling:** If no route matches the destination, drops packet and generates ICMP Destination Network Unreachable (Type 3, Code 0).

### Layer 1 Hub
- **Primary Role:** Physical multi-port repeater.
- **Behavior:** Repeats incoming electrical/optical signals to all other connected ports without inspecting MAC headers or storing a forwarding table.

---

## 2. Virtual Link & Interface Semantics

Links connect two distinct device interface endpoints:
- **Administrative State:** Both the link itself and the attached interfaces must be UP for traffic to traverse.
- **Disconnection:** Packets attempting to traverse a severed cable or disabled interface are immediately dropped with observable diagnostic error events (`DROP_LINK_DOWN`, `DROP_INTERFACE_DOWN`).
- **Metrics:** Modeled with 1 Gbps bandwidth and 1.0 ms nominal propagation delay.

---

## 3. Subnetting & Addressing Mathematics

All calculations use strict bitwise arithmetic on 32-bit unsigned integers:

$$\text{Network Address} = \text{IP} \;\&\; \text{Mask}$$

$$\text{Wildcard Mask} = \sim\text{Mask} \;\&\; \text{0xFFFFFFFF}$$

$$\text{Broadcast Address} = \text{Network Address} \;|\; \text{Wildcard Mask}$$

### Usable Host Address Rules:
- **Standard Subnets (/0 to /30):**
  - First Usable: $\text{Network} + 1$
  - Last Usable: $\text{Broadcast} - 1$
  - Usable Count: $2^{(32 - \text{prefix})} - 2$
- **RFC 3021 Point-to-Point Links (/31):**
  - Designed for router-to-router point-to-point links.
  - Both addresses ($\text{Network}$ and $\text{Broadcast}$) are designated as usable host interfaces.
  - Usable Count: 2.
- **Single Host Routes (/32):**
  - Single host address (e.g. loopbacks, point-to-point tunnel endpoints).
  - Usable Count: 1.
