import logging
import smtplib
from email.message import EmailMessage
from urllib.parse import urlparse

from app.config import settings

logger = logging.getLogger(__name__)


def _api_host() -> str:
    parsed = urlparse(settings.FRONTEND_URL)
    host = parsed.hostname or "localhost"
    if host.startswith("www."):
        host = host[4:]
    return f"https://api.{host}"


def build_sub_url(vpn_uuid: str) -> str:
    return f"{_api_host()}/subkakovo/{vpn_uuid}"


def send_sub_link_email(to_email: str, vpn_uuid: str) -> None:
    """Send the user a single aggregated subscription link."""
    if not settings.SMTP_HOST or not settings.SMTP_USER:
        logger.info("SMTP not configured, skipping email to %s", to_email)
        return

    sub_url = build_sub_url(vpn_uuid)
    happ_deeplink = f"happ://add/{sub_url}"

    msg = EmailMessage()
    msg["Subject"] = "Ваша VPN подписка готова"
    msg["From"] = settings.SMTP_USER
    msg["To"] = to_email
    msg.set_content(
        "Здравствуйте!\n\n"
        "Ваша VPN-подписка активна. Вставьте ссылку ниже в ваш VPN-клиент "
        "(Happ, v2rayNG, Streisand и др.) — все серверы подгрузятся автоматически:\n\n"
        f"{sub_url}\n\n"
        f"Открыть в Happ: {happ_deeplink}\n\n"
        "Если в будущем мы добавим новые серверы, они появятся в клиенте "
        "автоматически при обновлении подписки — ссылку менять не нужно.\n"
    )

    try:
        with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT) as smtp:
            smtp.starttls()
            smtp.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
            smtp.send_message(msg)
        logger.info("Sent sub link email to %s", to_email)
    except Exception as e:
        logger.error("Failed to send email to %s: %s", to_email, e)
