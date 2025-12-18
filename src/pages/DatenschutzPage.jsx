import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

const DatenschutzPage = () => {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-50 py-20">
      <div className="max-w-3xl mx-auto px-4">
        
        <Link to="/" className="inline-flex items-center gap-2 text-slate-400 hover:text-white mb-8">
          <ArrowLeft size={20} /> Zurück zur Startseite
        </Link>

        <h1 className="text-4xl font-bold mb-8">Datenschutzerklärung</h1>

        <div className="space-y-6 text-slate-300">
          
          <section>
            <h2 className="text-xl font-semibold text-white mb-2">1. Datenschutz auf einen Blick</h2>
            <h3 className="font-medium text-white mt-4 mb-1">Allgemeine Hinweise</h3>
            <p className="text-sm">
              Die folgenden Hinweise geben einen einfachen Überblick darüber, was mit Ihren personenbezogenen Daten passiert, wenn Sie diese Website besuchen. Personenbezogene Daten sind alle Daten, mit denen Sie persönlich identifiziert werden können.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-2">2. Verantwortliche Stelle</h2>
            <p>
              AI Sales Systems<br />
              Weinberggasse 13/13<br />
              7201 Neudörfl<br />
              Österreich<br /><br />
              Telefon: +43 677 61783436<br />
              E-Mail: contact@alsales.ai
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-2">3. Datenerfassung auf dieser Website</h2>
            
            <h3 className="font-medium text-white mt-4 mb-1">Cookies</h3>
            <p className="text-sm">
              Unsere Website verwendet Cookies. Das sind kleine Textdateien, die Ihr Webbrowser auf Ihrem Endgerät speichert. Cookies helfen uns dabei, unser Angebot nutzerfreundlicher zu machen.
            </p>

            <h3 className="font-medium text-white mt-4 mb-1">Server-Log-Dateien</h3>
            <p className="text-sm">
              Der Provider der Seiten erhebt und speichert automatisch Informationen in sogenannten Server-Log-Dateien, die Ihr Browser automatisch an uns übermittelt.
            </p>

            <h3 className="font-medium text-white mt-4 mb-1">Kontaktformular & Registrierung</h3>
            <p className="text-sm">
              Wenn Sie sich auf unserer Plattform registrieren oder uns kontaktieren, werden die von Ihnen eingegebenen Daten (Name, E-Mail, etc.) zur Bearbeitung gespeichert. Diese Daten geben wir nicht ohne Ihre Einwilligung weiter.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-2">4. Analyse-Tools und Werbung</h2>
            <p className="text-sm">
              Wir nutzen ggf. Analyse-Tools zur Auswertung des Nutzerverhaltens. Details zu den einzelnen Tools finden Sie in den jeweiligen Abschnitten.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-2">5. Newsletter</h2>
            <p className="text-sm">
              Wenn Sie unseren Newsletter abonnieren, wird Ihre E-Mail-Adresse für Werbezwecke genutzt, bis Sie sich vom Newsletter abmelden. Die Abmeldung ist jederzeit möglich.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-2">6. Plugins und Tools</h2>
            
            <h3 className="font-medium text-white mt-4 mb-1">Stripe (Zahlungsabwicklung)</h3>
            <p className="text-sm">
              Für Zahlungen nutzen wir Stripe. Dabei werden Zahlungsdaten direkt an Stripe übermittelt. Weitere Infos: <a href="https://stripe.com/privacy" target="_blank" rel="noopener noreferrer" className="text-teal-400 hover:underline">https://stripe.com/privacy</a>
            </p>

            <h3 className="font-medium text-white mt-4 mb-1">OpenAI / Anthropic (KI-Dienste)</h3>
            <p className="text-sm">
              Für KI-Funktionen nutzen wir APIs von OpenAI und Anthropic. Ihre Chat-Eingaben werden zur Verarbeitung an diese Dienste übermittelt.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-2">7. Ihre Rechte</h2>
            <p className="text-sm">
              Sie haben jederzeit das Recht auf Auskunft, Berichtigung, Löschung und Einschränkung der Verarbeitung Ihrer personenbezogenen Daten. Kontaktieren Sie uns unter: <a href="mailto:contact@salesflow-system.com" className="text-teal-400 hover:underline">contact@salesflow-system.com</a>
            </p>
          </section>

        </div>
      </div>
    </div>
  );
};

export default DatenschutzPage;

