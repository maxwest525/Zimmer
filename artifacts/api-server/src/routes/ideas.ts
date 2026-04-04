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

router.post("/ideas/inbound", async (req, res) => {
  try {
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
