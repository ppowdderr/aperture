export type PreviewDay = 0 | 1 | 2 | 3 | 4;
export type PreviewSemester = 1 | 2;

export interface PreviewCourse {
  code: string;
  title: string;
  credits: number;
}

export interface PreviewBlock {
  code: string;
  day: PreviewDay;
  start: number;
  end: number;
}

export interface PreviewPlan {
  label: string;
  courses: readonly PreviewCourse[];
  blocks: Readonly<Record<PreviewSemester, readonly PreviewBlock[]>>;
}

export interface PreviewScenario {
  id: string;
  label: string;
  prompt: string;
  chips: readonly string[];
  note: string;
  plans: readonly PreviewPlan[];
}

export interface PreviewRule {
  title: string;
  summary: string;
  source: string;
  href: string;
}

export interface PreviewExample {
  label: string;
  prompt: string;
  chips: readonly string[];
}

export interface LandingLink {
  label: string;
  href: string;
  external?: boolean;
}

export interface LandingStat {
  value: string;
  label: string;
  source: string;
}

export interface LandingStackItem {
  tag: string;
  name: string;
  why: string;
}

export interface LandingLimit {
  title: string;
  body: string;
}

export interface LandingContent {
  meta: {
    title: string;
    description: string;
  };
  brand: {
    name: string;
    markLabel: string;
  };
  accessibility: {
    skipLink: string;
    navLabel: string;
    mainLabel: string;
  };
  nav: {
    links: readonly LandingLink[];
    mobileMenuLabel: string;
    github: LandingLink;
    cta: LandingLink;
  };
  hero: {
    label: string;
    headline: readonly [string, string];
    body: string;
    primaryCta: LandingLink;
    secondaryCta: LandingLink;
  };
  flip: {
    heading: string;
    oldLabel: string;
    oldText: string;
    newLabel: string;
    newText: string;
    detail: string;
  };
  how: {
    heading: string;
    intro: string;
    steps: readonly {
      title: string;
      body: string;
      demoLabel: string;
    }[];
  };
  stats: {
    heading: string;
    intro: string;
    items: readonly LandingStat[];
  };
  stack: {
    heading: string;
    intro: string;
    items: readonly LandingStackItem[];
    aiNote: string;
  };
  limits: {
    heading: string;
    intro: string;
    items: readonly LandingLimit[];
  };
  footer: {
    statement: string;
    detail: string;
    linksLabel: string;
    links: readonly LandingLink[];
  };
  preview: {
    shared: {
      demoLabel: string;
      simulatedLabel: string;
      yearLabel: string;
      semesterLabel: string;
      planListLabel: string;
      weekRequestLabel: string;
      courseListLabel: string;
      timetableLabel: string;
      loadingLabel: string;
      readyLabel: string;
      semesterNames: readonly [string, string];
      semesterShortNames: readonly [string, string];
      creditsShort: string;
      days: readonly string[];
      exampleHeading: string;
      appliedHeading: string;
      ruleSourceLabel: string;
      openSourceLabel: string;
    };
    hero: readonly PreviewScenario[];
    describe: {
      heading: string;
      intro: string;
      examples: readonly PreviewExample[];
    };
    rules: {
      heading: string;
      intro: string;
      items: readonly PreviewRule[];
    };
  };
}

const courses = {
  INFR09032: {
    code: "INFR09032",
    title: "System Design Project",
    credits: 20,
  },
  INFR09051: {
    code: "INFR09051",
    title: "Informatics Large Practical",
    credits: 20,
  },
  INFR10022: {
    code: "INFR10022",
    title: "Professional Issues (Level 10)",
    credits: 10,
  },
  INFR10052: {
    code: "INFR10052",
    title: "Algorithms and Data Structures",
    credits: 10,
  },
  INFR10057: {
    code: "INFR10057",
    title: "Software Testing",
    credits: 10,
  },
  INFR10059: {
    code: "INFR10059",
    title: "Introduction to Theoretical Computer Science",
    credits: 10,
  },
  INFR10065: {
    code: "INFR10065",
    title: "Compiling Techniques",
    credits: 20,
  },
  INFR10067: {
    code: "INFR10067",
    title: "Computer Security",
    credits: 20,
  },
  INFR10074: {
    code: "INFR10074",
    title: "Computer Communications and Networks",
    credits: 20,
  },
  INFR10076: {
    code: "INFR10076",
    title: "Computer Architecture and Design",
    credits: 20,
  },
  INFR10079: {
    code: "INFR10079",
    title: "Operating Systems",
    credits: 20,
  },
  INFR10086: {
    code: "INFR10086",
    title: "Machine Learning",
    credits: 20,
  },
  INFR10090: {
    code: "INFR10090",
    title: "Introduction to Mobile Robotics",
    credits: 20,
  },
} as const;

type PreviewCourseCode = keyof typeof courses;
type BlockInput = readonly [
  code: PreviewCourseCode,
  day: PreviewDay,
  start: number,
  end: number,
];

function plan(
  label: string,
  codes: readonly PreviewCourseCode[],
  semesterOne: readonly BlockInput[],
  semesterTwo: readonly BlockInput[],
): PreviewPlan {
  const block = ([code, day, start, end]: BlockInput): PreviewBlock => ({
    code,
    day,
    start,
    end,
  });

  return {
    label,
    courses: codes.map((code) => courses[code]),
    blocks: {
      1: semesterOne.map(block),
      2: semesterTwo.map(block),
    },
  };
}

const noNinePlans = [
  plan(
    "Plan 1",
    [
      "INFR09032",
      "INFR09051",
      "INFR10022",
      "INFR10052",
      "INFR10065",
      "INFR10067",
      "INFR10076",
    ],
    [
      ["INFR10067", 0, 600, 650],
      ["INFR10076", 0, 730, 780],
      ["INFR10022", 0, 790, 840],
      ["INFR10052", 0, 970, 1020],
      ["INFR10076", 2, 790, 900],
      ["INFR09051", 4, 540, 590],
    ],
    [
      ["INFR09032", 0, 730, 840],
      ["INFR09032", 2, 570, 660],
      ["INFR10065", 0, 910, 1020],
      ["INFR10065", 2, 910, 1020],
      ["INFR10065", 3, 910, 960],
      ["INFR09032", 4, 790, 960],
    ],
  ),
  plan(
    "Plan 2",
    [
      "INFR09032",
      "INFR09051",
      "INFR10022",
      "INFR10052",
      "INFR10067",
      "INFR10086",
      "INFR10090",
    ],
    [
      ["INFR10067", 0, 600, 650],
      ["INFR10022", 0, 790, 840],
      ["INFR10022", 0, 850, 930],
      ["INFR10052", 0, 970, 1020],
      ["INFR10052", 4, 670, 780],
      ["INFR09051", 4, 540, 590],
    ],
    [
      ["INFR09032", 0, 730, 840],
      ["INFR10086", 0, 670, 720],
      ["INFR10086", 1, 790, 840],
      ["INFR10090", 1, 600, 650],
      ["INFR10090", 2, 790, 840],
      ["INFR09032", 4, 790, 960],
    ],
  ),
  plan(
    "Plan 3",
    [
      "INFR09032",
      "INFR09051",
      "INFR10022",
      "INFR10057",
      "INFR10065",
      "INFR10067",
      "INFR10086",
    ],
    [
      ["INFR10067", 0, 600, 650],
      ["INFR10022", 0, 790, 840],
      ["INFR10022", 0, 850, 930],
      ["INFR10057", 1, 600, 650],
      ["INFR10057", 3, 600, 650],
      ["INFR09051", 4, 540, 590],
    ],
    [
      ["INFR10086", 0, 670, 720],
      ["INFR09032", 0, 730, 840],
      ["INFR10086", 1, 790, 840],
      ["INFR10065", 0, 910, 1020],
      ["INFR09032", 2, 570, 660],
      ["INFR09032", 4, 790, 960],
    ],
  ),
] as const;

const fridayPlans = [
  plan(
    "Plan 1",
    [
      "INFR09032",
      "INFR09051",
      "INFR10022",
      "INFR10059",
      "INFR10065",
      "INFR10067",
      "INFR10079",
    ],
    [
      ["INFR10067", 0, 600, 650],
      ["INFR10022", 0, 790, 840],
      ["INFR10059", 1, 910, 960],
      ["INFR10059", 3, 910, 960],
      ["INFR09051", 4, 540, 590],
      ["INFR10022", 4, 790, 840],
    ],
    [
      ["INFR10079", 0, 660, 710],
      ["INFR10079", 1, 540, 590],
      ["INFR09032", 2, 570, 660],
      ["INFR10065", 0, 910, 1020],
      ["INFR10079", 3, 540, 590],
      ["INFR09032", 4, 790, 960],
    ],
  ),
  plan(
    "Plan 2",
    [
      "INFR09032",
      "INFR09051",
      "INFR10022",
      "INFR10057",
      "INFR10065",
      "INFR10067",
      "INFR10090",
    ],
    [
      ["INFR10067", 0, 600, 650],
      ["INFR10022", 0, 790, 840],
      ["INFR10057", 1, 600, 650],
      ["INFR10057", 3, 600, 650],
      ["INFR09051", 4, 540, 590],
      ["INFR10022", 4, 790, 840],
    ],
    [
      ["INFR09032", 0, 730, 840],
      ["INFR10090", 0, 850, 900],
      ["INFR10090", 1, 600, 650],
      ["INFR09032", 2, 570, 660],
      ["INFR10090", 2, 790, 840],
      ["INFR09032", 4, 790, 960],
    ],
  ),
  plan(
    "Plan 3",
    [
      "INFR09032",
      "INFR09051",
      "INFR10022",
      "INFR10059",
      "INFR10067",
      "INFR10086",
      "INFR10090",
    ],
    [
      ["INFR10067", 0, 600, 650],
      ["INFR10022", 0, 790, 840],
      ["INFR10059", 1, 910, 960],
      ["INFR10059", 3, 910, 960],
      ["INFR09051", 4, 540, 590],
      ["INFR10022", 4, 790, 840],
    ],
    [
      ["INFR10086", 0, 670, 720],
      ["INFR09032", 0, 730, 840],
      ["INFR10090", 0, 850, 900],
      ["INFR10086", 1, 790, 840],
      ["INFR10090", 1, 600, 650],
      ["INFR09032", 2, 570, 660],
    ],
  ),
] as const;

const campusPlans = [
  plan(
    "Plan 1",
    [
      "INFR09032",
      "INFR09051",
      "INFR10022",
      "INFR10052",
      "INFR10065",
      "INFR10067",
      "INFR10074",
    ],
    [
      ["INFR10067", 0, 600, 650],
      ["INFR10022", 0, 790, 840],
      ["INFR10052", 0, 970, 1020],
      ["INFR10067", 1, 670, 720],
      ["INFR09051", 4, 540, 590],
      ["INFR10052", 4, 670, 780],
    ],
    [
      ["INFR09032", 0, 730, 840],
      ["INFR09032", 2, 570, 660],
      ["INFR10074", 3, 790, 900],
      ["INFR10074", 4, 540, 590],
      ["INFR10074", 4, 600, 650],
      ["INFR09032", 4, 790, 960],
    ],
  ),
  plan(
    "Plan 2",
    [
      "INFR09032",
      "INFR09051",
      "INFR10022",
      "INFR10052",
      "INFR10067",
      "INFR10076",
      "INFR10079",
    ],
    [
      ["INFR10067", 0, 600, 650],
      ["INFR10076", 0, 730, 780],
      ["INFR10022", 0, 790, 840],
      ["INFR10076", 0, 850, 900],
      ["INFR10052", 0, 970, 1020],
      ["INFR10076", 2, 790, 900],
    ],
    [
      ["INFR10079", 0, 660, 710],
      ["INFR09032", 0, 730, 840],
      ["INFR10079", 0, 910, 960],
      ["INFR10079", 1, 540, 590],
      ["INFR09032", 2, 570, 660],
      ["INFR10079", 3, 540, 590],
    ],
  ),
  plan(
    "Plan 3",
    [
      "INFR09032",
      "INFR09051",
      "INFR10022",
      "INFR10052",
      "INFR10067",
      "INFR10086",
      "INFR10090",
    ],
    [
      ["INFR10067", 0, 600, 650],
      ["INFR10022", 0, 790, 840],
      ["INFR10022", 0, 850, 930],
      ["INFR10052", 0, 970, 1020],
      ["INFR10052", 4, 670, 780],
      ["INFR09051", 4, 540, 590],
    ],
    [
      ["INFR10086", 0, 670, 720],
      ["INFR09032", 0, 730, 840],
      ["INFR10090", 0, 850, 900],
      ["INFR10086", 1, 790, 840],
      ["INFR10090", 1, 600, 650],
      ["INFR09032", 2, 570, 660],
    ],
  ),
] as const;

export const LANDING_CONTENT = {
  meta: {
    title: "Aperture | Start with the week",
    description:
      "Describe the week you want, then find course sets that satisfy the BSc Computer Science programme and the published timetable.",
  },
  brand: {
    name: "Aperture",
    markLabel: "Aperture home",
  },
  accessibility: {
    skipLink: "Skip to main content",
    navLabel: "Primary navigation",
    mainLabel: "Aperture landing page",
  },
  nav: {
    links: [
      { label: "The flip", href: "#flip" },
      { label: "How it works", href: "#how" },
      { label: "Stack", href: "#stack" },
      { label: "Limits", href: "#limits" },
      { label: "Slides", href: "/slides" },
    ],
    mobileMenuLabel: "Menu",
    github: {
      label: "GitHub",
      href: "https://github.com/ppowdderr/aperture",
      external: true,
    },
    cta: { label: "Open the planner", href: "/plan" },
  },
  hero: {
    label: "EdinburghAI Flip the Script",
    headline: ["Describe the week.", "Choose the legal year."],
    body:
      "No 9ams, Fridays free, King's Buildings days together. Aperture finds course sets that fit, then checks every degree rule.",
    primaryCta: { label: "Open the planner", href: "/plan" },
    secondaryCta: {
      label: "Create by chatting",
      href: "/chat",
    },
  },
  flip: {
    heading: "The sequence is backwards.",
    oldLabel: "Old way",
    oldText: "Pick courses, then discover the timetable they produce.",
    newLabel: "Aperture",
    newText:
      "Describe the week, then get the legal course sets that can produce it.",
    detail:
      "The week becomes the input. Degree rules and timetable clashes become checks, not surprises.",
  },
  how: {
    heading: "Three moves, one legal year.",
    intro:
      "Describe the week. Check the rules. Choose a timetable that survives both.",
    steps: [
      {
        title: "Describe the week",
        body:
          "Write the shape you want: no early starts, Friday afternoon free, one campus day, courses you want or will not take.",
        demoLabel: "Simulated preview",
      },
      {
        title: "Check the degree rules",
        body:
          "Compulsory courses, option credits, 120 credits, prerequisites and semester balance are checked against the programme table.",
        demoLabel: "Demo data",
      },
      {
        title: "Choose the legal year",
        body:
          "Compare legal course sets, choose tutorial groups, and see every unavoidable miss in the published timetable.",
        demoLabel: "Demo data",
      },
    ],
  },
  stats: {
    heading: "The demo is grounded.",
    intro:
      "Every number comes from the committed programme data and timetable export.",
    items: [
      {
        value: "68",
        label: "course records",
        source: "2026/27 DRPS scrape for UTCMPSI",
      },
      {
        value: "570",
        label: "timetable slots",
        source: "CTB export across 66 courses",
      },
      {
        value: "4",
        label: "programme years",
        source: "BSc Computer Science, years 1 to 4",
      },
      {
        value: "1",
        label: "end-to-end programme",
        source: "UTCMPSI with committed data",
      },
    ],
  },
  stack: {
    heading: "Built to be checked.",
    intro:
      "The language model handles language. The solver makes the decision.",
    items: [
      {
        tag: "App",
        name: "Next.js 16 and React 19",
        why: "One App Router codebase for the page, planner and API routes.",
      },
      {
        tag: "Types",
        name: "TypeScript 5 and zod",
        why: "Shared domain types and validated API inputs. Server code never trusts the client.",
      },
      {
        tag: "Rules",
        name: "Deterministic TypeScript solver",
        why: "Legal-year search and scoring stay fast, inspectable and outside the language model.",
      },
      {
        tag: "Data",
        name: "Mongoose 9 and MongoDB Atlas",
        why: "Persistent programme data when available, with committed JSON as the demo fallback.",
      },
      {
        tag: "Sources",
        name: "Cached DRPS and CTB exports",
        why: "The committed scrape runs the demo without a live university request.",
      },
      {
        tag: "Interface",
        name: "Tailwind 4 and scoped CSS",
        why: "Utility layout for the page and a landing-specific visual system without global overrides.",
      },
      {
        tag: "Deploy",
        name: "Vercel",
        why: "The Next.js app ships without a separate frontend or hosting layer.",
      },
    ],
    aiNote:
      "AI coding tools were used to build this project. The rule checks and timetable decisions remain deterministic.",
  },
  limits: {
    heading: "What is real, and what is not.",
    intro:
      "The boundary is explicit because a timetable tool should earn trust before it earns a click.",
    items: [
      {
        title: "One programme",
        body:
          "UTCMPSI Computer Science, years 1 to 4. No other degree programme is loaded.",
      },
      {
        title: "Cached data",
        body:
          "The demo reads committed 2026/27 scrape and timetable files. It does not pull live university data.",
      },
      {
        title: "Timetable coverage",
        body:
          "66 of 68 course records have timetable events. Two catalogue courses do not.",
      },
      {
        title: "Not enrolment",
        body:
          "Plans suggest course sets and tutorial groups. The university allocates groups and enrolment.",
      },
      {
        title: "Parser boundary",
        body:
          "Live sentence parsing needs a configured LLM endpoint. The previews on this page are simulated from fixed demo data.",
      },
      {
        title: "Published clashes",
        body:
          "If compulsory lectures clash in the published timetable, Aperture shows the forced miss.",
      },
    ],
  },
  footer: {
    statement: "Aperture. Built at EdinburghAI Flip the Script.",
    detail: "BSc Computer Science, 2026/27.",
    linksLabel: "Project links",
    links: [
      { label: "Open the planner", href: "/plan" },
      {
        label: "GitHub",
        href: "https://github.com/ppowdderr/aperture",
        external: true,
      },
      {
        label: "DRPS programme",
        href: "https://www.drps.ed.ac.uk/26-27/dpt/utcmpsi.htm",
        external: true,
      },
      {
        label: "Course Timetable Browser",
        href: "https://browser.ted.is.ed.ac.uk",
        external: true,
      },
    ],
  },
  preview: {
    shared: {
      demoLabel: "Interactive preview · Demo data",
      simulatedLabel: "Simulated preview",
      yearLabel: "BSc Computer Science · Year 3",
      semesterLabel: "Semester",
      planListLabel: "Plan options",
      weekRequestLabel: "Week requests",
      courseListLabel: "Courses in this plan",
      timetableLabel: "Sample timetable",
      loadingLabel: "Checking rules and timetable...",
      readyLabel: "Preview updated",
      semesterNames: ["Semester 1", "Semester 2"],
      semesterShortNames: ["S1", "S2"],
      creditsShort: "cr",
      days: ["Mon", "Tue", "Wed", "Thu", "Fri"],
      exampleHeading: "Try a sentence",
      appliedHeading: "Applied",
      ruleSourceLabel: "DRPS source",
      openSourceLabel: "Open source",
    },
    hero: [
      {
        id: "no-nine",
        label: "No 9am starts",
        prompt: "No 9am starts.",
        chips: ["No classes before 10:00"],
        note: "2 compulsory lectures still start before 10:00.",
        plans: noNinePlans,
      },
      {
        id: "friday-free",
        label: "Fridays free",
        prompt: "Fridays free.",
        chips: ["Friday kept free"],
        note: "4 compulsory lectures still land on Friday.",
        plans: fridayPlans,
      },
      {
        id: "campus-days",
        label: "KB days together",
        prompt: "Keep King's Buildings days together.",
        chips: ["Campus days grouped"],
        note: "No avoidable preference misses.",
        plans: campusPlans,
      },
    ],
    describe: {
      heading: "Describe a change",
      intro: "Every constraint stays visible and removable.",
      examples: [
        {
          label: "Week shape",
          prompt:
            "No 9ams, Fridays free, and keep King's Buildings days together.",
          chips: [
            "No classes before 10:00",
            "Friday kept free",
            "Campus days grouped",
          ],
        },
        {
          label: "Course interests",
          prompt:
            "I want databases and machine learning, with no classes before 10.",
          chips: [
            "Interested in databases",
            "Interested in machine learning",
            "No classes before 10:00",
          ],
        },
        {
          label: "Friday afternoon",
          prompt: "Keep Friday afternoon free and avoid early starts.",
          chips: [
            "Friday 13:00 to 18:00 kept free",
            "No classes before 10:00",
          ],
        },
      ],
    },
    rules: {
      heading: "Why this plan works",
      intro: "Each check keeps the source sentence beside it.",
      items: [
        {
          title: "Compulsory course",
          summary: "INFR09051 Informatics Large Practical",
          source:
            "Year 3 compulsory: Informatics Large Practical (INFR09051)",
          href: "https://www.drps.ed.ac.uk/26-27/dpt/cxinfr09051.htm",
        },
        {
          title: "Group A",
          summary: "Select exactly 50 credits",
          source: "Select exactly 50 credits in this group.",
          href: "https://www.drps.ed.ac.uk/26-27/dpt/utcmpsi.htm#dpt-year-3",
        },
        {
          title: "Semester 2 options",
          summary: "Choose 20 to 40 credits",
          source:
            "These are Computer Science courses in Semester 2 open to third-year undergraduate students.",
          href: "https://www.drps.ed.ac.uk/26-27/dpt/utcmpsi.htm#dpt-year-3",
        },
        {
          title: "Prerequisite",
          summary: "Machine Learning requires Foundations of Data Science",
          source:
            "Students MUST have passed: Informatics 2 - Foundations of Data Science (INFR08030)",
          href: "https://www.drps.ed.ac.uk/26-27/dpt/cxinfr10086.htm",
        },
      ],
    },
  },
} as const satisfies LandingContent;
