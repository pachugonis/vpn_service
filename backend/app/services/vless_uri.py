import json
import logging
from urllib.parse import quote, urlparse

logger = logging.getLogger(__name__)


def _parse_json(maybe_str) -> dict:
    if isinstance(maybe_str, dict):
        return maybe_str
    if not maybe_str:
        return {}
    try:
        return json.loads(maybe_str)
    except (TypeError, ValueError):
        return {}


def build_vless_uri(
    inbound: dict,
    vpn_uuid: str,
    host: str,
    remark: str,
) -> str | None:
    """Build a vless:// URI for one client from a 3x-ui inbound definition.
    Returns None if the inbound is not VLESS or does not contain the client."""
    if not inbound or inbound.get("protocol") != "vless":
        return None

    port = inbound.get("port")
    if not port:
        return None

    stream = _parse_json(inbound.get("streamSettings"))
    settings = _parse_json(inbound.get("settings"))

    client = next(
        (c for c in settings.get("clients") or [] if c.get("id") == vpn_uuid),
        None,
    )
    if not client:
        return None

    network = stream.get("network", "tcp")
    security = stream.get("security", "none")

    params: list[tuple[str, str]] = [("type", network), ("security", security)]

    flow = client.get("flow") or ""
    if flow:
        params.append(("flow", flow))

    if security == "reality":
        rs = stream.get("realitySettings", {}) or {}
        inner = rs.get("settings", {}) or {}
        pbk = inner.get("publicKey") or rs.get("publicKey") or ""
        fp = inner.get("fingerprint") or "chrome"
        spx = inner.get("spiderX") or "/"
        sni = ""
        server_names = rs.get("serverNames") or []
        if server_names:
            sni = server_names[0]
        sid = ""
        short_ids = rs.get("shortIds") or []
        if short_ids:
            sid = short_ids[0]
        if pbk:
            params.append(("pbk", pbk))
        if fp:
            params.append(("fp", fp))
        if sni:
            params.append(("sni", sni))
        if sid:
            params.append(("sid", sid))
        if spx:
            params.append(("spx", spx))
    elif security == "tls":
        tls = stream.get("tlsSettings", {}) or {}
        sni = tls.get("serverName") or ""
        fp = (tls.get("settings") or {}).get("fingerprint") or tls.get("fingerprint") or ""
        alpn = tls.get("alpn") or []
        if sni:
            params.append(("sni", sni))
        if fp:
            params.append(("fp", fp))
        if alpn:
            params.append(("alpn", ",".join(alpn)))

    if network == "ws":
        ws = stream.get("wsSettings", {}) or {}
        path = ws.get("path") or "/"
        host_hdr = (ws.get("headers") or {}).get("Host") or ""
        params.append(("path", path))
        if host_hdr:
            params.append(("host", host_hdr))
    elif network == "grpc":
        grpc = stream.get("grpcSettings", {}) or {}
        service = grpc.get("serviceName") or ""
        if service:
            params.append(("serviceName", service))
    elif network == "tcp":
        tcp = stream.get("tcpSettings", {}) or {}
        header = (tcp.get("header") or {}).get("type") or ""
        if header and header != "none":
            params.append(("headerType", header))

    query = "&".join(f"{k}={quote(str(v), safe='')}" for k, v in params if v != "")
    fragment = quote(remark, safe="")
    return f"vless://{vpn_uuid}@{host}:{port}?{query}#{fragment}"


def host_from_url(url: str) -> str:
    """Strip scheme/port/path from a panel URL so it can be used as VLESS host."""
    parsed = urlparse(url if "://" in url else f"https://{url}")
    return parsed.hostname or url
