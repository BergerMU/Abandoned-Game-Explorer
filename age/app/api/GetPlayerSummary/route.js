import { NextResponse } from "next/server";

// User Player Summary Function
export async function POST(request) {
  const { id: steamUserID } = await request.json();  
  try {
    // Fetch Steam API
    const response = await fetch(
      `http://api.steampowered.com/ISteamUser/GetPlayerSummaries/v0002/?key=${process.env.STEAM_ID}&steamids=${steamUserID}`
    );

    // Save Data
    const data = await response.json();
    return NextResponse.json(data.response);
    
    // Catch errors
  } catch (error) {
    console.error("API Error:", error.message);
  }
}