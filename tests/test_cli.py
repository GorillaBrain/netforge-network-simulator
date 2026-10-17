import pytest
from netforge.topology import Topology
from netforge.devices import Host, Switch, Router, Interface
from netforge.cli import DeviceCLI
from netforge.engine import SimulationEngine
from netforge.labs import build_lab_1_topology


def test_cli_show_and_config():
    topo = build_lab_1_topology()
    pc1_cli = DeviceCLI(topo, "pc1")

    # Help
    res = pc1_cli.execute("help")
    assert "NetForge Interactive CLI Help" in res["output"]

    # IP config command
    res = pc1_cli.execute("ip address 192.168.1.100 255.255.255.0")
    assert "192.168.1.100" in res["output"]
    assert topo.devices["pc1"].get_interface("eth0").ip_address == "192.168.1.100"

    # Show ip
    res = pc1_cli.execute("show ip")
    assert "192.168.1.100" in res["output"]

    # Default gateway
    res = pc1_cli.execute("ip default-gateway 192.168.1.1")
    assert topo.devices["pc1"].default_gateway == "192.168.1.1"


def test_router_cisco_mode_cli():
    topo = Topology(name="Router CLI Test")
    r1 = Router("r1", "Router1")
    r1.add_interface(Interface("Gi0/0", "00:AA:00:11:22:33"))
    topo.add_device(r1)

    r_cli = DeviceCLI(topo, "r1")
    assert r_cli.get_prompt() == "Router1# "

    # Enter config mode
    res = r_cli.execute("configure terminal")
    assert r_cli.mode == "CONFIG"
    assert r_cli.get_prompt() == "Router1(config)# "

    # Change hostname
    r_cli.execute("hostname CoreRouter")
    assert r_cli.get_prompt() == "CoreRouter(config)# "

    # Enter interface mode
    res = r_cli.execute("interface Gi0/0")
    assert r_cli.mode == "CONFIG_IF"
    assert r_cli.get_prompt() == "CoreRouter(config-if)# "

    # Configure IP
    res = r_cli.execute("ip address 10.0.0.1 255.255.255.0")
    assert r1.get_interface("Gi0/0").ip_address == "10.0.0.1"

    # Shutdown and no shutdown
    r_cli.execute("shutdown")
    assert r1.get_interface("Gi0/0").admin_up is False
    r_cli.execute("no shutdown")
    assert r1.get_interface("Gi0/0").admin_up is True

    # Exit back to config
    r_cli.execute("exit")
    assert r_cli.mode == "CONFIG"

    # Add static route
    res = r_cli.execute("ip route 172.16.0.0 255.255.0.0 10.0.0.254")
    assert len(r1.static_routes) == 1
    assert r1.static_routes[0].network == "172.16.0.0"

    # Show ip route
    res = r_cli.execute("show ip route")
    assert "172.16.0.0/16" in res["output"]
