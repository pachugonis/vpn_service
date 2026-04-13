#!/usr/bin/env bash
#
# VPN Service — автоустановка на Ubuntu 24.04 VPS
# Usage: sudo bash install.sh
#
set -Eeuo pipefail

RED=$'\e[31m'; GRN=$'\e[32m'; YLW=$'\e[33m'; BLU=$'\e[34m'; RST=$'\e[0m'
log()  { echo "${BLU}[*]${RST} $*"; }
ok()   { echo "${GRN}[✓]${RST} $*"; }
warn() { echo "${YLW}[!]${RST} $*"; }
err()  { echo "${RED}[✗]${RST} $*" >&2; }
die()  { err "$*"; exit 1; }
trap 'err "Ошибка на строке $LINENO. Установка прервана."' ERR

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$PROJECT_DIR"

# ──────────────────────────────────────────────────────────────────────────────
# 0. Проверки окружения
# ──────────────────────────────────────────────────────────────────────────────
[[ $EUID -eq 0 ]] || die "Запустите скрипт от root: sudo bash install.sh"

if [[ -r /etc/os-release ]]; then
    . /etc/os-release
    [[ "${ID:-}" == "ubuntu" ]] || warn "ОС не Ubuntu (${ID:-unknown}) — продолжаем на свой страх и риск"
    [[ "${VERSION_ID:-}" == "24.04" ]] || warn "Рекомендуется Ubuntu 24.04 (у вас ${VERSION_ID:-unknown})"
else
    warn "Не удалось определить ОС"
fi

ARCH=$(uname -m)
[[ "$ARCH" == "x86_64" || "$ARCH" == "aarch64" ]] || die "Неподдерживаемая архитектура: $ARCH"

for f in docker-compose.prod.yml backend/Dockerfile frontend/Dockerfile nginx/nginx.conf .env.example; do
    [[ -e "$PROJECT_DIR/$f" ]] || die "Не найден $f — запускайте скрипт из корня проекта"
done

# ──────────────────────────────────────────────────────────────────────────────
# 1. Параметры установки (интерактив / env)
# ──────────────────────────────────────────────────────────────────────────────
ask() {  # ask VAR prompt [default]
    local var=$1 prompt=$2 def=${3:-} val
    if [[ -n "${!var:-}" ]]; then return; fi
    if [[ -n "$def" ]]; then
        read -rp "$prompt [$def]: " val || true
        val=${val:-$def}
    else
        while :; do
            read -rp "$prompt: " val || true
            [[ -n "$val" ]] && break
        done
    fi
    printf -v "$var" '%s' "$val"
}

log "Настройка параметров установки"
ask DOMAIN       "Основной домен (фронтенд)"        "yourvpn.com"
ask API_DOMAIN   "API домен"                         "api.${DOMAIN}"
ask ADMIN_EMAIL  "Email администратора (для SSL и доступа к /admin)"
ask SSL_MODE     "SSL: letsencrypt | selfsigned | skip" "letsencrypt"

case "$SSL_MODE" in letsencrypt|selfsigned|skip) ;; *) die "Неверный SSL_MODE: $SSL_MODE";; esac

# Проверка DNS при Let's Encrypt
if [[ "$SSL_MODE" == "letsencrypt" ]]; then
    PUB_IP=$(curl -fs4 https://api.ipify.org || curl -fs4 https://ifconfig.me || echo "")
    [[ -n "$PUB_IP" ]] && ok "Публичный IP: $PUB_IP" || warn "Не удалось определить публичный IP"
    for d in "$DOMAIN" "$API_DOMAIN"; do
        resolved=$(getent hosts "$d" | awk '{print $1}' | head -n1 || true)
        if [[ -z "$resolved" ]]; then
            warn "DNS: $d не резолвится"
        elif [[ -n "$PUB_IP" && "$resolved" != "$PUB_IP" ]]; then
            warn "DNS: $d → $resolved (ожидалось $PUB_IP)"
        else
            ok "DNS: $d → $resolved"
        fi
    done
    read -rp "Продолжить установку с этими доменами? [y/N]: " yn
    [[ "$yn" =~ ^[Yy]$ ]] || die "Отменено пользователем"
fi

# ──────────────────────────────────────────────────────────────────────────────
# 2. Системные пакеты
# ──────────────────────────────────────────────────────────────────────────────
log "Обновление apt и установка базовых пакетов"
export DEBIAN_FRONTEND=noninteractive
apt-get update -qq
apt-get install -y -qq ca-certificates curl gnupg lsb-release ufw openssl jq git ecryptfs-utils >/dev/null || \
apt-get install -y -qq ca-certificates curl gnupg lsb-release ufw openssl jq git >/dev/null
ok "Базовые пакеты установлены"

# ──────────────────────────────────────────────────────────────────────────────
# 3. Docker + Compose plugin
# ──────────────────────────────────────────────────────────────────────────────
if ! command -v docker >/dev/null 2>&1; then
    log "Установка Docker Engine"
    install -m 0755 -d /etc/apt/keyrings
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
    chmod a+r /etc/apt/keyrings/docker.gpg
    echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] \
https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "$VERSION_CODENAME") stable" \
        > /etc/apt/sources.list.d/docker.list
    apt-get update -qq
    apt-get install -y -qq docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin >/dev/null
    systemctl enable --now docker
    ok "Docker установлен: $(docker --version)"
else
    ok "Docker уже установлен: $(docker --version)"
fi
docker compose version >/dev/null 2>&1 || die "docker compose plugin недоступен"
ok "Compose: $(docker compose version --short)"

# ──────────────────────────────────────────────────────────────────────────────
# 4. Firewall
# ──────────────────────────────────────────────────────────────────────────────
log "Настройка UFW"
ufw --force reset >/dev/null
ufw default deny incoming >/dev/null
ufw default allow outgoing >/dev/null
ufw allow OpenSSH >/dev/null
ufw allow 80/tcp  >/dev/null
ufw allow 443/tcp >/dev/null
ufw --force enable >/dev/null
ok "UFW: 22, 80, 443 открыты"

# ──────────────────────────────────────────────────────────────────────────────
# 5. .env с генерацией секретов
# ──────────────────────────────────────────────────────────────────────────────
gen()   { openssl rand -base64 "${1:-32}" | tr -d '\n=+/' | cut -c1-"${2:-40}"; }
genhex(){ openssl rand -hex "${1:-32}"; }

ENV_FILE="$PROJECT_DIR/.env"
if [[ -f "$ENV_FILE" ]]; then
    warn ".env уже существует — делаю бэкап .env.bak.$(date +%s)"
    cp "$ENV_FILE" "${ENV_FILE}.bak.$(date +%s)"
fi

DB_PASSWORD=$(gen 32 32)
SECRET_KEY=$(genhex 48)

log "Генерация .env"
cat > "$ENV_FILE" <<EOF
# ── сгенерировано install.sh $(date -Iseconds) ──

# База данных
DB_PASSWORD=${DB_PASSWORD}
DATABASE_URL=postgresql+asyncpg://vpnuser:${DB_PASSWORD}@db:5432/vpnshop
REDIS_URL=redis://redis:6379/0

# JWT
SECRET_KEY=${SECRET_KEY}
ACCESS_TOKEN_EXPIRE_MINUTES=60

# Platega.io — заполнить в ЛК https://my.platega.io
PLATEGA_MERCHANT_ID=change-me
PLATEGA_SECRET=change-me

# BTCPay Server — заполнить после деплоя BTCPay
BTCPAY_URL=https://btcpay.${DOMAIN}
BTCPAY_STORE_ID=change-me
BTCPAY_API_KEY=change-me
BTCPAY_WEBHOOK_SECRET=$(genhex 32)

# Frontend
FRONTEND_URL=https://${DOMAIN}
NEXT_PUBLIC_API_URL=https://${API_DOMAIN}

# Admin
ADMIN_EMAIL=${ADMIN_EMAIL}

# SMTP — заполнить вручную
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=noreply@${DOMAIN}
SMTP_PASSWORD=change-me
EOF
chmod 600 "$ENV_FILE"
ok ".env создан (права 600)"

# ──────────────────────────────────────────────────────────────────────────────
# 6. Nginx: подстановка доменов
# ──────────────────────────────────────────────────────────────────────────────
log "Конфигурация nginx под домены $DOMAIN / $API_DOMAIN"
cp nginx/nginx.conf nginx/nginx.conf.bak 2>/dev/null || true
# Заменяем заглушки yourvpn.com / api.yourvpn.com
sed -i \
    -e "s|api\\.yourvpn\\.com|__API_PLACEHOLDER__|g" \
    -e "s|yourvpn\\.com|${DOMAIN}|g" \
    -e "s|__API_PLACEHOLDER__|${API_DOMAIN}|g" \
    nginx/nginx.conf
ok "nginx.conf обновлён"

mkdir -p nginx/ssl

# ──────────────────────────────────────────────────────────────────────────────
# 7. SSL сертификаты
# ──────────────────────────────────────────────────────────────────────────────
issue_selfsigned() {
    log "Генерация self-signed сертификата"
    openssl req -x509 -nodes -days 825 -newkey rsa:2048 \
        -keyout nginx/ssl/privkey.pem \
        -out nginx/ssl/fullchain.pem \
        -subj "/CN=${DOMAIN}" \
        -addext "subjectAltName=DNS:${DOMAIN},DNS:${API_DOMAIN}" >/dev/null 2>&1
    ok "Self-signed сертификат создан"
}

issue_letsencrypt() {
    log "Выпуск Let's Encrypt сертификата (standalone, порт 80)"
    apt-get install -y -qq certbot >/dev/null
    # Останавливаем что может слушать 80 порт
    fuser -k 80/tcp 2>/dev/null || true
    certbot certonly --standalone --non-interactive --agree-tos \
        --email "$ADMIN_EMAIL" \
        -d "$DOMAIN" -d "$API_DOMAIN" \
        --preferred-challenges http
    LE_DIR="/etc/letsencrypt/live/${DOMAIN}"
    [[ -f "$LE_DIR/fullchain.pem" ]] || die "certbot не создал сертификат"
    cp "$LE_DIR/fullchain.pem" nginx/ssl/fullchain.pem
    cp "$LE_DIR/privkey.pem"   nginx/ssl/privkey.pem
    ok "Let's Encrypt сертификат установлен"

    # Deploy hook — перезагружать nginx после ренью
    mkdir -p /etc/letsencrypt/renewal-hooks/deploy
    cat > /etc/letsencrypt/renewal-hooks/deploy/vpn-service.sh <<HOOK
#!/usr/bin/env bash
set -e
cp /etc/letsencrypt/live/${DOMAIN}/fullchain.pem ${PROJECT_DIR}/nginx/ssl/fullchain.pem
cp /etc/letsencrypt/live/${DOMAIN}/privkey.pem   ${PROJECT_DIR}/nginx/ssl/privkey.pem
cd ${PROJECT_DIR} && docker compose -f docker-compose.prod.yml exec nginx nginx -s reload || true
HOOK
    chmod +x /etc/letsencrypt/renewal-hooks/deploy/vpn-service.sh
    systemctl enable --now certbot.timer 2>/dev/null || true
    ok "Автообновление SSL настроено"
}

case "$SSL_MODE" in
    letsencrypt) issue_letsencrypt ;;
    selfsigned)  issue_selfsigned ;;
    skip)        warn "SSL пропущен — вам нужно положить fullchain.pem и privkey.pem в nginx/ssl/ вручную"
                 [[ -f nginx/ssl/fullchain.pem ]] || issue_selfsigned ;;
esac
chmod 600 nginx/ssl/privkey.pem 2>/dev/null || true

# ──────────────────────────────────────────────────────────────────────────────
# 8. Сборка и запуск
# ──────────────────────────────────────────────────────────────────────────────
COMPOSE="docker compose -f docker-compose.prod.yml"

log "Сборка Docker-образов (это займёт несколько минут)"
$COMPOSE build --pull

log "Запуск стека"
$COMPOSE up -d

# ──────────────────────────────────────────────────────────────────────────────
# 9. Миграции БД
# ──────────────────────────────────────────────────────────────────────────────
log "Ожидание готовности PostgreSQL"
for i in {1..30}; do
    if $COMPOSE exec -T db pg_isready -U vpnuser -d vpnshop >/dev/null 2>&1; then
        ok "PostgreSQL готов"; break
    fi
    sleep 2
    [[ $i -eq 30 ]] && die "PostgreSQL не поднялся за 60 сек"
done

if $COMPOSE exec -T backend sh -c 'command -v alembic' >/dev/null 2>&1; then
    log "Запуск alembic upgrade head"
    $COMPOSE exec -T backend alembic upgrade head || warn "Миграции завершились с ошибкой — проверьте логи"
else
    warn "alembic не найден в backend-контейнере, миграции пропущены"
fi

# ──────────────────────────────────────────────────────────────────────────────
# 10. Проверки
# ──────────────────────────────────────────────────────────────────────────────
log "Проверка состояния контейнеров"
$COMPOSE ps

sleep 5
log "HTTP healthcheck"
HTTP_CODE=$(curl -ks -o /dev/null -w '%{http_code}' "https://${API_DOMAIN}/" || echo "000")
if [[ "$HTTP_CODE" =~ ^(200|301|302|404|401)$ ]]; then
    ok "API отвечает (HTTP $HTTP_CODE)"
else
    warn "API вернул HTTP $HTTP_CODE — проверьте $COMPOSE logs backend"
fi

FRONT_CODE=$(curl -ks -o /dev/null -w '%{http_code}' "https://${DOMAIN}/" || echo "000")
if [[ "$FRONT_CODE" =~ ^(200|301|302|404)$ ]]; then
    ok "Frontend отвечает (HTTP $FRONT_CODE)"
else
    warn "Frontend вернул HTTP $FRONT_CODE — проверьте $COMPOSE logs frontend"
fi

# ──────────────────────────────────────────────────────────────────────────────
# 11. Итог
# ──────────────────────────────────────────────────────────────────────────────
cat <<SUMMARY

${GRN}═══════════════════════════════════════════════════════════${RST}
${GRN} Установка завершена${RST}
${GRN}═══════════════════════════════════════════════════════════${RST}

  Frontend:  https://${DOMAIN}
  API:       https://${API_DOMAIN}
  Admin:     https://${DOMAIN}/admin  (логин: ${ADMIN_EMAIL})

  .env:      ${ENV_FILE}  (права 600)
  Compose:   docker compose -f docker-compose.prod.yml <cmd>

${YLW}Что сделать дальше:${RST}
  1. Заполнить в .env реальные ключи: PLATEGA_*, BTCPAY_*, SMTP_*
  2. Перезапустить: docker compose -f docker-compose.prod.yml up -d
  3. Зарегистрироваться под email ${ADMIN_EMAIL} — это будет админ
  4. В /admin добавить серверы 3x-ui и тарифные планы

${YLW}Полезные команды:${RST}
  Логи:        docker compose -f docker-compose.prod.yml logs -f
  Рестарт:     docker compose -f docker-compose.prod.yml restart
  Остановка:   docker compose -f docker-compose.prod.yml down

SUMMARY
ok "Готово"
