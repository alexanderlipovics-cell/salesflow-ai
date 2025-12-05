import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEYS = {
  COMPANY: 'onboarding_company',
  GOAL: 'onboarding_goal',
  COMPLETE: 'onboarding_complete',
};

/**
 * Speichert die ausgewählte Firma
 */
export async function saveCompany(company: string): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEYS.COMPANY, company);
}

/**
 * Speichert das ausgewählte Ziel
 */
export async function saveGoal(goal: string): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEYS.GOAL, goal);
}

/**
 * Holt die ausgewählte Firma
 */
export async function getSelectedCompany(): Promise<string | null> {
  return AsyncStorage.getItem(STORAGE_KEYS.COMPANY);
}

/**
 * Holt das ausgewählte Ziel
 */
export async function getSelectedGoal(): Promise<string | null> {
  return AsyncStorage.getItem(STORAGE_KEYS.GOAL);
}

/**
 * Markiert das Onboarding als abgeschlossen
 */
export async function completeOnboarding(): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEYS.COMPLETE, 'true');
}

/**
 * Prüft ob das Onboarding abgeschlossen ist
 */
export async function checkOnboardingComplete(): Promise<boolean> {
  const value = await AsyncStorage.getItem(STORAGE_KEYS.COMPLETE);
  return value === 'true';
}

/**
 * Setzt das Onboarding zurück (für Entwicklung/Testing)
 */
export async function resetOnboarding(): Promise<void> {
  await AsyncStorage.multiRemove([
    STORAGE_KEYS.COMPANY,
    STORAGE_KEYS.GOAL,
    STORAGE_KEYS.COMPLETE,
  ]);
}

/**
 * Generiert das Magic Script basierend auf Firma und Ziel
 */
export function getMagicScript(company: string, goal: string): string {
  const scripts: Record<string, Record<string, string>> = {
    LR: {
      TEAM: `Hey! 👋 Ich habe ein spannendes Projekt, das ich dir zeigen möchte.

Stell dir vor: Ein Firmenwagen deiner Wahl, komplett bezahlt. Klingt gut?

Bei LR Health & Beauty ist das Realität für viele Partner. Ich baue gerade mein Team auf und suche motivierte Leute.

Hast du 15 Minuten für einen kurzen Call? Ich zeige dir, wie das funktioniert – ohne Druck, nur Infos.`,

      CUSTOMER: `Hi! 😊 

Ich wollte dir kurz von etwas erzählen, das mir persönlich sehr geholfen hat.

Kennst du das Gefühl, wenn du morgens aufwachst und dich einfach nicht fit fühlst? Das Aloe Vera Drinking Gel von LR hat das bei mir komplett verändert.

Es unterstützt die Verdauung, stärkt das Immunsystem und gibt mir mehr Energie.

Soll ich dir mehr darüber erzählen? Ich kann dir auch eine Probe schicken!`,

      BOTH: `Hey! 👋

Ich arbeite mit LR Health & Beauty und bin total begeistert – sowohl von den Produkten als auch von der Möglichkeit.

Die Aloe-Produkte sind der Hammer für Gesundheit & Wohlbefinden. Und das Geschäftsmodell? Partner fahren Firmenwagen und bauen sich ein echtes Einkommen auf.

Was interessiert dich mehr – die Produkte oder die Business-Seite? Ich erzähl dir gerne mehr!`,
    },
    ZINZINO: {
      TEAM: `Hi! 👋

Ich habe etwas entdeckt, das mich echt umgehauen hat.

Zinzino ist ein Unternehmen, das auf Wissenschaft setzt. Der Clou: Du kannst deinen Omega-Balance mit einem Bluttest messen – und dann gezielt verbessern.

Das Beste? Als Partner hilfst du Menschen, gesünder zu leben UND baust dir ein Business auf.

Hast du Lust, mehr zu erfahren? Ich zeige dir, wie der Einstieg funktioniert.`,

      CUSTOMER: `Hey! 😊

Wusstest du, dass 97% der Menschen ein Omega-6/3 Ungleichgewicht haben? Das beeinflusst alles – Energie, Fokus, sogar die Haut.

Zinzino bietet einen Bluttest, der dir zeigt, wo du stehst. Und dann Produkte, die das gezielt ausgleichen.

Ich hab's selbst getestet und meine Werte haben sich in 4 Monaten deutlich verbessert.

Soll ich dir zeigen, wie der Test funktioniert?`,

      BOTH: `Hi! 👋

Zinzino hat mich doppelt überzeugt: Die Wissenschaft hinter den Produkten ist top, und als Business eine echte Chance.

Der Balance Test zeigt dir deinen Omega-Status – dann optimierst du mit den richtigen Produkten. Messbare Ergebnisse!

Und als Partner? Du hilfst Menschen gesünder zu leben und verdienst dabei.

Was interessiert dich mehr – der Test oder die Business-Seite?`,
    },
    HERBALIFE: {
      TEAM: `Hey! 💪

Ich baue gerade etwas Cooles auf und suche Leute, die mit mir durchstarten wollen.

Mit Herbalife kannst du Menschen helfen, ihre Fitnessziele zu erreichen – und dabei selbst erfolgreich werden. 

Viele starten nebenberuflich und bauen sich ein zweites Einkommen auf.

Hast du Interesse, mehr zu erfahren? Ich zeige dir, wie der Einstieg funktioniert!`,

      CUSTOMER: `Hi! 😊

Ich wollte dir kurz von meinem neuen Lieblings-Shake erzählen.

Der Formula 1 von Herbalife ist perfekt für alle, die sich gesund ernähren wollen, aber wenig Zeit haben. Voller Nährstoffe, super lecker und macht satt.

Ich ersetze damit oft mein Frühstück und fühle mich den ganzen Vormittag energiegeladen.

Willst du mal eine Probe probieren?`,

      BOTH: `Hey! 💪

Herbalife hat mein Leben verändert – erst die Produkte, dann das Business.

Die Shakes und Supplements sind perfekt für alle, die fit werden oder bleiben wollen. Und als Partner hilfst du anderen bei ihren Zielen.

Ich suche gerade Leute für mein Team UND neue Kunden für die Produkte.

Was spricht dich mehr an – selbst fitter werden oder anderen dabei helfen?`,
    },
    AMWAY: {
      TEAM: `Hi! 👋

Ich arbeite mit einem Unternehmen, das seit über 60 Jahren Menschen hilft, ihre Träume zu verwirklichen.

Amway bietet Produkte für Haushalt, Schönheit und Ernährung – in Premium-Qualität. Und ein Business-Modell, das wirklich funktioniert.

Ich baue gerade mein Team aus und suche motivierte Partner.

Hast du 20 Minuten für ein Gespräch? Ich zeige dir die Möglichkeiten!`,

      CUSTOMER: `Hey! 😊

Hast du schon mal von Amway gehört? Die haben echt hochwertige Produkte.

Besonders die Nutrilite Vitamine sind top – organisch angebaut und wissenschaftlich getestet. Ich nehme sie täglich und merke den Unterschied.

Auch die Artistry Hautpflege ist der Hammer, wenn du da Interesse hast.

Soll ich dir mal was zum Testen schicken?`,

      BOTH: `Hi! 👋

Amway ist ein Klassiker – aber mit gutem Grund. Die Produktqualität ist Premium.

Von Nutrilite Vitaminen über Artistry Kosmetik bis zu Haushaltsprodukten: Alles top.

Und als Partner kannst du dir ein echtes Einkommen aufbauen.

Ich helfe gerade Kunden mit den Produkten UND baue mein Team auf. 

Was interessiert dich mehr?`,
    },
    DOTERRA: {
      TEAM: `Hey! 🌿

Ich bin total begeistert von meiner Arbeit mit doTERRA und möchte dir davon erzählen.

Ätherische Öle sind mehr als nur Düfte – sie unterstützen Körper, Geist und Seele auf natürliche Weise.

Als doTERRA Partner hilfst du Menschen, natürlicher zu leben, und baust dir gleichzeitig ein eigenes Business auf.

Hast du Lust, mehr zu erfahren?`,

      CUSTOMER: `Hi! 🌿

Benutzt du ätherische Öle? Falls nicht, solltest du das unbedingt mal ausprobieren!

doTERRA Öle sind die reinsten auf dem Markt. Lavendel zum Entspannen, Pfefferminze für Energie, Weihrauch für die Meditation...

Ich bin total verliebt in meine Öle und möchte sie dir zeigen.

Soll ich dir ein Starter-Set empfehlen?`,

      BOTH: `Hey! 🌿

doTERRA hat meine Sicht auf natürliche Gesundheit verändert.

Die ätherischen Öle sind unglaublich rein und vielseitig – für alles von Entspannung bis Immunstärkung.

Und als Partner teile ich diese natürliche Lösung mit anderen und baue mir dabei etwas Eigenes auf.

Was interessiert dich – die Öle für dich selbst oder auch das Business?`,
    },
    GENERAL: {
      TEAM: `Hey! 👋

Ich baue gerade etwas Spannendes auf und suche motivierte Leute für mein Team.

Network Marketing bietet eine echte Chance: Du kannst nebenberuflich starten, von überall arbeiten und dir ein passives Einkommen aufbauen.

Die Produkte, mit denen ich arbeite, überzeugen mich jeden Tag aufs Neue.

Hast du Interesse, mehr zu erfahren? Lass uns mal telefonieren!`,

      CUSTOMER: `Hi! 😊

Ich arbeite mit Produkten, die mich persönlich total überzeugt haben.

Qualität steht bei uns an erster Stelle – und ich würde dir gerne zeigen, was wir anbieten.

Das Beste: Ich berate dich persönlich und helfe dir, das Richtige für dich zu finden.

Soll ich dir mehr erzählen?`,

      BOTH: `Hey! 👋

Ich bin im Network Marketing tätig und liebe es!

Die Produkte sind klasse, und das Business-Modell gibt mir Freiheit und Möglichkeiten.

Ich suche gerade sowohl neue Kunden als auch Partner für mein Team.

Was würde dich mehr interessieren – die Produkte oder die Geschäftsmöglichkeit? Erzähl mir gerne mehr!`,
    },
  };

  // Fallback-Logik
  const companyScripts = scripts[company] || scripts.GENERAL;
  const script = companyScripts[goal] || companyScripts.BOTH;
  
  return script;
}

