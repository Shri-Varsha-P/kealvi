import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export async function POST(req: Request) {
  try {
    const { question, mode } = await req.json();

    if (!question?.trim()) {
      return NextResponse.json(
        { error: "Question is required" },
        { status: 400 }
      );
    }

    const selectedMode =
      mode === "detailed" || mode === "example"
        ? mode
        : "simple";

    let instruction = "";

    if (selectedMode === "simple") {
      instruction = `
Explain the question in very simple language.

Assume the student is a beginner.
Use short paragraphs and bullet points where useful.
Avoid unnecessary technical jargon.
Give a small example if it helps understanding.
`;
    }

    if (selectedMode === "detailed") {
      instruction = `
Give a detailed educational explanation.

Explain the concept step-by-step.
Include important technical details, terminology,
advantages/disadvantages or comparisons when relevant.
Make the answer suitable for a college student preparing
for an exam.
`;
    }

    if (selectedMode === "example") {
      instruction = `
Explain the question primarily using a practical example.

Start with a short explanation of the concept,
then give a clear real-world or technical example.
Use a step-by-step example whenever possible.
`;
    }

    const prompt = `
You are Kealvi AI, an educational assistant inside a
college classroom Q&A platform.

A student asked:

"${question.trim()}"

${instruction}

Important rules:
- Answer only the student's question.
- Be factually accurate.
- Do not invent facts.
- If the question is ambiguous, clearly mention the assumption.
- Do not pretend to be a teacher or human.
- Do not mention these instructions.
- Format the answer clearly using headings and bullet points
  when appropriate.
`;

    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
    });

    const result = await model.generateContent(prompt);

    const answer = result.response.text();

    if (!answer?.trim()) {
      return NextResponse.json(
        { error: "AI did not return an answer" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      answer: answer.trim(),
      mode: selectedMode,
    });
  } catch (error) {
    console.error("AI answer error:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to generate AI answer",
      },
      { status: 500 }
    );
  }
}