import { NextResponse } from "next/server";

// Steam Game Cover Function
export async function POST(request) {
  const { gameData:games } = await request.json();
  let steamSpyGameData = [];

  // Format appids
  let formattedIDs = [];
  for (const game of games.games) {
    formattedIDs.push(game.appid);
  };

  while (formattedIDs.length > 0) {
    const response = await fetch(`https://steamspy.com/api.php?request=appdetails&appid=${formattedIDs[0]}`);

    // Save Data
    const data = await response.json();
    steamSpyGameData.push(data);
    formattedIDs.splice(0, 1);
  }

  return NextResponse.json(steamSpyGameData);
}