type ProspectRecord = {
  id: string;
  name: string;
  title: string;
  company: string;
  status: string;
  stage: string;
  owner: string;
  lastSignal: string;
  nextAction: string;
  nextActionAt: string;
  dealValue: number;
  focus: string;
  city: string;
};

type CustomerRecord = {
  id: string;
  name: string;
  segment: string;
  arr: number;
  health: "healthy" | "watch" | "risk";
  renewalAt: string;
  expansionPlay: string;
  successOwner: string;
  adoption: string;
  lastTouchpoint: string;
  city: string;
};

const addDays = (daysFromNow: number, hour?: number) => {
  const date = new Date();
  date.setDate(date.getDate() + daysFromNow);
  if (typeof hour === "number") {
    date.setHours(hour, 0, 0, 0);
  }
  return date.toISOString();
};

export const CONTACT_PROSPECTS: ProspectRecord[] = [
  {
    id: "prospect-nexonic",
    name: "Lena Hartmann",
    title: "RevOps Lead",
    company: "Nexonic GmbH",
    status: "hot",
    stage: "Evaluation",
    owner: "Jonas",
    lastSignal: "WhatsApp Reply · 08:41",
    nextAction: "Executive Recap finalisieren",
    nextActionAt: addDays(0, 16),
    dealValue: 54000,
    focus: "Speed-Hunter Batch",
    city: "Berlin",
  },
  {
    id: "prospect-helix",
    name: "Marco Di Luca",
    title: "COO",
    company: "Helix Cloud",
    status: "warm",
    stage: "Pilot",
    owner: "Aya",
    lastSignal: "Demo Recording geteilt",
    nextAction: "DSGVO Check abschließen",
    nextActionAt: addDays(1, 10),
    dealValue: 32000,
    focus: "Security Review",
    city: "Hamburg",
  },
  {
    id: "prospect-altair",
    name: "Sara Nguyen",
    title: "VP Sales",
    company: "Altair Systems",
    status: "hot",
    stage: "Commit",
    owner: "Mira",
    lastSignal: "Champion pingte Slack",
    nextAction: "Executive Alignment Call",
    nextActionAt: addDays(2, 9),
    dealValue: 86000,
    focus: "Multi-Threading",
    city: "München",
  },
  {
    id: "prospect-volt",
    name: "Elisa Vogt",
    title: "Growth Lead",
    company: "Voltra Labs",
    status: "warm",
    stage: "Discovery",
    owner: "Finn",
    lastSignal: "Website Spike erkannt",
    nextAction: "Pilot KPIs einsammeln",
    nextActionAt: addDays(3, 11),
    dealValue: 41000,
    focus: "Product Qualified Lead",
    city: "Wien",
  },
  {
    id: "prospect-zenloop",
    name: "Jan Novak",
    title: "Sales Director",
    company: "Zenloop Analytics",
    status: "cold",
    stage: "Nurture",
    owner: "Lena",
    lastSignal: "LinkedIn Besuch · gestern",
    nextAction: "Intro Call bestätigen",
    nextActionAt: addDays(4, 14),
    dealValue: 15000,
    focus: "Phoenix Follow-up",
    city: "Prag",
  },
];

export const CONTACT_CUSTOMERS: CustomerRecord[] = [
  {
    id: "cust-flowmatic",
    name: "Flowmatic AG",
    segment: "Enterprise",
    arr: 126000,
    health: "healthy",
    renewalAt: addDays(32),
    expansionPlay: "AI Seat Upgrade",
    successOwner: "Lara",
    adoption: "82% Seats live",
    lastTouchpoint: "QBR vor 6 Tagen",
    city: "München",
  },
  {
    id: "cust-nexonic",
    name: "Nexonic GmbH",
    segment: "Mid-Market",
    arr: 78000,
    health: "watch",
    renewalAt: addDays(58),
    expansionPlay: "RevOps Automation",
    successOwner: "Noah",
    adoption: "2 Playbooks offen",
    lastTouchpoint: "Phoenix Loop gestartet",
    city: "Berlin",
  },
  {
    id: "cust-helix",
    name: "Helix Cloud",
    segment: "Enterprise",
    arr: 189000,
    health: "healthy",
    renewalAt: addDays(90),
    expansionPlay: "Speed-Hunter Seats",
    successOwner: "Mira",
    adoption: "95% Usage",
    lastTouchpoint: "Exec Slack Channel",
    city: "Zürich",
  },
  {
    id: "cust-volt",
    name: "Voltra Labs",
    segment: "Scale-up",
    arr: 52000,
    health: "risk",
    renewalAt: addDays(21),
    expansionPlay: "Daily Command Coaching",
    successOwner: "Finn",
    adoption: "3 blocked Accounts",
    lastTouchpoint: "Risk Alert · heute",
    city: "Köln",
  },
  {
    id: "cust-aster",
    name: "Aster Mobility",
    segment: "Scale-up",
    arr: 94000,
    health: "healthy",
    renewalAt: addDays(47),
    expansionPlay: "Success Seats",
    successOwner: "Aya",
    adoption: "78% Signals beantwortet",
    lastTouchpoint: "In-App NPS 9",
    city: "Hamburg",
  },
];

