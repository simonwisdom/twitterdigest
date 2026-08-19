import { ThemeConfig } from "@/lib/types";

// The theme registry. Adding a theme = adding an entry here; pipeline code
// never branches on a theme id. Accounts and queries are starter seeds — edit freely.
export const THEMES: ThemeConfig[] = [
  {
    id: "science",
    label: "Science",
    accounts: [], // science is sourced purely from link searches
    // Thresholds calibrated Aug 2026: paper-link tweets are low-engagement
    // outside AI/arxiv (much of science Twitter left the platform), so these
    // min_faves gates are low; doi.org is the highest-volume source.
    searchQueries: [
      "url:arxiv.org min_faves:30",
      "url:biorxiv.org min_faves:5",
      "url:medrxiv.org min_faves:5",
      "url:nature.com min_faves:10",
      "url:science.org min_faves:10",
      "url:cell.com min_faves:5",
      "url:nejm.org min_faves:5",
      "url:thelancet.com min_faves:5",
      "url:pnas.org min_faves:5",
      "url:doi.org min_faves:10",
    ],
    inclusionCriteria:
      "Tweets discussing a specific scientific paper, journal article, or preprint (arxiv, biorxiv, medrxiv, or a journal). The tweet should be about the paper's content: its findings, methods, or implications, or substantive commentary/criticism of it.",
    exclusionCriteria:
      "Exclude: tweets about science policy, funding, or academia in general without a specific paper; job postings; conference announcements; personal news; jokes or memes that merely mention a paper; threads about tools/software releases that aren't papers.",
    clusterStrategy: "canonical-link",
    canonicalPatterns: [
      {
        name: "arxiv",
        hostPattern: "(^|\\.)arxiv\\.org$",
        idPattern: "(\\d{4}\\.\\d{4,5})",
      },
    ],
    summaryStyle:
      "Write for a scientifically literate reader. First summarize what the paper claims and how (2-4 sentences, grounded in the abstract when available — if no abstract is available, say the summary is based on discussion only). Then summarize the Twitter commentary: what people found notable, any substantive criticism or skepticism, in 1-3 sentences. Attribute skepticism as commentary, not fact.",
    categories: [
      { id: "physics", label: "Physics", color: "#7d6fae" },
      { id: "chemistry", label: "Chemistry", color: "#b57a52" },
      { id: "mathematics", label: "Mathematics", color: "#4f8b9b" },
      { id: "biology", label: "Biology", color: "#5f9173" },
      { id: "medicine", label: "Medicine", color: "#ad6666" },
      { id: "computer-science", label: "Computer Science", color: "#5f7ab3" },
      { id: "earth-climate", label: "Earth & Climate", color: "#9a7f4a" },
      { id: "social-science", label: "Social Science", color: "#a8718d" },
      { id: "engineering", label: "Engineering", color: "#647080" },
      { id: "other", label: "Other", color: "#7f858e" },
    ],
    fetchAbstracts: true,
    topN: 20,
    maxTweets: 1500,
  },
  {
    id: "news",
    label: "News",
    // News wires and newspapers only — no individual journalists.
    accounts: ["AP", "Reuters", "BBCWorld", "FinancialTimes"],
    searchQueries: [
      // Top-down: high-engagement tweets linking major news sites.
      // (filter:news isn't supported by twitterapi.io, and long url: OR-chains
      // return empty — keep these short. Paywalled sites (wsj/ft/bloomberg)
      // yield nothing via search; their own accounts above cover them.)
      "(url:reuters.com OR url:apnews.com OR url:nytimes.com OR url:washingtonpost.com) min_faves:100",
      "url:bbc.com min_faves:100",
      // Bottom-up: event-type keywords across languages, so events surface even
      // when curated accounts and news sites haven't covered them. Every keyword
      // group carries English + Japanese, Spanish, Portuguese, Arabic, and
      // Indonesian (the biggest Twitter languages), plus FR/DE/RU/ZH where we
      // already had them. High min_faves keeps volume bounded; the Haiku filter
      // handles the noise.
      "(war OR guerre OR guerra OR krieg OR война OR حرب OR 战争 OR 戦争 OR perang) min_faves:500",
      "(earthquake OR terremoto OR séisme OR 地震 OR زلزال OR gempa OR flood OR inundación OR inundação OR 洪水 OR فيضان OR banjir) min_faves:500",
      "(hurricane OR typhoon OR huracán OR tifón OR furacão OR tufão OR 台風 OR إعصار OR topan OR wildfire OR incêndio OR 山火事 OR \"kebakaran hutan\") min_faves:500",
      "(election OR referendum OR élection OR elección OR elecciones OR eleições OR Wahl OR выборы OR انتخابات OR 選挙 OR pemilu OR استفتاء OR 国民投票) min_faves:500",
      "(assassination OR assassinated OR murdered OR asesinato OR asesinado OR assassinato OR убийство OR اغتيال OR 暗殺 OR 殺害 OR pembunuhan) min_faves:500",
      "(\"supreme court\" OR ruling OR verdict OR indictment OR sentencia OR veredicto OR \"corte suprema\" OR \"supremo tribunal\" OR \"mahkamah agung\" OR vonis OR 判決 OR 起訴 OR 最高裁 OR \"المحكمة العليا\") min_faves:500",
      "(legislation OR impeachment OR legislación OR legislação OR تشريع OR 法案 OR 弾劾 OR pemakzulan OR \"undang-undang\" OR destitución) min_faves:500",
      "(coup OR kudeta OR انقلاب OR クーデター OR \"golpe de estado\" OR uprising OR levantamiento OR انتفاضة OR ceasefire OR cessar-fogo OR \"alto el fuego\" OR \"وقف إطلاق النار\" OR 停戦 OR \"gencatan senjata\") min_faves:500",
      "(sanctions OR sanciones OR sanções OR عقوبات OR 制裁 OR sanksi OR mobilization OR movilización OR mobilização OR 動員 OR \"martial law\" OR \"ley marcial\" OR \"lei marcial\" OR 戒厳令 OR \"darurat militer\" OR \"أحكام عرفية\") min_faves:500",
    ],
    inclusionCriteria:
      "Tweets discussing serious current events of the kind covered on a newspaper front page: US politics and government, international affairs, wars and conflicts, elections, major crimes and attacks, major economic/policy developments, significant disasters. Tweets in any language qualify; firsthand or local reports of real events qualify even if no news organization has covered them yet.",
    exclusionCriteria:
      "Exclude: celebrity and entertainment news, sports, gossip, pure opinion or hot takes not tied to a specific new event, culture-war dunking, promotional content, video-game or fictional 'events'.",
    clusterStrategy: "topic",
    primaryLinkHosts: [
      "reuters\\.com",
      "apnews\\.com",
      "bbc\\.(com|co\\.uk)",
      "nytimes\\.com",
      "washingtonpost\\.com",
      "wsj\\.com",
      "ft\\.com",
      "bloomberg\\.com",
      "economist\\.com",
      "axios\\.com",
      "politico\\.com",
    ],
    summaryStyle:
      'Write "just the facts" in the style of a wire service: what happened, who, where, when, and the immediate consequences. No opinion, no analysis of motives, no editorializing. Where facts are disputed or unconfirmed in the discussion, say so explicitly. If the source tweets are not in English, still write the summary in English. If no professional news source appears in the discussion, note that the report is unverified social-media reporting. 3-6 sentences.',
    fetchAbstracts: false,
    topN: 20,
    maxTweets: 1500,
  },
];

export function getTheme(id: string): ThemeConfig | undefined {
  return THEMES.find((t) => t.id === id);
}
