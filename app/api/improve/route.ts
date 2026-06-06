import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(
  process.env.GEMINI_API_KEY!
);

export async function POST(req: Request) {
  try {
    const { question } = await req.json();

    if (!question?.trim()) {
      return NextResponse.json(
        { error: "Question is required" },
        { status: 400 }
      );
    }

    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
    });

    const prompt = `
Rewrite the following question so it is:
- grammatically correct
- clear
- concise
- suitable for a public Q&A platform

Do not answer the question.
Return only the rewritten question.

Question:
${question}
`;

    const result = await model.generateContent(prompt);

    const improved =
      result.response.text()?.trim() || question;

    return NextResponse.json({
      improved,
    });
  } catch (err: any) {
    console.error(err);

    return NextResponse.json(
      {
        error: "Failed to improve question",
      },
      {
        status: 500,
      }
    );
  }
}