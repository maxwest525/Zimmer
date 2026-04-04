import { Router } from "express";
import { db, ideasTable } from "@workspace/db";
import { eq, desc, and } from "drizzle-orm";

const router = Router();

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
    const [idea] = await db
      .insert(ideasTable)
      .values({
        content: content.trim(),
        category: category || "general",
        source: source || "web",
      })
      .returning();
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
*{margin:0;padding:0;box-sizing:border-box}
body{background:#0a0d10;color:#e8eaed;font-family:'JetBrains Mono',monospace;min-height:100dvh;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:20px}
@import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;600&display=swap');
.wrap{width:100%;max-width:400px}
h1{font-size:14px;color:#34d399;letter-spacing:2px;text-transform:uppercase;margin-bottom:24px;text-align:center}
textarea{width:100%;background:#0c0f14;border:1px solid #1c2028;border-radius:8px;color:#e8eaed;font-family:inherit;font-size:16px;padding:14px;min-height:120px;resize:vertical;outline:none;transition:border-color .2s}
textarea:focus{border-color:#34d399}
textarea::placeholder{color:#6b7280}
.row{display:flex;gap:8px;margin-top:12px}
select{flex:1;background:#0c0f14;border:1px solid #1c2028;border-radius:8px;color:#e8eaed;font-family:inherit;font-size:14px;padding:10px;outline:none;appearance:none;-webkit-appearance:none}
select:focus{border-color:#34d399}
button{flex:1;background:#34d399;color:#0a0d10;border:none;border-radius:8px;font-family:inherit;font-size:14px;font-weight:600;padding:12px;cursor:pointer;transition:opacity .2s}
button:active{opacity:.7}
button:disabled{opacity:.4;cursor:not-allowed}
.toast{position:fixed;top:20px;left:50%;transform:translateX(-50%);background:#34d399;color:#0a0d10;font-family:inherit;font-size:13px;font-weight:600;padding:10px 20px;border-radius:8px;opacity:0;transition:opacity .3s;pointer-events:none}
.toast.show{opacity:1}
.count{text-align:right;font-size:11px;color:#6b7280;margin-top:6px}
</style>
</head>
<body>
<div class="wrap">
<h1>&#9889; MASSA — Quick Idea</h1>
<textarea id="txt" placeholder="What's on your mind?" autofocus></textarea>
<div class="count"><span id="len">0</span> chars</div>
<div class="row">
<select id="cat">
<option value="general">General</option>
<option value="product">Product</option>
<option value="marketing">Marketing</option>
<option value="engineering">Engineering</option>
<option value="design">Design</option>
<option value="content">Content</option>
</select>
<button id="btn" disabled>Send</button>
</div>
</div>
<div class="toast" id="toast"></div>
<script>
const txt=document.getElementById('txt'),btn=document.getElementById('btn'),cat=document.getElementById('cat'),len=document.getElementById('len'),toast=document.getElementById('toast');
txt.addEventListener('input',()=>{len.textContent=txt.value.length;btn.disabled=!txt.value.trim()});
function showToast(msg,ok){toast.textContent=msg;toast.style.background=ok?'#34d399':'#ef4444';toast.style.color=ok?'#0a0d10':'#fff';toast.classList.add('show');setTimeout(()=>toast.classList.remove('show'),2000)}
btn.addEventListener('click',async()=>{
  if(!txt.value.trim())return;
  btn.disabled=true;btn.textContent='...';
  try{
    const r=await fetch('/api/ideas',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({content:txt.value.trim(),category:cat.value,source:'mobile'})});
    if(!r.ok)throw new Error();
    txt.value='';len.textContent='0';showToast('Idea saved!',true);
  }catch{showToast('Failed to save',false)}
  finally{btn.disabled=false;btn.textContent='Send'}
});
txt.addEventListener('keydown',e=>{if(e.key==='Enter'&&!e.shiftKey&&txt.value.trim()){e.preventDefault();btn.click()}});
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
