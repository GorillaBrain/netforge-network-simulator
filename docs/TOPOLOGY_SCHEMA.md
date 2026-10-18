# NetForge Topology Schema & Import/Export Guide

NetForge supports importing and exporting network topologies using standard JSON files. This guide defines the schema, data types, and interface rules required to build custom network scenarios.

---

## 1. Top-Level Schema

```json
{
  "name": "Custom Topology Name",
  "description": "Optional scenario description",
  "devices": {
    "<device_id>": { /* Device Object */ }
  },
  "links": {
    "<link_id>": { /* Link Object */ }
  }
}
```

---

## 2. Device Object

| Property | Type | Description |
| :--- | :--- | :--- |
| `id` | `string` | Unique identifier matching the device map key (e.g., `"pc1"`, `"sw1"`, `"r1"`). |
| `name` | `string` | Human-readable hostname displayed on the canvas (e.g., `"AdminPC"`, `"CoreSwitch"`). |
| `device_type` | `string` | One of: `"pc"`, `"laptop"`, `"switch"`, `"router"`, `"server"`, `"hub"`, `"firewall"`, `"attacker"`. |
| `x` | `number` | Canvas X-coordinate in pixels (0–1200). |
| `y` | `number` | Canvas Y-coordinate in pixels (0–800). |
| `default_gateway` | `string \| null` | IPv4 address of next-hop gateway (for endpoints and servers). |
| `interfaces` | `object` | Map of interface names to Interface Objects. |
| `arp_cache` | `array` | Optional pre-populated ARP entries `[{ "ip": "...", "mac": "...", "type": "..." }]`. |
| `mac_table` | `array` | Switch forwarding table `[{ "mac": "...", "port": "..." }]` (switches only). |
| `static_routes` | `array` | Routing table entries `[{ "network": "...", "mask": "...", "next_hop": "..." }]` (routers/firewalls). |
| `security` | `object` | Cyber defense settings: `{ "acl": [], "rateLimit": boolean, "wafDpi": boolean, "daiGuard": boolean }`. |

---

## 3. Interface Object

```json
{
  "name": "eth0",
  "mac_address": "00:50:79:AA:01:10",
  "ip_address": "192.168.1.10",
  "subnet_mask": "255.255.255.0",
  "admin_up": true,
  "link_id": "l1"
}
```

- **`name`**: Port identifier (e.g. `eth0` for PCs, `Fa0/1` for FastEthernet switch ports, `Gi0/0` for Gigabit router interfaces).
- **`mac_address`**: Format `XX:XX:XX:XX:XX:XX`.
- **`ip_address`**: IPv4 address or `null` for unrouted Layer 2 switch ports.
- **`subnet_mask`**: Dotted-decimal subnet mask (e.g. `255.255.255.0`, `255.255.255.252`).
- **`admin_up`**: Administrative state (`true` = up, `false` = shutdown).
- **`link_id`**: Identifier of the connected link in the `links` table, or `null` if unpatched.

---

## 4. Link Object

```json
{
  "id": "l1",
  "device_a_id": "pc1",
  "interface_a_name": "eth0",
  "device_b_id": "sw1",
  "interface_b_name": "Fa0/1",
  "is_up": true
}
```

- **`is_up`**: Physical layer state (`true` = cable plugged in and functioning, `false` = severed/unplugged).

---

## 5. Pre-Built Topologies in `topologies/`

The repository includes ready-to-load topologies in the `topologies/` directory:

1. **[`enterprise-cyber-arena.json`](../topologies/enterprise-cyber-arena.json)**: DMZ, Core Switch, Edge Firewall, Web & Database Servers, Admin Workstation, and Kali Attacker.
2. **[`branch-office-wan.json`](../topologies/branch-office-wan.json)**: Headquarters & Remote Branch connected via edge routers with static routes.
3. **[`campus-three-tier.json`](../topologies/campus-three-tier.json)**: Hierarchical Cisco campus model (Core, Distribution, Access).

To load any topology into the live simulator, click **⬆ Import** in the top navigation bar and select the JSON file.
