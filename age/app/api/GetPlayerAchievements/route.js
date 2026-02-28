import { NextResponse } from "next/server";

// User Player Achievements Function
export async function POST(request) {
  const { id: steamUserID, gameData: games } = await request.json();
  const results = []

  // Go through batches of games
  for (let i = 0; i < games.games.length; i += 500) {
    const batch = games.games.slice(i, i+500)

    // Format appids in a string to use in api
    let formattedGames = ""
    batch.forEach((game, index) => {
      formattedGames += `&appids[${index}]=${game.appid}`;
    })

    // Fetch api using appids
    try {
      const response = await fetch(
        `https://api.steampowered.com/IPlayerService/GetTopAchievementsForGames/v1/?key=${process.env.STEAM_API_KEY}&steamid=${steamUserID}&language=en&max_achievements=10000${formattedGames}`
      )

      // invalid response
      if (!response.ok) {
        console.error("Steam error:", response.status)
      }

      // Save data
      const data = await response.json()
      if (data?.response?.games) {
        results.push(...data.response.games)
      }
    } catch (e) {
      console.error("Batch failed:", e.message)
    }
  }

  return NextResponse.json(results)
}