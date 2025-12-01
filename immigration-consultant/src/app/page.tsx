"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

type VisaStream = "189" | "190" | "491" | "partner" | "graduate";
type PaceOption = "standard" | "accelerated" | "relaxed";

type Profile = {
  visaStream: VisaStream;
  hasPartner: boolean;
  needsEnglishExam: boolean;
  pace: PaceOption;
  startDate: string;
  relocatingState: string;
  hasChildren: boolean;
  englishTest: "IELTS" | "PTE" | "TOEFL" | "Cambridge" | "None";
};

type Task = {
  id: string;
  title: string;
  detail?: string;
  link?: {
    label: string;
    href: string;
  };
  applies?: (profile: Profile) => boolean;
};

type Resource = {
  title: string;
  description: string;
  href: string;
  category: "points" | "skills" | "visa" | "settlement" | "partner";
};

type StageBlueprint = {
  id: string;
  title: string;
  summary: string;
  durationWeeks: number;
  milestone: string;
  applies: (profile: Profile) => boolean;
  tasks: Task[];
  resources: Resource[];
};

type PlannedTask = Task & {
  stageId: string;
  stageTitle: string;
  stageIndex: number;
  windowStart: Date;
  windowEnd: Date;
  suggestedDue: Date;
};

type PlannedStage = StageBlueprint & {
  duration: number;
  start: Date;
  end: Date;
  tasks: Task[];
};

const PROFILE_STORAGE_KEY = "aus-pathway-profile-v1";
const TASK_STORAGE_KEY = "aus-pathway-tasks-v1";

const defaultStartDate = new Date().toISOString().split("T")[0];

const defaultProfile: Profile = {
  visaStream: "189",
  hasPartner: false,
  needsEnglishExam: true,
  pace: "standard",
  startDate: defaultStartDate,
  relocatingState: "national",
  hasChildren: false,
  englishTest: "IELTS",
};

const paceMultipliers: Record<PaceOption, number> = {
  accelerated: 0.75,
  standard: 1,
  relaxed: 1.25,
};

const isSkilledStream = (profile: Profile) =>
  profile.visaStream === "189" ||
  profile.visaStream === "190" ||
  profile.visaStream === "491";

const STAGE_BLUEPRINTS: StageBlueprint[] = [
  {
    id: "foundations",
    title: "Strategy & Eligibility Foundations",
    summary:
      "Confirm that you meet the visa criteria, map your evidence trail, and get organised before spending money.",
    durationWeeks: 2,
    milestone: "Points or relationship evidence documented and ImmiAccount created.",
    applies: () => true,
    tasks: [
      {
        id: "foundation-points-audit",
        title: "Complete the official points test and log your target score",
        detail:
          "Record each claim (age, English, skilled employment, partners, qualifications) with supporting documents in a tracker.",
        link: {
          label: "Department points calculator",
          href: "https://immi.homeaffairs.gov.au/help-support/tools/points-calculator",
        },
        applies: (profile) => isSkilledStream(profile),
      },
      {
        id: "foundation-anzsco",
        title: "Validate your nominated occupation and ANZSCO tasks",
        detail:
          "Match your work history to the ANZSCO description that best suits the skills assessment authority you will use.",
        link: {
          label: "ANZSCO search",
          href: "https://www.abs.gov.au/anzsco",
        },
        applies: (profile) => isSkilledStream(profile),
      },
      {
        id: "foundation-relationship-map",
        title: "Compile a relationship timeline and joint evidence bundle",
        detail:
          "Outline key dates, shared finances, travel, and communication history. Collect Form 888 statutory declarations early.",
        link: {
          label: "Partner evidence guide",
          href: "https://immi.homeaffairs.gov.au/visas/getting-a-visa/visa-listing/partner-migrant/relationship-evidence",
        },
        applies: (profile) => profile.visaStream === "partner" || profile.hasPartner,
      },
      {
        id: "foundation-document-hub",
        title: "Set up a secure document hub with clear naming conventions",
        detail:
          "Use cloud storage (Google Drive, Dropbox, Notion) with folders per visa stage and include version control.",
      },
      {
        id: "foundation-immiaccount",
        title: "Create or update your ImmiAccount and grant access to partner (if required)",
        detail:
          "Ensure the email address used for the application will remain active for multi-year processing times.",
        link: {
          label: "ImmiAccount",
          href: "https://online.immi.gov.au/",
        },
      },
      {
        id: "foundation-calendar",
        title: "Block key milestones and reminders in your calendar",
        detail:
          "Add tasks for English testing, skills assessment expiry dates, health checks, and police clearances.",
      },
      {
        id: "foundation-state-intent",
        title: "List state or territory programs that align with your skills",
        detail:
          "Capture eligibility notes, job offers required, offshore/onshore status, and expression of interest nuances.",
        applies: (profile) =>
          profile.visaStream === "190" || profile.visaStream === "491",
      },
    ],
    resources: [
      {
        title: "GSM overview",
        description: "Department primer on General Skilled Migration pathways and requirements.",
        href: "https://immi.homeaffairs.gov.au/what-we-do/skilled-migration-program",
        category: "points",
      },
      {
        title: "Evidence checklist guidance",
        description: "Understand which documents are needed for each visa claim and how to organise them.",
        href: "https://immi.homeaffairs.gov.au/visas/supporting-evidence",
        category: "skills",
      },
    ],
  },
  {
    id: "english-prep",
    title: "English Proficiency Preparation",
    summary:
      "Lock in the English test that maximises your points and create a realistic study and test booking plan.",
    durationWeeks: 4,
    milestone: "Target score achieved and certificate saved in document hub.",
    applies: (profile) => profile.needsEnglishExam,
    tasks: [
      {
        id: "english-select-test",
        title: "Select the English test format that best suits your strengths",
        detail:
          "Compare IELTS, PTE, TOEFL, and Cambridge acceptance for your visa stream and potential points uplift.",
        link: {
          label: "English test comparison",
          href: "https://immi.homeaffairs.gov.au/visas/working-in-australia/skillselect/points-tested-skilled-migration-points-table",
        },
      },
      {
        id: "english-book-exam",
        title: "Book your exam date with contingency for retakes",
        detail:
          "Aim for an exam 6–8 weeks from now and reserve funds/time for a second sitting before visa validity deadlines.",
      },
      {
        id: "english-study-plan",
        title: "Create a study plan aligned to your target band scores",
        detail:
          "Allocate weekly tasks covering writing, speaking, listening, and reading with full mock tests each fortnight.",
      },
      {
        id: "english-proof-partner",
        title: "Assess partner English or arrange functional English payment",
        detail:
          "Collect partner English evidence (IELTS 4.5 equivalent) or budget for the second installment if not available.",
        applies: (profile) => profile.hasPartner,
      },
    ],
    resources: [
      {
        title: "IELTS vs PTE guide",
        description: "Understand grading differences and which exam offers faster turnaround.",
        href: "https://www.ielts.org/about-ielts/ielts-for-australia",
        category: "skills",
      },
      {
        title: "NAATI CCL overview",
        description: "Gain extra points through Community Language certification to boost your EOI.",
        href: "https://www.naati.com.au/certification/community-language/",
        category: "points",
      },
    ],
  },
  {
    id: "skills-assessment",
    title: "Skills Assessment Submission",
    summary:
      "Prepare your evidence and submit to the relevant assessing authority to prove your occupation suitability.",
    durationWeeks: 8,
    milestone: "Skills assessment lodged with tracking spreadsheet updated.",
    applies: (profile) => isSkilledStream(profile),
    tasks: [
      {
        id: "skills-authority",
        title: "Confirm the assessing authority criteria and document requirements",
        detail:
          "Read the latest guidelines (e.g. ACS, Engineers Australia, VETASSESS) and note fees, turnaround, and validity.",
        link: {
          label: "Assessing authorities list",
          href: "https://immi.homeaffairs.gov.au/visas/working-in-australia/skill-occupation-list",
        },
      },
      {
        id: "skills-cv-update",
        title: "Update your CV into Australian standards",
        detail:
          "Use reverse chronological format, include responsibilities mapped to ANZSCO duties, and convert grades to Australian equivalents.",
      },
      {
        id: "skills-references",
        title: "Gather employer references and statutory declarations",
        detail:
          "Ensure references outline duties, hours, salary, and tools/technologies. Arrange statutory declarations where references are not available.",
      },
      {
        id: "skills-qualifications",
        title: "Certify academic transcripts and qualification certificates",
        detail:
          "Maintain high resolution scans with translator certification where documents are not in English.",
      },
      {
        id: "skills-submit",
        title: "Lodge the assessment and track SLA",
        detail:
          "Record submission date, expected result, and follow-up contact details. Set reminders for assessment expiry (usually 3 years).",
      },
    ],
    resources: [
      {
        title: "ACS skills assessment",
        description: "Detailed guidelines for ICT professionals applying through ACS.",
        href: "https://www.acs.org.au/msa/international-student-applicants.html",
        category: "skills",
      },
      {
        title: "VETASSESS updates",
        description: "Latest processing times and evidence checklists for general occupations.",
        href: "https://www.vetassess.com.au/skills-assessment-for-migration",
        category: "skills",
      },
    ],
  },
  {
    id: "state-nomination",
    title: "State Nomination Readiness",
    summary:
      "Tailor your expression of interest to the state or territory priorities and secure critical supporting evidence.",
    durationWeeks: 6,
    milestone: "State documentation packaged and nomination submission ready.",
    applies: (profile) =>
      profile.visaStream === "190" || profile.visaStream === "491",
    tasks: [
      {
        id: "state-shortlist",
        title: "Shortlist states aligned to your occupation and situation",
        detail:
          "Compare current occupation lists, residency rules, job offer requirements, and offshore/onshore status.",
      },
      {
        id: "state-evidence",
        title: "Compile state-specific evidence pack",
        detail:
          "Collect resume, job offers, settlement funds, commitment statements, and additional forms required by the state.",
      },
      {
        id: "state-expression",
        title: "Draft your state commitment statement or ROI",
        detail:
          "Explain employment prospects, settlement plans, and why you will contribute to the region long term.",
      },
      {
        id: "state-monitor",
        title: "Set monitoring alerts for state program windows",
        detail:
          "Subscribe to email alerts and create a weekly task to review announcements or invitation rounds.",
      },
    ],
    resources: [
      {
        title: "NSW Skilled Nomination",
        description: "Latest NSW occupation list and invitation process.",
        href: "https://www.nsw.gov.au/visas-and-migration/skilled-visas",
        category: "visa",
      },
      {
        title: "SA ROI details",
        description: "South Australia requirements with ROI process and priority segments.",
        href: "https://www.migration.sa.gov.au/",
        category: "visa",
      },
    ],
  },
  {
    id: "expression-of-interest",
    title: "Expression of Interest & Invitations",
    summary:
      "Ensure your SkillSelect profile is accurate, defensible, and ready to respond quickly to invitations.",
    durationWeeks: 3,
    milestone: "SkillSelect EOI lodged with evidence cross-checked and monitoring cadence set.",
    applies: (profile) => isSkilledStream(profile),
    tasks: [
      {
        id: "eoi-profile",
        title: "Draft and peer review your SkillSelect entry",
        detail:
          "Ensure claimed points exactly match your evidence pack to avoid refusal for false claims.",
      },
      {
        id: "eoi-upload",
        title: "Bundle supporting documents ready for upload",
        detail:
          "Combine PDFs into labelled files (e.g. Employment_CompanyA_2018-2022.pdf) for faster response after invitation.",
      },
      {
        id: "eoi-monitor",
        title: "Set up invitation monitoring",
        detail:
          "Track SkillSelect invitation rounds and state draws. Update your SQL or spreadsheet with lodged EOIs and expiry dates.",
      },
      {
        id: "eoi-refresh",
        title: "Refresh EOI after major life changes",
        detail:
          "Update English scores, employment length, partner skills, or birthday impacts on points immediately.",
      },
    ],
    resources: [
      {
        title: "SkillSelect guide",
        description: "Official SkillSelect walkthrough and invitation round data.",
        href: "https://immi.homeaffairs.gov.au/what-we-do/skilled-migration-program/skilled-occupation-lists/invitation-rounds",
        category: "points",
      },
      {
        title: "EOI accuracy checklist",
        description: "Ensure every SkillSelect claim is supported by evidence to avoid refusal.",
        href: "https://www.homeaffairs.gov.au/visas/working-in-australia/skillselect/submitting-an-expression-of-interest",
        category: "visa",
      },
    ],
  },
  {
    id: "partner-evidence",
    title: "Partner Visa Evidence & Sponsorship",
    summary:
      "Gather thorough relationship evidence, plan sponsorship obligations, and prepare the narrative for your application.",
    durationWeeks: 6,
    milestone: "Relationship evidence indexed and sponsor obligations understood.",
    applies: (profile) => profile.visaStream === "partner" || profile.hasPartner,
    tasks: [
      {
        id: "partner-form888",
        title: "Coordinate Form 888 statutory declarations",
        detail:
          "Secure at least two Australian citizen or permanent resident referees who can speak to the genuineness of your relationship.",
        link: {
          label: "Form 888 download",
          href: "https://immi.homeaffairs.gov.au/form-listing/forms/888.pdf",
        },
      },
      {
        id: "partner-finances",
        title: "Compile shared financial evidence",
        detail:
          "Bank statements, mortgages, leases, insurance, and ongoing financial commitments showing shared responsibility.",
      },
      {
        id: "partner-social",
        title: "Document social and commitment evidence",
        detail:
          "Get photos, travel history, social media, and testimonials demonstrating the relationship across time.",
      },
      {
        id: "partner-sponsor",
        title: "Prepare sponsor supporting documents",
        detail:
          "Police clearances, Form 40SP, sponsor obligations summary, and assurance of support if required.",
      },
      {
        id: "partner-statement",
        title: "Write relationship statements (Applicant & Sponsor)",
        detail:
          "Cover how you met, development of relationship, financial and social aspects, and future plans in Australia.",
      },
    ],
    resources: [
      {
        title: "Partner visa guide",
        description: "Department explanation of partner visa streams, fees, and evidence.",
        href: "https://immi.homeaffairs.gov.au/visas/getting-a-visa/visa-listing/partner-migrant",
        category: "partner",
      },
      {
        title: "Form 40SP details",
        description: "Sponsorship obligations and supporting documentation for partners.",
        href: "https://immi.homeaffairs.gov.au/form-listing/forms/40sp.pdf",
        category: "partner",
      },
    ],
  },
  {
    id: "graduate-visa",
    title: "Graduate Visa Preparation",
    summary:
      "Secure your Australian study evidence, arrange health insurance, and prove employability for the 485 stream.",
    durationWeeks: 5,
    milestone: "Australian study requirement satisfied and 485 checklist ready.",
    applies: (profile) => profile.visaStream === "graduate",
    tasks: [
      {
        id: "graduate-completion",
        title: "Collect completion letter and official transcripts",
        detail:
          "Ensure the letter confirms CRICOS course codes, start/end dates, and meets the Australian study requirement.",
      },
      {
        id: "graduate-health-cover",
        title: "Arrange adequate health insurance (OVHC)",
        detail:
          "Transition from OSHC to OVHC covering the entire anticipated visa period.",
      },
      {
        id: "graduate-employment",
        title: "Prepare employment evidence for nominated occupation",
        detail:
          "Gather resumes, job references, or job offers aligned with the post-study stream you are applying for.",
      },
      {
        id: "graduate-afp",
        title: "Apply for AFP national police check",
        detail:
          "Use code 33 for immigration. Ensure all names, including previous names, are listed to avoid delays.",
      },
    ],
    resources: [
      {
        title: "485 visa checklist",
        description: "Home Affairs document checklist for Temporary Graduate visa applicants.",
        href: "https://immi.homeaffairs.gov.au/visas/web-evidentiary-tool",
        category: "visa",
      },
      {
        title: "Australian study requirement",
        description: "Understand what counts towards the Australian study criterion.",
        href: "https://immi.homeaffairs.gov.au/help-support/tools/working-holiday-visa-tool/australian-study-requirement",
        category: "visa",
      },
    ],
  },
  {
    id: "visa-lodgement",
    title: "Visa Lodgement & Compliance",
    summary:
      "Prepare health, character, and financial evidence so you can lodge confidently and respond quickly to case officer requests.",
    durationWeeks: 4,
    milestone: "Visa lodged with full document bundle uploaded and acknowledgements received.",
    applies: () => true,
    tasks: [
      {
        id: "visa-health",
        title: "Book panel physician health examinations",
        detail:
          "Use My Health Declarations or arrange after receiving HAP ID. Factor in processing time for results uploading.",
        link: {
          label: "Panel physician finder",
          href: "https://immi.homeaffairs.gov.au/help-support/contact-us/offices-and-locations/list",
        },
      },
      {
        id: "visa-police",
        title: "Order police certificates for each country lived in 12+ months",
        detail:
          "Check validity periods (usually 12 months) and translations. Upload once lodged as case officers often request quickly.",
      },
      {
        id: "visa-proof-funds",
        title: "Prepare financial capacity evidence",
        detail:
          "Provide bank statements, savings, and support letters demonstrating settlement funds or ongoing financial support.",
        applies: (profile) =>
          profile.visaStream === "190" ||
          profile.visaStream === "491" ||
          profile.visaStream === "partner",
      },
      {
        id: "visa-upload",
        title: "Upload documents with clear naming conventions",
        detail:
          "Match names to EOI claims or relationship categories. Double-check file size limits and PDF legibility.",
      },
      {
        id: "visa-followup",
        title: "Create a response plan for case officer requests",
        detail:
          "Draft templated replies, set SLA expectations, and ensure work/study travel plans allow quick turnaround.",
      },
    ],
    resources: [
      {
        title: "Health examinations",
        description: "Understand when to complete health checks and how HAP IDs work.",
        href: "https://immi.homeaffairs.gov.au/help-support/meeting-our-requirements/health",
        category: "visa",
      },
      {
        title: "Character requirements",
        description: "Official list of character and police check requirements for visa applicants.",
        href: "https://immi.homeaffairs.gov.au/help-support/meeting-our-requirements/character",
        category: "visa",
      },
    ],
  },
  {
    id: "settlement",
    title: "Arrival & Settlement Game Plan",
    summary:
      "Prepare the practical steps for relocating, including housing, job search, schooling, and community integration.",
    durationWeeks: 6,
    milestone: "Landing plan defined with budgets, school research, and first 90 days checklist.",
    applies: () => true,
    tasks: [
      {
        id: "settlement-budget",
        title: "Build a landing budget covering the first 6 months",
        detail:
          "Include temporary accommodation, rental bond, furniture, school costs, and buffer for job search.",
      },
      {
        id: "settlement-employment",
        title: "Craft an Australian-style resume and LinkedIn profile",
        detail:
          "Highlight measurable achievements, localise terminology, and line up referees reachable during Australian hours.",
      },
      {
        id: "settlement-schooling",
        title: "Research schooling or childcare options",
        detail:
          "Understand enrolment zones, documentation requirements, and fees. Plan bridging childcare if awaiting places.",
        applies: (profile) => profile.hasChildren,
      },
      {
        id: "settlement-arrival-kit",
        title: "Create an arrival action list for the first fortnight",
        detail:
          "Medicare enrolment, TFN, bank account, driver licence transfer, SIM cards, and local transport cards.",
      },
      {
        id: "settlement-community",
        title: "Identify professional and community networks",
        detail:
          "Join state-based migrant groups, industry associations, and mentorship programs before arrival.",
      },
    ],
    resources: [
      {
        title: "Life in Australia booklet",
        description: "Official guide covering values, culture, and settlement services.",
        href: "https://immi.homeaffairs.gov.au/settling-in-australia/living-in-australia",
        category: "settlement",
      },
      {
        title: "Job search toolkit",
        description: "Practical template for mapping employers, recruiters, and job boards.",
        href: "https://www.jobs.gov.au/migrants",
        category: "settlement",
      },
    ],
  },
];

function addDays(date: Date, days: number) {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

function addWeeks(date: Date, weeks: number) {
  return addDays(date, Math.round(weeks * 7));
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("en-AU", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}

function formatWeeks(total: number) {
  return total === 1 ? "1 week" : `${total} weeks`;
}

function readStoredProfile(): Profile {
  if (typeof window === "undefined") {
    return defaultProfile;
  }
  const stored = window.localStorage.getItem(PROFILE_STORAGE_KEY);
  if (stored) {
    try {
      const parsed = JSON.parse(stored) as Partial<Profile>;
      return { ...defaultProfile, ...parsed };
    } catch {
      return defaultProfile;
    }
  }
  return defaultProfile;
}

function useProfileState() {
  const [profile, setProfile] = useState<Profile>(() => readStoredProfile());

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    window.localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(profile));
  }, [profile]);

  return [profile, setProfile] as const;
}

function readStoredTasks(): Record<string, boolean> {
  if (typeof window === "undefined") {
    return {};
  }
  const stored = window.localStorage.getItem(TASK_STORAGE_KEY);
  if (stored) {
    try {
      return JSON.parse(stored) as Record<string, boolean>;
    } catch {
      return {};
    }
  }
  return {};
}

function useTaskCompletion() {
  const [completion, setCompletion] = useState<Record<string, boolean>>(
    () => readStoredTasks(),
  );

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    window.localStorage.setItem(TASK_STORAGE_KEY, JSON.stringify(completion));
  }, [completion]);

  return [completion, setCompletion] as const;
}

export default function Home() {
  const [profile, setProfile] = useProfileState();
  const [taskCompletion, setTaskCompletion] = useTaskCompletion();

  const stagePlans: PlannedStage[] = useMemo(() => {
    const startDate = profile.startDate
      ? new Date(profile.startDate)
      : new Date(defaultStartDate);
    const paceMultiplier = paceMultipliers[profile.pace];

    return STAGE_BLUEPRINTS.filter((stage) => stage.applies(profile)).reduce<
      PlannedStage[]
    >((accumulator, stage) => {
      const filteredTasks = stage.tasks.filter(
        (task) => !task.applies || task.applies(profile),
      );
      const duration = Math.max(
        1,
        Math.round(stage.durationWeeks * paceMultiplier),
      );
      const stageStart =
        accumulator.length === 0
          ? new Date(startDate)
          : new Date(accumulator[accumulator.length - 1].end);
      const stageEnd = addWeeks(stageStart, duration);

      accumulator.push({
        ...stage,
        tasks: filteredTasks,
        duration,
        start: stageStart,
        end: stageEnd,
      });

      return accumulator;
    }, []);
  }, [profile]);

  const plannedTasks: PlannedTask[] = useMemo(() => {
    return stagePlans.flatMap((stage, stageIndex) => {
      if (!stage.tasks.length) {
        return [];
      }

      return stage.tasks.map((task, taskIndex) => {
        const chunks = stage.duration * 7;
        const offset =
          stage.tasks.length === 1
            ? chunks
            : Math.round(((taskIndex + 1) / stage.tasks.length) * chunks);
        const suggestedDue = addDays(stage.start, Math.max(offset - 1, 0));

        return {
          ...task,
          stageId: stage.id,
          stageTitle: stage.title,
          stageIndex,
          windowStart: stage.start,
          windowEnd: stage.end,
          suggestedDue,
        };
      });
    });
  }, [stagePlans]);

  const totalTasks = plannedTasks.length;
  const completedTasks = plannedTasks.filter(
    (task) => taskCompletion[task.id],
  ).length;
  const progress = totalTasks === 0 ? 0 : Math.round((completedTasks / totalTasks) * 100);

  const totalWeeks = stagePlans.reduce((acc, stage) => acc + stage.duration, 0);
  const visaStage = stagePlans.find((stage) => stage.id === "visa-lodgement");
  const estimatedVisaDate = visaStage?.end;
  const nextSteps = plannedTasks
    .filter((task) => !taskCompletion[task.id])
    .slice(0, 4);

  const resourceLibrary = useMemo(() => {
    const map = new Map<string, Resource>();
    stagePlans.forEach((stage) => {
      stage.resources.forEach((resource) => {
        if (!map.has(resource.href)) {
          map.set(resource.href, resource);
        }
      });
    });
    return Array.from(map.values());
  }, [stagePlans]);

  const updateProfileField = <K extends keyof Profile>(
    key: K,
    value: Profile[K],
  ) => {
    setProfile((prev) => ({ ...prev, [key]: value }));
  };

  const toggleTask = (taskId: string) => {
    setTaskCompletion((previous) => ({
      ...previous,
      [taskId]: !previous[taskId],
    }));
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-slate-950 text-slate-100">
      <div className="pointer-events-none absolute inset-x-0 top-[-10%] h-[520px] bg-gradient-to-b from-emerald-400/30 via-slate-950/20 to-slate-950 blur-3xl" />
      <main className="relative mx-auto flex w-full max-w-6xl flex-col gap-10 px-4 pb-24 pt-16 sm:px-6 lg:px-8">
        <section className="rounded-3xl border border-white/10 bg-white/5 p-8 shadow-2xl shadow-emerald-500/10 backdrop-blur">
          <p className="text-xs uppercase tracking-[0.32em] text-emerald-300">
            Aus Pathway
          </p>
          <h1 className="mt-3 text-3xl font-semibold text-white sm:text-4xl">
            Your Australian immigration co‑pilot
          </h1>
          <p className="mt-4 max-w-3xl text-base text-slate-200">
            Build a personalised checklist, timeline, and resource library that
            guides you from eligibility checks through to landing in Australia.
            Update your profile and the plan reshapes itself instantly.
          </p>
          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-4">
              <p className="text-xs uppercase tracking-wide text-slate-400">
                Overall Progress
              </p>
              <p className="mt-2 text-3xl font-semibold text-emerald-300">
                {`${progress}%`}
              </p>
              <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-slate-800">
                <div
                  className="h-full rounded-full bg-emerald-400 transition-all duration-500"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="mt-2 text-sm text-slate-300">
                {totalTasks} task{totalTasks === 1 ? "" : "s"} tracked
              </p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-4">
              <p className="text-xs uppercase tracking-wide text-slate-400">
                Planned Journey
              </p>
              <p className="mt-2 text-3xl font-semibold text-emerald-300">
                {formatWeeks(totalWeeks)}
              </p>
              <p className="mt-2 text-sm text-slate-300">
                Pace set to{" "}
                <span className="font-medium text-white">{profile.pace}</span>
              </p>
              {estimatedVisaDate ? (
                <p className="mt-2 text-sm text-slate-400">
                  Target visa lodgement:{" "}
                  <span className="text-slate-100">
                    {formatDate(estimatedVisaDate)}
                  </span>
                </p>
              ) : null}
            </div>
            <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-4">
              <p className="text-xs uppercase tracking-wide text-slate-400">
                Visa Stream
              </p>
              <p className="mt-2 text-xl font-semibold text-white">
                {profile.visaStream === "189" && "189 • Skilled Independent"}
                {profile.visaStream === "190" && "190 • Skilled Nominated"}
                {profile.visaStream === "491" && "491 • Skilled Regional (Provisional)"}
                {profile.visaStream === "partner" && "Partner (309/100 or 820/801)"}
                {profile.visaStream === "graduate" && "485 • Temporary Graduate"}
              </p>
              <p className="mt-2 text-sm text-slate-300">
                State focus:{" "}
                <span className="capitalize text-white">
                  {profile.relocatingState.replace("-", " ")}
                </span>
              </p>
            </div>
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
          <div className="rounded-3xl border border-white/10 bg-slate-900/70 p-6 backdrop-blur">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold text-white">
                  Profile & Strategy
                </h2>
                <p className="mt-1 text-sm text-slate-300">
                  Update your situation and the system recalculates checklist
                  items, timing, and state-specific steps.
                </p>
              </div>
              <span className="rounded-full bg-emerald-400/10 px-3 py-1 text-xs font-medium uppercase tracking-wide text-emerald-200">
                Live sync
              </span>
            </div>
            <form className="mt-6 grid gap-5 md:grid-cols-2">
              <label className="flex flex-col gap-2 text-sm">
                <span className="text-slate-300">Visa pathway</span>
                <select
                  className="rounded-xl border border-white/10 bg-slate-950/80 px-3 py-2 text-white outline-none transition hover:border-emerald-400/50 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/30"
                  value={profile.visaStream}
                  onChange={(event) =>
                    updateProfileField(
                      "visaStream",
                      event.target.value as VisaStream,
                    )
                  }
                >
                  <option value="189">189 • Skilled Independent</option>
                  <option value="190">190 • Skilled Nominated</option>
                  <option value="491">491 • Skilled Regional Provisional</option>
                  <option value="partner">Partner • Subclass 309/100 or 820/801</option>
                  <option value="graduate">485 • Temporary Graduate</option>
                </select>
              </label>

              <label className="flex flex-col gap-2 text-sm">
                <span className="text-slate-300">Target pace</span>
                <select
                  className="rounded-xl border border-white/10 bg-slate-950/80 px-3 py-2 text-white outline-none transition hover:border-emerald-400/50 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/30"
                  value={profile.pace}
                  onChange={(event) =>
                    updateProfileField(
                      "pace",
                      event.target.value as PaceOption,
                    )
                  }
                >
                  <option value="accelerated">Accelerated (fast track)</option>
                  <option value="standard">Standard (balanced)</option>
                  <option value="relaxed">Deliberate (more buffer)</option>
                </select>
              </label>

              <label className="flex flex-col gap-2 text-sm">
                <span className="text-slate-300">Planned start week</span>
                <input
                  type="date"
                  value={profile.startDate}
                  onChange={(event) =>
                    updateProfileField("startDate", event.target.value)
                  }
                  className="rounded-xl border border-white/10 bg-slate-950/80 px-3 py-2 text-white outline-none transition hover:border-emerald-400/50 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/30"
                />
              </label>

              <label className="flex flex-col gap-2 text-sm">
                <span className="text-slate-300">Intended state or territory</span>
                <select
                  className="rounded-xl border border-white/10 bg-slate-950/80 px-3 py-2 text-white outline-none transition hover:border-emerald-400/50 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/30"
                  value={profile.relocatingState}
                  onChange={(event) =>
                    updateProfileField("relocatingState", event.target.value)
                  }
                >
                  <option value="national">Open to anywhere</option>
                  <option value="nsw">New South Wales</option>
                  <option value="vic">Victoria</option>
                  <option value="qld">Queensland</option>
                  <option value="sa">South Australia</option>
                  <option value="wa">Western Australia</option>
                  <option value="tas">Tasmania</option>
                  <option value="act">Australian Capital Territory</option>
                  <option value="nt">Northern Territory</option>
                </select>
              </label>

              <label className="flex flex-col gap-2 text-sm">
                <span className="text-slate-300">Preferred English test</span>
                <select
                  className="rounded-xl border border-white/10 bg-slate-950/80 px-3 py-2 text-white outline-none transition hover:border-emerald-400/50 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/30"
                  value={profile.englishTest}
                  onChange={(event) =>
                    updateProfileField(
                      "englishTest",
                      event.target.value as Profile["englishTest"],
                    )
                  }
                >
                  <option value="IELTS">IELTS Academic / General</option>
                  <option value="PTE">PTE Academic</option>
                  <option value="TOEFL">TOEFL iBT</option>
                  <option value="Cambridge">Cambridge C1 Advanced</option>
                  <option value="None">Already exempt</option>
                </select>
              </label>

              <label className="flex items-center gap-3 rounded-xl border border-white/10 bg-slate-950/70 px-3 py-3 text-sm text-slate-200">
                <input
                  type="checkbox"
                  checked={profile.needsEnglishExam}
                  onChange={(event) =>
                    updateProfileField("needsEnglishExam", event.target.checked)
                  }
                  className="h-4 w-4 rounded border-white/20 bg-slate-900 text-emerald-400 focus:ring-emerald-400"
                />
                I still need to book and pass an English language exam
              </label>

              <label className="flex items-center gap-3 rounded-xl border border-white/10 bg-slate-950/70 px-3 py-3 text-sm text-slate-200">
                <input
                  type="checkbox"
                  checked={profile.hasPartner}
                  onChange={(event) =>
                    updateProfileField("hasPartner", event.target.checked)
                  }
                  className="h-4 w-4 rounded border-white/20 bg-slate-900 text-emerald-400 focus:ring-emerald-400"
                />
                I am migrating with a partner who may need to be included
              </label>

              <label className="flex items-center gap-3 rounded-xl border border-white/10 bg-slate-950/70 px-3 py-3 text-sm text-slate-200">
                <input
                  type="checkbox"
                  checked={profile.hasChildren}
                  onChange={(event) =>
                    updateProfileField("hasChildren", event.target.checked)
                  }
                  className="h-4 w-4 rounded border-white/20 bg-slate-900 text-emerald-400 focus:ring-emerald-400"
                />
                We have dependent children migrating with us
              </label>
            </form>
          </div>

          <div className="rounded-3xl border border-emerald-400/20 bg-emerald-400/10 p-6 shadow-lg shadow-emerald-500/20">
            <h3 className="text-lg font-semibold text-white">
              Next recommended actions
            </h3>
            <p className="mt-1 text-sm text-emerald-100">
              Focus here this week. Completing these keeps your pathway on
              schedule.
            </p>
            <ul className="mt-5 space-y-4">
              {nextSteps.length === 0 ? (
                <li className="rounded-2xl border border-white/10 bg-emerald-400/10 px-4 py-3 text-sm text-emerald-50">
                  You have cleared every item! Review your timeline or refresh
                  your profile for new commitments.
                </li>
              ) : (
                nextSteps.map((task) => (
                  <li
                    key={task.id}
                    className="rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-slate-100"
                  >
                    <p className="font-medium text-white">{task.title}</p>
                    <p className="mt-1 text-xs uppercase tracking-wide text-emerald-200">
                      {task.stageTitle}
                    </p>
                    <p className="mt-1 text-xs text-emerald-100">
                      Target completion by{" "}
                      <span className="font-medium text-white">
                        {formatDate(task.suggestedDue)}
                      </span>
                    </p>
                  </li>
                ))
              )}
            </ul>
            <div className="mt-6 rounded-2xl border border-white/10 bg-slate-950/40 px-4 py-3 text-xs text-emerald-100">
              <p>
                Tip: block out a 2‑hour deep work session weekly to smash the
                highest-impact task. Revisit your profile after major life
                changes (new job, birthday, exam results).
              </p>
            </div>
          </div>
        </section>

        <section className="space-y-6">
          <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
            <div>
              <h2 className="text-xl font-semibold text-white">
                Your step-by-step checklist
              </h2>
              <p className="mt-1 text-sm text-slate-300">
                Tick items as you progress. Everything you complete is saved
                locally so you can return anytime.
              </p>
            </div>
            <p className="text-sm text-slate-400">
              {completedTasks}/{totalTasks} complete
            </p>
          </div>

          <div className="grid gap-5">
            {stagePlans.map((stage, index) => {
              const stageTasks = plannedTasks.filter(
                (task) => task.stageId === stage.id,
              );
              const stageCompleted = stageTasks.filter(
                (task) => taskCompletion[task.id],
              ).length;
              const completionRatio =
                stageTasks.length === 0
                  ? 0
                  : Math.round((stageCompleted / stageTasks.length) * 100);

              return (
                <div
                  key={stage.id}
                  className="rounded-3xl border border-white/10 bg-slate-900/70 p-6 shadow-lg shadow-slate-900/60 backdrop-blur"
                >
                  <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                    <div>
                      <p className="text-xs uppercase tracking-wide text-slate-400">
                        Stage {index + 1} • {formatDate(stage.start)} →{" "}
                        {formatDate(stage.end)}
                      </p>
                      <h3 className="mt-2 text-2xl font-semibold text-white">
                        {stage.title}
                      </h3>
                      <p className="mt-2 text-sm text-slate-300">
                        {stage.summary}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <span className="rounded-full bg-emerald-400/10 px-3 py-1 text-xs font-medium uppercase tracking-wide text-emerald-200">
                        {formatWeeks(stage.duration)}
                      </span>
                      <span className="text-xs text-slate-400">
                        {stage.milestone}
                      </span>
                      <div className="mt-2 h-2 w-32 overflow-hidden rounded-full bg-slate-800">
                        <div
                          className="h-full rounded-full bg-emerald-400 transition-all duration-500"
                          style={{ width: `${completionRatio}%` }}
                        />
                      </div>
                      <span className="text-xs text-slate-300">
                        {stageCompleted}/{stageTasks.length} complete
                      </span>
                    </div>
                  </div>
                  <ul className="mt-6 space-y-4">
                    {stageTasks.length === 0 ? (
                      <li className="rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-4 text-sm text-slate-300">
                        No checklist items for this stage based on your current
                        profile.
                      </li>
                    ) : (
                      stageTasks.map((task) => (
                        <li
                          key={task.id}
                          className="rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-4"
                        >
                          <label className="flex items-start gap-3">
                            <input
                              type="checkbox"
                              checked={!!taskCompletion[task.id]}
                              onChange={() => toggleTask(task.id)}
                              className="mt-1 h-4 w-4 rounded border-white/30 bg-slate-900 text-emerald-400 focus:ring-emerald-400"
                            />
                            <div>
                              <p className="font-medium text-white">
                                {task.title}
                              </p>
                              {task.detail ? (
                                <p className="mt-1 text-sm text-slate-300">
                                  {task.detail}
                                </p>
                              ) : null}
                              <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-slate-400">
                                <span>
                                  Target: {formatDate(task.suggestedDue)}
                                </span>
                                <span>
                                  Window: {formatDate(task.windowStart)} →{" "}
                                  {formatDate(task.windowEnd)}
                                </span>
                                {task.link ? (
                                  <Link
                                    href={task.link.href}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="inline-flex items-center gap-1 rounded-full bg-emerald-400/10 px-3 py-1 font-medium text-emerald-200 transition hover:bg-emerald-400/20"
                                  >
                                    {task.link.label}
                                  </Link>
                                ) : null}
                              </div>
                            </div>
                          </label>
                        </li>
                      ))
                    )}
                  </ul>
                </div>
              );
            })}
          </div>
        </section>

        <section className="rounded-3xl border border-white/10 bg-slate-900/70 p-6 backdrop-blur">
          <h2 className="text-xl font-semibold text-white">
            Resource library
          </h2>
          <p className="mt-1 text-sm text-slate-300">
            Official links, templates, and references curated for your chosen
            pathway. Bookmark the essentials and review them again before
            lodging.
          </p>
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            {resourceLibrary.map((resource) => (
              <Link
                key={resource.href}
                href={resource.href}
                target="_blank"
                rel="noreferrer"
                className="group rounded-2xl border border-white/10 bg-slate-950/60 p-4 transition hover:border-emerald-400/40 hover:bg-slate-950/80"
              >
                <span className="text-xs uppercase tracking-wide text-emerald-200">
                  {resource.category}
                </span>
                <p className="mt-2 text-lg font-semibold text-white group-hover:text-emerald-200">
                  {resource.title}
                </p>
                <p className="mt-1 text-sm text-slate-300">
                  {resource.description}
                </p>
              </Link>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
