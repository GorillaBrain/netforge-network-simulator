import pytest
from netforge.labs import (
    LAB_DEFINITIONS, evaluate_lab,
    build_lab_1_topology, build_lab_2_topology, build_lab_3_topology,
    build_lab_4_topology, build_lab_5_topology
)


def test_lab_1_workflow():
    topo = build_lab_1_topology()
    res = evaluate_lab("lab-1", topo)
    assert res["completed"] is False

    topo.devices["pc1"].get_interface("eth0").ip_address = "192.168.1.10"
    topo.devices["pc1"].get_interface("eth0").subnet_mask = "255.255.255.0"
    topo.devices["pc2"].get_interface("eth0").ip_address = "192.168.1.20"
    topo.devices["pc2"].get_interface("eth0").subnet_mask = "255.255.255.0"

    res = evaluate_lab("lab-1", topo)
    assert res["completed"] is True
    assert res["tasks"][0]["completed"] is True
    assert res["tasks"][1]["completed"] is True
    assert res["tasks"][2]["completed"] is True


def test_lab_2_workflow():
    topo = build_lab_2_topology()
    res = evaluate_lab("lab-2", topo)
    assert res["completed"] is False

    topo.devices["pc2"].get_interface("eth0").subnet_mask = "255.255.255.0"

    res = evaluate_lab("lab-2", topo)
    assert res["completed"] is True


def test_lab_3_workflow():
    topo = build_lab_3_topology()
    res = evaluate_lab("lab-3", topo)
    assert res["completed"] is False

    topo.devices["r1"].get_interface("Gi0/0").ip_address = "192.168.10.1"
    topo.devices["r1"].get_interface("Gi0/0").subnet_mask = "255.255.255.0"
    topo.devices["r1"].get_interface("Gi0/0").admin_up = True

    topo.devices["r1"].get_interface("Gi0/1").ip_address = "192.168.20.1"
    topo.devices["r1"].get_interface("Gi0/1").subnet_mask = "255.255.255.0"
    topo.devices["r1"].get_interface("Gi0/1").admin_up = True

    topo.devices["pc1"].default_gateway = "192.168.10.1"
    topo.devices["pc2"].default_gateway = "192.168.20.1"

    res = evaluate_lab("lab-3", topo)
    assert res["completed"] is True


def test_lab_4_troubleshoot_workflow():
    topo = build_lab_4_topology()
    res = evaluate_lab("lab-4", topo)
    assert res["completed"] is False

    topo.devices["r1"].get_interface("Gi0/0").admin_up = True
    topo.devices["pc2"].default_gateway = "10.0.2.1"
    topo.links["link4"].is_up = True

    res = evaluate_lab("lab-4", topo)
    assert res["completed"] is True


def test_lab_5_workflow():
    topo = build_lab_5_topology()
    res = evaluate_lab("lab-5", topo)
    assert res["completed"] is True  # Ready to run ping and verify ARP difference
