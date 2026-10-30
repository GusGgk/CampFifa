import Image from "next/image";
import Link from "next/link";

export default function NotFound() {
  return (
    <main className="page">
      <div className="empty">
        <Image src="/brand/logo-competitivo.png" alt="" width={120} height={112} />
        <b>Página não encontrada</b>
        <span>Esse jogador ou essa partida não existe.</span>
        <Link className="btn btn-primary" href="/">
          Voltar para a visão geral
        </Link>
      </div>
    </main>
  );
}
