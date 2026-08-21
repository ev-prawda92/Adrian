/**
 * ADRIAN — Unified Evaluation Platform
 * Operation Mincemeat LLC
 *
 * One reasoning engine. Multiple domain lenses (Catalyze · Equity Lens · Sendero).
 * This server is a thin CORS proxy to the model APIs plus a static host for the
 * single-page platform. API keys travel per-request in headers and are never stored.
 */
const express = require("express");
const cors = require("cors");
const fetch = require("node-fetch");
const path = require("path");

const app = express();
app.use(cors());
app.use(express.json({ limit: "2mb" }));
app.use(express.static(path.join(__dirname, "public")));

const PORT = process.env.PORT || 3001;

// ── ANTHROPIC ────────────────────────────────────────────────────────────────
app.post("/proxy/anthropic", async (req, res) => {
  const apiKey = req.headers["x-anthropic-key"];
  if (!apiKey) return res.status(400).json({ error: "Missing x-anthropic-key header" });
  try {
    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify(req.body),
    });
    res.status(r.status).json(await r.json());
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── OPENAI ───────────────────────────────────────────────────────────────────
app.post("/proxy/openai", async (req, res) => {
  const apiKey = req.headers["x-openai-key"];
  if (!apiKey) return res.status(400).json({ error: "Missing x-openai-key header" });
  try {
    const r = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify(req.body),
    });
    res.status(r.status).json(await r.json());
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GEMINI ───────────────────────────────────────────────────────────────────
app.post("/proxy/gemini", async (req, res) => {
  const apiKey = req.headers["x-gemini-key"];
  if (!apiKey) return res.status(400).json({ error: "Missing x-gemini-key header" });
  try {
    const { model = "gemini-2.0-flash", ...body } = req.body;
    const r = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
      { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }
    );
    res.status(r.status).json(await r.json());
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── LIVE EVIDENCE RETRIEVAL ─────────────────────────────────────────────────
// Routed through the server so the browser never hits CORS. No API key needed.

function stripTags(s) {
  return (s || "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&")
    .replace(/&#\d+;/g, " ").replace(/\s+/g, " ").trim();
}
function pick(re, xml) { const m = re.exec(xml); return m ? m[1] : ""; }

function parsePubmed(xml) {
  const out = [];
  const blocks = xml.split(/<PubmedArticle>/).slice(1);
  for (const b of blocks) {
    const pmid = stripTags(pick(/<PMID[^>]*>(\d+)<\/PMID>/, b));
    const title = stripTags(pick(/<ArticleTitle>([\s\S]*?)<\/ArticleTitle>/, b));
    const absParts = [...b.matchAll(/<AbstractText[^>]*>([\s\S]*?)<\/AbstractText>/g)].map(m => stripTags(m[1]));
    const abstract = absParts.join(" ");
    const journal = stripTags(pick(/<Title>([\s\S]*?)<\/Title>/, b));
    const year = stripTags(pick(/<Year>(\d{4})<\/Year>/, b));
    if (title) out.push({ id: pmid, title, abstract, source: "PubMed", meta: [journal, year].filter(Boolean).join(" · "), url: pmid ? `https://pubmed.ncbi.nlm.nih.gov/${pmid}/` : "" });
  }
  return out;
}

app.get("/retrieve/pubmed", async (req, res) => {
  const q = (req.query.q || "").toString().trim();
  const n = Math.min(parseInt(req.query.n) || 6, 12);
  if (!q) return res.status(400).json({ error: "Missing query" });
  try {
    const es = await fetch(`https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?db=pubmed&retmode=json&sort=relevance&retmax=${n}&term=${encodeURIComponent(q)}`);
    const ed = await es.json();
    const ids = (ed.esearchresult && ed.esearchresult.idlist) || [];
    if (!ids.length) return res.json({ source: "pubmed", query: q, results: [] });
    const ef = await fetch(`https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi?db=pubmed&retmode=xml&id=${ids.join(",")}`);
    const xml = await ef.text();
    res.json({ source: "pubmed", query: q, results: parsePubmed(xml) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/retrieve/trials", async (req, res) => {
  const q = (req.query.q || "").toString().trim();
  const n = Math.min(parseInt(req.query.n) || 6, 12);
  if (!q) return res.status(400).json({ error: "Missing query" });
  try {
    const url = `https://clinicaltrials.gov/api/v2/studies?query.term=${encodeURIComponent(q)}&pageSize=${n}`;
    const r = await fetch(url);
    const d = await r.json();
    const results = (d.studies || []).map((s) => {
      const p = s.protocolSection || {};
      const idm = p.identificationModule || {};
      const desc = p.descriptionModule || {};
      const st = p.statusModule || {};
      const dm = p.designModule || {};
      const cm = p.conditionsModule || {};
      const nct = idm.nctId || "";
      return {
        id: nct,
        title: idm.briefTitle || idm.officialTitle || nct,
        abstract: desc.briefSummary || desc.detailedDescription || "",
        source: "ClinicalTrials.gov",
        meta: [st.overallStatus, (dm.phases || []).join("/"), (cm.conditions || []).slice(0, 2).join(", ")].filter(Boolean).join(" · "),
        url: nct ? `https://clinicaltrials.gov/study/${nct}` : "",
      };
    }).filter((x) => x.title);
    res.json({ source: "trials", query: q, results });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/health", (req, res) =>
  res.json({ status: "Adrian is running", port: PORT })
);

app.listen(PORT, () => {
  console.log(`\n⚖️  ADRIAN — Unified Platform (Operation Mincemeat)`);
  console.log(`   Running on http://localhost:${PORT}`);
  console.log(`   Lenses: Catalyze · Equity Lens · Sendero`);
  console.log(`   Health: http://localhost:${PORT}/health\n`);
});
