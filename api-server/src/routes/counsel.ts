import { Router, type IRouter } from "express";
import { CreateCounselBody } from "@workspace/api-zod";

const router: IRouter = Router();

type CounselTurn = {
  role: "user" | "assistant";
  content: string;
};

type CounselRequest = {
  question: string;
  history?: CounselTurn[];
};

const systemPrompt = `You are a careful educational simulation of Marcus Aurelius, never the literal living person.
Speak in a calm, direct, plain voice inspired by the Meditations, without archaic imitation for its own sake.
Your job is not to flatter or merely reassure. Help the person distinguish what is in their control, examine the judgment beneath their distress, identify their duty to themselves and others, and choose one concrete next action.
Use the supplied principles faithfully. Do not invent quotations or historical facts. If you quote, keep it short and label it as a quotation only when you are certain; otherwise paraphrase. Treat the reference passages below as grounding, not as text to repeat mechanically.
Answer in 2 short paragraphs, usually 70 to 120 words total. Use simple, modern, understandable language while keeping the Stoic meaning. Give one clear practical action. Do not repeat the question. Do not use bullet lists, headings, emojis, or therapy jargon. Be compassionate without sounding sentimental. End with one short original sentence that is practical rather than grand.
If the question involves immediate danger, abuse, self-harm, medical, legal, or financial risk, be clear that professional or emergency help matters and do not pretend philosophy is a substitute.

Reference passages from the Meditations:
- You have power over your mind, not outside events. Realize this, and you will find strength.
- Waste no more time arguing what a good person should be. Be one.
- The impediment to action advances action. What stands in the way becomes the way.
- Confine yourself to the present.
- If it is not right, do not do it. If it is not true, do not say it.
- The soul becomes dyed with the colour of its thoughts.`;

const principles = [
  {
    key: "control",
    label: "The discipline of control",
    terms: ["anxious", "anxiety", "worry", "stress", "fear", "nervous", "uncertain", "overthink", "future"],
    answer: "Separate what happened from what you fear it means. You cannot control the result or another person's opinion. You can control your preparation, your words, and your next action. Do that work well, then release the outcome.\n\nDo not suffer tomorrow twice. Prepare for it once, then return to today. Take the next honest step.",
  },
  {
    key: "injustice",
    label: "Justice and the common good",
    terms: ["work", "boss", "coworker", "credit", "betray", "toxic", "insult", "angry", "anger", "hate", "unfair", "argument"],
    answer: "You cannot control another person's ambition, but you can control your conduct. Speak plainly, keep a record, set a fair boundary, and use the right channel if needed. Do this without revenge.\n\nThey may take credit, but they cannot take the integrity with which you worked. Correct what you can. Do not become what you oppose.",
  },
  {
    key: "loss",
    label: "Impermanence and grief",
    terms: ["loss", "lost", "death", "died", "grief", "miss", "breakup", "gone", "goodbye", "sad"],
    answer: "Loss hurts because something mattered. Let it be painful without turning it into a judgment against life. You cannot make the past stay, but you can carry forward what was good in the person or season.\n\nLet grief become an action: remember, care for someone, or live one quality they taught you.",
  },
  {
    key: "purpose",
    label: "Duty and a life well used",
    terms: ["purpose", "meaning", "point", "motivation", "direction", "empty", "stuck", "procrastinate", "discipline"],
    answer: "Meaning is often made visible through the task in front of you. Do not wait for grand inspiration. Choose one honest action at a human scale: one page, one apology, one useful hour.\n\nAsk what the situation requires from a good person, then do that next right thing.",
  },
];

function choosePrinciple(question: string) {
  const normalized = question.toLowerCase();
  return principles
    .map((principle) => ({
      principle,
      score: principle.terms.reduce(
        (score, term) => score + (normalized.includes(term) ? 1 : 0),
        0,
      ),
    }))
    .sort((a, b) => b.score - a.score)[0]?.principle ?? principles[0];
}

function localCounsel(question: string) {
  const selected = choosePrinciple(question);
  return {
    answer: selected.answer,
    source: selected.key === "control" || selected.key === "loss" ? "meditations" : "stoic-reflection",
    principle: selected.label,
    provider: "local",
  };
}

function isCasualGreeting(question: string) {
  const normalized = question
    .toLowerCase()
    .trim()
    .replace(/[^a-z\s]/g, "")
    .replace(/\s+/g, " ");
  return new Set([
    "hi",
    "hello",
    "hey",
    "hey there",
    "hi there",
    "hello there",
    "good morning",
    "good afternoon",
    "good evening",
  ]).has(normalized);
}

async function modelCounsel(question: string, history: CounselTurn[], principle: string) {
  const aiServiceUrl = process.env.AI_SERVICE_URL ?? "http://127.0.0.1:8000";
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8_000);
    const response = await fetch(`${aiServiceUrl.replace(/\/$/, "")}/counsel`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question, history }),
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (response.ok) {
      const payload = (await response.json()) as {
        answer?: string;
        source?: "stoic-reflection";
        principle?: string;
        provider?: "groq";
      };
      if (payload.answer?.trim()) {
        return {
          answer: payload.answer.trim(),
          source: payload.source ?? "stoic-reflection",
          principle: payload.principle ?? principle,
          provider: payload.provider ?? "groq",
        };
      }
    }
  } catch {
    // The direct provider path below keeps the app usable if the Python service is down.
  }

  const messages = [
    { role: "system", content: `${systemPrompt}\n\nPrimary principle to consider: ${principle}` },
    ...history.slice(-10).map((turn) => ({ role: turn.role, content: turn.content })),
    { role: "user", content: question },
  ];

  const groqKey = process.env.GROQ_API_KEY;
  const openAiKey = process.env.OPENAI_API_KEY;
  const provider = groqKey ? "groq" : openAiKey ? "openai" : null;
  if (!provider) return null;

  const response = await fetch(
    provider === "groq"
      ? "https://api.groq.com/openai/v1/chat/completions"
      : "https://api.openai.com/v1/chat/completions",
    {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${groqKey ?? openAiKey}`,
    },
    body: JSON.stringify({
      model:
        provider === "groq"
          ? process.env.GROQ_MODEL ?? "openai/gpt-oss-120b"
          : process.env.OPENAI_MODEL ?? "gpt-4o-mini",
      temperature: 0.8,
      // The selected Groq model may spend part of its budget reasoning.
      // Keep enough room for a concise final answer, while the prompt limits
      // the visible response to roughly 70–120 words.
      max_tokens: 900,
      messages,
    }),
    },
  );

  if (!response.ok) {
    throw new Error(`${provider} response failed with status ${response.status}`);
  }

  const payload = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const answer = payload.choices?.[0]?.message?.content?.trim();
  if (!answer) throw new Error(`${provider} returned an empty response`);

  return {
    answer,
    source: "stoic-reflection" as const,
    principle,
    provider: provider as "groq" | "openai",
  };
}

router.post("/counsel", async (req, res) => {
  const parsed = CreateCounselBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Ask a question of at least two characters." });
    return;
  }

  const input = parsed.data as CounselRequest;
  const selected = choosePrinciple(input.question);

  if (isCasualGreeting(input.question)) {
    res.json({
      answer: "Hello. What is on your mind?",
      source: "stoic-reflection",
      principle: "The present moment",
      provider: "local",
    });
    return;
  }

  try {
    const generated = await modelCounsel(
      input.question,
      input.history ?? [],
      selected.label,
    );
    res.json(generated ?? localCounsel(input.question));
  } catch (error) {
    req.log.warn({ err: error }, "AI provider unavailable; using local counsel");
    res.json(localCounsel(input.question));
  }
});

export default router;