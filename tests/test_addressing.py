import pytest
from netforge.addressing import (
    ip_to_int, int_to_ip, mask_str_to_prefix, prefix_to_mask_str,
    calculate_subnet_info, is_same_subnet, is_valid_ipv4, is_valid_subnet_mask,
    prefix_to_mask_int, get_network_int, get_broadcast_int
)


def test_ip_conversion():
    assert ip_to_int("0.0.0.0") == 0
    assert ip_to_int("255.255.255.255") == 0xFFFFFFFF
    assert ip_to_int("192.168.1.1") == (192 << 24) | (168 << 16) | (1 << 8) | 1
    assert int_to_ip((10 << 24) | (0 << 16) | (1 << 8) | 5) == "10.0.1.5"


def test_invalid_ip():
    assert not is_valid_ipv4("256.1.1.1")
    assert not is_valid_ipv4("192.168.1")
    assert not is_valid_ipv4("192.168.1.1.1")
    assert not is_valid_ipv4("abc.def.ghi.jkl")
    assert not is_valid_ipv4("192.168.01.1")  # leading zero disallowed


def test_mask_conversion():
    assert mask_str_to_prefix("255.255.255.0") == 24
    assert mask_str_to_prefix("/24") == 24
    assert mask_str_to_prefix("24") == 24
    assert mask_str_to_prefix("255.255.255.252") == 30
    assert mask_str_to_prefix("255.255.255.254") == 31
    assert mask_str_to_prefix("255.255.255.255") == 32
    assert prefix_to_mask_str(24) == "255.255.255.0"
    assert prefix_to_mask_str(30) == "255.255.255.252"
    assert prefix_to_mask_str(16) == "255.255.0.0"


def test_invalid_mask():
    assert not is_valid_subnet_mask("255.255.255.1")  # non-contiguous
    assert not is_valid_subnet_mask("/33")
    assert not is_valid_subnet_mask("-1")


def test_same_subnet():
    assert is_same_subnet("192.168.1.10", "192.168.1.50", "255.255.255.0")
    assert not is_same_subnet("192.168.1.10", "192.168.2.10", "255.255.255.0")
    assert not is_same_subnet("192.168.1.50", "192.168.1.200", "255.255.255.128")  # /25 split


def test_subnet_calculator_standard():
    info = calculate_subnet_info("192.168.1.10", "24")
    assert info["network_address"] == "192.168.1.0"
    assert info["broadcast_address"] == "192.168.1.255"
    assert info["first_usable"] == "192.168.1.1"
    assert info["last_usable"] == "192.168.1.254"
    assert info["total_addresses"] == 256
    assert info["usable_hosts"] == 254
    assert info["wildcard_mask"] == "0.0.0.255"
    assert info["is_private"] is True
    assert info["ip_class"] == "C"


def test_subnet_calculator_edge_cases():
    # /31 RFC 3021
    info31 = calculate_subnet_info("10.0.0.0", "31")
    assert info31["usable_hosts"] == 2
    assert info31["first_usable"] == "10.0.0.0"
    assert info31["last_usable"] == "10.0.0.1"

    # /32 Host route
    info32 = calculate_subnet_info("172.16.1.1", "32")
    assert info32["usable_hosts"] == 1
    assert info32["first_usable"] == "172.16.1.1"
    assert info32["last_usable"] == "172.16.1.1"
