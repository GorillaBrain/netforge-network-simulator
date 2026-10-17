"""
IPv4 Addressing and Subnetting Engine for NetForge.

Provides exact bitwise calculations for IPv4 addresses, subnet masks,
prefix lengths, network/broadcast addresses, usable host ranges,
RFC 3021 (/31 point-to-point) support, and edge-case validation.
"""

from typing import Dict, Any, Tuple, Optional


def ip_to_int(ip_str: str) -> int:
    """Convert a dotted-decimal IPv4 string to a 32-bit unsigned integer."""
    if not isinstance(ip_str, str):
        raise ValueError(f"Invalid IP address format: {ip_str} (must be a string)")
    parts = ip_str.strip().split(".")
    if len(parts) != 4:
        raise ValueError(f"IPv4 address must contain exactly 4 octets: {ip_str}")
    val = 0
    for part in parts:
        if not part.isdigit():
            raise ValueError(f"Octet must be numeric: '{part}' in {ip_str}")
        if len(part) > 1 and part.startswith("0"):
            raise ValueError(f"Leading zeros not permitted in octet: '{part}'")
        num = int(part)
        if num < 0 or num > 255:
            raise ValueError(f"Octet out of range (0-255): {num} in {ip_str}")
        val = (val << 8) | num
    return val


def int_to_ip(ip_int: int) -> str:
    """Convert a 32-bit unsigned integer to dotted-decimal IPv4 string."""
    ip_int = ip_int & 0xFFFFFFFF
    return f"{(ip_int >> 24) & 0xFF}.{(ip_int >> 16) & 0xFF}.{(ip_int >> 8) & 0xFF}.{ip_int & 0xFF}"


def int_to_binary_str(val: int, bits: int = 32) -> str:
    """Format an integer as a dotted binary string for educational display."""
    raw = f"{val & 0xFFFFFFFF:032b}"
    return ".".join([raw[0:8], raw[8:16], raw[16:24], raw[24:32]])


def prefix_to_mask_int(prefix: int) -> int:
    """Convert prefix length (0-32) to 32-bit mask integer."""
    if not isinstance(prefix, int) or prefix < 0 or prefix > 32:
        raise ValueError(f"Prefix length must be an integer between 0 and 32: {prefix}")
    if prefix == 0:
        return 0
    return ((0xFFFFFFFF << (32 - prefix)) & 0xFFFFFFFF)


def mask_int_to_prefix(mask_int: int) -> int:
    """
    Validate that an integer represents a valid contiguous subnet mask
    and return its prefix length (0-32).
    """
    mask_int = mask_int & 0xFFFFFFFF
    # Check if mask consists of 1s followed by 0s:
    # (~mask_int + 1) must be a power of 2
    inverted = (~mask_int) & 0xFFFFFFFF
    if ((inverted + 1) & inverted) != 0:
        raise ValueError(f"Subnet mask is non-contiguous: {int_to_ip(mask_int)}")
    
    # Count set bits
    prefix = bin(mask_int).count("1")
    return prefix


def mask_str_to_prefix(mask_str: str) -> int:
    """Convert dotted-decimal or prefix string ('255.255.255.0' or '/24' or '24') to prefix length."""
    mask_str = str(mask_str).strip()
    if mask_str.startswith("/"):
        mask_str = mask_str[1:]
    if mask_str.isdigit():
        return prefix_to_mask_int_prefix(int(mask_str))
    mask_int = ip_to_int(mask_str)
    return mask_int_to_prefix(mask_int)


def prefix_to_mask_int_prefix(prefix: int) -> int:
    if prefix < 0 or prefix > 32:
        raise ValueError(f"Prefix length out of range (0-32): {prefix}")
    return prefix


def prefix_to_mask_str(prefix: int) -> str:
    """Convert prefix length (0-32) to dotted-decimal mask string."""
    return int_to_ip(prefix_to_mask_int(prefix))


def is_valid_ipv4(ip_str: str) -> bool:
    """Check if string is a valid IPv4 address."""
    try:
        ip_to_int(ip_str)
        return True
    except Exception:
        return False


def is_valid_subnet_mask(mask_str: str) -> bool:
    """Check if string is a valid dotted-decimal or prefix subnet mask."""
    try:
        mask_str_to_prefix(mask_str)
        return True
    except Exception:
        return False


def get_network_int(ip_int: int, mask_int: int) -> int:
    """Calculate network address as 32-bit int."""
    return (ip_int & mask_int) & 0xFFFFFFFF


def get_broadcast_int(ip_int: int, mask_int: int) -> int:
    """Calculate broadcast address as 32-bit int."""
    wildcard = (~mask_int) & 0xFFFFFFFF
    return ((ip_int & mask_int) | wildcard) & 0xFFFFFFFF


def is_same_subnet(ip1_str: str, ip2_str: str, mask_str: str) -> bool:
    """Determine whether two IPv4 addresses belong to the same subnet."""
    ip1 = ip_to_int(ip1_str)
    ip2 = ip_to_int(ip2_str)
    prefix = mask_str_to_prefix(mask_str)
    mask = prefix_to_mask_int(prefix)
    return get_network_int(ip1, mask) == get_network_int(ip2, mask)


def calculate_subnet_info(ip_str: str, mask_or_prefix: str) -> Dict[str, Any]:
    """
    Perform complete subnet analysis and return structured educational metrics.
    Handles standard subnets (/0 to /30), RFC 3021 point-to-point (/31), and host routes (/32).
    """
    ip_int = ip_to_int(ip_str)
    prefix = mask_str_to_prefix(mask_or_prefix)
    mask_int = prefix_to_mask_int(prefix)
    mask_str = int_to_ip(mask_int)
    wildcard_int = (~mask_int) & 0xFFFFFFFF
    wildcard_str = int_to_ip(wildcard_int)

    network_int = get_network_int(ip_int, mask_int)
    network_str = int_to_ip(network_int)
    broadcast_int = get_broadcast_int(ip_int, mask_int)
    broadcast_str = int_to_ip(broadcast_int)

    total_addresses = 2 ** (32 - prefix)
    
    if prefix == 32:
        # /32 Single Host Route
        usable_hosts = 1
        first_usable_int = ip_int
        last_usable_int = ip_int
        first_usable_str = int_to_ip(first_usable_int)
        last_usable_str = int_to_ip(last_usable_int)
        is_usable_host = True
        note = "RFC 3021/host route: /32 represents a single host or loopback address."
    elif prefix == 31:
        # /31 RFC 3021 Point-to-Point Links
        usable_hosts = 2
        first_usable_int = network_int
        last_usable_int = broadcast_int
        first_usable_str = int_to_ip(first_usable_int)
        last_usable_str = int_to_ip(last_usable_int)
        is_usable_host = True
        note = "RFC 3021 point-to-point link: both addresses are usable for host interfaces."
    else:
        # Standard /0 through /30
        usable_hosts = max(0, total_addresses - 2)
        if usable_hosts > 0:
            first_usable_int = network_int + 1
            last_usable_int = broadcast_int - 1
            first_usable_str = int_to_ip(first_usable_int)
            last_usable_str = int_to_ip(last_usable_int)
            is_usable_host = (first_usable_int <= ip_int <= last_usable_int)
        else:
            first_usable_str = None
            last_usable_str = None
            is_usable_host = False
        note = "Standard IPv4 network with reserved network and broadcast addresses."

    # Address classification
    first_octet = (ip_int >> 24) & 0xFF
    if first_octet < 128:
        ip_class = "A"
        default_cidr = 8
    elif first_octet < 192:
        ip_class = "B"
        default_cidr = 16
    elif first_octet < 224:
        ip_class = "C"
        default_cidr = 24
    elif first_octet < 240:
        ip_class = "D (Multicast)"
        default_cidr = None
    else:
        ip_class = "E (Experimental)"
        default_cidr = None

    # RFC 1918 Private Address Detection
    is_private = (
        (10 << 24) <= ip_int <= ((10 << 24) | 0x00FFFFFF) or
        ((172 << 24) | (16 << 16)) <= ip_int <= ((172 << 24) | (31 << 16) | 0xFFFF) or
        ((192 << 24) | (168 << 16)) <= ip_int <= ((192 << 24) | (168 << 16) | 0xFFFF)
    )
    is_loopback = (127 << 24) <= ip_int <= ((127 << 24) | 0x00FFFFFF)
    is_link_local = ((169 << 24) | (254 << 16)) <= ip_int <= ((169 << 24) | (254 << 16) | 0xFFFF)

    return {
        "ip": ip_str,
        "prefix": prefix,
        "cidr": f"/{prefix}",
        "subnet_mask": mask_str,
        "wildcard_mask": wildcard_str,
        "network_address": network_str,
        "broadcast_address": broadcast_str,
        "first_usable": first_usable_str,
        "last_usable": last_usable_str,
        "total_addresses": total_addresses,
        "usable_hosts": usable_hosts,
        "is_usable_host": is_usable_host,
        "is_network_address": (ip_int == network_int and prefix < 31),
        "is_broadcast_address": (ip_int == broadcast_int and prefix < 31),
        "ip_binary": int_to_binary_str(ip_int),
        "mask_binary": int_to_binary_str(mask_int),
        "network_binary": int_to_binary_str(network_int),
        "broadcast_binary": int_to_binary_str(broadcast_int),
        "ip_class": ip_class,
        "default_cidr": default_cidr,
        "is_private": is_private,
        "is_loopback": is_loopback,
        "is_link_local": is_link_local,
        "note": note,
    }
