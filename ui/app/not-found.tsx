import Link from "next/link";

export default function NotFound() {
  return (
    <main className="gate__body" style={{ minHeight: "100dvh" }}>
      <div className="gate__card">
        <p className="kicker">404</p>
        <h1 className="title">Não achei essa página.</h1>
        <Link className="btn" href="/">
          Voltar ao início
        </Link>
      </div>
    </main>
  );
}
