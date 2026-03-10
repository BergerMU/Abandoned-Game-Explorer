import { NextResponse } from "next/server";

// User Owned Games Function
export async function POST(request) {
  const { id: steamUserID } = await request.json();
  try {
    // Fetch Steam API
    const response = await fetch(
      `http://api.steampowered.com/IPlayerService/GetOwnedGames/v0001/?key=${process.env.STEAM_API_KEY}&steamid=${steamUserID}&include_appinfo=True&include_played_free_games=True`
    );

    if (!response.ok) {
      throw new Error(`Get Owned Games Status Error: ${response.status}`);
    }

    // Save Data
    const data = await response.json();
    return NextResponse.json(data.response);

    // Catch errors
  } catch (e) {
    console.error("Get Owned Games Error:", e.message);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}