import { NextResponse } from "next/server";

// Steam Game Cover Function
export async function POST(request) {
  const { gameData:games } = await request.json();
  let gameCoverData = [];

  // Format appids
  let formattedIDs = [];
  for (const game of games.games) {
    formattedIDs.push(game.appid);
  };

  // Copy of list of appids
  const formattedIDsCopy = [...formattedIDs];

  while (formattedIDs.length > 0) {
    const first100 = formattedIDs.slice(0, 50);
      const response = await fetch(
        `https://www.steamgriddb.com/api/v2/grids/steam/${first100}`,
        {
          headers: {
          'Authorization': `Bearer ${process.env.STEAM_GRID_API_KEY}`
        }
      }
    );

    // Save Data
    const data = await response.json();
    gameCoverData.push(...data.data || {})

    formattedIDs.splice(0, 50);
  }

  // AI assisted in the combination of the appid being attached
  const coverURLs = gameCoverData.map((obj, index) => ({
    appid: formattedIDsCopy[index],
    url: obj.data?.[0]?.url ?? "No Cover"
  }));

  return NextResponse.json(coverURLs);
}