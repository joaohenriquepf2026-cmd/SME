import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Requerimento • Secretaria Municipal de Educação de Paraipaba" },
      {
        name: "description",
        content:
          "Protocolo digital de requerimentos da Secretaria Municipal de Educação de Paraipaba/CE: envie, acompanhe e consulte o resultado do seu requerimento.",
      },
      { property: "og:title", content: "Secretaria Municipal de Educação de Paraipaba" },
      {
        property: "og:description",
        content: "Protocolo digital de requerimentos da SME de Paraipaba/CE.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Index,
});

function Index() {
  return (
    <iframe
      src="/sme/index.html"
      title="Protocolo Digital de Requerimentos — SME Paraipaba"
      style={{ display: "block", width: "100%", height: "100vh", border: 0 }}
    />
  );
}
