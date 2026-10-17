import pytest
import json
from netforge.topology import Topology
from netforge.devices import Host, Switch, Interface
from netforge.links import Link
from netforge.labs import build_lab_1_topology


def test_topology_serialization_and_validation():
    topo = build_lab_1_topology()
    val = topo.validate()
    assert val["valid"] is True
    assert val["device_count"] == 3
    assert val["link_count"] == 2

    # Serialize to dict and JSON
    d = topo.to_dict()
    json_str = json.dumps(d)
    assert "schema_version" in json_str

    # Deserialize from dict
    restored = Topology.from_dict(json.loads(json_str))
    assert len(restored.devices) == 3
    assert len(restored.links) == 2


def test_duplicate_ip_detection():
    topo = build_lab_1_topology()
    topo.devices["pc1"].get_interface("eth0").ip_address = "192.168.1.10"
    topo.devices["pc2"].get_interface("eth0").ip_address = "192.168.1.10"  # Duplicate collision!

    val = topo.validate()
    assert val["valid"] is False
    assert any("Duplicate IPv4 address conflict" in err for err in val["errors"])
