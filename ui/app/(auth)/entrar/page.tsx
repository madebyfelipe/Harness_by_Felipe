import { redirect } from "next/navigation";
import { LoginForm } from "@/components/LoginForm";
import { currentUser, userExists } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const metadata = { title: "Entrar" };

export default async function EntrarPage() {
  if (!(await userExists())) redirect("/configurar");
  if (await currentUser()) redirect("/");
  return (
    <div className="gate__card">
      <div className="stack">
        <p className="kicker">Made by Felipe</p>
        <h1 className="title">Entrar</h1>
      </div>
      <LoginForm />
    </div>
  );
}
