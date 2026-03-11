import { useState, useRef, useEffect } from "react";
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
} from "recharts";

// ─── Constants ───────────────────────────────────────────────────────────────

const SERVICES = {
  data_integration: {
    name: "Data Integration",
    short: "Integration",
    icon: "⛓",
    desc: "Break down silos by building pipelines that connect legacy and cloud data sources.",
  },
  data_quality: {
    name: "Data Quality",
    short: "Quality",
    icon: "✓",
    desc: "Ensure data is accurate, complete, consistent, and fit for purpose.",
  },
  data_governance: {
    name: "Data Governance",
    short: "Governance",
    icon: "⚖",
    desc: "Understand data meaning, lineage, and policies to build accountability.",
  },
  data_observability: {
    name: "Data Observability",
    short: "Observability",
    icon: "◎",
    desc: "Proactively detect data anomalies before they become costly downstream issues.",
  },
  geo_addressing: {
    name: "Geo Addressing",
    short: "Geo Addressing",
    icon: "◉",
    desc: "Verify, standardize, cleanse, and geocode addresses for decision-making.",
  },
  spatial_analytics: {
    name: "Spatial Analytics",
    short: "Spatial",
    icon: "◈",
    desc: "Discover patterns and relationships in location-based datasets.",
  },
  data_enrichment: {
    name: "Data Enrichment",
    short: "Enrichment",
    icon: "◆",
    desc: "Add context from 400+ curated datasets with 9,000+ attributes.",
  },
};

const URGENCY_COLORS = {
  critical: "#dc2626",
  high: "#f59e0b",
  medium: "#3b82f6",
  low: "#475569",
};

const INDUSTRIES = [
  { id: "financial", label: "Financial Services", icon: "⬡" },
  { id: "healthcare", label: "Healthcare", icon: "✦" },
  { id: "retail", label: "Retail & CPG", icon: "▣" },
  { id: "manufacturing", label: "Manufacturing", icon: "⬢" },
  { id: "tech", label: "Tech / SaaS", icon: "◇" },
  { id: "government", label: "Government", icon: "△" },
];

const SCALES = [
  { id: "small", label: "10–50 sources", sub: "Small" },
  { id: "medium", label: "50–200 sources", sub: "Medium" },
  { id: "large", label: "200–1,000 sources", sub: "Large" },
  { id: "enterprise", label: "1,000+ sources", sub: "Enterprise" },
];

const GOALS = [
  { id: "ai", label: "Power AI / ML initiatives", icon: "◈", desc: "Build foundation for trustworthy AI outputs" },
  { id: "compliance", label: "Meet regulatory requirements", icon: "⚖", desc: "GDPR, HIPAA, SOX, or industry mandates" },
  { id: "cx", label: "Improve customer experience", icon: "✦", desc: "Single customer view, personalization" },
  { id: "cost", label: "Reduce operational costs", icon: "▿", desc: "Eliminate redundancy and manual work" },
  { id: "modernize", label: "Modernize legacy systems", icon: "⬡", desc: "Migrate from mainframe/on-prem to cloud" },
];

const PAINS = [
  { id: "silos", label: "Data lives in too many disconnected systems", service: "data_integration" },
  { id: "errors", label: "We find errors after they've already caused damage", service: "data_observability" },
  { id: "lineage", label: "Nobody knows where our data came from or who owns it", service: "data_governance" },
  { id: "inconsistent", label: "Our data is incomplete or inconsistent across systems", service: "data_quality" },
  { id: "addresses", label: "Our address and location data is unreliable", service: "geo_addressing" },
  { id: "no_context", label: "We lack external context to enrich our decisions", service: "data_enrichment" },
  { id: "geo_blind", label: "We can't see geographic patterns in our data", service: "spatial_analytics" },
];

// ─── API Helper ──────────────────────────────────────────────────────────────

async function callClaude(messages, systemPrompt) {
  const response = await fetch("/api/claude", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1000,
      system: systemPrompt,
      messages,
    }),
  });
  const data = await response.json();
  return (
    data.content
      ?.map((b) => (b.type === "text" ? b.text : ""))
      .filter(Boolean)
      .join("\n") || ""
  );
}

const QUESTION_PROMPT = `You are an expert data integrity consultant at Precisely. Based on a prospect's structured intake data, generate ONE incisive diagnostic question that probes the specific intersection of their industry, goal, and pain points.

RULES:
- Ask exactly ONE question. No preamble, no "great question" filler.
- Start with a brief 1-sentence acknowledgment that shows you understood their specific combination.
- Then ask a question that a junior consultant would never think to ask — something that reveals the ROOT CAUSE behind their stated pain.
- The question should help determine which of Precisely's 7 services would have the highest immediate impact.
- Keep it to 3 sentences max total.
- Be conversational, not corporate.`;

const DIAGNOSIS_PROMPT = `You are an expert data integrity analyst at Precisely. Based on the prospect's structured intake AND their open-ended response, generate a diagnosis.

PRECISELY'S 7 SERVICES: data_integration, data_quality, data_governance, data_observability, geo_addressing, spatial_analytics, data_enrichment

SCORING:
- accuracy_score (1-5): How clean/validated/correct is their data? (1=severe gap, 5=strong)
- consistency_score (1-5): How well-connected and non-siloed?
- context_score (1-5): How enriched/contextualized for decisions?
- Each service: relevance ("critical"|"high"|"medium"|"low") and urgency (same scale)
- Weight their selected pain points heavily — those are direct signals.
- Factor industry norms (e.g., financial services = governance-heavy, retail = geo/enrichment-heavy).

Respond with ONLY valid JSON, no markdown, no backticks:
{
  "accuracy_score": <number>,
  "consistency_score": <number>,
  "context_score": <number>,
  "industry": "<their industry>",
  "company_scale": "<their scale>",
  "services": {
    "data_integration": { "relevance": "<level>", "urgency": "<level>" },
    "data_quality": { "relevance": "<level>", "urgency": "<level>" },
    "data_governance": { "relevance": "<level>", "urgency": "<level>" },
    "data_observability": { "relevance": "<level>", "urgency": "<level>" },
    "geo_addressing": { "relevance": "<level>", "urgency": "<level>" },
    "spatial_analytics": { "relevance": "<level>", "urgency": "<level>" },
    "data_enrichment": { "relevance": "<level>", "urgency": "<level>" }
  },
  "diagnosis_summary": "<2-3 sentence plain-English diagnosis of their core gap — specific to their situation, not generic>",
  "primary_gap": "<most critical service key>",
  "secondary_gap": "<second most critical service key>"
}`;

const ROADMAP_PROMPT = `You are an expert data integrity strategist at Precisely. Generate a personalized 3-phase implementation roadmap.

RULES:
- Phase 1 (Months 1-3): The ONE service addressing their most urgent pain. Explain WHY first.
- Phase 2 (Months 3-6): 1-2 complementary services making Phase 1 sustainable.
- Phase 3 (Months 6-12): Remaining relevant services (skip "low" relevance).
- Reference specific details from their intake — industry, goal, pain points, their typed answer.
- Each phase: 3-4 sentences max. Write in second person. Be direct.

Respond with ONLY valid JSON, no markdown, no backticks:
{
  "phases": [
    {
      "title": "Phase 1: Quick Win",
      "timeline": "Months 1–3",
      "services": ["<service_key>"],
      "rationale": "<why this first — reference their situation>",
      "success_signal": "<you'll know it's working when...>"
    },
    {
      "title": "Phase 2: Foundation",
      "timeline": "Months 3–6",
      "services": ["<key>"],
      "rationale": "<why these next>",
      "success_signal": "<signal>"
    },
    {
      "title": "Phase 3: Scale",
      "timeline": "Months 6–12",
      "services": ["<key>"],
      "rationale": "<why these complete the picture>",
      "success_signal": "<signal>"
    }
  ],
  "executive_summary": "<1 paragraph tying the whole roadmap to their stated goal>"
}`;

// ─── Wizard Steps ────────────────────────────────────────────────────────────

function StepShell({ stepNum, totalSteps, title, subtitle, children }) {
  return (
    <div style={st.stepContainer} key={stepNum}>
      <div style={st.stepProgress}>
        {Array.from({ length: totalSteps }, (_, i) => (
          <div
            key={i}
            style={{
              ...st.progressDot,
              background: i <= stepNum ? "#06b6d4" : "#1e293b",
              opacity: i <= stepNum ? 1 : 0.35,
              width: i === stepNum ? 28 : 8,
              borderRadius: 4,
            }}
          />
        ))}
      </div>
      <div style={st.stepHeader}>
        <span style={st.stepLabel}>Step {stepNum + 1} of {totalSteps}</span>
        <h2 style={st.stepTitle}>{title}</h2>
        {subtitle && <p style={st.stepSubtitle}>{subtitle}</p>}
      </div>
      <div style={st.stepBody}>{children}</div>
    </div>
  );
}

function Step1({ data, setData, onNext }) {
  const { industry, scale } = data;
  return (
    <StepShell stepNum={0} totalSteps={4} title="Your data landscape" subtitle="Tell us about your organization so we can calibrate the diagnosis.">
      <div>
        <label style={st.fieldLabel}>Industry</label>
        <div style={st.cardGrid6}>
          {INDUSTRIES.map((ind) => (
            <div key={ind.id} onClick={() => setData((d) => ({ ...d, industry: ind.id }))}
              style={{ ...st.selectCard, ...(industry === ind.id ? st.selectCardActive : {}) }}>
              <span style={st.cardIcon}>{ind.icon}</span>
              <span style={st.cardLabel}>{ind.label}</span>
            </div>
          ))}
        </div>
      </div>
      <div style={{ marginTop: 24 }}>
        <label style={st.fieldLabel}>Data sources in your org</label>
        <div style={st.cardGrid4}>
          {SCALES.map((sc) => (
            <div key={sc.id} onClick={() => setData((d) => ({ ...d, scale: sc.id }))}
              style={{ ...st.selectCard, ...st.scaleCard, ...(scale === sc.id ? st.selectCardActive : {}) }}>
              <span style={st.scaleNum}>{sc.label}</span>
              <span style={st.scaleSub}>{sc.sub}</span>
            </div>
          ))}
        </div>
      </div>
      <button style={{ ...st.nextBtn, opacity: industry && scale ? 1 : 0.3 }} onClick={onNext} disabled={!industry || !scale}>
        Continue <span style={{ marginLeft: 6 }}>→</span>
      </button>
    </StepShell>
  );
}

function Step2({ data, setData, onNext, onBack }) {
  const { goal } = data;
  return (
    <StepShell stepNum={1} totalSteps={4} title="What are you building toward?" subtitle="Pick the primary objective driving your data investment.">
      <div style={st.goalGrid}>
        {GOALS.map((g) => {
          const sel = goal === g.id;
          return (
            <div key={g.id} onClick={() => setData((d) => ({ ...d, goal: g.id }))}
              style={{ ...st.goalCard, ...(sel ? st.goalCardActive : {}) }}>
              <div style={st.goalTop}>
                <div style={{ ...st.radio, ...(sel ? st.radioActive : {}) }}>
                  {sel && <div style={st.radioDot} />}
                </div>
                <span style={st.goalIcon}>{g.icon}</span>
                <span style={st.goalLabel}>{g.label}</span>
              </div>
              <span style={{ ...st.goalDesc, marginLeft: 50 }}>{g.desc}</span>
            </div>
          );
        })}
      </div>
      <div style={st.btnRow}>
        <button style={st.backBtn} onClick={onBack}>← Back</button>
        <button style={{ ...st.nextBtn, opacity: goal ? 1 : 0.3 }} onClick={onNext} disabled={!goal}>
          Continue <span style={{ marginLeft: 6 }}>→</span>
        </button>
      </div>
    </StepShell>
  );
}

function Step3({ data, setData, onNext, onBack }) {
  const pains = data.pains || [];
  function toggle(id) {
    setData((d) => {
      const c = d.pains || [];
      if (c.includes(id)) return { ...d, pains: c.filter((p) => p !== id) };
      if (c.length >= 3) return d;
      return { ...d, pains: [...c, id] };
    });
  }
  return (
    <StepShell stepNum={2} totalSteps={4} title="Where does it hurt?" subtitle="Select up to 3 pain points your team faces regularly.">
      <div style={st.painGrid}>
        {PAINS.map((p) => {
          const sel = pains.includes(p.id);
          const dis = !sel && pains.length >= 3;
          return (
            <div key={p.id} onClick={() => { if (!dis) toggle(p.id); }}
              style={{ ...st.painCard, ...(sel ? st.painCardActive : {}), ...(dis ? st.painCardDisabled : {}) }}>
              <div style={{ ...st.painCheck, ...(sel ? st.painCheckActive : {}) }}>
                {sel ? "✓" : ""}
              </div>
              <span style={st.painLabel}>{p.label}</span>
            </div>
          );
        })}
      </div>
      <p style={st.painCounter}>{pains.length}/3 selected</p>
      <div style={st.btnRow}>
        <button style={st.backBtn} onClick={onBack}>← Back</button>
        <button style={{ ...st.nextBtn, opacity: pains.length > 0 ? 1 : 0.3 }} onClick={onNext} disabled={pains.length === 0}>
          Continue <span style={{ marginLeft: 6 }}>→</span>
        </button>
      </div>
    </StepShell>
  );
}

function Step4({ aiQuestion, answer, setAnswer, onSubmit, onBack, isGenerating }) {
  return (
    <StepShell stepNum={3} totalSteps={4} title="One question for you" subtitle="Tailored to your specific combination of industry, goal, and pain points.">
      {!aiQuestion ? (
        <div style={st.aiLoadingBox}>
          <div style={st.spinner} />
          <p style={st.aiLoadingText}>Generating a personalized question...</p>
        </div>
      ) : (
        <div style={st.aiQuestionBox}>
          <div style={st.aiBadge}><span style={{ fontSize: 11 }}>◈</span> AI-Generated</div>
          <p style={st.aiQuestionText}>{aiQuestion}</p>
        </div>
      )}
      {aiQuestion && (
        <textarea style={st.answerArea} value={answer} onChange={(e) => setAnswer(e.target.value)}
          placeholder="Share as much detail as you'd like..." rows={4} disabled={isGenerating} />
      )}
      <div style={st.btnRow}>
        <button style={st.backBtn} onClick={onBack} disabled={isGenerating}>← Back</button>
        <button style={{ ...st.nextBtn, ...st.submitBtn, opacity: answer.trim() && !isGenerating ? 1 : 0.3 }}
          onClick={onSubmit} disabled={!answer.trim() || isGenerating}>
          {isGenerating ? "Analyzing..." : "Generate My Diagnosis"} <span style={{ marginLeft: 6 }}>→</span>
        </button>
      </div>
    </StepShell>
  );
}

// ─── Results ─────────────────────────────────────────────────────────────────

function DiagnosisScreen({ diagnosis, onGenerateRoadmap, isGenerating }) {
  const radarData = [
    { axis: "Accuracy", value: diagnosis.accuracy_score, fullMark: 5 },
    { axis: "Consistency", value: diagnosis.consistency_score, fullMark: 5 },
    { axis: "Context", value: diagnosis.context_score, fullMark: 5 },
  ];
  const serviceData = Object.entries(diagnosis.services)
    .map(([key, val]) => ({
      key, fullName: SERVICES[key]?.name || key, icon: SERVICES[key]?.icon || "·",
      desc: SERVICES[key]?.desc || "", relevance: val.relevance, urgency: val.urgency,
      score: val.relevance === "critical" ? 4 : val.relevance === "high" ? 3 : val.relevance === "medium" ? 2 : 1,
    }))
    .sort((a, b) => b.score - a.score);

  return (
    <div style={st.resultsContainer}>
      <div style={st.resultsHeader}>
        <div style={st.logoBadge}><span style={st.logoIcon}>◈</span></div>
        <h2 style={st.resultsTitle}>Your Data Integrity Diagnosis</h2>
        <div style={st.pillRow}>
          <span style={st.pill}>{diagnosis.industry}</span>
          <span style={st.pill}>{diagnosis.company_scale}</span>
        </div>
      </div>
      <div style={st.summaryBox}><p style={st.summaryText}>{diagnosis.diagnosis_summary}</p></div>
      <div style={st.diagGrid}>
        <div style={st.diagCard}>
          <h3 style={st.cardTitle}>Integrity Scores</h3>
          <p style={st.cardSub}>Lower = larger gap (1–5 scale)</p>
          <div style={{ width: "100%", height: 220 }}>
            <ResponsiveContainer>
              <RadarChart data={radarData} cx="50%" cy="50%" outerRadius="68%">
                <PolarGrid stroke="#1e293b" />
                <PolarAngleAxis dataKey="axis" tick={{ fill: "#94a3b8", fontSize: 13, fontFamily: "'DM Sans'" }} />
                <PolarRadiusAxis domain={[0, 5]} tick={{ fill: "#475569", fontSize: 10 }} axisLine={false} />
                <Radar dataKey="value" stroke="#06b6d4" fill="#06b6d4" fillOpacity={0.15} strokeWidth={2} dot={{ r: 4, fill: "#06b6d4" }} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div style={st.diagCard}>
          <h3 style={st.cardTitle}>Service Priority Map</h3>
          <p style={st.cardSub}>Ranked by relevance to your situation</p>
          <div style={st.serviceList}>
            {serviceData.map((sv) => (
              <div key={sv.key} style={st.serviceRow}>
                <div style={st.serviceIcon}>{sv.icon}</div>
                <div style={st.serviceInfo}>
                  <div style={st.serviceName}>{sv.fullName}</div>
                  <div style={st.serviceDescText}>{sv.desc}</div>
                </div>
                <span style={{ ...st.badge, background: URGENCY_COLORS[sv.relevance] + "18", color: URGENCY_COLORS[sv.relevance], borderColor: URGENCY_COLORS[sv.relevance] + "40" }}>
                  {sv.relevance}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
      <button style={{ ...st.nextBtn, ...st.generateBtn, opacity: isGenerating ? 0.4 : 1 }} onClick={onGenerateRoadmap} disabled={isGenerating}>
        {isGenerating ? "Generating..." : "Generate My Personalized Roadmap"} <span style={{ marginLeft: 6 }}>→</span>
      </button>
    </div>
  );
}

function RoadmapScreen({ roadmap, diagnosis }) {
  const colors = ["#06b6d4", "#8b5cf6", "#f59e0b"];
  return (
    <div style={st.resultsContainer}>
      <div style={st.resultsHeader}>
        <div style={st.logoBadge}><span style={st.logoIcon}>◈</span></div>
        <h2 style={st.resultsTitle}>Your Data Integrity Roadmap</h2>
        <div style={st.pillRow}>
          <span style={st.pill}>{diagnosis.industry}</span>
          <span style={st.pill}>{diagnosis.company_scale}</span>
        </div>
      </div>
      <div style={st.summaryBox}><p style={st.summaryText}>{roadmap.executive_summary}</p></div>
      <div style={st.timelineBar}>
        <div style={st.timelineLine} />
        {roadmap.phases.map((ph, i) => (
          <div key={i} style={st.timelineNode}>
            <div style={{ ...st.timelineDot, background: colors[i], boxShadow: `0 0 10px ${colors[i]}44` }} />
            <span style={st.timelineLabel}>{ph.timeline}</span>
          </div>
        ))}
      </div>
      <div style={st.phasesStack}>
        {roadmap.phases.map((phase, i) => (
          <div key={i} style={st.phaseCard}>
            <div style={{ ...st.phaseAccent, background: colors[i] }} />
            <div style={st.phaseBody}>
              <div style={st.phaseTop}>
                <h3 style={{ ...st.phaseTitle, color: colors[i] }}>{phase.title}</h3>
                <span style={st.phaseTime}>{phase.timeline}</span>
              </div>
              <div style={st.phaseServices}>
                {phase.services.map((k) => (
                  <span key={k} style={st.phaseServicePill}>{SERVICES[k]?.icon} {SERVICES[k]?.name || k}</span>
                ))}
              </div>
              <p style={st.phaseRationale}>{phase.rationale}</p>
              <div style={st.successBox}>
                <span style={st.successIcon}>✦</span>
                <span style={st.successText}>{phase.success_signal}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
      <div style={st.footer}>
        <p style={st.footerText}>
          Built by Sidharth Sundaram as a prototype for Precisely's AI PM Intern role.
          This tool productizes the first consulting conversation — reducing the mental effort
          of choosing across 7 services into one personalized recommendation.
        </p>
      </div>
    </div>
  );
}

function LoadingScreen({ message }) {
  return (
    <div style={st.loadingScreen}>
      <div style={st.spinner} />
      <p style={st.loadingScreenText}>{message}</p>
    </div>
  );
}

function IntroScreen({ onStart }) {
  return (
    <div style={st.introWrap}>
      <div style={st.introInner}>
        <div style={st.logoBadge}><span style={st.logoIcon}>◈</span></div>
        <h1 style={st.introTitle}>Data Integrity Advisor</h1>
        <p style={st.introSub}>Powered by Precisely's Data Integrity Suite</p>
        <div style={st.divider} />
        <p style={st.introDesc}>
          Answer 4 quick questions about your data landscape. Our AI advisor diagnoses
          your integrity gaps and generates a personalized roadmap across Precisely's
          seven interoperable services.
        </p>
        <div style={st.statsRow}>
          {[{ n: "12,000+", l: "Organizations Trust Precisely" }, { n: "95", l: "of the Fortune 100" }, { n: "7", l: "Interoperable Services" }].map((x) => (
            <div key={x.l} style={st.stat}>
              <div style={st.statNum}>{x.n}</div>
              <div style={st.statLabel}>{x.l}</div>
            </div>
          ))}
        </div>
        <button style={st.startBtn} onClick={onStart}>Begin Diagnostic <span style={{ marginLeft: 8 }}>→</span></button>
        <p style={st.footnote}>~2 minutes · No signup · Data stays private</p>
      </div>
    </div>
  );
}

// ─── Main App ────────────────────────────────────────────────────────────────

export default function App() {
  const [stage, setStage] = useState("intro");
  const [step, setStep] = useState(0);
  const [data, setData] = useState({ industry: null, scale: null, goal: null, pains: [] });
  const [aiQuestion, setAiQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [diagnosis, setDiagnosis] = useState(null);
  const [roadmap, setRoadmap] = useState(null);
  const [loading, setLoading] = useState(false);

  function buildContext() {
    const ind = INDUSTRIES.find((i) => i.id === data.industry)?.label || data.industry;
    const sc = SCALES.find((x) => x.id === data.scale)?.label || data.scale;
    const gl = GOALS.find((g) => g.id === data.goal)?.label || data.goal;
    const pn = (data.pains || []).map((p) => PAINS.find((x) => x.id === p)?.label).filter(Boolean);
    return `Industry: ${ind}\nScale: ${sc}\nPrimary Goal: ${gl}\nPain Points:\n${pn.map((p) => "- " + p).join("\n")}`;
  }

  async function generateQuestion() {
    const ctx = buildContext();
    try {
      const q = await callClaude(
        [{ role: "user", content: "Here is the prospect's intake data:\n\n" + ctx + "\n\nGenerate your single diagnostic question." }],
        QUESTION_PROMPT
      );
      setAiQuestion(q);
    } catch {
      setAiQuestion("Given the pain points you've described — what typically happens when something goes wrong with your data? Walk me through the last time a data issue caused a real business problem.");
    }
  }

  async function generateDiagnosis() {
    setLoading(true);
    setStage("diagnosing");
    const ctx = buildContext();
    const input = ctx + "\n\nOpen-ended response to diagnostic question:\n\"" + answer + "\"";
    try {
      const raw = await callClaude([{ role: "user", content: input }], DIAGNOSIS_PROMPT);
      const parsed = JSON.parse(raw.replace(/```json|```/g, "").trim());
      setDiagnosis(parsed);
      setStage("diagnosis");
    } catch (e) {
      console.error("Diagnosis error:", e);
      const ps = (data.pains || []).map((p) => PAINS.find((x) => x.id === p)?.service).filter(Boolean);
      setDiagnosis({
        accuracy_score: 2, consistency_score: 2, context_score: 3,
        industry: INDUSTRIES.find((i) => i.id === data.industry)?.label || "Technology",
        company_scale: SCALES.find((x) => x.id === data.scale)?.sub || "Medium",
        services: Object.fromEntries(Object.keys(SERVICES).map((k) => [k, { relevance: ps[0] === k ? "critical" : ps.includes(k) ? "high" : "medium", urgency: ps[0] === k ? "high" : "medium" }])),
        diagnosis_summary: "Based on your responses, your organization faces significant data integrity challenges that require a structured approach to resolve.",
        primary_gap: ps[0] || "data_governance", secondary_gap: ps[1] || "data_integration",
      });
      setStage("diagnosis");
    }
    setLoading(false);
  }

  async function generateRoadmap() {
    setLoading(true);
    setStage("generating");
    const ctx = buildContext();
    try {
      const raw = await callClaude(
        [{ role: "user", content: "DIAGNOSIS:\n" + JSON.stringify(diagnosis, null, 2) + "\n\nINTAKE:\n" + ctx + "\n\nOPEN RESPONSE:\n\"" + answer + "\"" }],
        ROADMAP_PROMPT
      );
      const parsed = JSON.parse(raw.replace(/```json|```/g, "").trim());
      setRoadmap(parsed);
      setStage("roadmap");
    } catch {
      setRoadmap({
        phases: [
          { title: "Phase 1: Quick Win", timeline: "Months 1–3", services: [diagnosis.primary_gap], rationale: "Addresses your most acute pain point first to build momentum and organizational confidence.", success_signal: "You'll know it's working when data issues are caught proactively instead of reactively." },
          { title: "Phase 2: Foundation", timeline: "Months 3–6", services: [diagnosis.secondary_gap], rationale: "Builds the structural layer that makes your Phase 1 gains sustainable.", success_signal: "You'll know it's working when teams spend less time debating data accuracy and more time acting on insights." },
          { title: "Phase 3: Scale", timeline: "Months 6–12", services: Object.entries(diagnosis.services).filter(([k, v]) => v.relevance === "high" && k !== diagnosis.primary_gap && k !== diagnosis.secondary_gap).map(([k]) => k).slice(0, 2), rationale: "These services multiply the value of your foundation by adding breadth.", success_signal: "You'll know it's working when data-driven decisions become the default." },
        ],
        executive_summary: "Your roadmap delivers quick impact, builds a sustainable foundation, then scales across your data ecosystem.",
      });
      setStage("roadmap");
    }
    setLoading(false);
  }

  function wizardNext() {
    if (step < 2) setStep(step + 1);
    else if (step === 2) { setStep(3); generateQuestion(); }
  }

  return (
    <div style={st.root}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700&family=JetBrains+Mono:wght@400;500&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        button { outline: none !important; }
        button:focus, button:focus-visible, button:active, button:focus-within { 
          outline: none !important; 
          box-shadow: none !important; 
          -webkit-appearance: none !important;
        }
        button::-moz-focus-inner { border: 0 !important; }
        *:focus { outline: none !important; }
        *:focus-visible { outline: none !important; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>

      {stage === "intro" && <IntroScreen onStart={() => setStage("wizard")} />}
      {stage === "wizard" && step === 0 && <Step1 data={data} setData={setData} onNext={wizardNext} />}
      {stage === "wizard" && step === 1 && <Step2 data={data} setData={setData} onNext={wizardNext} onBack={() => setStep(0)} />}
      {stage === "wizard" && step === 2 && <Step3 data={data} setData={setData} onNext={wizardNext} onBack={() => setStep(1)} />}
      {stage === "wizard" && step === 3 && <Step4 aiQuestion={aiQuestion} answer={answer} setAnswer={setAnswer} onSubmit={generateDiagnosis} onBack={() => { setStep(2); setAiQuestion(""); setAnswer(""); }} isGenerating={loading} />}
      {stage === "diagnosing" && <LoadingScreen message="Analyzing your data integrity landscape..." />}
      {stage === "diagnosis" && diagnosis && <DiagnosisScreen diagnosis={diagnosis} onGenerateRoadmap={generateRoadmap} isGenerating={loading} />}
      {stage === "generating" && <LoadingScreen message="Building your personalized roadmap..." />}
      {stage === "roadmap" && roadmap && diagnosis && <RoadmapScreen roadmap={roadmap} diagnosis={diagnosis} />}
    </div>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const f = "'DM Sans', sans-serif";
const mn = "'JetBrains Mono', monospace";

const st = {
  root: { minHeight: "100vh", background: "#0b1120", fontFamily: f, color: "#e2e8f0" },

  introWrap: { minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 24, background: "radial-gradient(ellipse at 25% 15%, #0f2847 0%, #0b1120 65%)" },
  introInner: { maxWidth: 540, textAlign: "center", animation: "fadeIn 0.5s ease-out" },
  logoBadge: { width: 52, height: 52, borderRadius: 14, background: "linear-gradient(135deg, #06b6d4, #0891b2)", display: "inline-flex", alignItems: "center", justifyContent: "center", marginBottom: 20, boxShadow: "0 0 28px #06b6d420" },
  logoIcon: { fontSize: 22, color: "#fff" },
  introTitle: { fontSize: 34, fontWeight: 700, letterSpacing: "-0.025em", color: "#f1f5f9", marginBottom: 6 },
  introSub: { fontSize: 13, color: "#64748b", letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 24 },
  divider: { width: 40, height: 2, background: "linear-gradient(90deg, #06b6d4, transparent)", margin: "0 auto 24px" },
  introDesc: { fontSize: 15, lineHeight: 1.7, color: "#94a3b8", marginBottom: 28 },
  statsRow: { display: "flex", justifyContent: "center", gap: 28, marginBottom: 32 },
  stat: { textAlign: "center" },
  statNum: { fontSize: 20, fontWeight: 700, color: "#06b6d4", fontFamily: mn },
  statLabel: { fontSize: 11, color: "#64748b", marginTop: 2 },
  startBtn: { padding: "13px 32px", fontSize: 14, fontWeight: 600, fontFamily: f, color: "#0b1120", background: "linear-gradient(135deg, #06b6d4, #22d3ee)", border: "none", borderRadius: 10, cursor: "pointer", boxShadow: "0 4px 20px #06b6d430" },
  footnote: { fontSize: 11, color: "#475569", marginTop: 14 },

  stepContainer: { minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "32px 24px", animation: "fadeIn 0.35s ease-out" },
  stepProgress: { display: "flex", gap: 6, marginBottom: 24, alignItems: "center" },
  progressDot: { height: 6, transition: "all 0.3s ease" },
  stepHeader: { textAlign: "center", marginBottom: 24, maxWidth: 520 },
  stepLabel: { fontSize: 11, fontFamily: mn, color: "#475569", letterSpacing: "0.06em", textTransform: "uppercase" },
  stepTitle: { fontSize: 26, fontWeight: 700, color: "#f1f5f9", marginTop: 8, letterSpacing: "-0.02em" },
  stepSubtitle: { fontSize: 14, color: "#64748b", marginTop: 6 },
  stepBody: { width: "100%", maxWidth: 600 },

  fieldLabel: { fontSize: 11, fontWeight: 600, color: "#94a3b8", letterSpacing: "0.05em", textTransform: "uppercase", display: "block", marginBottom: 8 },
  cardGrid6: { display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 },
  cardGrid4: { display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8 },
  selectCard: { display: "flex", flexDirection: "column", alignItems: "center", gap: 6, padding: "14px 6px", background: "#111827", border: "1.5px solid #111827", borderRadius: 10, cursor: "pointer", transition: "all 0.15s", fontFamily: f, color: "#94a3b8", fontSize: 12, outline: "none", userSelect: "none" },
  selectCardActive: { border: "1.5px solid #06b6d4", background: "#06b6d418", color: "#e2e8f0", boxShadow: "inset 0 0 0 1px #06b6d444" },
  cardIcon: { fontSize: 18 },
  cardLabel: { fontSize: 11, fontWeight: 500, textAlign: "center", lineHeight: 1.3 },
  scaleCard: { padding: "12px 6px" },
  scaleNum: { fontSize: 12, fontWeight: 600, fontFamily: mn },
  scaleSub: { fontSize: 10, color: "#64748b" },

  goalGrid: { display: "flex", flexDirection: "column", gap: 8 },
  goalCard: { display: "flex", flexDirection: "column", gap: 4, padding: "14px 16px", textAlign: "left", background: "#111827", border: "1.5px solid #111827", borderRadius: 10, cursor: "pointer", transition: "all 0.15s", fontFamily: f, color: "#94a3b8", outline: "none", userSelect: "none" },
  goalCardActive: { border: "1.5px solid #06b6d4", background: "#06b6d418", color: "#e2e8f0", boxShadow: "inset 0 0 0 1px #06b6d444" },
  goalTop: { display: "flex", alignItems: "center", gap: 10 },
  radio: { width: 18, height: 18, borderRadius: "50%", border: "2px solid #334155", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, transition: "all 0.15s" },
  radioActive: { borderColor: "#06b6d4" },
  radioDot: { width: 8, height: 8, borderRadius: "50%", background: "#06b6d4" },
  goalIcon: { fontSize: 14 },
  goalLabel: { fontSize: 13, fontWeight: 600, color: "inherit" },
  goalDesc: { fontSize: 11, color: "#64748b", marginLeft: 24 },

  painGrid: { display: "flex", flexDirection: "column", gap: 6 },
  painCard: { display: "flex", alignItems: "center", gap: 10, padding: "12px 14px", background: "#111827", border: "1.5px solid #111827", borderRadius: 10, cursor: "pointer", transition: "all 0.15s", fontFamily: f, color: "#94a3b8", textAlign: "left", outline: "none", userSelect: "none" },
  painCardActive: { border: "1.5px solid #06b6d4", background: "#06b6d418", color: "#e2e8f0", boxShadow: "inset 0 0 0 1px #06b6d444" },
  painCardDisabled: { opacity: 0.3, cursor: "not-allowed" },
  painCheck: { width: 20, height: 20, borderRadius: 5, border: "1.5px solid #334155", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, flexShrink: 0, color: "transparent", transition: "all 0.15s" },
  painCheckActive: { background: "#06b6d4", borderColor: "#06b6d4", color: "#0b1120" },
  painLabel: { fontSize: 13, fontWeight: 500, lineHeight: 1.4 },
  painCounter: { fontSize: 11, fontFamily: mn, color: "#475569", textAlign: "center", marginTop: 8 },

  aiLoadingBox: { display: "flex", flexDirection: "column", alignItems: "center", padding: "36px 0", gap: 12 },
  aiLoadingText: { fontSize: 13, color: "#64748b" },
  aiQuestionBox: { background: "linear-gradient(135deg, #0f2847, #152036)", border: "1px solid #1e3a5f", borderRadius: 12, padding: "16px 18px", marginBottom: 14 },
  aiBadge: { display: "inline-flex", alignItems: "center", gap: 5, fontSize: 9, fontFamily: mn, color: "#06b6d4", background: "#06b6d411", padding: "2px 8px", borderRadius: 5, border: "1px solid #06b6d422", marginBottom: 8, letterSpacing: "0.05em", textTransform: "uppercase" },
  aiQuestionText: { fontSize: 14, lineHeight: 1.7, color: "#cbd5e1" },
  answerArea: { width: "100%", padding: "12px 14px", fontSize: 13, fontFamily: f, lineHeight: 1.6, background: "#111827", border: "1.5px solid #1e293b", borderRadius: 10, color: "#e2e8f0", outline: "none", resize: "vertical", minHeight: 90 },

  btnRow: { display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 20 },
  nextBtn: { padding: "11px 24px", fontSize: 13, fontWeight: 600, fontFamily: f, color: "#0b1120", background: "linear-gradient(135deg, #06b6d4, #22d3ee)", border: "none", borderRadius: 9, cursor: "pointer", display: "block", marginTop: 20, marginLeft: "auto", transition: "opacity 0.15s" },
  backBtn: { padding: "11px 18px", fontSize: 12, fontWeight: 500, fontFamily: f, color: "#64748b", background: "transparent", border: "1px solid #1e293b", borderRadius: 9, cursor: "pointer", marginTop: 20 },
  submitBtn: { background: "linear-gradient(135deg, #06b6d4, #0891b2)" },
  generateBtn: { margin: "0 auto", marginTop: 24 },

  loadingScreen: { minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 14 },
  spinner: { width: 32, height: 32, border: "3px solid #1e293b", borderTopColor: "#06b6d4", borderRadius: "50%", animation: "spin 0.7s linear infinite" },
  loadingScreenText: { fontSize: 14, color: "#94a3b8" },

  resultsContainer: { maxWidth: 860, margin: "0 auto", padding: "36px 24px 56px", animation: "fadeIn 0.5s ease-out" },
  resultsHeader: { textAlign: "center", marginBottom: 24 },
  resultsTitle: { fontSize: 24, fontWeight: 700, color: "#f1f5f9", marginTop: 12, letterSpacing: "-0.015em" },
  pillRow: { display: "flex", justifyContent: "center", gap: 8, marginTop: 10 },
  pill: { fontSize: 10, fontFamily: mn, padding: "3px 9px", borderRadius: 14, background: "#1e293b", color: "#94a3b8", border: "1px solid #334155" },
  summaryBox: { background: "linear-gradient(135deg, #0f2847, #152036)", border: "1px solid #1e3a5f", borderRadius: 12, padding: "16px 20px", marginBottom: 20 },
  summaryText: { fontSize: 13, lineHeight: 1.7, color: "#cbd5e1" },

  diagGrid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 4 },
  diagCard: { background: "#111827", border: "1px solid #1e293b", borderRadius: 12, padding: 18 },
  cardTitle: { fontSize: 14, fontWeight: 600, color: "#f1f5f9", marginBottom: 2 },
  cardSub: { fontSize: 10, color: "#475569", marginBottom: 12 },
  serviceList: { display: "flex", flexDirection: "column", gap: 5 },
  serviceRow: { display: "flex", alignItems: "center", gap: 7, padding: "6px 7px", background: "#0b1120", borderRadius: 7, border: "1px solid #1e293b" },
  serviceIcon: { width: 26, height: 26, borderRadius: 6, background: "#1e293b", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, flexShrink: 0 },
  serviceInfo: { flex: 1, minWidth: 0 },
  serviceName: { fontSize: 11, fontWeight: 600, color: "#e2e8f0" },
  serviceDescText: { fontSize: 9, color: "#475569", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" },
  badge: { fontSize: 8, fontWeight: 600, fontFamily: mn, padding: "2px 6px", borderRadius: 4, border: "1px solid", textTransform: "uppercase", letterSpacing: "0.04em", flexShrink: 0 },

  timelineBar: { position: "relative", display: "flex", justifyContent: "space-between", padding: "0 32px", marginBottom: 24, marginTop: 4 },
  timelineLine: { position: "absolute", top: 6, left: 40, right: 40, height: 2, background: "linear-gradient(90deg, #06b6d4, #8b5cf6, #f59e0b)", borderRadius: 1 },
  timelineNode: { textAlign: "center", position: "relative" },
  timelineDot: { width: 14, height: 14, borderRadius: "50%", margin: "0 auto 5px", border: "2px solid #0b1120" },
  timelineLabel: { fontSize: 9, fontFamily: mn, color: "#475569" },
  phasesStack: { display: "flex", flexDirection: "column", gap: 10 },
  phaseCard: { display: "flex", background: "#111827", border: "1px solid #1e293b", borderRadius: 12, overflow: "hidden" },
  phaseAccent: { width: 4, flexShrink: 0 },
  phaseBody: { padding: "16px 18px", flex: 1 },
  phaseTop: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
  phaseTitle: { fontSize: 15, fontWeight: 700 },
  phaseTime: { fontSize: 10, fontFamily: mn, color: "#475569", background: "#1e293b", padding: "2px 7px", borderRadius: 5 },
  phaseServices: { display: "flex", flexWrap: "wrap", gap: 5, marginBottom: 8 },
  phaseServicePill: { fontSize: 10, padding: "2px 8px", borderRadius: 5, background: "#06b6d410", color: "#06b6d4", border: "1px solid #06b6d420", fontWeight: 500 },
  phaseRationale: { fontSize: 12, lineHeight: 1.65, color: "#94a3b8", marginBottom: 8 },
  successBox: { display: "flex", alignItems: "flex-start", gap: 6, padding: "8px 10px", background: "#0b1120", borderRadius: 7, border: "1px solid #1e293b" },
  successIcon: { color: "#06b6d4", fontSize: 11, marginTop: 1 },
  successText: { fontSize: 11, lineHeight: 1.5, color: "#cbd5e1", fontStyle: "italic" },

  footer: { textAlign: "center", padding: "24px 0 0", marginTop: 28, borderTop: "1px solid #1e293b" },
  footerText: { fontSize: 10, color: "#475569", lineHeight: 1.6, maxWidth: 540, margin: "0 auto" },
};
