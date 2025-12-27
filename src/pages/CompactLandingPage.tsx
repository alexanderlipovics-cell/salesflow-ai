import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  CheckCircle, 
  Play, 
  ArrowRight, 
  X, 
  Zap, 
  MessageSquare, 
  Clock, 
  Users, 
  Star, 
  Download,
  Menu,
  ChevronRight
} from 'lucide-react';

// --- COMPONENTS ---

const Button = ({ children, variant = 'primary', className = '', as: Component = 'button', to, ...props }) => {
  const baseStyle = "px-6 py-3 rounded-lg font-bold transition-all duration-200 flex items-center justify-center gap-2 transform hover:-translate-y-0.5";
  const variants = {
    primary: "bg-teal-500 hover:bg-teal-400 text-white shadow-lg shadow-teal-500/20",
    secondary: "bg-slate-800 hover:bg-slate-700 text-white border border-slate-700",
    outline: "border-2 border-teal-500/30 text-teal-400 hover:bg-teal-500/10",
    ghost: "text-slate-400 hover:text-white"
  };

  if (to) {
    return (
      <Link to={to} className={`${baseStyle} ${variants[variant]} ${className}`} {...props}>
        {children}
      </Link>
    );
  }

  return (
    <button className={`${baseStyle} ${variants[variant]} ${className}`} {...props}>
      {children}
    </button>
  );
};

const SectionBadge = ({ children }) => (
  <span className="inline-block px-3 py-1 mb-4 text-xs font-bold tracking-wider text-teal-400 uppercase bg-teal-500/10 rounded-full border border-teal-500/20">
    {children}
  </span>
);

// --- MAIN LANDING PAGE ---

const CompactLandingPage = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [email, setEmail] = useState('');

  const handlePlaybookSubmit = (e) => {
    e.preventDefault();
    // TODO: Save email and redirect to playbook
    window.location.href = '/playbook';
  };

  const handleAnchorClick = (e, targetId) => {
    e.preventDefault();
    const element = document.getElementById(targetId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
      setIsMenuOpen(false); // Close mobile menu
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50 font-sans selection:bg-teal-500/30">
      
      {/* NAVIGATION */}
      <nav className="fixed top-0 w-full z-50 bg-slate-950/80 backdrop-blur-md border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <Link to="/" className="flex items-center">
              <img 
                src="/alsales-logo-transparent.png" 
                alt="AlSales" 
                className="h-10"
              />
            </Link>
            
            <div className="hidden md:flex items-center gap-8">
              <a href="#features" onClick={(e) => handleAnchorClick(e, 'features')} className="text-slate-400 hover:text-white transition-colors">Features</a>
              <a href="#playbook" onClick={(e) => handleAnchorClick(e, 'playbook')} className="text-slate-400 hover:text-white transition-colors">Gratis Playbook</a>
              <a href="#pricing" onClick={(e) => handleAnchorClick(e, 'pricing')} className="text-slate-400 hover:text-white transition-colors">Preise</a>
              <Link to="/login" className="text-white font-medium hover:text-teal-400">Login</Link>
              <Button variant="primary" to="/signup" className="py-2 px-4 text-sm">Kostenlos testen</Button>
            </div>

            <div className="md:hidden">
              <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="text-slate-400">
                <Menu />
              </button>
            </div>
          </div>
          
          {/* Mobile Menu */}
          {isMenuOpen && (
            <div className="md:hidden py-4 border-t border-slate-800">
              <div className="flex flex-col gap-4">
                <a href="#features" onClick={(e) => handleAnchorClick(e, 'features')} className="text-slate-400 hover:text-white">Features</a>
                <a href="#playbook" onClick={(e) => handleAnchorClick(e, 'playbook')} className="text-slate-400 hover:text-white">Gratis Playbook</a>
                <a href="#pricing" onClick={(e) => handleAnchorClick(e, 'pricing')} className="text-slate-400 hover:text-white">Preise</a>
                <Link to="/login" className="text-white font-medium">Login</Link>
                <Button variant="primary" to="/signup">Kostenlos testen</Button>
              </div>
            </div>
          )}
        </div>
      </nav>

      {/* 1. HERO SECTION */}
      <section className="relative pt-32 pb-20 overflow-hidden">
        <div className="absolute top-20 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-teal-500/20 rounded-full blur-[120px] -z-10 opacity-50"></div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <img 
            src="/alsales-logo-transparent.png" 
            alt="AlSales" 
            className="h-20 w-auto mx-auto mb-6"
          />
          <SectionBadge>AI-Powered CRM 2.0</SectionBadge>
          
          <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight text-white mb-6 leading-tight">
            Schluss mit Zettelwirtschaft. <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-400 to-cyan-300">
              Dein Network auf Autopilot.
            </span>
          </h1>
          
          <p className="mt-4 max-w-2xl mx-auto text-xl text-slate-400 mb-10">
            Das erste CRM, das für dich denkt. Organisiere Kontakte, automatisiere Follow-ups und schließe 2x mehr Deals ab – ohne technische Vorkenntnisse.
          </p>
          
          <div className="flex flex-col sm:flex-row justify-center gap-4 mb-8">
            <Button variant="primary" to="/signup" className="text-lg px-8">
              Kostenlos testen <ArrowRight size={20} />
            </Button>
            <Button variant="secondary" className="text-lg px-8">
              <Play size={20} className="fill-current" /> 2-Minuten Demo
            </Button>
          </div>

          <div className="flex items-center justify-center gap-6 text-sm text-slate-500">
            <span className="flex items-center gap-1"><CheckCircle size={14} className="text-teal-500" /> 14 Tage kostenlos</span>
            <span className="flex items-center gap-1"><CheckCircle size={14} className="text-teal-500" /> Keine Kreditkarte</span>
            <span className="flex items-center gap-1"><CheckCircle size={14} className="text-teal-500" /> Jederzeit kündbar</span>
          </div>

          {/* Visual / Mockup */}
          <div className="mt-16 relative mx-auto max-w-5xl">
            <div className="rounded-xl border border-slate-800 bg-slate-900 shadow-2xl overflow-hidden aspect-[16/9] group relative">
              <div className="bg-slate-800 h-8 flex items-center px-4 gap-2 border-b border-slate-700">
                <div className="w-3 h-3 rounded-full bg-red-500/50"></div>
                <div className="w-3 h-3 rounded-full bg-yellow-500/50"></div>
                <div className="w-3 h-3 rounded-full bg-green-500/50"></div>
                <span className="ml-4 text-xs text-slate-500">alsales.ai/dashboard</span>
              </div>
              <div className="flex h-full items-center justify-center bg-slate-900 relative p-8">
                <div className="text-slate-600 text-lg">Dashboard Preview</div>
                <div className="absolute top-8 left-8 bg-slate-800 p-4 rounded-lg border border-slate-700 shadow-xl flex items-center gap-3 animate-pulse">
                  <div className="w-10 h-10 rounded-full bg-teal-500/20 flex items-center justify-center text-teal-400">
                    <MessageSquare size={20} />
                  </div>
                  <div>
                    <div className="text-xs text-slate-400">AI Vorschlag</div>
                    <div className="text-sm font-semibold text-white">Einwand behandeln?</div>
                  </div>
                </div>
              </div>
            </div>
            <div className="absolute -inset-4 bg-teal-500/20 blur-2xl -z-10 rounded-[2rem]"></div>
          </div>
        </div>
      </section>

      {/* 2. SOCIAL PROOF */}
      <section className="py-10 border-y border-slate-800 bg-slate-900/50">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <p className="text-sm font-semibold text-slate-500 uppercase tracking-widest mb-6">
            Bereits 500+ Networker von Top-Companies nutzen Al Sales Solutions
          </p>
          <div className="flex flex-wrap justify-center items-center gap-8 md:gap-16 opacity-60">
            <span className="text-xl font-bold">ZINZINO</span>
            <span className="text-xl font-bold">PM International</span>
            <span className="text-xl font-bold">LR Health & Beauty</span>
            <span className="text-xl font-bold italic">Ringana</span>
            <span className="text-xl font-bold">Herbalife</span>
          </div>
        </div>
      </section>

      {/* 3. PROBLEM SECTION */}
      <section className="py-24 bg-slate-950">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">Kennst du das?</h2>
            <p className="text-slate-400 max-w-2xl mx-auto">
              Die meisten Networker scheitern nicht am Produkt, sondern am Chaos.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                icon: <X size={32} />,
                color: "text-red-400",
                bg: "bg-red-500/10",
                title: "Chaos in den DMs",
                desc: "Hunderte Chats auf WhatsApp, Insta & Co. Du verlierst den Überblick, wer eigentlich Interesse hatte."
              },
              {
                icon: <Clock size={32} />,
                color: "text-orange-400",
                bg: "bg-orange-500/10",
                title: "Follow-ups vergessen",
                desc: "Das Geld liegt im Follow-up. Aber ohne System vergisst du 80% deiner potenziellen Partner."
              },
              {
                icon: <MessageSquare size={32} />,
                color: "text-purple-400",
                bg: "bg-purple-500/10",
                title: "Keine Ahnung was schreiben",
                desc: "Du starrst auf den Bildschirm und weißt nicht, wie du auf 'Zu teuer' antworten sollst."
              }
            ].map((item, i) => (
              <div key={i} className="bg-slate-900 p-8 rounded-2xl border border-slate-800 hover:border-slate-700 transition-colors">
                <div className={`w-14 h-14 rounded-xl ${item.bg} ${item.color} flex items-center justify-center mb-6`}>
                  {item.icon}
                </div>
                <h3 className="text-xl font-bold text-white mb-3">{item.title}</h3>
                <p className="text-slate-400 leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 4. SOLUTION / FEATURES */}
      <section id="features" className="py-24 bg-slate-900 relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-24">
          
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="order-2 lg:order-1 relative">
              <div className="absolute inset-0 bg-teal-500/20 blur-3xl rounded-full"></div>
              <div className="relative rounded-xl border border-slate-700 shadow-2xl bg-slate-800 overflow-hidden">
                <img 
                  src="/dashboard-screenshot.png" 
                  alt="Al Sales Solutions Dashboard" 
                  className="w-full h-auto"
                />
              </div>
            </div>
            <div className="order-1 lg:order-2">
              <SectionBadge>Smart Pipeline</SectionBadge>
              <h3 className="text-3xl font-bold text-white mb-4">Dein Business auf einen Blick.</h3>
              <p className="text-slate-400 text-lg mb-6">
                Schiebe Leads einfach von "Neu" zu "Kontaktiert" zu "Partner". Al Sales Solutions erinnert dich automatisch, wenn es Zeit für den nächsten Schritt ist.
              </p>
              <ul className="space-y-3">
                {['Visuelles Kanban Board', 'Automatische Erinnerungen', 'Drag & Drop Bedienung'].map((item, i) => (
                  <li key={i} className="flex items-center gap-3 text-slate-300">
                    <CheckCircle size={18} className="text-teal-400 shrink-0" /> {item}
                  </li>
                ))}
              </ul>
            </div>
            </div>

          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <SectionBadge>AI Assistant</SectionBadge>
              <h3 className="text-3xl font-bold text-white mb-4">Der perfekte Einwand-Killer.</h3>
              <p className="text-slate-400 text-lg mb-6">
                Ein Interessent schreibt "Keine Zeit"? Unsere AI generiert dir in Sekunden die perfekte Antwort, die den Einwand löst und den Termin bucht.
              </p>
              <ul className="space-y-3">
                {['GPT-4 Technologie', 'Lernfähig für dein Produkt', 'One-Click Antworten'].map((item, i) => (
                  <li key={i} className="flex items-center gap-3 text-slate-300">
                    <CheckCircle size={18} className="text-teal-400 shrink-0" /> {item}
                  </li>
                ))}
              </ul>
            </div>
            <div className="relative">
              <div className="absolute inset-0 bg-purple-500/20 blur-3xl rounded-full"></div>
              <div className="relative rounded-xl border border-slate-700 shadow-2xl bg-slate-800 overflow-hidden">
                <img 
                  src="/ai-chat-screenshot.png" 
                  alt="Al Sales Systems Chat" 
                  className="w-full h-auto"
                />
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* 5. LEAD MAGNET SECTION */}
      <section id="playbook" className="py-24 relative overflow-hidden">
        <div className="absolute inset-0 bg-teal-900/20"></div>
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-3xl p-8 md:p-12 border border-slate-700 shadow-2xl flex flex-col md:flex-row items-center gap-12">
            
            <div className="w-full md:w-1/3 flex justify-center">
              <div className="w-48 h-64 bg-gradient-to-br from-slate-800 to-slate-900 border border-teal-500/30 rounded-r-xl rounded-l-sm shadow-2xl flex flex-col items-center justify-center relative transform rotate-[-6deg] hover:rotate-0 transition-transform duration-300">
                <div className="absolute left-2 top-0 bottom-0 w-1 bg-slate-700/50"></div>
                <Zap size={48} className="text-teal-500 mb-4" />
                <span className="text-center font-bold text-white px-4">AI SALES<br/>PLAYBOOK</span>
              </div>
            </div>

            <div className="w-full md:w-2/3">
              <h2 className="text-3xl font-bold text-white mb-4">Hol dir den unfairen Vorteil.</h2>
              <p className="text-slate-400 mb-6">
                Lade dir unser kostenloses <strong className="text-white">AI Sales Playbook</strong> herunter. 7 Copy-Paste Prompts, mit denen unsere User ihre Abschlussquote verdoppelt haben.
              </p>
              
              <form onSubmit={handlePlaybookSubmit} className="flex flex-col sm:flex-row gap-3">
                <input 
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Deine beste E-Mail Adresse" 
                  required
                  className="flex-1 bg-slate-950 border border-slate-700 text-white px-4 py-3 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none"
                />
                <Button type="submit" variant="primary" className="whitespace-nowrap">
                  <Download size={18} /> Jetzt sichern
                </Button>
              </form>
              <p className="text-xs text-slate-500 mt-3">100% Kostenlos. Kein Spam. Abmeldung jederzeit.</p>
            </div>

          </div>
        </div>
      </section>

      {/* 6. TESTIMONIALS */}
      <section className="py-24 bg-slate-950">
        <div className="max-w-7xl mx-auto px-4">
          <h2 className="text-3xl font-bold text-center text-white mb-16">Erfolge aus der Community</h2>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                name: "Sarah M.",
                role: "Emerald Partner, Zinzino",
                text: "Ich habe früher 20 Stunden die Woche nur Listen gepflegt. Mit Al Sales Systems mach ich das in 2 Stunden am Sonntag. Mein Team ist explodiert."
              },
              {
                name: "Markus W.",
                role: "Sales Director",
                text: "Die AI Antworten sind gruselig gut. Ich habe letzte Woche 3 'kalte' Leads reaktiviert, die mich eigentlich geghostet hatten."
              },
              {
                name: "Julia K.",
                role: "Network Einsteigerin",
                text: "Perfekt für Anfänger. Ich wusste nie, wann ich wen kontaktieren soll. Al Sales Systems gibt mir jeden Tag einen klaren Plan."
              }
            ].map((t, i) => (
              <div key={i} className="bg-slate-900 p-6 rounded-xl border border-slate-800">
                <div className="flex items-center gap-1 mb-4">
                  {[1,2,3,4,5].map(star => <Star key={star} size={14} className="text-yellow-500 fill-current" />)}
                </div>
                <p className="text-slate-300 mb-6 italic">"{t.text}"</p>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-slate-800 rounded-full flex items-center justify-center text-slate-500 font-bold border border-slate-700">
                    {t.name[0]}
                  </div>
                  <div>
                    <div className="text-white font-medium text-sm">{t.name}</div>
                    <div className="text-teal-500 text-xs">{t.role}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 7. PRICING PREVIEW */}
      <section id="pricing" className="py-24 bg-slate-900 border-t border-slate-800">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold text-white mb-4">Investiere in dein Wachstum</h2>
          <p className="text-slate-400 mb-8">Fairer Preis. ROI meist nach dem ersten neuen Partner.</p>

          {/* Founders Pricing Banner */}
          <div className="text-center mb-8">
            <span className="inline-block bg-gradient-to-r from-amber-500 to-orange-500 text-white font-bold px-6 py-2 rounded-full text-sm">
              🔥 FOUNDERS PRICING - Nur noch 347 von 500 Plätzen!
            </span>
            <p className="text-slate-400 text-sm mt-2">Nur bei jährlicher Zahlung. Preis gilt für immer!</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto items-center">
            
            <div className="bg-slate-950 p-8 rounded-2xl border border-slate-800 hover:border-slate-700 transition-colors">
              <h3 className="text-slate-400 font-medium mb-2">Starter</h3>
              <div className="mb-2">
                <span className="line-through text-slate-500 text-lg">€588/Jahr</span>
              </div>
              <div className="text-3xl font-bold text-white mb-2">
                €290<span className="text-slate-400 text-lg font-normal">/Jahr</span>
              </div>
              <div className="text-green-400 text-sm mb-6">= €24/Monat • 51% sparen</div>
              <ul className="space-y-3 mb-8 text-left text-sm text-slate-400">
                <li className="flex gap-2"><CheckCircle size={16} className="text-teal-500 shrink-0" /> 100 Kontakte</li>
                <li className="flex gap-2"><CheckCircle size={16} className="text-teal-500 shrink-0" /> Basic AI Chat</li>
                <li className="flex gap-2"><CheckCircle size={16} className="text-teal-500 shrink-0" /> Pipeline View</li>
              </ul>
              <Button variant="secondary" to="/signup" className="w-full">Starten</Button>
              <p className="text-amber-400 text-xs mt-2">⏳ Founders-Preis für immer!</p>
            </div>

            <div className="bg-slate-800 p-8 rounded-2xl border-2 border-teal-500 shadow-2xl shadow-teal-500/10 relative transform md:scale-105 z-10">
              <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-teal-500 text-white text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wide">
                Bestseller
              </div>
              <h3 className="text-teal-400 font-medium mb-2">Builder</h3>
              <div className="mb-2">
                <span className="line-through text-slate-500 text-lg">€1.788/Jahr</span>
              </div>
              <div className="text-4xl font-bold text-white mb-2">
                €690<span className="text-slate-400 text-lg font-normal">/Jahr</span>
              </div>
              <div className="text-green-400 text-sm mb-6">= €58/Monat • 61% sparen</div>
              <ul className="space-y-3 mb-8 text-left text-sm text-slate-300">
                <li className="flex gap-2"><CheckCircle size={16} className="text-teal-400 shrink-0" /> 500 Kontakte</li>
                <li className="flex gap-2"><CheckCircle size={16} className="text-teal-400 shrink-0" /> GPT-4 AI</li>
                <li className="flex gap-2"><CheckCircle size={16} className="text-teal-400 shrink-0" /> Voice Input/Output</li>
                <li className="flex gap-2"><CheckCircle size={16} className="text-teal-400 shrink-0" /> Power Hour</li>
              </ul>
              <Button variant="primary" to="/signup" className="w-full">14 Tage kostenlos</Button>
              <p className="text-amber-400 text-xs mt-2">⏳ Founders-Preis für immer!</p>
            </div>

            <div className="bg-slate-950 p-8 rounded-2xl border border-slate-800 hover:border-slate-700 transition-colors">
              <h3 className="text-slate-400 font-medium mb-2">Leader</h3>
              <div className="mb-2">
                <span className="line-through text-slate-500 text-lg">€3.588/Jahr</span>
              </div>
              <div className="text-3xl font-bold text-white mb-2">
                €1.490<span className="text-slate-400 text-lg font-normal">/Jahr</span>
              </div>
              <div className="text-green-400 text-sm mb-6">= €124/Monat • 58% sparen</div>
              <ul className="space-y-3 mb-8 text-left text-sm text-slate-400">
                <li className="flex gap-2"><CheckCircle size={16} className="text-teal-500 shrink-0" /> Unbegrenzte Kontakte</li>
                <li className="flex gap-2"><CheckCircle size={16} className="text-teal-500 shrink-0" /> Team Features (3)</li>
                <li className="flex gap-2"><CheckCircle size={16} className="text-teal-500 shrink-0" /> Premium Support</li>
              </ul>
              <Button variant="secondary" to="/signup" className="w-full">Team starten</Button>
              <p className="text-amber-400 text-xs mt-2">⏳ Founders-Preis für immer!</p>
          </div>

          </div>
          
          <Link to="/pricing" className="inline-block mt-8 text-teal-400 hover:text-teal-300 font-medium">
            Alle Pläne vergleichen →
          </Link>
        </div>
      </section>

      {/* 8. FINAL CTA */}
      <section className="py-24 bg-gradient-to-t from-teal-900/20 to-slate-950 text-center relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-teal-500/50 to-transparent"></div>
        <div className="max-w-4xl mx-auto px-4 relative z-10">
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">Bereit für dein nächstes Level?</h2>
          <p className="text-xl text-slate-300 mb-8">
            Werde einer der ersten 100 Gründer-Mitglieder und sichere dir den aktuellen Preis auf Lebenszeit.
          </p>
          <div className="flex flex-col items-center gap-4">
            <Button variant="primary" to="/signup" className="text-xl px-12 py-4 shadow-teal-500/40">
              Jetzt kostenlos starten <ChevronRight size={24} />
            </Button>
            <p className="text-sm text-slate-500 mt-2">Kein Risiko. Kündigung per Klick im Profil.</p>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="bg-slate-950 border-t border-slate-800 pt-12 pb-8">
        <div className="max-w-7xl mx-auto px-4 flex flex-col md:flex-row justify-between items-center gap-6">
          <Link to="/" className="flex items-center">
            <img 
              src="/alsales-logo-transparent.png" 
              alt="AlSales" 
              className="h-8"
            />
          </Link>
          <div className="text-slate-500 text-sm flex gap-6">
            <Link to="/impressum" className="hover:text-white">Impressum</Link>
            <Link to="/datenschutz" className="hover:text-white">Datenschutz</Link>
            <Link to="/agb" className="hover:text-white">AGB</Link>
          </div>
          <div className="text-slate-600 text-sm">
            © 2025 Al Sales Systems. Made with ❤️ in DACH.
          </div>
        </div>
      </footer>

    </div>
  );
};

export default CompactLandingPage;