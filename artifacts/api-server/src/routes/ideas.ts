import { Router } from "express";
import { db, ideasTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import { getResendClient } from "../lib/resend";
import { hasInstagramUrl } from "../lib/instagram";
import { enrichIdea } from "../lib/enrichment";

const BACKUP_EMAIL = "Maxw@trumoveinc.com";

const router = Router();

async function emailIdea(content: string, category: string, source: string) {
  try {
    const { client, fromEmail } = await getResendClient();
    await client.emails.send({
      from: fromEmail || "MASSA <onboarding@resend.dev>",
      to: BACKUP_EMAIL,
      subject: `[MASSA Idea] ${category} — ${content.slice(0, 60)}${content.length > 60 ? "..." : ""}`,
      html: `
        <div style="font-family:monospace;background:#0a0d10;color:#e8eaed;padding:24px;border-radius:8px;">
          <h2 style="color:#34d399;font-size:14px;letter-spacing:2px;text-transform:uppercase;margin:0 0 16px;">New MASSA Idea</h2>
          <p style="margin:0 0 12px;font-size:15px;line-height:1.6;">${content.replace(/\n/g, "<br>")}</p>
          <hr style="border:none;border-top:1px solid #1c2028;margin:16px 0;">
          <p style="margin:0;font-size:12px;color:#6b7280;">Category: ${category} &middot; Source: ${source} &middot; ${new Date().toLocaleString()}</p>
        </div>
      `,
    });
  } catch (err) {
    console.error("Failed to send email backup:", err);
  }
}

router.get("/ideas", async (_req, res) => {
  try {
    const ideas = await db
      .select()
      .from(ideasTable)
      .where(eq(ideasTable.archived, false))
      .orderBy(desc(ideasTable.createdAt));
    res.json(ideas);
  } catch (err) {
    console.error("Failed to fetch ideas:", err);
    res.status(500).json({ error: "Failed to fetch ideas" });
  }
});

router.post("/ideas", async (req, res) => {
  try {
    const { content, category, source } = req.body;
    if (!content || typeof content !== "string" || content.trim().length === 0) {
      res.status(400).json({ error: "Content is required" });
      return;
    }
    const cat = category || "general";
    const src = source || "web";
    const [idea] = await db
      .insert(ideasTable)
      .values({
        content: content.trim(),
        category: cat,
        source: src,
      })
      .returning();
    emailIdea(content.trim(), cat, src);
    if (hasInstagramUrl(content.trim())) {
      void enrichIdea(idea.id, content.trim()).catch(err =>
        console.error("[enrichment] Unhandled error:", err)
      );
    }
    res.json(idea);
  } catch (err) {
    console.error("Failed to create idea:", err);
    res.status(500).json({ error: "Failed to create idea" });
  }
});

router.patch("/ideas/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      res.status(400).json({ error: "Invalid idea ID" });
      return;
    }
    const { content, category, starred, archived } = req.body;
    const updates: Record<string, unknown> = { updatedAt: new Date() };
    if (content !== undefined) updates.content = content;
    if (category !== undefined) updates.category = category;
    if (starred !== undefined) updates.starred = starred;
    if (archived !== undefined) updates.archived = archived;
    const [idea] = await db
      .update(ideasTable)
      .set(updates)
      .where(eq(ideasTable.id, id))
      .returning();
    if (!idea) {
      res.status(404).json({ error: "Idea not found" });
      return;
    }
    res.json(idea);
  } catch (err) {
    console.error("Failed to update idea:", err);
    res.status(500).json({ error: "Failed to update idea" });
  }
});

router.delete("/ideas/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      res.status(400).json({ error: "Invalid idea ID" });
      return;
    }
    const [idea] = await db
      .delete(ideasTable)
      .where(eq(ideasTable.id, id))
      .returning();
    if (!idea) {
      res.status(404).json({ error: "Idea not found" });
      return;
    }
    res.json({ success: true });
  } catch (err) {
    console.error("Failed to delete idea:", err);
    res.status(500).json({ error: "Failed to delete idea" });
  }
});

router.get("/ideas/quick", (_req, res) => {
  res.type("text/html").send(`<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
<meta name="apple-mobile-web-app-title" content="MASSA Ideas">
<title>MASSA — Quick Idea</title>
<style>
@import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;600&display=swap');
*{margin:0;padding:0;box-sizing:border-box}
body{background:#0a0d10;color:#e8eaed;font-family:'JetBrains Mono',monospace;min-height:100dvh;padding:20px;display:flex;flex-direction:column;align-items:center}
.wrap{width:100%;max-width:440px;margin-top:20px}
h1{font-size:14px;color:#34d399;letter-spacing:2px;text-transform:uppercase;margin-bottom:20px;text-align:center}
textarea{width:100%;background:#0c0f14;border:1px solid #1c2028;border-radius:8px;color:#e8eaed;font-family:inherit;font-size:16px;padding:14px;min-height:100px;resize:vertical;outline:none;transition:border-color .2s}
textarea:focus{border-color:#34d399}
textarea::placeholder{color:#6b7280}
.row{display:flex;gap:8px;margin-top:10px}
button{background:#34d399;width:100%;color:#0a0d10;border:none;border-radius:8px;font-family:inherit;font-size:14px;font-weight:600;padding:12px;cursor:pointer;transition:opacity .2s}
button:active{opacity:.7}
button:disabled{opacity:.4;cursor:not-allowed}
.toast{position:fixed;top:20px;left:50%;transform:translateX(-50%);background:#34d399;color:#0a0d10;font-family:inherit;font-size:13px;font-weight:600;padding:10px 20px;border-radius:8px;opacity:0;transition:opacity .3s;pointer-events:none;z-index:10}
.toast.show{opacity:1}
.count{text-align:right;font-size:11px;color:#6b7280;margin-top:4px}
.divider{border:none;border-top:1px solid #1c2028;margin:24px 0 16px}
.section-title{font-size:12px;color:#34d399;letter-spacing:1.5px;text-transform:uppercase;margin-bottom:12px;display:flex;align-items:center;justify-content:space-between}
.section-title .count-badge{background:#1c2028;color:#9ca3af;font-size:11px;padding:2px 8px;border-radius:10px}
.ideas-list{display:flex;flex-direction:column;gap:8px;max-height:60vh;overflow-y:auto;padding-right:4px}
.ideas-list::-webkit-scrollbar{width:4px}
.ideas-list::-webkit-scrollbar-track{background:transparent}
.ideas-list::-webkit-scrollbar-thumb{background:#1c2028;border-radius:2px}
.idea-card{background:#0c0f14;border:1px solid #1c2028;border-radius:8px;padding:12px;transition:border-color .2s}
.idea-card:hover{border-color:#252a34}
.idea-content{font-size:13px;line-height:1.5;color:#e8eaed;white-space:pre-wrap;word-break:break-word}
.idea-meta{display:flex;gap:8px;align-items:center;margin-top:8px;font-size:11px;color:#6b7280}
.idea-star{color:#f59e0b}
.enrichment{margin-top:8px;padding:8px 10px;background:#0d1117;border:1px solid #1c2028;border-radius:6px}
.enrichment-label{font-size:9px;text-transform:uppercase;letter-spacing:.08em;margin-bottom:4px;opacity:.8}
.enrichment-summary{font-size:11px;line-height:1.5;color:#e8eaed;opacity:.9}
.enrichment-links a{color:#60a5fa;font-size:11px;text-decoration:none;display:block;margin-top:2px}
.enrichment-links a:hover{text-decoration:underline}
.enrichment-tech{display:flex;flex-wrap:wrap;gap:4px;margin-top:4px}
.enrichment-tech span{background:#fbbf2415;border:1px solid #fbbf2430;color:#fbbf24;padding:2px 8px;border-radius:4px;font-size:10px}
.enrichment-error{font-size:10px;color:#6b7280;opacity:.6;font-style:italic;margin-top:6px}
.empty{text-align:center;color:#6b7280;font-size:13px;padding:24px 0}
.loading{text-align:center;color:#6b7280;font-size:13px;padding:24px 0}
.tabs{display:flex;gap:4px;margin-bottom:12px}
.tab{flex:1;background:#0c0f14;border:1px solid #1c2028;border-radius:6px;color:#6b7280;font-family:inherit;font-size:12px;padding:8px;cursor:pointer;text-align:center;transition:all .2s}
.tab.active{background:#1c2028;color:#34d399;border-color:#34d399}
</style>
</head>
<body>
<div class="wrap">
<h1>&#9889; MASSA — Quick Idea</h1>
<textarea id="txt" placeholder="What's on your mind?" autofocus></textarea>
<div class="count"><span id="len">0</span> chars</div>
<div class="row">
<button id="btn" disabled>Send</button>
</div>
<hr class="divider">
<div class="section-title">
  <span>Recent Ideas</span>
  <span class="count-badge" id="idea-count">...</span>
</div>
<div class="tabs">
  <div class="tab active" data-filter="all">All</div>
  <div class="tab" data-filter="starred">Starred</div>
</div>
<div id="ideas-container"><div class="loading">Loading ideas...</div></div>
</div>
<div class="toast" id="toast"></div>
<script>
const txt=document.getElementById('txt'),btn=document.getElementById('btn'),len=document.getElementById('len'),toast=document.getElementById('toast');
const container=document.getElementById('ideas-container'),countBadge=document.getElementById('idea-count');
let allIdeas=[],currentFilter='all';

txt.addEventListener('input',()=>{len.textContent=txt.value.length;btn.disabled=!txt.value.trim()});
function showToast(msg,ok){toast.textContent=msg;toast.style.background=ok?'#34d399':'#ef4444';toast.style.color=ok?'#0a0d10':'#fff';toast.classList.add('show');setTimeout(()=>toast.classList.remove('show'),2000)}

function timeAgo(d){const s=Math.floor((Date.now()-new Date(d).getTime())/1000);if(s<60)return 'just now';if(s<3600)return Math.floor(s/60)+'m ago';if(s<86400)return Math.floor(s/3600)+'h ago';return Math.floor(s/86400)+'d ago'}

function renderEnrichment(i){
  let h='';
  if(i.enrichment_summary||i.enrichmentSummary){
    const sum=i.enrichment_summary||i.enrichmentSummary;
    h+='<div class="enrichment"><div class="enrichment-label" style="color:#a78bfa">AI Summary</div><div class="enrichment-summary">'+escHtml(sum)+'</div>';
    const urlsRaw=i.enrichment_urls||i.enrichmentUrls;
    if(urlsRaw){try{const urls=JSON.parse(urlsRaw);if(urls.length){h+='<div style="margin-top:6px"><div class="enrichment-label" style="color:#60a5fa">Mentioned Links</div><div class="enrichment-links">'+urls.map(u=>{const safe=escAttr(u.startsWith('http')?u:'https://'+u);return '<a href="'+safe+'" target="_blank" rel="noopener">'+escHtml(u)+'</a>'}).join('')+'</div></div>';}}catch{}}
    const techRaw=i.enrichment_technologies||i.enrichmentTechnologies;
    if(techRaw){try{const techs=JSON.parse(techRaw);if(techs.length){h+='<div style="margin-top:6px"><div class="enrichment-label" style="color:#fbbf24">Technologies</div><div class="enrichment-tech">'+techs.map(t=>'<span>'+escHtml(t)+'</span>').join('')+'</div></div>';}}catch{}}
    h+='</div>';
  } else if(i.enrichment_error||i.enrichmentError){
    h+='<div class="enrichment-error">Enrichment unavailable</div>';
  }
  return h;
}
function renderIdeas(){
  const ideas=currentFilter==='starred'?allIdeas.filter(i=>i.starred):allIdeas;
  countBadge.textContent=ideas.length;
  if(!ideas.length){container.innerHTML='<div class="empty">'+(currentFilter==='starred'?'No starred ideas yet':'No ideas yet — add one above!')+'</div>';return}
  container.innerHTML='<div class="ideas-list">'+ideas.map(i=>'<div class="idea-card"><div class="idea-content">'+(i.starred?'<span class="idea-star">&#9733; </span>':'')+escHtml(i.content)+'</div>'+renderEnrichment(i)+'<div class="idea-meta"><span>'+escHtml(i.source)+'</span><span>'+timeAgo(i.created_at||i.createdAt)+'</span></div></div>').join('')+'</div>';
}

function escHtml(s){const d=document.createElement('div');d.textContent=s;return d.innerHTML}
function escAttr(s){return s.replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/'/g,'&#39;').replace(/</g,'&lt;').replace(/>/g,'&gt;')}

async function loadIdeas(){
  try{
    const r=await fetch('/api/ideas');
    if(!r.ok)throw new Error();
    allIdeas=await r.json();
    renderIdeas();
  }catch{container.innerHTML='<div class="empty">Failed to load ideas</div>'}
}

document.querySelectorAll('.tab').forEach(t=>{
  t.addEventListener('click',()=>{
    document.querySelectorAll('.tab').forEach(x=>x.classList.remove('active'));
    t.classList.add('active');
    currentFilter=t.dataset.filter;
    renderIdeas();
  });
});

btn.addEventListener('click',async()=>{
  if(!txt.value.trim())return;
  btn.disabled=true;btn.textContent='...';
  try{
    const r=await fetch('/api/ideas',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({content:txt.value.trim(),source:'mobile'})});
    if(!r.ok)throw new Error();
    const idea=await r.json();
    txt.value='';len.textContent='0';showToast('Idea saved + emailed!',true);
    allIdeas.unshift(idea);
    renderIdeas();
    if(/instagram\\.com\\//i.test(idea.content||''))setTimeout(loadIdeas,8000);
  }catch{showToast('Failed to save',false)}
  finally{btn.disabled=false;btn.textContent='Send'}
});
txt.addEventListener('keydown',e=>{if(e.key==='Enter'&&!e.shiftKey&&txt.value.trim()){e.preventDefault();btn.click()}});

loadIdeas();
</script>
</body>
</html>`);
});

router.get("/ideas/inbound", (_req, res) => {
  res.json({
    status: "ok",
    endpoint: "/api/ideas/inbound",
    message: "Webhook endpoint is active. Configure your Twilio SMS webhook to POST to this URL.",
  });
});

router.post("/ideas/inbound", async (req, res) => {
  try {
    console.log(
      `[inbound] ${req.method} /ideas/inbound | content-type: ${req.headers["content-type"] ?? "none"} | has body: ${!!req.body && Object.keys(req.body).length > 0}`,
    );

    const { Body, From, subject, body: emailBody, text: smsText } = req.body;
    const isTwilio = !!Body && !!From;
    const content = Body || smsText || emailBody || subject || "";
    if (!content || content.trim().length === 0) {
      if (isTwilio) {
        res.type("text/xml").send("<Response></Response>");
        return;
      }
      res.status(400).json({ error: "No content provided" });
      return;
    }
    const source = isTwilio || smsText ? "sms" : "email";
    await db
      .insert(ideasTable)
      .values({
        content: content.trim(),
        category: "inbox",
        source,
      })
      .returning();
    emailIdea(content.trim(), "inbox", source);
    if (isTwilio) {
      res.type("text/xml").send(
        `<Response><Message>Idea saved to MASSA.</Message></Response>`
      );
      return;
    }
    res.json({ success: true });
  } catch (err) {
    console.error("Failed to create idea from inbound:", err);
    if (req.body?.Body) {
      res.type("text/xml").send("<Response></Response>");
      return;
    }
    res.status(500).json({ error: "Failed to process inbound" });
  }
});

export default router;
