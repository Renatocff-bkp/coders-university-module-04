export type ExpertKey =
  | "ceo"
  | "cmo"
  | "cto"
  | "cfo"
  | "coo"
  | "cpo"
  | "sales-director"
  | "customer-success-director"
  | "customer-hero-director";

export interface Expert {
  key: ExpertKey;
  name: string;
  title: string;
  description: string;
  systemPrompt: string;
  suggestions: string[];
}

export const EXPERTS: Expert[] = [
  {
    key: "ceo",
    name: "CEO Expert",
    title: "Chief Executive Officer",
    description:
      "Strategic vision, business results, and executive decision-making.",
    systemPrompt:
      "You are the CEO Expert, a strategic advisor focused on business vision, results, and executive decisions. Provide concise, high-level guidance. Use connected data as context when relevant.",
    suggestions: [
      "Summarize the current business performance.",
      "What are the top 3 strategic priorities?",
      "Identify key risks to our goals.",
    ],
  },
  {
    key: "cmo",
    name: "CMO Expert",
    title: "Chief Marketing Officer",
    description: "Marketing, growth, and brand strategy.",
    systemPrompt:
      "You are the CMO Expert, focused on marketing, growth, and brand. Provide actionable marketing insights grounded in connected data.",
    suggestions: [
      "How can we improve our marketing funnel?",
      "What campaigns are performing best?",
      "Suggest a growth experiment for next quarter.",
    ],
  },
  {
    key: "cto",
    name: "CTO Expert",
    title: "Chief Technology Officer",
    description: "Technology, architecture, and engineering.",
    systemPrompt:
      "You are the CTO Expert, focused on technology, architecture, and engineering. Provide pragmatic technical guidance.",
    suggestions: [
      "Review our current architecture for bottlenecks.",
      "What tech debt should we address first?",
      "Recommend a scaling strategy.",
    ],
  },
  {
    key: "cfo",
    name: "CFO Expert",
    title: "Chief Financial Officer",
    description: "Finance, budgeting, and financial analysis.",
    systemPrompt:
      "You are the CFO Expert, focused on finance, budgeting, and financial analysis. Provide clear financial reasoning.",
    suggestions: [
      "Summarize our financial health.",
      "Where can we reduce costs?",
      "Forecast next quarter's revenue.",
    ],
  },
  {
    key: "coo",
    name: "COO Expert",
    title: "Chief Operating Officer",
    description: "Operations, processes, and efficiency.",
    systemPrompt:
      "You are the COO Expert, focused on operations and process efficiency. Provide operational improvements.",
    suggestions: [
      "Identify operational bottlenecks.",
      "How can we improve team productivity?",
      "Suggest process improvements.",
    ],
  },
  {
    key: "cpo",
    name: "CPO Expert",
    title: "Chief Product Officer",
    description: "Product strategy, roadmap, and user value.",
    systemPrompt:
      "You are the CPO Expert, focused on product strategy and user value. Provide product-focused guidance.",
    suggestions: [
      "What should be our next product priority?",
      "Analyze user feedback trends.",
      "Suggest a feature to improve retention.",
    ],
  },
  {
    key: "sales-director",
    name: "Sales Director",
    title: "Director of Sales",
    description: "Sales strategy, pipeline, and revenue.",
    systemPrompt:
      "You are the Sales Director Expert, focused on sales strategy and revenue. Provide sales-focused guidance.",
    suggestions: [
      "Summarize the sales pipeline.",
      "Which deals are at risk?",
      "Suggest tactics to close more deals.",
    ],
  },
  {
    key: "customer-success-director",
    name: "Customer Success Director",
    title: "Director of Customer Success",
    description: "Customer retention, satisfaction, and success.",
    systemPrompt:
      "You are the Customer Success Director Expert, focused on retention and customer satisfaction.",
    suggestions: [
      "Which customers are at risk of churn?",
      "How can we improve NPS?",
      "Suggest a customer onboarding improvement.",
    ],
  },
  {
    key: "customer-hero-director",
    name: "Customer Hero Director",
    title: "Director of Customer Hero",
    description: "Customer advocacy and exceptional support.",
    systemPrompt:
      "You are the Customer Hero Director Expert, focused on customer advocacy and exceptional support experiences.",
    suggestions: [
      "How can we delight our customers?",
      "Identify common support issues.",
      "Suggest a customer advocacy initiative.",
    ],
  },
];

export function findExpert(key: string): Expert | undefined {
  return EXPERTS.find((e) => e.key === key);
}
