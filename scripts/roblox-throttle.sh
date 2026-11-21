#!/bin/sh
# roblox-throttle.sh — limita a velocidade do Roblox para TODA a rede do roteador.
#
# Feito para rodar NO ROTEADOR (OpenWrt/Linux com nftables + tc). POSIX sh.
#
# Como funciona:
#   1. nftables marca (fwmark) todo pacote encaminhado de/para o Roblox:
#        - faixas de IP dos servidores de jogo do Roblox (AS22697)
#        - IPs resolvidos pelo dnsmasq para *.roblox.com / *.rbxcdn.com (nftset)
#   2. tc (HTB) limita o tráfego marcado:
#        - download: na interface LAN (egress do roteador -> dispositivos)
#        - upload:   na interface WAN (egress do roteador -> internet)
#   O resto da internet NÃO é afetado (classe default sem limite).
#
# Uso:
#   ./roblox-throttle.sh apply  [DOWN_KBIT] [UP_KBIT]   # padrão: 1000 / 500
#   ./roblox-throttle.sh remove
#   ./roblox-throttle.sh status
#
# Variáveis (opcionais): LAN_IF, WAN_IF, DOWN_KBIT, UP_KBIT
#   LAN_IF=br-lan WAN_IF=eth1 ./roblox-throttle.sh apply 2000 1000
#
# Obs.: para pegar também os domínios, rode uma vez no OpenWrt (ver "dnsmasq" abaixo)
#       e reinicie o dnsmasq. O script já escreve o arquivo de configuração.

set -eu

TABLE="roblox_throttle"
MARK="0x52"                     # 'R'
CLASSID="1:52"
DNSMASQ_CONF="/tmp/dnsmasq.d/roblox-throttle.conf"

# Faixas conhecidas dos servidores do Roblox (AS22697). Ajuste se necessário.
ROBLOX_CIDRS="128.116.0.0/16, 209.206.40.0/21"
ROBLOX_DOMAINS="roblox.com rbxcdn.com robloxlabs.com"

DOWN_KBIT="${2:-${DOWN_KBIT:-1000}}"
UP_KBIT="${3:-${UP_KBIT:-500}}"

detect_lan() {
    for i in br-lan br0 lan; do
        [ -d "/sys/class/net/$i" ] && { echo "$i"; return; }
    done
    echo "br-lan"
}

detect_wan() {
    dev=$(ip route show default 2>/dev/null | awk '{for(i=1;i<=NF;i++) if($i=="dev"){print $(i+1); exit}}')
    echo "${dev:-eth1}"
}

LAN_IF="${LAN_IF:-$(detect_lan)}"
WAN_IF="${WAN_IF:-$(detect_wan)}"

need() { command -v "$1" >/dev/null 2>&1 || { echo "Erro: '$1' não encontrado (OpenWrt: opkg install $2)" >&2; exit 1; }; }

write_dnsmasq() {
    mkdir -p "$(dirname "$DNSMASQ_CONF")"
    : > "$DNSMASQ_CONF"
    for d in $ROBLOX_DOMAINS; do
        echo "nftset=/$d/4#inet#$TABLE#roblox_v4" >> "$DNSMASQ_CONF"
    done
    # recarrega o dnsmasq se existir (OpenWrt)
    if [ -x /etc/init.d/dnsmasq ]; then /etc/init.d/dnsmasq restart >/dev/null 2>&1 || true; fi
}

apply() {
    need nft nftables-json
    need tc tc-full
    echo "LAN=$LAN_IF  WAN=$WAN_IF  down=${DOWN_KBIT}kbit  up=${UP_KBIT}kbit"

    remove quiet

    nft -f - <<EOF
table inet $TABLE {
    set roblox_v4 {
        type ipv4_addr
        flags interval
        elements = { $ROBLOX_CIDRS }
    }
    chain mark_fwd {
        type filter hook forward priority mangle; policy accept;
        ip daddr @roblox_v4 meta mark set $MARK
        ip saddr @roblox_v4 meta mark set $MARK
    }
}
EOF
    # o set precisa aceitar IPs adicionados pelo dnsmasq (auto-merge de intervalos)
    nft add element inet "$TABLE" roblox_v4 '{ }' 2>/dev/null || true

    write_dnsmasq

    # Download: egress da LAN
    tc qdisc replace dev "$LAN_IF" root handle 1: htb default 10
    tc class add dev "$LAN_IF" parent 1: classid 1:10 htb rate 1000mbit
    tc class add dev "$LAN_IF" parent 1: classid "$CLASSID" htb rate "${DOWN_KBIT}kbit" ceil "${DOWN_KBIT}kbit"
    tc qdisc add dev "$LAN_IF" parent "$CLASSID" handle 52: fq_codel
    tc filter add dev "$LAN_IF" parent 1: protocol ip prio 1 handle "$MARK" fw flowid "$CLASSID"

    # Upload: egress da WAN
    tc qdisc replace dev "$WAN_IF" root handle 1: htb default 10
    tc class add dev "$WAN_IF" parent 1: classid 1:10 htb rate 1000mbit
    tc class add dev "$WAN_IF" parent 1: classid "$CLASSID" htb rate "${UP_KBIT}kbit" ceil "${UP_KBIT}kbit"
    tc qdisc add dev "$WAN_IF" parent "$CLASSID" handle 52: fq_codel
    tc filter add dev "$WAN_IF" parent 1: protocol ip prio 1 handle "$MARK" fw flowid "$CLASSID"

    echo "OK: Roblox limitado em toda a rede."
    echo "Aviso: o root qdisc HTB substitui qualquer SQM/CAKE nessas interfaces. 'remove' desfaz."
}

remove() {
    nft delete table inet "$TABLE" 2>/dev/null || true
    tc qdisc del dev "$LAN_IF" root 2>/dev/null || true
    tc qdisc del dev "$WAN_IF" root 2>/dev/null || true
    if [ -f "$DNSMASQ_CONF" ]; then
        rm -f "$DNSMASQ_CONF"
        [ -x /etc/init.d/dnsmasq ] && /etc/init.d/dnsmasq restart >/dev/null 2>&1 || true
    fi
    [ "${1:-}" = quiet ] || echo "Limite removido."
}

status() {
    echo "== nft =="; nft list table inet "$TABLE" 2>/dev/null || echo "(inativo)"
    echo "== tc $LAN_IF =="; tc -s class show dev "$LAN_IF" 2>/dev/null | grep -A3 "$CLASSID" || true
    echo "== tc $WAN_IF =="; tc -s class show dev "$WAN_IF" 2>/dev/null | grep -A3 "$CLASSID" || true
}

case "${1:-}" in
    apply)  apply ;;
    remove) remove ;;
    status) status ;;
    *) sed -n '2,25p' "$0"; exit 1 ;;
esac
