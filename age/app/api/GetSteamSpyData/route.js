import { NextResponse } from "next/server";

// Steam Game Cover Function
export async function POST(request) {
  const { gameData: games } = await request.json();
  const savedBatchResults = [];

  // Format appids
  let formattedIDs = [];
  for (const game of games.games) {
    formattedIDs.push(game.appid);
  };

  // Batch an array into subarrays with even amoutns of data
  const chunkArray = (array, chunkSize) => {
    const numberOfChunks = Math.ceil(array.length / chunkSize)

    return [...Array(numberOfChunks)]
      .map((value, index) => {
        return array.slice(index * chunkSize, (index + 1) * chunkSize)
      })
  }
  const batchedIDs = chunkArray(formattedIDs, 50);

  // Gets the api request itself
  async function callApi(param, apiNumber) {
    try {
      const response = await fetch(`https://steamspy.com/api.php?request=appdetails&appid=${param}`);
      if (!response.ok) {
        throw new Error(`API ${apiNumber} request failed`);
      }

      if (!response.ok) {
        throw new Error(`Get Steam Spy Status Error: ${response.status}`);
      }

      // Save data
      const data = await response.json();
      return data;

      // Output error
    } catch (e) {
      console.error(`Steam Spy Error ${apiNumber}: `, e.message);
      return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
  }

  // Runs each batch using the callAPI function
  for (const batch of batchedIDs) {
    const promises = batch.map((param, index) => callApi(param, index + 1));
    const results = await Promise.all(promises);
    savedBatchResults.push(...results);
  }

  return NextResponse.json(savedBatchResults);
}