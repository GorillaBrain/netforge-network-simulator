# NetForge Cyber Defense Operations Manual (SOC & Blue Team Guide)

Welcome to the **NetForge: Cyber Defense Operations Manual**. This guide explains the underlying networking and cybersecurity mechanics, Red Team threat vectors, Blue Team security controls, and mission solutions in the simulator.

---

## 1. Blue Team Defensive Controls

NetForge integrates Cisco hardware configuration with real-time cybersecurity defense layers:

### A. Access Control Lists (Firewall ACLs)
- **Concept:** Standard and extended packet filtering rules applied to incoming/outgoing traffic at routers and firewalls.
- **Rule Syntax:** `[PERMIT / DENY] [Protocol: ANY/ICMP/TCP/UDP] [Source IP: ANY/CIDR] [Dst Port: ANY/Port]`
- **Evaluation Order:** Top-to-bottom first match.
- **Common Port Defenses:**
  - Port `22` (SSH): Block unauthorized brute-force attempts from external subnets (`DENY TCP ANY:22`).
  - Port `80` / `443` (HTTP/HTTPS): Permit legitimate web traffic while filtering unauthorized management interfaces.

### B. Dynamic ARP Inspection (DAI Guard)
- **Concept:** Layer 2 switch security feature that intercepts and validates ARP packets against the DHCP snooping binding database / IP-to-MAC mapping before forwarding.
- **Threat Mitigated:** Address Resolution Protocol (ARP) poisoning, Man-in-the-Middle (MITM) cache tampering, and Gratuitous ARP attacks.
- **Implementation in NetForge:** When enabled on a switch (`sw1.security.daiGuard = true`), any fraudulent Gratuitous ARP frame or spoofed IP mapping from an unauthorized host is blocked and logged to the SIEM as `[DAI ALERT: Dropped spoofed ARP]`.

### C. Web Application Firewall & Deep Packet Inspection (WAF / DPI)
- **Concept:** Layer 7 payload inspection looking for known exploit signatures (SQL injection, cross-site scripting, directory traversal).
- **Threat Mitigated:** SQL Injection (`' OR 1=1 --`), command injection payloads inside HTTP query parameters or POST bodies.
- **Implementation in NetForge:** Inspects packet payloads; when enabled on a firewall or server, any packet containing SQLi tokens is dropped with an `[HTTP 403 Forbidden - WAF SQLi Signature Blocked]` SIEM alert.

### D. Rate Limiting & SYN Flood Defense
- **Concept:** Traffic policing mechanism capping incoming TCP SYN packets per second from unverified sources.
- **Threat Mitigated:** Distributed Denial of Service (DDoS) and SYN Floods intended to exhaust connection queues and degrade SLA Uptime.
- **Implementation in NetForge:** Enforces a token bucket rate limiter. Excessive SYN packets exceeding the burst threshold are discarded, preserving core service availability.

---

## 2. Red Team Attack Vectors & Signatures

| Exploit Name | Protocol / Port | Signature / Behavior | Defensive Countermeasure |
| :--- | :--- | :--- | :--- |
| **Nmap Stealth SYN Scan** | TCP `80`, `443`, `22`, `3306` | Rapid probe packets with SYN flag set to identify listening ports | Rate Limiting + Strict Ingress ACLs |
| **SSH Hydra Brute Force** | TCP `22` | Dictionary-based credential stuffing attempts | ACL rule `DENY TCP ANY 22` or IP whitelist |
| **SQL Injection (SQLi)** | TCP `80` (HTTP) | Query injection payloads (`' OR 1=1 --`) targeting backend databases | Web Application Firewall (WAF / DPI) |
| **Botnet DDoS SYN Flood** | TCP `80` (HTTP) | High-volume spoofed SYN floods designed to crash SLA uptime | Rate Limiting + Edge Firewall Policing |
| **Gratuitous ARP MITM** | ARP (EtherType `0x0806`) | Fraudulent broadcast asserting attacker MAC for gateway IP | Dynamic ARP Inspection (DAI) + ARP cache purge (`clear arp`) |

---

## 3. Campaign Missions & Walkthroughs

### Mission 01: First LAN & ARP Discovery
- **Objective:** Configure PC2 IP (`192.168.1.20/24`) and ping PC1 (`192.168.1.10`).
- **Mechanics:** Observe first packet triggering broadcast ARP request (`Who has 192.168.1.20? Tell 192.168.1.10`), followed by unicast ARP reply and ICMP Echo exchange.

### Mission 02: Subnet Mask Forensics (/25 vs /24)
- **Objective:** Resolve communication failure between PC1 (`192.168.1.10/25`) and PC2 (`192.168.1.130/25`).
- **Root Cause:** A `/25` mask splits `192.168.1.0` into subnets `0-127` and `128-255`. Since hosts are on separate subnets without a router, same-subnet routing fails.
- **Fix:** Update both masks to `255.255.255.0` (`/24`).

### Mission 03: Cross-Subnet Router Gateway
- **Objective:** Connect two separate LANs (`192.168.10.0/24` and `192.168.20.0/24`) via Router1.
- **Fix:** Configure Router1 interfaces (`Gi0/0: 192.168.10.1`, `Gi0/1: 192.168.20.1`) and set respective default gateways on PC1 and PC2.

### Mission 04: Multi-Layer Outage Triage
- **Objective:** Diagnose simultaneous Layer 1 (unplugged cable), Layer 2 (shutdown interface), and Layer 3 (wrong gateway) faults.
- **Fix:** Bring `Gi0/0` up (`no shutdown`), correct PC2 gateway to `10.0.2.1`, and toggle cable `l4` to UP.

### Mission 05: L2/L3 MAC Re-Encapsulation Trace
- **Objective:** Trace MAC address rewrite as a packet traverses a routing hop.
- **Key Takeaway:** IP addresses remain constant end-to-end, while source/destination MAC addresses are stripped and rewritten at each Layer 3 boundary.

### Mission 06: Operation Iron Gate — Firewall ACL & SSH Defense
- **Objective:** Block KaliRedTeam brute-force SSH attacks while allowing legitimate AdminPC traffic.
- **Fix:** Add ACL rule on ASA-FW1: `DENY TCP ANY:22`, or enable WAF/DPI.

### Mission 07: Operation Poison Ivy — ARP Spoofing MITM
- **Objective:** Defeat ARP cache poisoning executed by RogueInsider.
- **Fix:** Enable Dynamic ARP Inspection (DAI) on Switch1, and clear the poisoned ARP cache on FinancePC (`clear arp`).

### Mission 08: Operation Blackout — Zero-Trust DDoS & WAF Boss
- **Objective:** Survive concurrent Botnet DDoS attack and SQL injection against CoreDBServer while maintaining 95%+ SLA Uptime.
- **Fix:** Enable Rate Limiting on ASA-CoreFW, toggle WAF/DPI on, and configure port ACLs.
