import { ThemeConfig } from "@/lib/types";

// The theme registry. Adding or refining a feed happens here; pipeline code
// does not branch on theme ids. These searches cover each theme's rolling X
// window, while the prompts do the evidence and eligibility screening.
export const THEMES: ThemeConfig[] = [
  {
    id: "longevity",
    label: "Practical Longevity",
    accounts: [],
    searchQueries: [
      "url:pubmed.ncbi.nlm.nih.gov (aging OR healthspan OR mortality) min_faves:2",
      "url:doi.org (aging OR healthspan OR longevity OR lifespan) min_faves:5",
      "url:jamanetwork.com (aging OR mortality OR exercise OR sleep) min_faves:3",
      "url:nejm.org (aging OR mortality OR prevention) min_faves:3",
      "url:thelancet.com (aging OR mortality OR exercise OR nutrition) min_faves:3",
      "url:bmj.com (aging OR mortality OR prevention OR healthspan) min_faves:3",
      "url:nature.com (aging OR healthspan OR longevity) min_faves:3",
      "url:cell.com (aging OR senescence OR metabolism) min_faves:3",
      "url:cochranelibrary.com (aging OR exercise OR sleep OR nutrition) min_faves:2",
    ],
    inclusionCriteria:
      "Include specific research or evidence syntheses relevant to extending healthy human life, prioritising human randomized trials, systematic reviews/meta-analyses, strong prospective cohorts, and clinical or public-health guidance. Focus on findings with a plausible practical implication: exercise and physical capacity, sleep, nutrition, cardiovascular or metabolic risk, prevention and screening, social/mental health, and diagnostics or biomarkers only when they have demonstrated clinical utility. Early-stage interventions may be included only when clearly framed as research to watch. Substantive criticism or correction of a longevity claim also qualifies.",
    exclusionCriteria:
      "Exclude mouse, worm, cell, or other preclinical results presented as advice for people; influencer protocols and anecdotes; supplement or drug claims without substantial human evidence; biological-age tests without demonstrated clinical utility; vague anti-aging or lifespan claims; company promotion; and tweets that give individualized medical instructions or dosing. Exclude papers whose only connection is that they mention age without a meaningful healthspan, prevention, function, morbidity, or mortality outcome.",
    clusterStrategy: "canonical-link",
    // A DOI or PubMed link proves that a paper exists, not that it is human,
    // useful, or responsibly described. Keep the evidence screen enabled.
    autoKeepCanonicalLinks: false,
    canonicalPatterns: [
      {
        name: "pubmed",
        hostPattern: "(^|\\.)pubmed\\.ncbi\\.nlm\\.nih\\.gov$",
        idPattern: "pubmed\\.ncbi\\.nlm\\.nih\\.gov\\/(\\d+)",
      },
    ],
    primaryLinkHosts: [
      "pubmed\\.ncbi\\.nlm\\.nih\\.gov",
      "doi\\.org",
      "jamanetwork\\.com",
      "nejm\\.org",
      "thelancet\\.com",
      "bmj\\.com",
      "nature\\.com",
      "cell\\.com",
      "cochranelibrary\\.com",
    ],
    summaryStyle:
      "Write for a careful non-specialist who wants useful, evidence-based takeaways—not biohacking hype. State the study type, population, intervention or exposure, outcome, and effect size (prefer absolute effects when available). Separate association from causation and name the most important limitation. End with a short 'Practical meaning:' sentence. Calibrate every claim's verbs to the strength of the evidence, and apply this most strictly to the Practical meaning sentence: plain assertion ('improves', 'reduces') only for mature or converging human evidence; 'likely' or 'probably' for moderate evidence; 'may' or 'might' for single studies, observational designs, or otherwise weak evidence; 'it is unclear whether' for very weak or conflicting evidence. Never let a sentence sound more certain than the evidence it rests on. Do not prescribe, recommend doses, diagnose, or imply that one study changes medical care. Assign applicable-now only to low-risk general behaviours backed by mature or converging human evidence; clinician-conversation to tests, treatments, risk factors, or decisions that need individual medical context; and research-watch to preliminary, mixed, surrogate-outcome, or not-yet-actionable findings. If no abstract is available, explicitly say the account is based on the linked discussion.",
    categories: [
      {
        id: "applicable-now",
        label: "Applicable now",
        color: "#3f7654",
        description:
          "Low-risk, general behaviours backed by mature or converging human evidence.",
      },
      {
        id: "clinician-conversation",
        label: "Discuss with a clinician",
        color: "#5a6f9c",
        description:
          "Tests, treatments, or risk decisions that need individual medical context.",
      },
      {
        id: "research-watch",
        label: "Research watch",
        color: "#806b9e",
        description: "Preliminary, mixed, or not-yet-actionable findings.",
      },
    ],
    fetchAbstracts: true,
    lookbackDays: 14,
    topN: 12,
    maxTweets: 800,
  },
  {
    id: "art-residencies",
    label: "European Art Residencies",
    accounts: [],
    searchQueries: [
      "url:on-the-move.org (residency OR fellowship)",
      "url:transartists.org (residency OR open-call)",
      "url:resartis.org (residency OR \"open call\")",
      "url:culture.ec.europa.eu (residency OR \"Culture Moves Europe\")",
      "url:artconnect.com (residency OR \"open call\")",
      "(\"artist residency\" OR \"artists residency\") (\"open call\" OR apply OR deadline) (Europe OR European) min_faves:1",
      "(\"résidence artistique\" OR \"residencia artística\" OR Künstlerresidenz OR residenza) (candidature OR convocatoria OR Ausschreibung OR candidatura)",
    ],
    inclusionCriteria:
      "Include a currently open call that an individual artist or artist collective can still apply to, for an in-person residency physically located in geographic Europe. The source must provide or link to a real programme page with an identifiable host, place, future application deadline, and application route. Visual art, design, writing, music/sound, film, performance, interdisciplinary, digital/new-media, socially engaged, and art-and-science practices all qualify. Prioritize opportunities offering a stipend, fee, housing, travel, production budget, or other meaningful support, while retaining reputable self-funded programmes when all costs are transparent.",
    exclusionCriteria:
      "Exclude calls whose deadline is before the digest date; opportunities outside geographic Europe or entirely online; exhibition, prize, job, workshop, or commission calls with no residency; calls only for host organizations; vague promotional posts without a verifiable deadline and application page; aggregator-only posts that cannot be traced to a programme or official call; high-fee pay-to-participate schemes with little substantive support; and opportunities whose stated nationality, age, career-stage, discipline, or other eligibility rules clearly make them unavailable to a general individual applicant. Do not assume that Culture Moves Europe host calls are artist application calls.",
    clusterStrategy: "topic",
    primaryLinkHosts: [
      "on-the-move\\.org",
      "transartists\\.org",
      "resartis\\.org",
      "culture\\.ec\\.europa\\.eu",
      "artconnect\\.com",
    ],
    summaryStyle:
      "Write this as an application brief, not arts publicity. Start with location (city, country) and the exact deadline. Then give residency dates or duration, accepted disciplines/career stage, key eligibility restrictions, and what the resident is expected to do. Itemize money plainly: artist fee or stipend, housing, travel, production support, application/programme fees, and costs the artist must cover; write 'not stated' for missing facts. Include the official call/application page as the first primary link when it appears in the source material, without inventing a URL. Flag any uncertainty or second-hand listing. Assign fully-funded only when there is no programme fee and the major participation costs are covered; partially-funded when meaningful support is offered but the artist bears a major cost; self-funded when the artist bears most costs; and funding-unclear when the source does not say. If the deadline appears expired relative to the digest date, say so rather than encouraging an application.",
    categories: [
      {
        id: "fully-funded",
        label: "Fully funded",
        color: "#3f7654",
        description:
          "No programme fee and the major participation costs are covered.",
      },
      {
        id: "partially-funded",
        label: "Partially funded",
        color: "#567596",
        description:
          "Meaningful support is offered, but the artist bears a major cost.",
      },
      {
        id: "self-funded",
        label: "Self-funded",
        color: "#916a4f",
        description: "The artist bears most costs.",
      },
      {
        id: "funding-unclear",
        label: "Funding unclear",
        color: "#6e7278",
        description: "The source does not say how the residency is funded.",
      },
    ],
    fetchAbstracts: false,
    lookbackDays: 30,
    topN: 15,
    maxTweets: 600,
  },
];

export function getTheme(id: string): ThemeConfig | undefined {
  return THEMES.find((t) => t.id === id);
}
