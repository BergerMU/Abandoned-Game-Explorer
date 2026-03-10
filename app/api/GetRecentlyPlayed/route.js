import { NextResponse } from "next/server";

// Recently Played Games Function
export async function POST(request) {
  const { id: steamUserID } = await request.json();
  try {
    // Fetch Steam API
    const response = await fetch(
      `http://api.steampowered.com/IPlayerService/GetRecentlyPlayedGames/v0001/?key=${process.env.STEAM_API_KEY}&steamid=${steamUserID}`
    );

    if (!response.ok) {
      throw new Error(`Get Recently Played Status Error: ${response.status}`);
    }

    // Save Data
    const data = await response.json();
    return NextResponse.json(data.response);

    // Catch errors
  } catch (e) {
    console.error("Get Recently Played Games Error:", e.message);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}