import { NextResponse } from "next/server";

// Recently Played Games Function
export async function POST(request) {
  const { id: steamUserID } = await request.json();
  try {
    // Fetch Steam API
    const response = await fetch(
      `http://api.steampowered.com/IPlayerService/GetRecentlyPlayedGames/v0001/?key=${process.env.STEAM_API_KEY}&steamid=${steamUserID}`
    );

    // Save Data
    const data = await response.json();
    return NextResponse.json(data.response);
    
    // Catch errors
  } catch (error) {
    console.error("API Error:", error.message);
  }
}