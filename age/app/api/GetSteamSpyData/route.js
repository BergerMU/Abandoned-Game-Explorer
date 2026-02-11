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

      // Save data
      const data = await response.json();
      return data;

      // Output error
    } catch (error) {
      console.error(`Error in API ${apiNumber}: `, error);
      return { error: "Failed to fetch Steam data", status: 500 };
    }
  }

  // Runs each batch using the callAPI function
  for (const batch of batchedIDs) {
    const promises = batch.map((param, index) => callApi(param, index + 1));

    // Save results
    try {
      const results = await Promise.all(promises);
      savedBatchResults.push(...results);

      // Output error
    } catch (error) {
      console.error("Error during fetching: ", error);
      return NextResponse.json(
        { error: "Failed to fetch Steam data", status: 500 }
      );
    }
  }

  return NextResponse.json(savedBatchResults);
}