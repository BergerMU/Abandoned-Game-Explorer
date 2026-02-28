import { NextResponse } from "next/server"

// User Player Achievements Function
export async function POST(request) {
  const { id: steamUserID, gameData: games } = await request.json()
  const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms))
  const savedBatchResults = []

  // Format list of owned game appids into string for achievement api
  let formattedIDs = []
  let x = 0
  for (const game of games.games) {
    formattedIDs.push(`&appids[${x}]=${game.appid}`)
    x++
  }

  // Batch an array into subarrays with even amoutns of data
  const chunkArray = (array, chunkSize) => {
    const numberOfChunks = Math.ceil(array.length / chunkSize)

    return [...Array(numberOfChunks)]
      .map((value, index) => {
        return array.slice(index * chunkSize, (index + 1) * chunkSize)
      })
  }
  const batchedIDs = chunkArray(formattedIDs, 500)

  // Function for calling each batch
  async function callApi(param, apiNumber) {
    try {
      const response = await fetch(`https://api.steampowered.com/IPlayerService/GetTopAchievementsForGames/v1/?key=${process.env.STEAM_API_KEY}&steamid=${steamUserID}&language=en${param}`)
      if (!response.ok) {
        throw new Error(`API ${apiNumber} request failed`)
      }

      // save data
      const data = await response.json()
      return data

      // output error
    } catch (e) {
      console.error(`Achievement API Error ${apiNumber}: `, e.message)
      return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
    }
  }

  // Runs each batch using the callAPI function
  for (const batch of batchedIDs) {
    const promises = batch.map((param, index) => callApi(param, index + 1))
    const results = await Promise.all(promises)
    savedBatchResults.push(...results)
    // await delay(1000)
  }

  return NextResponse.json(savedBatchResults)
}