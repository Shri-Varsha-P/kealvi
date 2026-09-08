import { supabase } from "@/lib/supabase";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const { data, error } = await supabase
      .from("polls")
      .select(`
        id,
        question,
        poll_options (
          id,
          option_text,
          poll_votes(count)
        )
      `);

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    const formattedPolls = (data ?? []).map((poll: any) => {
      let pollTotalVotes = 0;

      const formattedOptions = (poll.poll_options ?? []).map(
        (opt: any) => {
          const count =
            opt.poll_votes?.[0]?.count ??
            opt.poll_votes?.count ??
            0;

          pollTotalVotes += Number(count);

          return {
            id: opt.id,
            option_text: opt.option_text,
            vote_count: Number(count),
          };
        }
      );

      return {
        id: poll.id,
        question: poll.question,
        total_votes: pollTotalVotes,
        poll_options: formattedOptions,
      };
    });

    return NextResponse.json(formattedPolls);
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const { question, options } = await req.json();

    /* =========================
       VALIDATE QUESTION
    ========================= */

    const cleanedQuestion =
      typeof question === "string"
        ? question.trim()
        : "";

    if (!cleanedQuestion) {
      return NextResponse.json(
        { error: "Poll question cannot be empty" },
        { status: 400 }
      );
    }

    /* =========================
       VALIDATE OPTIONS
    ========================= */

    if (!Array.isArray(options) || options.length < 2) {
      return NextResponse.json(
        { error: "At least 2 options are required" },
        { status: 400 }
      );
    }

    /*
      Remove empty options and trim spaces.
    */
    const cleanedOptions = options
      .filter(
        (o: unknown) =>
          typeof o === "string" && o.trim() !== ""
      )
      .map((o: string) => o.trim());

    if (cleanedOptions.length < 2) {
      return NextResponse.json(
        { error: "At least 2 non-empty options are required" },
        { status: 400 }
      );
    }

    /* =========================
       CHECK DUPLICATE OPTIONS
    ========================= */

    const normalizedOptions = cleanedOptions.map(
      (option: string) =>
        option.toLowerCase().replace(/\s+/g, " ")
    );

    const uniqueOptions = new Set(normalizedOptions);

    if (uniqueOptions.size !== normalizedOptions.length) {
      return NextResponse.json(
        { error: "Poll options cannot be identical" },
        { status: 400 }
      );
    }

    /* =========================
       CHECK DUPLICATE POLL
    ========================= */

    /*
      Normalize the question so that:

      "What is AI?"
      " what is ai? "
      "WHAT IS AI?"

      are treated as the same question.
    */
    const normalizedQuestion =
      cleanedQuestion
        .toLowerCase()
        .replace(/\s+/g, " ");

    /*
      Fetch existing polls along with their options.
    */
    const { data: existingPolls, error: existingError } =
      await supabase
        .from("polls")
        .select(`
          id,
          question,
          poll_options (
            option_text
          )
        `);

    if (existingError) {
      return NextResponse.json(
        { error: existingError.message },
        { status: 500 }
      );
    }

    /*
      Compare question + complete option set.

      Sorting means:

      [A, B, C]

      and

      [C, A, B]

      are considered the same poll.
    */
    const sortedNewOptions = [...normalizedOptions].sort();

    const duplicatePoll = (existingPolls ?? []).find(
      (poll: any) => {
        const existingQuestion =
          String(poll.question ?? "")
            .trim()
            .toLowerCase()
            .replace(/\s+/g, " ");

        if (existingQuestion !== normalizedQuestion) {
          return false;
        }

        const existingOptions = (
          poll.poll_options ?? []
        ).map((opt: any) =>
          String(opt.option_text ?? "")
            .trim()
            .toLowerCase()
            .replace(/\s+/g, " ")
        );

        const sortedExistingOptions =
          [...existingOptions].sort();

        if (
          sortedExistingOptions.length !==
          sortedNewOptions.length
        ) {
          return false;
        }

        return sortedExistingOptions.every(
          (option, index) =>
            option === sortedNewOptions[index]
        );
      }
    );

    if (duplicatePoll) {
      return NextResponse.json(
        {
          error:
            "A poll with the same question and options already exists",
        },
        { status: 409 }
      );
    }

    /* =========================
       CREATE POLL
    ========================= */

    const { data: poll, error: pollError } =
      await supabase
        .from("polls")
        .insert({
          question: cleanedQuestion,
        })
        .select()
        .single();

    if (pollError) {
      return NextResponse.json(
        { error: pollError.message },
        { status: 500 }
      );
    }

    /* =========================
       CREATE OPTIONS
    ========================= */

    const optionRows = cleanedOptions.map(
      (text: string) => ({
        poll_id: poll.id,
        option_text: text,
      })
    );

    const { error: optError } = await supabase
      .from("poll_options")
      .insert(optionRows);

    if (optError) {
      /*
        If option creation fails, remove the poll
        that was just created.
      */
      await supabase
        .from("polls")
        .delete()
        .eq("id", poll.id);

      return NextResponse.json(
        { error: optError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      id: poll.id,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}