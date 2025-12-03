import { useEffect, useRef, useState } from "react";
import "../styles/marketing-landing.css";

type ItemWithIcon = {
  title: string;
  description: string;
  icon: JSX.Element;
};

type FeatureCard = ItemWithIcon & {
  bullets: string[];
};

type ModuleCard = ItemWithIcon;

type PricingPlan = {
  name: string;
  description: string;
  price: string;
  period: string;
  features: string[];
  featured?: boolean;
  showMonthlyLabel?: boolean;
};

type TimelineStep = {
  week: string;
  title: string;
  description: string;
};

type FAQItem = {
  question: string;
  answer: string;
};

const CheckIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

const ArrowIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <path d="M5 12h14" />
    <path d="M12 5l7 7-7 7" />
  </svg>
);

const PlusIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="5" x2="12" y2="19" />
    <line x1="5" y1="12" x2="19" y2="12" />
  </svg>
);

const LogoIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="var(--color-bg)" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
  </svg>
);

const problemCards: ItemWithIcon[] = [
  {
    title: "Leads bleiben liegen",
    description: "Follow-ups werden vergessen oder zu spät gemacht. Umsatz geht verloren.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <path d="M12 6v6l4 2" />
      </svg>
    ),
  },
  {
    title: "Ungleiche Performance",
    description: "Top-Verkäufer liefern konstant – der Rest kämpft ohne System hinterher.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
  },
  {
    title: "Skripte verstauben",
    description: "Es gibt Playbooks, aber keiner nutzt sie konsequent im Alltag.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <path d="M14 2v6h6" />
        <path d="M16 13H8" />
        <path d="M16 17H8" />
        <path d="M10 9H8" />
      </svg>
    ),
  },
  {
    title: "Lange Onboarding-Zeit",
    description: "Neue Mitarbeiter brauchen Wochen oder Monate, bis sie wirklich performen.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2v4" />
        <path d="M12 18v4" />
        <path d="M4.93 4.93l2.83 2.83" />
        <path d="M16.24 16.24l2.83 2.83" />
        <path d="M2 12h4" />
        <path d="M18 12h4" />
        <path d="M4.93 19.07l2.83-2.83" />
        <path d="M16.24 7.76l2.83-2.83" />
      </svg>
    ),
  },
];

const featureCards: FeatureCard[] = [
  {
    title: "Ein KI-Copilot pro Verkäufer",
    description: "Jeder bekommt seinen persönlichen Assistenten, der den Alltag erleichtert.",
    bullets: [
      "Schreibt WhatsApp- und Mail-Texte in eurem Stil",
      "Kennt eure Produkte, Preise, Angebote",
      "Hilft bei Einwänden und Follow-ups",
    ],
    icon: (
      <svg viewBox="0 0 24 24" fill="none" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
        <circle cx="12" cy="7" r="4" />
      </svg>
    ),
  },
  {
    title: "Einheitliches Sales-Playbook",
    description: "Eure besten Praktiken werden zum Standard für alle.",
    bullets: [
      "Skripte werden standardisiert",
      "Top-Verkäufer werden replizierbar",
      "Neue Mitarbeiter sind schneller produktiv",
    ],
    icon: (
      <svg viewBox="0 0 24 24" fill="none" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
        <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
      </svg>
    ),
  },
  {
    title: "Sales-Flow statt Zufall",
    description: "Struktur und System statt Arbeit auf Zuruf.",
    bullets: [
      "Kein Lead bleibt mehr liegen",
      "Follow-ups sind geplant, nicht spontan",
      "Außen- und Innendienst nutzen ein System",
    ],
    icon: (
      <svg viewBox="0 0 24 24" fill="none" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
      </svg>
    ),
  },
];

const modules: ModuleCard[] = [
  {
    title: "Lead-Hunter",
    description:
      "Findet und strukturiert neue Leads (Makler, Networker, B2B) und übergibt sie direkt an euer Team.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        <circle cx="11" cy="11" r="8" />
        <path d="M21 21l-4.35-4.35" />
      </svg>
    ),
  },
  {
    title: "Phönix – Außendienst-Copilot",
    description: "30 Minuten zu früh? Phönix schlägt Bestandskunden und Leads in der Nähe vor – inklusive Text.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
        <circle cx="12" cy="10" r="3" />
      </svg>
    ),
  },
  {
    title: "Delay-Master",
    description: "Perfekte, wertschätzende Nachrichten bei Verspätung – ein Klick, fertige Vorlage.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <path d="M12 6v6l4 2" />
      </svg>
    ),
  },
  {
    title: "Follow-up-Engine",
    description: "Vordefinierte Sequenzen: Danke, Mehrwert, Urgency, Reaktivierung – immer im Stil des Verkäufers.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
        <polyline points="22 4 12 14.01 9 11.01" />
      </svg>
    ),
  },
  {
    title: "Einwand-Killer",
    description: "KI lernt eure häufigsten Einwände und gibt konkrete Antwort-Vorschläge für jeden Verkäufer.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
      </svg>
    ),
  },
];

const pricingPlans: PricingPlan[] = [
  {
    name: "Team 10",
    description: "Bis 10 aktive Nutzer",
    price: "1.200 €",
    period: "Ideal für kleine Sales-Teams",
    features: ["Alle Module inklusive", "Laufende Updates", "E-Mail Support"],
    showMonthlyLabel: true,
  },
  {
    name: "Growth 25",
    description: "Bis 25 aktive Nutzer",
    price: "2.400 €",
    period: "Für wachsende Teams",
    features: ["Alle Module inklusive", "Priority Support", "Monatlicher Strategie-Check"],
    featured: true,
    showMonthlyLabel: true,
  },
  {
    name: "Scale 50",
    description: "Bis 50 aktive Nutzer",
    price: "3.900 €",
    period: "Für etablierte Vertriebsteams",
    features: ["Alle Module inklusive", "Dedicated Account Manager", "Custom Integrations"],
    showMonthlyLabel: true,
  },
  {
    name: "Enterprise 100+",
    description: "Ab 100 Nutzer",
    price: "Individuell",
    period: "Preis & Scope nach Vereinbarung",
    features: ["Alle Features von Scale", "SLA-Garantien", "On-Premise Option"],
    showMonthlyLabel: false,
  },
];

const timeline: TimelineStep[] = [
  {
    week: "Woche 1-2",
    title: "Kickoff & Playbook",
    description:
      "60-90 Minuten Workshop mit der Sales-Leitung. Wir sammeln eure Skripte, Mails und Einwände – ihr bekommt einen ersten nutzbaren AI-Copilot.",
  },
  {
    week: "Woche 3-6",
    title: "Pilot mit 10-20 Verkäufern",
    description: "Live-Einsatz in einem ausgewählten Team. Wir sehen, wo die größte Wirkung ist und optimieren eure Vorlagen.",
  },
  {
    week: "Ab Woche 7",
    title: "Rollout auf 50-100+",
    description: "Team-Trainings, interne Champions bekommen Support, monatliche Reviews mit der Sales-Leitung.",
  },
];

const faqItems: FAQItem[] = [
  {
    question: "Ersetzt das unsere Verkäufer?",
    answer:
      "Nein. Sales Flow AI ersetzt nicht den Menschen, sondern den Chaos-Teil: Formulierungen, Nachfassen, Einwandstrukturen. Deine Verkäufer haben mehr Zeit für echte Gespräche – und performen besser.",
  },
  {
    question: "Wie aufwendig ist das für uns?",
    answer:
      "Wir brauchen am Anfang ca. 1-2 Workshops und eure bestehenden Unterlagen (Skripte, Mails, Einwand-Listen). Danach können die ersten 10 Verkäufer schon live arbeiten. Kein monatelanges Projekt.",
  },
  {
    question: "Was ist, wenn es bei uns nicht funktioniert?",
    answer:
      "Im Zweifel stoppen wir nach dem Pilot. Ihr geht kein Risiko auf 5 Jahre ein – wir starten klein und skalieren nur, wenn es messbar Sinn macht. Transparente Zahlen, keine Überraschungen.",
  },
  {
    question: "Für welche Branchen funktioniert das?",
    answer:
      "Innen- und Außendienst, Network Marketing, Makler, Finance, B2B-Sales – überall dort, wo Vertriebsteams mit Leads arbeiten und Follow-ups machen. Die Module werden auf eure Branche angepasst.",
  },
];

const MarketingLandingPage = () => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) {
      return;
    }

    const cards = container.querySelectorAll<HTMLElement>(".ml-card");
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("ml-visible");
            entry.target.classList.remove("ml-hidden");
            observer.unobserve(entry.target);
          }
        });
      },
      {
        threshold: 0.1,
        rootMargin: "0px 0px -50px 0px",
      }
    );

    cards.forEach((card) => {
      card.classList.add("ml-hidden");
      observer.observe(card);
    });

    return () => observer.disconnect();
  }, []);

  const toggleFaq = (index: number) => {
    setOpenFaqIndex((prev) => (prev === index ? null : index));
  };

  return (
    <div className="marketing-landing" ref={containerRef}>
      <div className="bg-gradient" aria-hidden="true" />

      <nav>
        <div className="nav-inner">
          <a href="#hero" className="logo">
            <div className="logo-icon">
              <LogoIcon />
            </div>
            Sales Flow AI
          </a>
          <a href="#contact" className="nav-cta">
            Erstgespräch buchen
          </a>
        </div>
      </nav>

      <main>
        <section className="hero" id="hero">
          <div className="hero-inner">
            <div className="hero-content">
              <div className="hero-badge">Für Teams ab 10 Vertrieblern</div>
              <h1>
                Mehr Abschlüsse,
                <br />
                weniger Chaos,
                <br />
                <span className="accent">ein Standard.</span>
              </h1>
              <p className="hero-subtitle">
                Wir machen aus deinem Vertrieb ein System: jeder Verkäufer bekommt einen eigenen KI-Copilot – trainiert mit eurem Playbook,
                euren Produkten und euren Prozessen.
              </p>
              <div className="hero-cta-group">
                <a href="#contact" className="btn-primary">
                  Erstgespräch buchen
                  <ArrowIcon />
                </a>
                <a href="#features" className="btn-secondary">
                  Mehr erfahren
                </a>
              </div>
            </div>
            <div className="hero-visual">
              <div className="hero-card">
                <div className="chat-demo">
                  <div className="chat-message">
                    <div className="chat-avatar user">MK</div>
                    <div className="chat-bubble">Kunde sagt "zu teuer" - was antworte ich?</div>
                  </div>
                  <div className="chat-message">
                    <div className="chat-avatar ai">AI</div>
                    <div className="chat-bubble ai">
                      <div className="typing-indicator">
                        <span />
                        <span />
                        <span />
                      </div>
                    </div>
                  </div>
                  <div className="chat-message">
                    <div className="chat-avatar ai">AI</div>
                    <div className="chat-bubble ai">
                      Verstehe ich total. Darf ich fragen: Zu teuer verglichen womit? Oft liegt es am Vergleich mit Angeboten, die weniger Leistung bieten...
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="problem-section" aria-labelledby="problem-section-title">
          <div className="section-inner">
            <div className="section-header">
              <p className="section-label">Das Problem</p>
              <h2 id="problem-section-title">Was heute im Vertrieb schiefläuft</h2>
            </div>
            <div className="problem-grid">
              {problemCards.map((card, index) => (
                <div className="problem-card ml-card" key={card.title} style={{ transitionDelay: `${index * 0.1}s` }}>
                  <div className="problem-icon">{card.icon}</div>
                  <h3>{card.title}</h3>
                  <p>{card.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="features" aria-labelledby="features-title">
          <div className="section-inner">
            <div className="section-header">
              <p className="section-label">Die Lösung</p>
              <h2 id="features-title">Was Sales Flow AI in deinem Team macht</h2>
              <p className="section-subtitle">Ein System, das jedem Verkäufer hilft – nicht nur den Top-Performern.</p>
            </div>
            <div className="features-grid">
              {featureCards.map((feature, index) => (
                <div className="feature-card ml-card" key={feature.title} style={{ transitionDelay: `${index * 0.1}s` }}>
                  <div className="feature-icon">{feature.icon}</div>
                  <h3>{feature.title}</h3>
                  <p>{feature.description}</p>
                  <ul className="feature-list">
                    {feature.bullets.map((bullet) => (
                      <li key={bullet}>{bullet}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="modules-section" aria-labelledby="modules-title">
          <div className="section-inner">
            <div className="section-header">
              <p className="section-label">Module</p>
              <h2 id="modules-title">Tools, die eurem Vertrieb sofort helfen</h2>
            </div>
            <div className="modules-grid">
              {modules.map((module, index) => (
                <div className="module-card ml-card" key={module.title} style={{ transitionDelay: `${index * 0.1}s` }}>
                  <div className="module-icon">{module.icon}</div>
                  <div className="module-content">
                    <h3>{module.title}</h3>
                    <p>{module.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="pricing-section" id="pricing" aria-labelledby="pricing-title">
          <div className="section-inner">
            <div className="section-header">
              <p className="section-label">Preise</p>
              <h2 id="pricing-title">Klar und skalierbar</h2>
              <p className="section-subtitle">Monatliche Lizenz je nach Teamgröße – alle Preise zzgl. USt.</p>
            </div>
            <div className="pricing-grid">
              {pricingPlans.map((plan, index) => (
                <div
                  className={`pricing-card ml-card${plan.featured ? " featured" : ""}`}
                  key={plan.name}
                  style={{ transitionDelay: `${index * 0.1}s` }}
                >
                  <h3>{plan.name}</h3>
                  <p className="desc">{plan.description}</p>
                  <p className="price">
                    {plan.price} {plan.showMonthlyLabel !== false && <span>/Monat</span>}
                  </p>
                  <p className="period">{plan.period}</p>
                  <ul className="pricing-features">
                    {plan.features.map((feature) => (
                      <li key={feature}>
                        <CheckIcon />
                        {feature}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
            <div className="setup-box">
              <div className="setup-info">
                <h3>Einmaliges Setup (Pflicht)</h3>
                <p>Analyse, KI-Setup, Import, 1-2 Live-Trainings für euer Team</p>
              </div>
              <div className="setup-price">ab 9.800 €</div>
            </div>
          </div>
        </section>

        <section className="timeline-section" aria-labelledby="timeline-title">
          <div className="section-inner">
            <div className="section-header">
              <p className="section-label">Ablauf</p>
              <h2 id="timeline-title">So führen wir Sales Flow AI ein</h2>
            </div>
            <div className="timeline">
              {timeline.map((step, index) => (
                <div className="timeline-step ml-card" key={step.title} style={{ transitionDelay: `${index * 0.15}s` }}>
                  <div className="timeline-marker">
                    <span>{index + 1}</span>
                  </div>
                  <p className="week">{step.week}</p>
                  <h3>{step.title}</h3>
                  <p>{step.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="faq" aria-labelledby="faq-title">
          <div className="section-inner">
            <div className="section-header">
              <p className="section-label">FAQ</p>
              <h2 id="faq-title">Häufig gestellte Fragen</h2>
            </div>
            <div className="faq-grid">
              {faqItems.map((item, index) => {
                const isOpen = openFaqIndex === index;
                return (
                  <div className={`faq-item ml-card${isOpen ? " open" : ""}`} key={item.question}>
                    <button
                      type="button"
                      className="faq-question"
                      onClick={() => toggleFaq(index)}
                      aria-expanded={isOpen}
                      aria-controls={`faq-answer-${index}`}
                    >
                      <h3>{item.question}</h3>
                      <div className="faq-toggle">
                        <PlusIcon />
                      </div>
                    </button>
                    <div className="faq-answer" id={`faq-answer-${index}`}>
                      <p>{item.answer}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        <section className="cta-section" id="contact">
          <div className="cta-box ml-card">
            <h2>Bereit für mehr Abschlüsse?</h2>
            <p>45 Minuten, kostenlos – wir prüfen gemeinsam, ob Sales Flow AI zu deinem Team passt und rechnen durch, ob es sich lohnt.</p>
            <a href="#contact" className="btn-primary">
              Erstgespräch buchen
              <ArrowIcon />
            </a>
          </div>
        </section>
      </main>

      <footer>
        <div className="footer-inner">
          <div className="footer-brand">
            <div className="logo-icon" style={{ width: 24, height: 24, borderRadius: 6 }}>
              <LogoIcon />
            </div>
            <span>Sales Flow AI</span>
          </div>
          <div className="footer-links">
            <a href="#">Impressum</a>
            <a href="#">Datenschutz</a>
            <a href="#contact">Kontakt</a>
          </div>
          <p className="footer-copy">© 2025 Sales Flow AI. Alle Rechte vorbehalten.</p>
        </div>
      </footer>
    </div>
  );
};

export default MarketingLandingPage;

