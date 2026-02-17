import { NextResponse } from "next/server";

// User Player Summary Function
export async function POST(request) {
  const { id: steamUserID } = await request.json();
  try {
    // Fetch Steam API
    const response = await fetch(
      `http://api.steampowered.com/ISteamUser/GetPlayerSummaries/v0002/?key=${process.env.STEAM_API_KEY}&steamids=${steamUserID}`
    );

    if (!response.ok) {
      throw new Error(`Get Player Summaries Status Error: ${response.status}`);
    }

    // Save Data
    const data = await response.json();
    return NextResponse.json(data.response);

    // Catch errors
  } catch (e) {
    console.error("Get Player Summaries Error:", e.message);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}