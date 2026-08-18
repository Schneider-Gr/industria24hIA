import { getApiDocs } from "@/lib/swagger";
import ReactSwagger from "./react-swagger";

export const metadata = {
  title: "API interna | Industria24",
  robots: { index: false, follow: false },
};

export default function ApiDocsPage() {
  const spec = getApiDocs();
  return (
    <section className="mx-auto max-w-5xl px-4 py-8">
      <ReactSwagger spec={spec} />
    </section>
  );
}
