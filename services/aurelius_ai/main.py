from __future__ import annotations

import os
from typing import Literal, TypedDict

from fastapi import FastAPI, HTTPException
from langchain_core.messages import AIMessage, BaseMessage, HumanMessage, SystemMessage
from langchain_groq import ChatGroq
from langgraph.graph import END, START, StateGraph
from pydantic import BaseModel, Field


class CounselTurn(BaseModel):
    role: Literal["user", "assistant"]
    content: str = Field(min_length=1, max_length=4000)


class CounselRequest(BaseModel):
    question: str = Field(min_length=2, max_length=4000)
    history: list[CounselTurn] = Field(default_factory=list, max_length=12)


class CounselResponse(BaseModel):
    answer: str
    source: Literal["stoic-reflection"] = "stoic-reflection"
    principle: str
    provider: Literal["groq"] = "groq"


def is_casual_greeting(question: str) -> bool:
    normalized = "".join(
        character for character in question.lower().strip() if character.isalpha() or character.isspace()
    )
    return normalized.strip() in {
        "hi",
        "hello",
        "hey",
        "hey there",
        "hi there",
        "hello there",
        "good morning",
        "good afternoon",
        "good evening",
    }


class CounselState(TypedDict, total=False):
    question: str
    history: list[CounselTurn]
    principle: str
    context: str
    answer: str


PRINCIPLES = [
    {
        "label": "The discipline of control",
        "terms": [
            "anxious",
            "anxiety",
            "worry",
            "stress",
            "fear",
            "nervous",
            "uncertain",
            "overthink",
            "future",
        ],
        "context": "Separate what is in the person's control from outcomes, other people's opinions, and the future.",
    },
    {
        "label": "Justice and the common good",
        "terms": [
            "work",
            "boss",
            "coworker",
            "credit",
            "betray",
            "toxic",
            "insult",
            "angry",
            "anger",
            "hate",
            "unfair",
            "argument",
        ],
        "context": "Protect dignity and fairness through honest speech, appropriate boundaries, and action without revenge.",
    },
    {
        "label": "Impermanence and grief",
        "terms": [
            "loss",
            "lost",
            "death",
            "died",
            "grief",
            "miss",
            "breakup",
            "gone",
            "goodbye",
            "sad",
        ],
        "context": "Acknowledge grief without denying it, and carry forward what was good through present action.",
    },
    {
        "label": "Duty and a life well used",
        "terms": [
            "purpose",
            "meaning",
            "point",
            "motivation",
            "direction",
            "empty",
            "stuck",
            "procrastinate",
            "discipline",
        ],
        "context": "Make meaning practical by doing the next honest duty instead of waiting for perfect motivation.",
    },
]

MEDITATIONS_CONTEXT = """
Grounding passages from the Meditations:
- You have power over your mind, not outside events. Realize this, and you will find strength.
- Waste no more time arguing what a good person should be. Be one.
- The impediment to action advances action. What stands in the way becomes the way.
- Confine yourself to the present.
- If it is not right, do not do it. If it is not true, do not say it.
- The soul becomes dyed with the colour of its thoughts.
"""

SYSTEM_PROMPT = f"""You are a careful educational simulation of Marcus Aurelius, never the literal living person.
Speak in a calm, direct, plain voice inspired by the Meditations. Use simple modern language and short sentences.
Help the person separate what is in their control, examine the judgment beneath their distress, and choose one useful next action.
Answer in exactly two short paragraphs, usually 70 to 120 words total. Do not repeat the question.
Do not use headings, bullet lists, emojis, therapy jargon, or dramatic language.
Be compassionate without sounding sentimental. End with one short practical sentence.
Do not invent quotations or historical facts. Paraphrase unless a short quotation is certain.
For immediate danger, abuse, self-harm, medical, legal, or financial risk, clearly recommend qualified or emergency help.

{MEDITATIONS_CONTEXT}
"""


def choose_principle(question: str) -> dict[str, str]:
    normalized = question.lower()
    scored = [
        (
            sum(normalized.count(term) > 0 for term in principle["terms"]),
            principle,
        )
        for principle in PRINCIPLES
    ]
    return max(scored, key=lambda item: item[0])[1]


def select_principle(state: CounselState) -> CounselState:
    principle = choose_principle(state["question"])
    return {
        "principle": principle["label"],
        "context": principle["context"],
    }


def build_messages(state: CounselState) -> list[BaseMessage]:
    messages: list[BaseMessage] = [
        SystemMessage(
            content=(
                f"{SYSTEM_PROMPT}\n"
                f"Primary principle to consider: {state['principle']}.\n"
                f"Practical grounding: {state['context']}"
            )
        )
    ]
    for turn in state.get("history", [])[-10:]:
        if turn.role == "user":
            messages.append(HumanMessage(content=turn.content))
        else:
            messages.append(AIMessage(content=turn.content))
    messages.append(HumanMessage(content=state["question"]))
    return messages


async def generate_counsel(state: CounselState) -> CounselState:
    api_key = os.getenv("GROQ_API_KEY")
    if not api_key:
        raise RuntimeError("GROQ_API_KEY is not configured")

    model = os.getenv("GROQ_MODEL", "openai/gpt-oss-120b")
    llm = ChatGroq(
        api_key=api_key,
        model=model,
        temperature=0.55,
        max_tokens=900,
    )
    response = await llm.ainvoke(build_messages(state))
    content = response.content

    if isinstance(content, str):
        answer = content.strip()
    else:
        answer = " ".join(
            block.get("text", "")
            for block in content
            if isinstance(block, dict) and block.get("type") == "text"
        ).strip()

    if not answer:
        raise RuntimeError("Groq returned an empty response")

    return {"answer": answer}


graph_builder = StateGraph(CounselState)
graph_builder.add_node("select_principle", select_principle)
graph_builder.add_node("generate_counsel", generate_counsel)
graph_builder.add_edge(START, "select_principle")
graph_builder.add_edge("select_principle", "generate_counsel")
graph_builder.add_edge("generate_counsel", END)
COUNSEL_GRAPH = graph_builder.compile()

app = FastAPI(
    title="Aurelius AI Service",
    description="LangGraph and LangChain orchestration for grounded Stoic counsel.",
    version="1.0.0",
)


@app.get("/healthz")
async def healthz() -> dict[str, str]:
    return {"status": "ok", "orchestration": "langgraph"}


@app.post("/counsel", response_model=CounselResponse)
async def counsel(request: CounselRequest) -> CounselResponse:
    if is_casual_greeting(request.question):
        return CounselResponse(
            answer="Hello. What is on your mind?",
            principle="The present moment",
        )

    try:
        result = await COUNSEL_GRAPH.ainvoke(
            {
                "question": request.question,
                "history": request.history,
            }
        )
    except Exception as error:
        raise HTTPException(status_code=503, detail="AI service unavailable") from error

    return CounselResponse(
        answer=result["answer"],
        principle=result["principle"],
    )