import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(
  process.env.GEMINI_API_KEY!
);

type InputAnswer = {
  id: number;
  body: string;
  author: string | null;
};

export async function POST(req: Request) {
  try {
    const { question, answers } = await req.json();

    if (!question?.trim()) {
      return NextResponse.json(
        { error: "Question is required" },
        { status: 400 }
      );
    }

    if (!Array.isArray(answers) || answers.length < 2) {
      return NextResponse.json(
        {
          error:
            "At least two answers are required for AI ranking",
        },
        { status: 400 }
      );
    }

    const cleanedAnswers: InputAnswer[] = answers
      .map((answer: any) => ({
        id: Number(answer.id),
        body: String(answer.body ?? "").trim(),
        author: answer.author
          ? String(answer.author).trim()
          : null,
      }))
      .filter(
        (answer) =>
          Number.isFinite(answer.id) &&
          answer.body.length > 0
      );

    if (cleanedAnswers.length < 2) {
      return NextResponse.json(
        {
          error:
            "At least two text answers are required for AI ranking",
        },
        { status: 400 }
      );
    }

    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
    });

    const answerText = cleanedAnswers
      .map(
        (answer) => `
ANSWER ID: ${answer.id}
AUTHOR: ${answer.author || "Anonymous"}
ANSWER:
${answer.body}
`
      )
      .join("\n--------------------\n");

    const prompt = `
You are Kealvi AI, an educational answer-ranking assistant.

Your task is to rank student answers to a question from MOST useful/relevant to LEAST useful/relevant.

QUESTION:
${question.trim()}

STUDENT ANSWERS:
${answerText}

Evaluate every answer using these factors:

1. Relevance:
   Does the answer directly address the question?

2. Correctness:
   Is the information factually and conceptually correct?

3. Completeness:
   Does it sufficiently answer the question?

4. Clarity:
   Is the explanation understandable and logically presented?

5. Usefulness:
   Would this answer actually help a student understand the topic?

Important rules:

- Do NOT rank an answer highly merely because it is longer.
- Do NOT rank an answer highly because of the author's name.
- A concise but correct answer can rank higher than a long answer.
- Incorrect information should significantly reduce the score.
- Completely irrelevant answers should receive a very low score.
- Do not invent information that is not present in the answers.
- Every answer must appear exactly once in the result.
- Use the exact answer ID supplied above.
- Score each answer from 0 to 100.
- Rank from highest score to lowest score.

Return ONLY valid JSON.

Required JSON format:

{
  "rankings": [
    {
      "answer_id": 123,
      "score": 95,
      "label": "Highly Relevant",
      "reason": "Brief explanation of why this answer received this score."
    }
  ]
}

Allowed labels:

- "Highly Relevant" for 85-100
- "Relevant" for 70-84
- "Partially Relevant" for 40-69
- "Least Relevant" for 0-39

The rankings array MUST be sorted from highest score to lowest score.
`;

    const result = await model.generateContent(prompt);

    const text = result.response.text().trim();

    if (!text) {
      return NextResponse.json(
        {
          error: "AI did not return a ranking",
        },
        { status: 500 }
      );
    }

    let parsed;

    try {
      const cleanedText = text
        .replace(/^```json\s*/i, "")
        .replace(/^```\s*/i, "")
        .replace(/\s*```$/i, "")
        .trim();

      parsed = JSON.parse(cleanedText);
    } catch (parseError) {
      console.error(
        "AI ranking JSON parse error:",
        parseError,
        text
      );

      return NextResponse.json(
        {
          error:
            "AI returned an invalid ranking format. Please try again.",
        },
        { status: 500 }
      );
    }

    if (
      !parsed?.rankings ||
      !Array.isArray(parsed.rankings)
    ) {
      return NextResponse.json(
        {
          error: "AI returned an invalid ranking",
        },
        { status: 500 }
      );
    }

    const validIds = new Set(
      cleanedAnswers.map((answer) => answer.id)
    );

    const rankings = parsed.rankings
      .filter(
        (item: any) =>
          validIds.has(Number(item.answer_id))
      )
      .map((item: any) => ({
        answer_id: Number(item.answer_id),
        score: Math.max(
          0,
          Math.min(100, Number(item.score) || 0)
        ),
        label: String(
          item.label || "Partially Relevant"
        ),
        reason: String(
          item.reason || "No explanation provided."
        ),
      }))
      .sort(
        (a: any, b: any) =>
          b.score - a.score
      );

    if (rankings.length !== cleanedAnswers.length) {
      return NextResponse.json(
        {
          error:
            "AI could not rank all answers. Please try again.",
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      rankings,
    });
  } catch (error) {
    console.error(
      "AI rank answers error:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Failed to rank answers. Please try again.",
      },
      { status: 500 }
    );
  }
}