# NetForge Testing & Quality Assurance

NetForge incorporates automated testing for all networking algorithms, protocols, device state machines, and educational workflows.

---

## 1. Test Suite Structure

The test suite is organized under `tests/` and executed via `pytest`:

| Test Module | Coverage Scope | Test Count |
| :--- | :--- | :---: |
| `tests/test_addressing.py` | IPv4 conversion, mask validation, CIDR prefixes, /31 RFC 3021, /32 host routes, wildcard masks, and same-subnet checks. | 7 |
| `tests/test_protocols.py` | Data models and serialization for Ethernet frames, ARP packets, IPv4 headers, and ICMP messages. | 3 |
| `tests/test_switching.py` | Dynamic MAC address learning, unicast forwarding, broadcast flooding, unknown unicast flooding, and same-port filtering. | 4 |
| `tests/test_arp.py` | End-to-end ARP request broadcasting, target matching, unicast ARP reply, cache learning, and cache hits. | 1 |
| `tests/test_routing.py` | Routing tables, connected ("C") routes, static ("S") routes, candidate default ("S*"), and Longest Prefix Match (LPM). | 1 |
| `tests/test_icmp_simulation.py` | Cross-subnet multi-hop routed pings, TTL decrements, missing default gateways, and administrative interface shutdown drops. | 3 |
| `tests/test_cli.py` | Cisco-style terminal commands (`show ip`, `show interfaces`, `show arp`, `conf t`, `ip address`, `shutdown`, `ip route`). | 2 |
| `tests/test_topology.py` | JSON schema import/export, duplicate IP address collision detection, and dangling link reference validation. | 2 |
| `tests/test_labs.py` | Complete workflows and automated state evaluation for all 5 guided networking labs. | 5 |
| **Total Test Suite** | **Comprehensive Full-Engine Verification** | **28** |

---

## 2. Executing Automated Tests

Run the test suite from the project root:

```bash
# Run all tests with verbose output
python -m pytest -v

# Run specific test module
python -m pytest tests/test_routing.py -v

# Run with test failure details
python -m pytest -ra
```

All 28 tests execute in under 0.2 seconds with 100% pass rates.
