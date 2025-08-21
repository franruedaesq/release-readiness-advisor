import { NextResponse } from "next/server";
import axios from "axios";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const backendResponse = await axios.post(
      "http://54.242.153.126:3002/api/v2/analysis/run",
      {
        task: body.task,
        model: body.model,
      }
    );

    return NextResponse.json({ report: backendResponse.data.report });
  } catch (error: unknown) {
    console.error("API Route Error:", error);
    let status = 500;
    if (
      typeof error === "object" &&
      error !== null &&
      "response" in error &&
      typeof (error as { response?: { status?: number } }).response?.status ===
        "number"
    ) {
      status = (error as { response: { status: number } }).response.status;
    }
    return NextResponse.json(
      { message: "Error forwarding request to backend." },
      { status }
    );
  }
}
