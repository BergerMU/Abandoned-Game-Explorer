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

    if (!response.ok) {
      throw new Error(`Get Player Achievements Status Error: ${response.status}`);
    }

    // Save Data
    const data = await response.json();
    return NextResponse.json(data.response.games);

    // Catch errors
  } catch (e) {
    console.error("Get Player Achievements Error:", e.message);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}