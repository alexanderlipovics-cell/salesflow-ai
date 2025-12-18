import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

const AGBPage = () => {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-50 py-20">
      <div className="max-w-3xl mx-auto px-4">
        
        <Link to="/" className="inline-flex items-center gap-2 text-slate-400 hover:text-white mb-8">
          <ArrowLeft size={20} /> Zurück zur Startseite
        </Link>

        <h1 className="text-4xl font-bold mb-8">Allgemeine Geschäftsbedingungen</h1>

        <div className="space-y-6 text-slate-300 text-sm">
          
          <section>
            <h2 className="text-xl font-semibold text-white mb-3">§ 1 Geltungsbereich</h2>
            <p>
              Diese Allgemeinen Geschäftsbedingungen (AGB) gelten für alle Verträge zwischen Al Sales Systems, Weinberggasse 13/13, 7201 Neudörfl, Österreich (nachfolgend "Anbieter") und dem Kunden (nachfolgend "Nutzer") über die Nutzung der SaaS-Plattform "Al Sales Systems".
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">§ 2 Vertragsgegenstand</h2>
            <p>
              Der Anbieter stellt dem Nutzer eine webbasierte CRM- und Vertriebsplattform mit KI-Funktionen zur Verfügung. Der Funktionsumfang richtet sich nach dem gewählten Tarif (Starter, Builder, Leader).
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">§ 3 Vertragsschluss & Registrierung</h2>
            <p>
              (1) Die Registrierung erfolgt über die Website. Mit Abschluss der Registrierung kommt ein Nutzungsvertrag zustande.<br/><br/>
              (2) Der Nutzer muss mindestens 18 Jahre alt sein und garantiert die Richtigkeit seiner Angaben.<br/><br/>
              (3) Ein kostenloser Testzeitraum von 14 Tagen kann angeboten werden.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">§ 4 Preise & Zahlung</h2>
            <p>
              (1) Die aktuellen Preise sind auf der Website einsehbar. Alle Preise verstehen sich inklusive der gesetzlichen Mehrwertsteuer.<br/><br/>
              (2) Die Zahlung erfolgt monatlich oder jährlich im Voraus per Kreditkarte oder anderen angebotenen Zahlungsmethoden über unseren Zahlungsdienstleister Stripe.<br/><br/>
              (3) Bei Zahlungsverzug kann der Zugang zur Plattform gesperrt werden.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">§ 5 Laufzeit & Kündigung</h2>
            <p>
              (1) Der Vertrag läuft auf unbestimmte Zeit und kann jederzeit zum Ende des Abrechnungszeitraums gekündigt werden.<br/><br/>
              (2) Die Kündigung erfolgt über das Nutzerkonto oder per E-Mail an contact@alsales.ai.<br/><br/>
              (3) Nach Kündigung werden die Nutzerdaten nach 30 Tagen gelöscht, sofern keine gesetzlichen Aufbewahrungspflichten bestehen.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">§ 6 Nutzungsrechte & Pflichten</h2>
            <p>
              (1) Der Nutzer erhält ein nicht-exklusives, nicht übertragbares Recht zur Nutzung der Plattform.<br/><br/>
              (2) Der Nutzer verpflichtet sich, die Plattform nicht missbräuchlich zu nutzen, keine rechtswidrigen Inhalte zu speichern und seine Zugangsdaten geheim zu halten.<br/><br/>
              (3) Der Nutzer ist für alle unter seinem Account vorgenommenen Handlungen verantwortlich.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">§ 7 Verfügbarkeit & Support</h2>
            <p>
              (1) Der Anbieter bemüht sich um eine Verfügbarkeit von 99% im Jahresmittel. Wartungsarbeiten werden nach Möglichkeit angekündigt.<br/><br/>
              (2) Support ist per E-Mail und Chat verfügbar. Reaktionszeiten richten sich nach dem gewählten Tarif.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">§ 8 Datenschutz</h2>
            <p>
              Die Verarbeitung personenbezogener Daten erfolgt gemäß unserer Datenschutzerklärung unter{' '}
              <Link to="/datenschutz" className="text-teal-400 hover:underline">/datenschutz</Link>.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">§ 9 Haftung</h2>
            <p>
              (1) Der Anbieter haftet unbeschränkt für Vorsatz und grobe Fahrlässigkeit.<br/><br/>
              (2) Für leichte Fahrlässigkeit haftet der Anbieter nur bei Verletzung wesentlicher Vertragspflichten, begrenzt auf den vorhersehbaren, vertragstypischen Schaden.<br/><br/>
              (3) Die Haftung für Datenverlust ist auf den typischen Wiederherstellungsaufwand begrenzt.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">§ 10 Änderungen der AGB</h2>
            <p>
              Der Anbieter kann diese AGB mit einer Ankündigungsfrist von 4 Wochen ändern. Der Nutzer wird per E-Mail informiert. Widerspricht der Nutzer nicht innerhalb von 4 Wochen, gelten die neuen AGB als akzeptiert.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">§ 11 Schlussbestimmungen</h2>
            <p>
              (1) Es gilt österreichisches Recht unter Ausschluss des UN-Kaufrechts.<br/><br/>
              (2) Gerichtsstand ist Eisenstadt, Österreich, sofern der Nutzer Unternehmer ist.<br/><br/>
              (3) Sollten einzelne Bestimmungen unwirksam sein, bleibt die Wirksamkeit der übrigen Bestimmungen unberührt.
            </p>
          </section>

          <section className="pt-6 border-t border-slate-800">
            <p className="text-slate-500">
              Stand: Dezember 2025<br/>
              AI Sales Systems, Neudörfl, Österreich
            </p>
          </section>

        </div>
      </div>
    </div>
  );
};

export default AGBPage;

