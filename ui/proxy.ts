import { NextResponse, type NextRequest } from "next/server";

/**
 * Proxy (o antigo middleware do Next). Primeira barreira: sem o cookie de
 * sessão, nenhuma página abre. A conferência de verdade (sessão válida no
 * banco, origem do pedido) é refeita em cada página e em cada rota de API —
 * se o matcher mudar, nada abre junto.
 */
const PUBLIC = ["/entrar", "/configurar", "/api/health", "/api/auth/login", "/api/auth/passkey/login", "/api/setup"];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (PUBLIC.some((p) => pathname === p || pathname.startsWith(p + "/"))) return NextResponse.next();
  if (request.cookies.has("central_session")) return NextResponse.next();
  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "Sessão expirada. Entre de novo." }, { status: 401 });
  }
  const url = request.nextUrl.clone();
  url.pathname = "/entrar";
  url.search = "";
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|fonts/|favicon.ico|icon.svg).*)"]
};
