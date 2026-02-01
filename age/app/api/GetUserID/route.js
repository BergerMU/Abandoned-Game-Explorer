import { NextResponse } from "next/server";

// Steam User ID Function
export async function POST(request) {
  const { username: steamUsername } = await request.json();
  try {
    // Fetch Steam API
    const response = await fetch(
      `http://api.steampowered.com/ISteamUser/ResolveVanityURL/v0001/?key=${process.env.STEAM_API_KEY}&vanityurl=${steamUsername}`
    );

    // Save Data
    const data = await response.json();
    return NextResponse.json(data.response.steamid);

    // Catch errors
  } catch (error) {
    console.error("API Error:", error.message);
  }
}