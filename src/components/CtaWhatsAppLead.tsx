"use client";

// Link de WhatsApp da landing de captação de seller que avisa o pixel da Meta.
// Sem este evento a campanha só tem o clique no anúncio como sinal e otimiza
// por visita, não por conversa iniciada — que é o que vira seller.
// O <a> continua sendo um link normal: o fbq roda antes da navegação e o
// clique funciona igual se o pixel estiver bloqueado por adblock.
export function CtaWhatsAppLead({
  href,
  className,
  ariaLabel,
  children,
}: {
  href: string;
  className: string;
  ariaLabel?: string;
  children: React.ReactNode;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={ariaLabel}
      className={className}
      onClick={() => window.fbq?.("track", "Lead", { content_name: "whatsapp-venda-no-industria" })}
    >
      {children}
    </a>
  );
}
