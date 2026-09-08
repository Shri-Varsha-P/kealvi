import { supabase } from "@/lib/supabase";
import { NextResponse } from "next/server";

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const questionId = searchParams.get("question_id");

    if (!questionId) {
      return NextResponse.json(
        { error: "question_id is required" },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("answers")
      .select("id, question_id, body, author, image_url, created_at")
      .eq("question_id", questionId)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("GET answers error:", error);

      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      answers: data ?? [],
    });
  } catch (error: any) {
    console.error("GET answers exception:", error);

    return NextResponse.json(
      { error: error.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  let uploadedFilePath: string | null = null;

  try {
    const formData = await req.formData();

    const questionId = formData.get("question_id")?.toString();
    const body = formData.get("body")?.toString().trim() || "";
    const author = formData.get("author")?.toString().trim() || null;

    const fileEntry = formData.get("image");

    const file =
      fileEntry instanceof File && fileEntry.size > 0
        ? fileEntry
        : null;

    if (!questionId) {
      return NextResponse.json(
        { error: "question_id is required" },
        { status: 400 }
      );
    }

    // At least text OR image must be provided
    if (!body && !file) {
      return NextResponse.json(
        { error: "Answer must contain text or a PNG image" },
        { status: 400 }
      );
    }

    let imageUrl: string | null = null;

    /*
     * =========================
     * IMAGE VALIDATION + UPLOAD
     * =========================
     */

    if (file) {
      // Only PNG
      if (file.type !== "image/png") {
        return NextResponse.json(
          { error: "Only PNG images are allowed" },
          { status: 400 }
        );
      }

      // Maximum 5 MB
      if (file.size > MAX_FILE_SIZE) {
        return NextResponse.json(
          { error: "PNG image must be smaller than 5 MB" },
          { status: 400 }
        );
      }

      // Make sure filename ends in .png
      const originalName = file.name.toLowerCase();

      if (!originalName.endsWith(".png")) {
        return NextResponse.json(
          { error: "Only .png files are allowed" },
          { status: 400 }
        );
      }

      const fileName = `${crypto.randomUUID()}.png`;

      uploadedFilePath = `${questionId}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("answer-images")
        .upload(uploadedFilePath, file, {
          contentType: "image/png",
          upsert: false,
        });

      if (uploadError) {
        console.error("Image upload error:", uploadError);

        return NextResponse.json(
          { error: uploadError.message },
          { status: 500 }
        );
      }

      const { data: publicUrlData } = supabase.storage
        .from("answer-images")
        .getPublicUrl(uploadedFilePath);

      imageUrl = publicUrlData.publicUrl;
    }

    /*
     * =========================
     * SAVE ANSWER
     * =========================
     */

    const { data, error } = await supabase
      .from("answers")
      .insert({
        question_id: Number(questionId),
        body: body || "",
        author,
        image_url: imageUrl,
      })
      .select(
        "id, question_id, body, author, image_url, created_at"
      )
      .single();

    if (error) {
      console.error("POST answer error:", error);

      // Remove uploaded image if database insert failed
      if (uploadedFilePath) {
        await supabase.storage
          .from("answer-images")
          .remove([uploadedFilePath]);
      }

      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json(data, { status: 201 });
  } catch (error: any) {
    console.error("POST answer exception:", error);

    // Cleanup uploaded image if something unexpected happened
    if (uploadedFilePath) {
      await supabase.storage
        .from("answer-images")
        .remove([uploadedFilePath]);
    }

    return NextResponse.json(
      { error: error.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}