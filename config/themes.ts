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
    // Keep the historical id: the per-theme dedupe ledger and existing digest
    // editions are keyed by it.
    id: "art-residencies",
    label: "Artist Opportunities",
    accounts: [],
    searchQueries: [
      "url:on-the-move.org (residency OR fellowship OR grant OR prize OR \"open call\")",
      "url:transartists.org (residency OR open-call)",
      "url:resartis.org (residency OR \"open call\")",
      "url:culture.ec.europa.eu (residency OR grant OR \"open call\" OR \"Culture Moves Europe\")",
      "url:artconnect.com (residency OR grant OR prize OR \"open call\")",
      "(\"artist residency\" OR \"artists residency\") (\"open call\" OR apply OR deadline) (Europe OR European) min_faves:1",
      "(\"résidence artistique\" OR \"residencia artística\" OR Künstlerresidenz OR residenza) (candidature OR convocatoria OR Ausschreibung OR candidatura)",
      "(\"artist grant\" OR \"artists grant\" OR \"arts grant\" OR \"artist fund\") (\"open call\" OR apply OR deadline) min_faves:1",
      "(\"art prize\" OR \"artist prize\" OR \"art award\" OR \"artist award\") (\"open call\" OR \"call for entries\" OR apply OR deadline) min_faves:1",
      "(\"open call\" OR \"call for proposals\") (commission OR \"public art\") (artist OR artists) min_faves:1",
      "(\"artist fellowship\" OR \"writing fellowship\" OR \"writers fellowship\" OR \"creative fellowship\") (apply OR deadline OR \"open call\") min_faves:1",
    ],
    inclusionCriteria:
      "Include a currently open opportunity that an individual artist, writer, or artist collective can still apply to. Two scopes qualify: (1) in-person residencies physically located in geographic Europe; (2) grants, prizes, awards, commissions, fellowships, and funded research or writing programmes that a Europe-based individual applicant is eligible for, whether the funder is European or international and whether participation is in person or remote. The source must provide or link to a real programme page with an identifiable host or funder, a future application deadline, and an application route. Visual art, design, writing, music/sound, film, performance, interdisciplinary, digital/new-media, socially engaged, and art-and-science practices all qualify. Prioritize opportunities offering meaningful money or support—award money, stipend, artist fee, production budget, housing, travel—while retaining reputable self-funded residencies when all costs are transparent.",
    exclusionCriteria:
      "Exclude calls whose deadline is before the digest date; residencies outside geographic Europe or entirely online; opportunities restricted to applicants of a specific nationality, ethnicity, gender, religion, age band, or narrowly defined group, such that a general Europe-based individual applicant cannot apply — positive-action calls limited to particular demographic groups count as restricted; job postings, internships, and degree or diploma programmes; unfunded workshops and exhibition-only calls with no money, residency, or commission attached; calls only for host organizations; vague promotional posts without a verifiable deadline and application page; aggregator-only posts that cannot be traced to a programme or official call; and pay-to-enter schemes—high-fee vanity prizes, publication fees dressed as awards, or residencies charging large fees with little substantive support. Do not assume that Culture Moves Europe host calls are artist application calls.",
    clusterStrategy: "topic",
    primaryLinkHosts: [
      "on-the-move\\.org",
      "transartists\\.org",
      "resartis\\.org",
      "culture\\.ec\\.europa\\.eu",
      "artconnect\\.com",
    ],
    summaryStyle:
      "Write this as an application brief grounded in the fetched page content when it is provided; when only tweets are available, hedge and say the account is based on the linked discussion. Open with one or two sentences saying what the opportunity actually is and what makes it worth attention, in concrete terms: who runs it, what the selected applicant gets or does, and any headline numbers (prize value, stipend, duration) exactly as the source states them — the reader should understand the opportunity without clicking through. Then give the opportunity type, location (city, country—or 'remote'), exact deadline, dates or duration, accepted disciplines/career stage, key eligibility restrictions (including nationality or location requirements), and what the applicant must submit. Itemize only the money the source states—award or grant amount, stipend, housing, travel, production support, fees—and compress everything missing into at most one sentence like 'Other financial details are not stated'; never enumerate multiple 'not stated' fields. State the funding level in words—fully funded, partially funded, self-funded, or funding unclear. If the call or application page is not in English, say which language it is in. Include the official call/application page as the first primary link when it appears in the source material, without inventing a URL. Flag any uncertainty or second-hand listing. Assign the category matching the opportunity's primary type: residency for in-person residency stays; grant for project or working grants; prize for prizes and awards; commission for commissioned new work including public art; fellowship-program for fellowships and funded research or writing programmes. For hybrids, pick the component the applicant is chiefly applying for. If the deadline appears expired relative to the digest date, say so rather than encouraging an application.",
    categories: [
      {
        id: "residency",
        label: "Residency",
        color: "#3f7654",
        description: "In-person residency stays located in geographic Europe.",
      },
      {
        id: "grant",
        label: "Grant",
        color: "#5a6f9c",
        description:
          "Project or working grants an individual artist can apply for.",
      },
      {
        id: "prize",
        label: "Prize",
        color: "#806b9e",
        description: "Prizes and awards with meaningful money or support.",
      },
      {
        id: "commission",
        label: "Commission",
        color: "#916a4f",
        description: "Paid commissions for new work, including public art.",
      },
      {
        id: "fellowship-program",
        label: "Fellowship / program",
        color: "#4a7d7d",
        description:
          "Fellowships and funded research or writing programmes, in person or remote.",
      },
    ],
    fetchAbstracts: false,
    fetchPages: true,
    extractOpportunityMeta: true,
    // Soft ranking preferences, phrased impersonally (this file is public).
    tasteNotes:
      "Core practice: creative technology and new media—digital, generative, interactive, sound, and technology-driven art. Rank opportunities in these disciplines, and open-discipline calls that welcome them, highest. The reader is UK-based: remote or global opportunities and those in the UK or Europe are preferred, and residencies of up to roughly three months are viable anywhere reachable, but much longer stays are usually impractical. Well-funded opportunities are preferred, though self-funded or partially funded programmes are acceptable when the programme is strong. Applications must be workable in English or Spanish; calls documented only in other languages are low priority. Prizes and awards with substantial value and remote entry are highly relevant. Keep prestigious, easily shareable fellowships or programmes somewhat outside the core practice (for example major writing or research fellowships), ranked below directly applicable opportunities.",
    lookbackDays: 30,
    topN: 15,
    maxTweets: 800,
  },
];

export function getTheme(id: string): ThemeConfig | undefined {
  return THEMES.find((t) => t.id === id);
}
