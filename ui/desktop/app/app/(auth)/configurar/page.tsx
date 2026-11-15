import { redirect } from "next/navigation";
import { SetupForm } from "@/components/SetupForm";
import { getSetupToken, userExists } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const metadata = { title: "Configurar" };

export default async function ConfigurarPage() {
  if (await userExists()) redirect("/entrar");
  getSetupToken(); // cria o arquivo do token no primeiro acesso
  return (
    <div className="gate__card">
      <div className="stack">
        <p className="kicker">Primeiro acesso</p>
        <h1 className="title">Criar a sua conta</h1>
        <p className="lead">Uma conta só, a sua. Senha, segundo fator e, depois, passkey.</p>
      </div>
      <SetupForm />
    </div>
  );
}
