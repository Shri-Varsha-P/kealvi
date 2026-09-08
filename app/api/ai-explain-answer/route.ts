import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(
  process.env.GEMINI_API_KEY!
);

export async function POST(req: Request) {
  try {
    const { question, answer } = await req.json();

    if (!question?.trim()) {
      return NextResponse.json(
        { error: "Question is required" },
        { status: 400 }
      );
    }

    if (!answer?.trim()) {
      return NextResponse.json(
        { error: "Answer is required" },
        { status: 400 }
      );
    }

    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
    });

    const prompt = `
You are Kealvi AI, an educational answer-review assistant.

A student has posted an answer to a question.

Your job is to:
1. Check whether the answer is correct.
2. Identify any incorrect or incomplete information.
3. Explain the issue clearly.
4. Give a corrected answer if necessary.
5. Keep the explanation educational and easy to understand.

Question:
${question}

Student's Answer:
${answer}

Respond using this structure:

Assessment:
[Correct / Partially Correct / Incorrect]

Explanation:
[Explain clearly why]

Suggested Answer:
[Give a better/correct answer]

Important:
- Do not be unnecessarily harsh.
- If the student's answer is correct, say so clearly.
- Do not invent facts.
- Keep the explanation appropriate for a college student.
`;

    const result = await model.generateContent(prompt);

    const response = result.response;
    const text = response.text();

    if (!text?.trim()) {
      return NextResponse.json(
        { error: "AI did not return an explanation" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      explanation: text.trim(),
    });
  } catch (error) {
    console.error(
      "AI explain answer error:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Failed to analyze the answer. Please try again.",
      },
      { status: 500 }
    );
  }
}