import { NextResponse } from "next/server";

// User Player Achievements Function
export async function POST(request) {
  const { id: steamUserID, gameData: games } = await request.json();

  // Format list of owned game appids into string for achievement api
  let formattedGames = ""
  let x = 0;
  for (const game of games.games) {
    formattedGames += `&appids[${x}]=${game.appid}`;
    x++;
  }

  try {
    // Fetch Steam API
    const response = await fetch(
      `https://api.steampowered.com/IPlayerService/GetTopAchievementsForGames/v1/?key=${process.env.STEAM_API_KEY}&steamid=${steamUserID}&language=en&max_achievements=10000${formattedGames}`
    );

    // Save Data
    const data = await response.json();
    return NextResponse.json(data.response.games);
    
    // Catch errors
  } catch (error) {
    console.error("API Error:", error.message);
  }
}