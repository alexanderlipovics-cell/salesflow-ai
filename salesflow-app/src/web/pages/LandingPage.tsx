/**
 * ╔════════════════════════════════════════════════════════════════════════════╗
 * ║  FELLO - Landing Page                                                     ║
 * ║  Hero & Problem Section                                                    ║
 * ╚════════════════════════════════════════════════════════════════════════════╝
 */

import React, { useEffect, useRef } from 'react';

export default function LandingPage() {
  const heroRef = useRef<HTMLDivElement>(null);
  const problemRef = useRef<HTMLDivElement>(null);

  // Scroll-Animationen
  useEffect(() => {
    const observerOptions = {
      threshold: 0.1,
      rootMargin: '0px 0px -100px 0px',
    };

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('animate-fade-in-up');
        }
      });
    }, observerOptions);

    if (heroRef.current) {
      observer.observe(heroRef.current);
    }
    if (problemRef.current) {
      observer.observe(problemRef.current);
    }

    return () => observer.disconnect();
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-indigo-900">
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* HERO SECTION */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      <section
        ref={heroRef}
        className="relative min-h-screen flex items-center justify-center px-4 sm:px-6 lg:px-8 pt-20 pb-16 overflow-hidden"
      >
        {/* Gradient Background Overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-blue-600/20 via-purple-600/20 to-indigo-600/20" />
        
        {/* Animated Background Particles */}
        <div className="absolute inset-0 overflow-hidden">
          {[...Array(30)].map((_, i) => (
            <div
              key={i}
              className="absolute rounded-full bg-white/10 animate-pulse"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                width: `${Math.random() * 4 + 2}px`,
                height: `${Math.random() * 4 + 2}px`,
                animationDelay: `${Math.random() * 2}s`,
                animationDuration: `${Math.random() * 3 + 2}s`,
              }}
            />
          ))}
        </div>

        {/* Hero Content */}
        <div className="relative z-10 max-w-6xl mx-auto text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 mb-8 bg-white/10 backdrop-blur-md rounded-full border border-white/20">
            <span className="text-2xl">✨</span>
            <span className="text-sm font-semibold text-white">
              Vertikale Sales-KI für Networker, MLM & Makler
            </span>
          </div>

          {/* Headline */}
          <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-extrabold text-white mb-6 leading-tight">
            Weniger tippen.
            <br />
            <span className="bg-gradient-to-r from-cyan-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
              Mehr abschließen.
            </span>
          </h1>

          {/* Subheadline */}
          <p className="text-xl sm:text-2xl text-gray-300 mb-12 max-w-3xl mx-auto leading-relaxed">
            FELLO – deine Sales KI für Networker, MLM & Makler.
          </p>

          {/* Bullet Points */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12 max-w-4xl mx-auto">
            {[
              {
                icon: '⏱️',
                text: 'Spare bis zu 10 Stunden Schreibarbeit pro Woche',
              },
              {
                icon: '💶',
                text: 'Hole Umsatz aus Kontakten, die du längst vergessen hast',
              },
              {
                icon: '🛡️',
                text: 'Reduziere dein Risiko für teure Abmahnungen',
              },
              {
                icon: '🤖',
                text: 'Dupliziere deine Sprache mit einer vertikalen Sales-KI',
              },
            ].map((point, index) => (
              <div
                key={index}
                className="glass-card p-6 rounded-2xl border border-white/10 backdrop-blur-md bg-white/5 hover:bg-white/10 transition-all duration-300 hover:scale-105"
                style={{
                  animationDelay: `${index * 100}ms`,
                }}
              >
                <div className="flex items-start gap-4">
                  <span className="text-3xl flex-shrink-0">{point.icon}</span>
                  <p className="text-white text-lg font-medium">{point.text}</p>
                </div>
              </div>
            ))}
          </div>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-8">
            <button className="group relative px-8 py-4 bg-gradient-to-r from-cyan-500 to-purple-600 text-white font-bold rounded-xl shadow-lg shadow-purple-500/50 hover:shadow-xl hover:shadow-purple-500/70 transition-all duration-300 hover:scale-105 transform">
              <span className="relative z-10">Jetzt kostenlos starten</span>
              <div className="absolute inset-0 bg-gradient-to-r from-cyan-600 to-purple-700 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            </button>
            
            <button className="px-8 py-4 bg-white/10 backdrop-blur-md text-white font-bold rounded-xl border-2 border-white/20 hover:bg-white/20 transition-all duration-300 hover:scale-105 transform">
              Alle Pakete ansehen
            </button>
          </div>

          {/* Trust Badge */}
          <div className="flex items-center justify-center gap-2 text-gray-300">
            <svg
              className="w-5 h-5 text-green-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <span className="text-sm font-medium">
              14 Tage alle Funktionen testen. Keine Kreditkarte nötig.
            </span>
          </div>
        </div>

        {/* Scroll Indicator */}
        <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 animate-bounce">
          <svg
            className="w-6 h-6 text-white/60"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 14l-7 7m0 0l-7-7m7 7V3"
            />
          </svg>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* PROBLEM SECTION */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      <section
        ref={problemRef}
        className="relative py-24 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-indigo-900/50 to-purple-900/50"
      >
        <div className="max-w-4xl mx-auto">
          {/* Headline */}
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-white text-center mb-16">
            Wie viel sind dir{' '}
            <span className="bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent">
              10 Stunden extra Fokus
            </span>{' '}
            pro Woche wert?
          </h2>

          {/* Questions List */}
          <div className="space-y-6 mb-12">
            {[
              'Wie viel Zeit verbringst du täglich damit, E-Mails und Nachrichten zu schreiben?',
              'Wie viele Kontakte hast du in deiner Liste, die du nie wieder kontaktiert hast?',
              'Wie oft denkst du: "Hätte ich nur mehr Zeit für echte Verkaufsgespräche"?',
              'Wie viel kostet dich eine Abmahnung, wenn du versehentlich falsche Versprechen machst?',
              'Wie viele Leads gehen dir verloren, weil du nicht schnell genug antwortest?',
              'Wie viel Umsatz liegst du jeden Monat, weil du nicht alle Kontakte aktivierst?',
            ].map((question, index) => (
              <div
                key={index}
                className="glass-card p-6 rounded-xl border border-white/10 backdrop-blur-md bg-white/5 hover:bg-white/10 transition-all duration-300 hover:scale-[1.02] transform"
                style={{
                  animationDelay: `${index * 100}ms`,
                }}
              >
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-r from-cyan-500 to-purple-600 flex items-center justify-center text-white font-bold">
                    {index + 1}
                  </div>
                  <p className="text-white text-lg font-medium flex-1">{question}</p>
                </div>
              </div>
            ))}
          </div>

          {/* ROI Question */}
          <div className="glass-card p-8 rounded-2xl border-2 border-cyan-500/30 backdrop-blur-md bg-gradient-to-r from-cyan-500/10 to-purple-600/10 mb-12 text-center">
            <p className="text-2xl sm:text-3xl font-bold text-white mb-4">
              Was wäre, wenn du für{' '}
              <span className="bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent">
                29–119€ pro Monat
              </span>{' '}
              diese Probleme lösen könntest?
            </p>
            <p className="text-gray-300 text-lg">
              Statt 10 Stunden pro Woche zu tippen, könntest du{' '}
              <span className="text-cyan-400 font-semibold">10 zusätzliche Verkaufsgespräche</span>{' '}
              führen.
            </p>
          </div>

          {/* Transition Text */}
          <div className="text-center">
            <p className="text-2xl sm:text-3xl font-bold text-white mb-4">
              Genau hier setzt{' '}
              <span className="bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent">
                FELLO
              </span>{' '}
              an...
            </p>
            <p className="text-gray-300 text-lg max-w-2xl mx-auto">
              Eine vertikale Sales-KI, die deine Sprache lernt, deine Kontakte aktiviert und
              dein Risiko für Abmahnungen minimiert – während du dich auf das konzentrierst, was
              wirklich zählt: Verkaufen.
            </p>
          </div>
        </div>
      </section>

      {/* Custom Styles */}
      <style jsx>{`
        @keyframes fade-in-up {
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .animate-fade-in-up {
          animation: fade-in-up 0.6s ease-out forwards;
        }

        .glass-card {
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
        }

        .glass-card:hover {
          box-shadow: 0 12px 48px rgba(0, 0, 0, 0.4);
        }
      `}</style>
    </div>
  );
}

