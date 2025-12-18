import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

const ImpressumPage = () => {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-50 py-20">
      <div className="max-w-3xl mx-auto px-4">
        
        <Link to="/" className="inline-flex items-center gap-2 text-slate-400 hover:text-white mb-8">
          <ArrowLeft size={20} /> Zurück zur Startseite
        </Link>

        <h1 className="text-4xl font-bold mb-8">Impressum</h1>

        <div className="space-y-6 text-slate-300">
          
          <section>
            <h2 className="text-xl font-semibold text-white mb-2">Angaben gemäß § 5 ECG</h2>
            <p>
              AI Sales Systems<br />
              Weinberggasse 13/13<br />
              7201 Neudörfl<br />
              Österreich
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-2">Kontakt</h2>
            <p>
              Telefon: +43 677 61783436<br />
              E-Mail: contact@alsales.ai
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-2">Vertreten durch</h2>
            <p>Alexander Lipovics (Geschäftsführer)</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-2">Umsatzsteuer-ID</h2>
            <p>
              Umsatzsteuer-Identifikationsnummer gemäß § 27a Umsatzsteuergesetz:<br />
              [ATU-Nummer einfügen wenn vorhanden]
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-2">Verantwortlich für den Inhalt</h2>
            <p>Alexander Lipovics</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-2">EU-Streitschlichtung</h2>
            <p>
              Die Europäische Kommission stellt eine Plattform zur Online-Streitbeilegung (OS) bereit:{' '}
              <a href="https://ec.europa.eu/consumers/odr/" target="_blank" rel="noopener noreferrer" className="text-teal-400 hover:underline">
                https://ec.europa.eu/consumers/odr/
              </a>
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-2">Haftungsausschluss</h2>
            <h3 className="font-medium text-white mt-4 mb-1">Haftung für Inhalte</h3>
            <p className="text-sm">
              Die Inhalte unserer Seiten wurden mit größter Sorgfalt erstellt. Für die Richtigkeit, Vollständigkeit und Aktualität der Inhalte können wir jedoch keine Gewähr übernehmen.
            </p>
            <h3 className="font-medium text-white mt-4 mb-1">Haftung für Links</h3>
            <p className="text-sm">
              Unser Angebot enthält Links zu externen Webseiten Dritter, auf deren Inhalte wir keinen Einfluss haben. Für die Inhalte der verlinkten Seiten ist stets der jeweilige Anbieter verantwortlich.
            </p>
          </section>

        </div>
      </div>
    </div>
  );
};

export default ImpressumPage;

