import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  ArrowRight, Check, Copy, CheckCircle, Zap, 
  Brain, Target, TrendingUp, Users, Award
} from 'lucide-react';

const PlaybookPage = () => {
  const [copiedIndex, setCopiedIndex] = useState(null);

  const handleCopy = (text, index) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const playbookSections = [
    {
      title: "1. AI-Powered Lead Qualification",
      content: `Nutze KI, um Leads automatisch zu qualifizieren:
- Bewertung nach BANT (Budget, Authority, Need, Timeline)
- Lead-Scoring basierend auf Verhalten und Profil
- Automatische Priorisierung der heißesten Leads
- Zeitersparnis: 80% weniger manuelle Arbeit`,
      icon: Target
    },
    {
      title: "2. Personalisierte Outreach-Sequenzen",
      content: `Erstelle maßgeschneiderte Sequenzen mit KI:
- Multi-Channel (Email, LinkedIn, WhatsApp)
- Dynamische Personalisierung basierend auf Firmendaten
- A/B-Testing für optimale Conversion
- Automatische Follow-ups zum perfekten Zeitpunkt`,
      icon: Zap
    },
    {
      title: "3. Einwandbehandlung mit KI-Coach",
      content: `Meistere jedes Gespräch mit KI-Unterstützung:
- Live-Einwandbehandlung während Calls
- Vordefinierte Antworten für häufige Objections
- Rollenspiel-Training mit KI
- Erfolgsrate: +45% mehr Closed Deals`,
      icon: Brain
    },
    {
      title: "4. Deal-Pipeline Management",
      content: `Behalte den Überblick über alle Deals:
- Automatische Pipeline-Updates
- Vorhersage von Close-Wahrscheinlichkeiten
- Alerts für kritische Deals
- Revenue-Forecasting mit KI`,
      icon: TrendingUp
    },
    {
      title: "5. Team-Performance Analytics",
      content: `Optimiere dein Sales-Team kontinuierlich:
- Individuelle Performance-Dashboards
- Best-Practice-Identifikation
- Automatische Coaching-Empfehlungen
- Team-Benchmarking und Leaderboards`,
      icon: Users
    }
  ];

  const testimonials = [
    {
      name: "Sarah M.",
      role: "Sales Director",
      company: "TechCorp",
      quote: "Umsatz +120% im ersten Quartal. Die KI-Strategien sind game-changing!"
    },
    {
      name: "Michael K.",
      role: "Founder",
      company: "StartupXYZ",
      quote: "Von 5 auf 25 Deals pro Monat. Das Playbook hat unser Business transformiert."
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      
      {/* Hero Section */}
      <section className="max-w-6xl mx-auto px-4 py-16 md:py-24 text-center">
        <div className="inline-block px-4 py-2 bg-teal-100 text-teal-700 rounded-full text-sm font-semibold mb-6">
          🚀 KOSTENLOSER LEAD MAGNET
        </div>
        <h1 className="text-5xl md:text-6xl font-extrabold text-gray-900 mb-6 leading-tight">
          Das AI Sales Playbook
          <br />
          <span className="text-teal-600">für 2025</span>
        </h1>
        <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
          Die 5 bewährten Strategien, die Top-Performer nutzen, um mit KI ihren Umsatz zu verdoppeln.
        </p>
        <div className="flex flex-wrap justify-center gap-4 mb-12">
          <div className="flex items-center gap-2 text-gray-700">
            <CheckCircle className="text-teal-600" size={20} />
            <span>5 bewährte Strategien</span>
          </div>
          <div className="flex items-center gap-2 text-gray-700">
            <CheckCircle className="text-teal-600" size={20} />
            <span>50+ Seiten Content</span>
          </div>
          <div className="flex items-center gap-2 text-gray-700">
            <CheckCircle className="text-teal-600" size={20} />
            <span>100% Praxiserprobt</span>
          </div>
        </div>
      </section>

      {/* Value Proposition */}
      <section className="max-w-6xl mx-auto px-4 py-16">
        <div className="bg-gradient-to-r from-teal-50 to-blue-50 rounded-2xl p-8 md:p-12">
          <h2 className="text-3xl font-bold text-gray-900 mb-6 text-center">
            Was du in diesem Playbook lernst:
          </h2>
          <div className="grid md:grid-cols-2 gap-6">
            {playbookSections.map((section, index) => (
              <div key={index} className="bg-white rounded-xl p-6 shadow-lg">
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-teal-100 rounded-lg">
                    <section.icon className="text-teal-600" size={24} />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-bold text-lg text-gray-900 mb-2">
                      {section.title}
                    </h3>
                    <p className="text-gray-600 whitespace-pre-line text-sm leading-relaxed">
                      {section.content}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Key Takeaways */}
      <section className="max-w-4xl mx-auto px-4 py-16">
        <h2 className="text-3xl font-bold text-gray-900 mb-8 text-center">
          Die 3 wichtigsten Erkenntnisse
        </h2>
        <div className="space-y-6">
          {[
            {
              title: "KI ersetzt nicht den Sales-Profi",
              content: "KI verstärkt deine Fähigkeiten. Die besten Ergebnisse erzielst du, wenn du menschliche Intuition mit KI-Effizienz kombinierst."
            },
            {
              title: "Personalization at Scale ist möglich",
              content: "Mit den richtigen Tools kannst du 1000 Leads genauso persönlich ansprechen wie 10 - und dabei 10x schneller sein."
            },
            {
              title: "Datengetriebene Entscheidungen gewinnen",
              content: "Top-Performer nutzen Analytics nicht nur für Reporting, sondern für proaktive Optimierung ihrer Sales-Prozesse."
            }
          ].map((item, index) => (
            <div key={index} className="bg-white border-2 border-gray-200 rounded-xl p-6 hover:border-teal-500 transition-colors">
              <h3 className="font-bold text-xl text-gray-900 mb-2">
                {item.title}
              </h3>
              <p className="text-gray-600">
                {item.content}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Social Proof */}
      <section className="max-w-6xl mx-auto px-4 py-16">
        <h2 className="text-3xl font-bold text-gray-900 mb-8 text-center">
          Was andere Sales-Profis sagen
        </h2>
        <div className="grid md:grid-cols-2 gap-6">
          {testimonials.map((testimonial, index) => (
            <div key={index} className="bg-white rounded-xl p-6 shadow-lg border border-gray-200">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 rounded-full bg-teal-100 flex items-center justify-center">
                  <Users className="text-teal-600" size={24} />
                </div>
                <div>
                  <p className="font-bold text-gray-900">{testimonial.name}</p>
                  <p className="text-sm text-gray-600">{testimonial.role} @ {testimonial.company}</p>
                </div>
              </div>
              <p className="text-gray-700 italic">"{testimonial.quote}"</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA Section */}
      <section className="max-w-4xl mx-auto px-4 py-16">
        <div className="bg-gradient-to-r from-teal-600 to-blue-600 rounded-2xl p-8 md:p-12 text-center text-white">
          <Award className="mx-auto mb-6" size={48} />
          <h2 className="text-4xl font-bold mb-4">
            Bereit, dein Sales-Game zu transformieren?
          </h2>
          <p className="text-xl mb-8 text-teal-100">
            Starte jetzt deine kostenlose 14-Tage-Testversion von Al Sales Systems
          </p>
          <Link to="/signup">
            <button className="bg-white text-teal-600 font-bold px-8 py-4 rounded-xl hover:bg-gray-100 transition-colors text-lg inline-flex items-center gap-2 shadow-lg">
              KOSTENLOS TESTEN - 14 TAGE GRATIS
              <ArrowRight className="inline" size={20} />
            </button>
          </Link>
          <p className="text-sm text-teal-100 mt-4">
            Keine Kreditkarte erforderlich • Jederzeit kündbar
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="max-w-6xl mx-auto px-4 py-8 text-center text-gray-500 text-sm">
        <p>© 2025 Al Sales Systems. Alle Rechte vorbehalten.</p>
      </footer>
    </div>
  );
};

export default PlaybookPage;

