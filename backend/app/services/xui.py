import json
import logging
from dataclasses import dataclass

import httpx

logger = logging.getLogger(__name__)


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
        self.base_url = server.url
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

        expire_ms = expire_days * 24 * 60 * 60 * 1000 if expire_days else 0
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
            logger.info("add_client %s -> %s", self.server.name, resp.status_code)
            return resp.json()

    async def delete_client(self, vpn_uuid: str) -> dict:
        await self._ensure_auth()
        async with httpx.AsyncClient(verify=False) as client:
            resp = await client.post(
                f"{self.base_url}/panel/api/inbounds/{self.server.inbound_id}/delClient/{vpn_uuid}",
                headers=self._get_headers(),
            )
            logger.info("delete_client %s -> %s", self.server.name, resp.status_code)
            return resp.json()

    async def update_client_expiry(self, vpn_uuid: str, expire_days: int) -> dict:
        await self._ensure_auth()
        expire_ms = expire_days * 24 * 60 * 60 * 1000
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
                                    "expiryTime": expire_ms,
                                    "enable": True,
                                }
                            ]
                        }
                    ),
                },
            )
            return resp.json()

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
                    return False, f"Inbounds HTTP {list_resp.status_code}"
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

    def get_sub_link(self, vpn_uuid: str) -> str:
        return f"{self.base_url}/sub/{vpn_uuid}"
