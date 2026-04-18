import json
import logging
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone

import httpx

logger = logging.getLogger(__name__)


def _expiry_ms(expire_days: int) -> int:
    """3x-ui expects absolute Unix timestamp in ms, or 0 for unlimited."""
    if not expire_days:
        return 0
    ts = datetime.now(timezone.utc) + timedelta(days=expire_days)
    return int(ts.timestamp() * 1000)


@dataclass
class XUIServer:
    name: str
    url: str
    username: str
    password: str
    inbound_id: int


class XUIClient:
    def __init__(self, server: XUIServer):
        self.server = server
        self.base_url = server.url.rstrip("/")
        self._session_cookie: str | None = None

    async def _login(self) -> str:
        async with httpx.AsyncClient(verify=False) as client:
            resp = await client.post(
                f"{self.base_url}/login",
                json={
                    "username": self.server.username,
                    "password": self.server.password,
                },
            )
            resp.raise_for_status()
            self._session_cookie = resp.cookies.get("3x-ui")
            return self._session_cookie

    def _get_headers(self) -> dict:
        return {"Cookie": f"3x-ui={self._session_cookie}"}

    async def _ensure_auth(self):
        if not self._session_cookie:
            await self._login()

    async def add_client(
        self,
        vpn_uuid: str,
        email: str,
        expire_days: int = 30,
        traffic_gb: int = 0,
    ) -> dict:
        await self._ensure_auth()

        expire_ms = _expiry_ms(expire_days)
        traffic_bytes = traffic_gb * 1024**3 if traffic_gb else 0

        payload = {
            "id": self.server.inbound_id,
            "settings": json.dumps(
                {
                    "clients": [
                        {
                            "id": vpn_uuid,
                            "email": email,
                            "enable": True,
                            "expiryTime": expire_ms,
                            "totalGB": traffic_bytes,
                            "limitIp": 0,
                            "flow": "xtls-rprx-vision",
                            "subId": vpn_uuid,
                            "tgId": "",
                        }
                    ]
                }
            ),
        }

        async with httpx.AsyncClient(verify=False) as client:
            resp = await client.post(
                f"{self.base_url}/panel/api/inbounds/addClient",
                headers=self._get_headers(),
                json=payload,
            )
            logger.info(
                "add_client %s -> %s %s",
                self.server.name,
                resp.status_code,
                resp.text[:200],
            )
            data = resp.json()
            if not data.get("success", True):
                raise RuntimeError(
                    f"3x-ui addClient failed on {self.server.name}: {data.get('msg')}"
                )
            return data

    async def delete_client(self, vpn_uuid: str) -> dict:
        await self._ensure_auth()
        async with httpx.AsyncClient(verify=False) as client:
            resp = await client.post(
                f"{self.base_url}/panel/api/inbounds/{self.server.inbound_id}/delClient/{vpn_uuid}",
                headers=self._get_headers(),
            )
            logger.info("delete_client %s -> %s", self.server.name, resp.status_code)
            return resp.json()

    async def update_client(
        self,
        vpn_uuid: str,
        email: str,
        expire_days: int,
        traffic_gb: int = 0,
    ) -> dict:
        """Full-payload update. 3x-ui replaces the client record from the
        supplied settings, so partial payloads wipe email/flow/traffic/subId
        and cause 3x-ui to regenerate a random 8-char email and 16-char subId
        (which in turn breaks the /subkakovo/<vpn_uuid> subscription URL)."""
        await self._ensure_auth()
        expire_ms = _expiry_ms(expire_days)
        traffic_bytes = traffic_gb * 1024**3 if traffic_gb else 0
        async with httpx.AsyncClient(verify=False) as client:
            resp = await client.post(
                f"{self.base_url}/panel/api/inbounds/updateClient/{vpn_uuid}",
                headers=self._get_headers(),
                json={
                    "id": self.server.inbound_id,
                    "settings": json.dumps(
                        {
                            "clients": [
                                {
                                    "id": vpn_uuid,
                                    "email": email,
                                    "enable": True,
                                    "expiryTime": expire_ms,
                                    "totalGB": traffic_bytes,
                                    "limitIp": 0,
                                    "flow": "xtls-rprx-vision",
                                    "subId": vpn_uuid,
                                    "tgId": "",
                                }
                            ]
                        }
                    ),
                },
            )
            logger.info("update_client %s -> %s %s", self.server.name, resp.status_code, resp.text[:200])
            data = resp.json()
            if not data.get("success", True):
                raise RuntimeError(
                    f"3x-ui updateClient failed on {self.server.name}: {data.get('msg')}"
                )
            return data

    async def get_inbound(self) -> dict:
        """Fetch full inbound JSON (used to build VLESS URIs directly, without
        relying on 3x-ui's optional subscription service being configured
        with a matching sub path on every server)."""
        await self._ensure_auth()
        async with httpx.AsyncClient(verify=False, timeout=10.0) as client:
            resp = await client.get(
                f"{self.base_url}/panel/api/inbounds/get/{self.server.inbound_id}",
                headers=self._get_headers(),
            )
            resp.raise_for_status()
            data = resp.json()
            if not data.get("success"):
                raise RuntimeError(
                    f"3x-ui getInbound failed on {self.server.name}: {data.get('msg')}"
                )
            return data.get("obj") or {}

    async def test_connection(self) -> tuple[bool, str]:
        """Проверка: логин + наличие inbound с заданным id."""
        try:
            async with httpx.AsyncClient(verify=False, timeout=10.0) as client:
                login_resp = await client.post(
                    f"{self.base_url}/login",
                    json={
                        "username": self.server.username,
                        "password": self.server.password,
                    },
                )
                if login_resp.status_code != 200:
                    return False, f"Login HTTP {login_resp.status_code}"
                try:
                    login_data = login_resp.json()
                except Exception:
                    return False, "Login: неверный ответ (не JSON)"
                if not login_data.get("success"):
                    return False, f"Login: {login_data.get('msg') or 'неверные данные'}"
                cookie = login_resp.cookies.get("3x-ui")
                if not cookie:
                    return False, "Login: сессионная cookie не получена"

                list_resp = await client.get(
                    f"{self.base_url}/panel/api/inbounds/list",
                    headers={"Cookie": f"3x-ui={cookie}"},
                )
                if list_resp.status_code != 200:
                    return False, (
                        f"Inbounds HTTP {list_resp.status_code} "
                        f"({list_resp.request.url})"
                    )
                data = list_resp.json()
                if not data.get("success"):
                    return False, f"Inbounds: {data.get('msg') or 'ошибка'}"
                inbounds = data.get("obj") or []
                ids = [i.get("id") for i in inbounds]
                if self.server.inbound_id not in ids:
                    return False, f"Inbound #{self.server.inbound_id} не найден (есть: {ids or 'нет'})"
                return True, f"OK — подключено, inbound #{self.server.inbound_id} найден"
        except httpx.ConnectError as e:
            return False, f"Не удалось подключиться: {e}"
        except httpx.TimeoutException:
            return False, "Таймаут подключения"
        except Exception as e:
            return False, f"Ошибка: {e}"

    async def get_server_stats(self) -> dict:
        """Fetch clients count and system status in a single session."""
        async with httpx.AsyncClient(verify=False, timeout=10.0) as client:
            # Login
            login_resp = await client.post(
                f"{self.base_url}/login",
                json={
                    "username": self.server.username,
                    "password": self.server.password,
                },
            )
            login_resp.raise_for_status()
            cookie = login_resp.cookies.get("3x-ui")
            headers = {"Cookie": f"3x-ui={cookie}"}

            stats: dict = {"online_clients": 0, "cpu": 0.0, "mem": {}}

            # Clients count
            inbound_resp = await client.get(
                f"{self.base_url}/panel/api/inbounds/get/{self.server.inbound_id}",
                headers=headers,
            )
            if inbound_resp.status_code == 200:
                data = inbound_resp.json()
                if data.get("success"):
                    obj = data.get("obj", {})
                    settings_raw = obj.get("settings", "{}")
                    settings = json.loads(settings_raw) if isinstance(settings_raw, str) else settings_raw
                    clients = settings.get("clients", [])
                    stats["online_clients"] = sum(1 for c in clients if c.get("enable", True))

            # System status — try POST first, fall back to GET
            status_resp = await client.post(
                f"{self.base_url}/panel/api/server/status",
                headers=headers,
            )
            if status_resp.status_code != 200:
                logger.warning(
                    "server/status POST %s returned %s, trying GET",
                    self.server.name, status_resp.status_code,
                )
                status_resp = await client.get(
                    f"{self.base_url}/panel/api/server/status",
                    headers=headers,
                )
            if status_resp.status_code == 200:
                status_data = status_resp.json()
                logger.info(
                    "server/status %s response: %s",
                    self.server.name, str(status_data)[:500],
                )
                obj = status_data.get("obj", {})
                # cpu can be a list (per-core) or a single float
                raw_cpu = obj.get("cpu", 0) or obj.get("cpuPercent", 0)
                if isinstance(raw_cpu, list):
                    stats["cpu"] = sum(raw_cpu) / len(raw_cpu) if raw_cpu else 0.0
                else:
                    stats["cpu"] = float(raw_cpu) if raw_cpu else 0.0
                stats["mem"] = obj.get("mem", {})

            return stats

    def get_sub_link(self, vpn_uuid: str) -> str:
        return f"{self.base_url}/subkakovo/{vpn_uuid}"
