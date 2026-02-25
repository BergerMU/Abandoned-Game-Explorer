// Correct rendering for local testing and vercel deployment
"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"

export default function Homepage() {
  // Page Variables
  const router = useRouter()
  const [accountDataLoading, setAccountDataLoading] = useState(true)
  const [gameDataLoading, setGameDataLoading] = useState(true)
  const [privacyError, setPrivacyError] = useState(false)

  // Account Variables
  const [steamid, setSteamid] = useState<string | null>(null)
  const [userSummary, setUserSummary] = useState<any>(null)
  const [accountScore, setAccountScore] = useState(0)
  const [accountCost, setAccountCost] = useState(0)
  const [errorHeader, setErrorHeader] = useState("")

  // Game Variables
  type Game = {
    name: string
    appid: number
    score: number

    global_average_playtime: number
    global_median_playtime: number

    game_cover: string
    img_icon_url: string

    played_within_two_weeks: boolean
    playtime_forever: number

    percent_of_achievements: number
    total_achievements: number
    unlocked_achievements_count: number
  }
  const [userGameData, setUserGameData] = useState<Game[]>([])

  // Calculate a score of how much a user has completed their game
  function CalculateScore(userPlaytime: number, globalPlaytime: number, totalAchievements: number, unlockedAchievements: number) {
    let totalScore = 0

    // Global playtime is unavailable
    if (globalPlaytime == -1) {
      return -1
    }

    // Game has achievements
    if (totalAchievements !== 0) {
      totalScore += (unlockedAchievements / totalAchievements) * .5

      if (userPlaytime < globalPlaytime) {
        totalScore += (userPlaytime / globalPlaytime) * .5

      } else {
        totalScore += 0.5
      }

      // Game doesn't have achievements
    } else {
      if (userPlaytime < globalPlaytime && userPlaytime > 0) {
        totalScore += userPlaytime / globalPlaytime
      } else if (userPlaytime >= globalPlaytime) {
        totalScore += 1
      }
    }

    return (Math.round(totalScore * 100))
  }

  // Gets owned games, covers, achievements, game details, recently played
  async function FetchSteamGames(steamid: string) {
    setPrivacyError(false)
    // Fetch owned games from steamid
    const tempOwnedGames = await fetch('/api/GetOwnedGames', {
      method: "POST",
      body: JSON.stringify({ id: steamid })
    })
    const ownedGames = await tempOwnedGames.json()
    console.log("User Owned Games: ", ownedGames)

    // Check if user games are available and playtime can be viewed. Account privacy settings might be private
    if (!ownedGames.game_count || ownedGames.game_count > 0 && ownedGames.games.every(((game: any) => game.playtime_forever == 0))) {
      console.log("Get Owned Games API: no games visible")
      setPrivacyError(true)
      setGameDataLoading(false)
      return
    }
    // Unable to fetch account/games in the first place
    if (ownedGames.error) {
      router.push("/")
    }

    // Fetch in depth data from steam spy
    const tempDetailedGameData = await fetch('/api/GetSteamSpyData', {
      method: "POST",
      body: JSON.stringify({ gameData: ownedGames })
    })
    type SteamSpyResponse = Record<string, Record<string, any>>
    const steamSpyData = await tempDetailedGameData.json() as SteamSpyResponse
    console.log("Steam Spy Game Data: ", steamSpyData)

    if (Object.values(steamSpyData).some(obj => !Object.keys(obj).length)) {
      setErrorHeader("Games details, account score, and estimated account cost may be inaccurate due to the Steam Spy API infrastucture globally being overloaded.")
    }

    // Fetch owned game covers
    const tempGameCovers = await fetch('/api/GetSteamCovers', {
      method: "POST",
      body: JSON.stringify({ gameData: ownedGames })
    })
    const gameCovers = await tempGameCovers.json()
    console.log("Game Covers: ", gameCovers)

    // Fetch owned games from userID
    const tempUserAchievements = await fetch('/api/GetPlayerAchievements', {
      method: "POST",
      body: JSON.stringify({ id: steamid, gameData: ownedGames })
    })
    const userAchievements = await tempUserAchievements.json()
    console.log("User Achievements: ", userAchievements)

    // Fetch recently played
    const tempRecentlyPlayed = await fetch('/api/GetRecentlyPlayed', {
      method: "POST",
      body: JSON.stringify({ id: steamid })
    })

    // Save the returned data
    const recentlyPlayed = await tempRecentlyPlayed.json()
    console.log("Recently Played: ", recentlyPlayed)

    return { ownedGames, userAchievements, steamSpyData, recentlyPlayed, gameCovers }
  }

  // Combine various game data into a single list of objects
  async function CombineGameData(ownedGames: any, userAchievements: any, steamSpyData: any, recentlyPlayed: any, gameCovers: any) {

    const combinedData = ownedGames.games.map((currentGame: any) => {
      // Specific Game details
      const matchDetailedGameData = steamSpyData.find((item: any) => item.appid === currentGame.appid)
      const matchCover = gameCovers.find((item: any) => item.appid === currentGame.appid)

      // Achievements avariables
      const matchAchievements = userAchievements.find((item: any) => item.appid === currentGame.appid)
      const totalAchievements = matchAchievements?.total_achievements ?? 0
      const unlockedAchievementsCount = matchAchievements?.achievements ? matchAchievements?.achievements.length : 0

      // Determine if game has been played within two weeks
      let isPlayedWithinTwoWeeks: boolean
      if (recentlyPlayed.total_count > 0) {
        if (recentlyPlayed?.games.find((item: any) => item.appid === currentGame.appid)) {
          isPlayedWithinTwoWeeks = true
        } else {
          isPlayedWithinTwoWeeks = false
        }
      } else {
        isPlayedWithinTwoWeeks = false
      }

      // Calculate Game Score
      const score = CalculateScore(
        currentGame.playtime_forever ?? -1,
        matchDetailedGameData?.median_forever ?? -1,
        totalAchievements ?? 0,
        unlockedAchievementsCount ?? 0,
      )

      return {
        ...currentGame,
        global_average_playtime: matchDetailedGameData?.average_forever ?? -1,
        global_median_playtime: matchDetailedGameData?.median_forever ?? -1,
        total_achievements: totalAchievements,
        unlocked_achievements_count: unlockedAchievementsCount,
        percent_of_achievements: totalAchievements > 0 ? Math.round((unlockedAchievementsCount / totalAchievements) * 100) : 0,
        score: score,
        played_within_two_weeks: isPlayedWithinTwoWeeks,
        game_cover: matchCover?.url ?? "No Cover"
      }
    })

    // Save game data
    setUserGameData(combinedData)
    console.log("Combined Game Data: ", combinedData)

    // Calculate account score by averaging each individual game score
    let tempAccountScore = 0
    let totalValidGames = 0
    for (const obj of combinedData) {
      if (obj.global_median_playtime != -1) {
        tempAccountScore += obj.score
        totalValidGames += 1
      }
    }

    // Accounts for division by zero errors
    if (combinedData.length > 0) {
      setAccountScore(Math.round(tempAccountScore / totalValidGames))
    } else {
      setAccountScore(0)
    }
  }

  async function GetUserDetails(steamid: string) {
    // Fetch user summary from steamid
    const tempUserSummary = await fetch('./api/GetPlayerSummary', {
      method: "POST",
      body: JSON.stringify({ id: steamid })
    })
    const summary = await tempUserSummary.json()
    setUserSummary(summary.players[0])
    console.log("User Summary: ", summary.players[0])
  }

  type SortConfig<T> = {
    key: keyof T
    direction: 'ascending' | 'descending'
  } | null

  type Category = {
    games: Game[]
    header: string
    subtext: string
    description: string
  }

  // Takes in array of user games and sorts them based on categories
  function useSortableData<T extends Record<string, any>>(
    items: T[],
    config: SortConfig<T> = null
  ) {
    const [sortConfig, setSortConfig] = useState<SortConfig<T>>(config)

    const sortedItems = useMemo(() => {
      let sortableItems = [...items]

      if (sortConfig !== null) {
        sortableItems.sort((a, b) => {
          if (a[sortConfig.key] < b[sortConfig.key]) {
            return sortConfig.direction === 'ascending' ? -1 : 1
          }
          if (a[sortConfig.key] > b[sortConfig.key]) {
            return sortConfig.direction === 'ascending' ? 1 : -1
          }
          return 0
        })
      }

      return sortableItems
    }, [items, sortConfig])

    const requestSort = (key: keyof T) => {
      let direction: 'ascending' | 'descending' = 'descending'

      if (
        sortConfig &&
        sortConfig.key === key &&
        sortConfig.direction === 'descending'
      ) {
        direction = 'ascending'
      }

      setSortConfig({ key, direction })
    }

    return { items: sortedItems, requestSort, sortConfig }
  }

  const CategoryTable = ({ header, subtext, description, games }: Category) => {
    const { items, requestSort, sortConfig } = useSortableData(games, {
      key: "global_median_playtime",
      direction: "descending"
    })

    // Search variables for each category
    const [searchGames, setSearchGames] = useState('')

    return (
      <div className='flex flex-col p-3 bg-radial-[at_50%_50%] from-gray-800 to-gray-900 rounded-xl'>
        <div className="flex flex-row justify-between items-start">
          <div className='flex flex-col mb-2 gap-2 max-w-120 min-w-min'>
            <b className='text-3xl'>{header}</b>
            <p className="text-2xl">{description}</p>
            <p>{subtext}</p>
          </div>

          <button type="button"
            onClick={() => requestSort('score')}
            className="cursor-pointer">
            {sortConfig?.key === 'score' ? sortConfig?.direction === "descending" ? (
              <p>Score ▼</p>
            ) : (
              <p>Score ▲</p>
            ) : (
              <p>Score</p>
            )}
          </button>

          <button type="button"
            onClick={() => requestSort('playtime_forever')}
            className="cursor-pointer">
            {sortConfig?.key === 'playtime_forever' ? sortConfig?.direction === "descending" ? (
              <p>Hours Played ▼</p>
            ) : (
              <p>Hours Played ▲</p>
            ) : (
              <p>Hours Played</p>
            )}
          </button>

          <button type="button"
            onClick={() => requestSort('global_median_playtime')}
            className="cursor-pointer">
            {sortConfig?.key === 'global_median_playtime' ? sortConfig?.direction === "descending" ? (
              <p>Global Average Playtime ▼</p>
            ) : (
              <p>Global Average Playtime ▲</p>
            ) : (
              <p>Global Average Playtime</p>
            )}
          </button>

          <button type="button"
            onClick={() => requestSort('percent_of_achievements')}
            className="cursor-pointer">
            {sortConfig?.key === 'percent_of_achievements' ? sortConfig?.direction === "descending" ? (
              <p>Achievements Unlocked ▼</p>
            ) : (
              <p>Achievements Unlocked ▲</p>
            ) : (
              <p>Achievements Unlocked</p>
            )}
          </button>

          <div className="flex flex-col text-right">
            <input type="text" className='w-60 p-3 h-10 outline-1 outline-black rounded-xl bg-sky-950' placeholder="Search for your games" onChange={e => setSearchGames(e.target.value)} value={searchGames} />
            <p className='text-2xl'>{items.length} Games</p>
          </div>
        </div>
        <div className="grid sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 max-h-150 overflow-y-auto space-y-8 gap-5 p-3">
          {items.length > 0 ? items.filter(g => g.name.toLowerCase().includes(searchGames.toLowerCase())).map((game) => (
            <div className="flex flex-col w-full max-w-xs sm:max-w-sm md:max-w-md space-y-3" key={game.appid}>
              <b>{game.name}</b>

              <div className="group relative inline-block cursor-pointer w-full h-full z-10">
                {/* Content user interacts with goes here */}
                {game.game_cover != "No Cover" ? (
                  <div className="rounded-xl">
                    <img className="object-contain rounded-xl" src={game.game_cover} />
                  </div>
                ) : (
                  <div className='relative w-full h-full bg-linear-to-tl from-slate-800 to-slate-700 rounded-xl overflow-hidden'>
                    <div className='absolute w-2xl h-2xl font-bold inset-[-100] rotate-345 bg-repeat-x text-slate-600 cursor-default'>
                      {Array(200).fill(game.name + " ")}
                    </div>
                  </div>
                )}
                <div className="invisible absolute shadow-xs bg-slate-700 rounded-xl group-hover:visible group-hover:delay-500 p-3">
                  {/* Popup goes here */}
                  <div className="flex flex-col">
                    <a className="text-blue-300" href={`https://store.steampowered.com/app/${game.appid}/`} target="_blank">Visit Game Store</a>
                    <a className="text-blue-300" href={`https://steamcommunity.com/app/${game.appid}/guides`} target="_blank">Visit Game Guides</a>
                  </div>
                </div>
              </div>

              <div className="group relative inline-block cursor-pointer w-full">
                {game.score != -1 ? (
                  <p>Total Score: {game.score}</p>
                ) : (
                  <p>Total Score: Unavailable</p>
                )}
                <progress max="100" value={game.score} className='flex w-full'>{game.score}</progress>
                <div className="invisible absolute shadow-xs bg-slate-700 rounded-xl group-hover:visible group-hover:delay-500 p-3">
                  <div>
                    <b>Scoring</b>
                    <p>+50% if Hours Played more than global average</p>
                    <br />
                    <p>+50% if all achievements are unlocked</p>
                  </div>
                </div>
              </div>


              {game.playtime_forever / 60 < 1 ? (
                <p>Hours Played: {game.playtime_forever} minutes</p>
              ) : (
                <p>Hours Played: {Math.floor(game.playtime_forever / 60)} hours and {game.playtime_forever % 60} minutes</p>
              )}

              {game.global_median_playtime != -1 ? (game.global_median_playtime / 60 < 1 ? (
                <p>Average Global Playtime: {game.global_median_playtime % 60} minutes </p>
              ) : (
                <p>Average Global Playtime: {Math.floor(game.global_median_playtime / 60)} hours and {game.global_median_playtime % 60} minutes</p>
              )) : (
                <p>Average Global Playtime: Unavailable</p>
              )}

              {game.total_achievements ? (
                <p>Achievements: {game.percent_of_achievements}% unlocked</p>
              ) : (
                <p>No unlockable achievements</p>
              )}
            </div>
          )) : (
            <p>No games to display</p>
          )}
        </div>
      </div>
    )
  }

  // Run all apis for user info and game data
  const FetchAllData = async () => {
    if (!steamid) {
      return
    }

    setAccountDataLoading(true)
    await GetUserDetails(steamid)
    setAccountDataLoading(false)

    setGameDataLoading(true)
    // Get steam games and check if null
    const result = await FetchSteamGames(steamid)
    if (!result) {
      return
    }

    // Concat data
    const { ownedGames, userAchievements, steamSpyData, recentlyPlayed, gameCovers } = result
    await CombineGameData(ownedGames, userAchievements, steamSpyData, recentlyPlayed, gameCovers)

    let tempGameSum = 0

    for (const obj of Object.values(steamSpyData)) {
      if (obj.price != null) {
        tempGameSum += Number(obj.price)
      }
    }
    setAccountCost(tempGameSum / 100)

    setGameDataLoading(false)
  }

  // Get steamid from url
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const id = params.get("steamid")
    setSteamid(id)
  }, [])

  // Fetch user data on page load
  useEffect(() => {
    FetchAllData()
  }, [steamid])

  return (
    <main className="flex min-h-screen flex-col py-20 px-16 items-center justify-center">
      {/* Loading user account info */}
      {accountDataLoading ? (
        <div className='flex flex-row space-x-6'>
          <p className='text-2xl'>Loading User Information</p>
          <div className="h-6 w-6 animate-spin rounded-full border-b-2 border-current" />
        </div>
        // Loading Game info
      ) : gameDataLoading ? (
        <div className='flex flex-row space-x-6'>
          <p className='text-2xl'>Loading Game Data</p>
          <div className="h-6 w-6 animate-spin rounded-full border-b-2 border-current" />
        </div>
      ) : privacyError ? (
        <div className="bg-radial-[at_50%_50%] from-gray-800 to-gray-900 p-3 w-full space-y-5 rounded-xl">
          <p className="text-2xl">Your account data was unable to be viewed</p>
          <p>Go to your steam account privacy settings and check the following to ensure your account is accessable</p>
          <p>• Make sure "My basic details" is "Public"</p>
          <p>• Make sure "My profile" is "Public"</p>
          <p>• Make sure "Game details" is "Public"</p>
          <p>• Make sure "Always keep my total playtime private even if users can see my game details" is unchecked</p>
        </div>
      ) : (
        <div>
          {/* Header User Section */}
          {errorHeader && (
            <div className="bg-red-600 p-3 w-full space-y-5 rounded-xl">
              <p>{errorHeader}</p>
            </div>
          )}
          <div className='flex'>
            {/* Account Information */}
            <div className='flex flex-col p-3'>
              <p className="text-4xl mb-2">{userSummary.personaname}</p>

              <div className='flex flex-row space-x-10'>
                <img src={userSummary.avatarfull} />
                <div className="flex flex-col space-y-3">
                  <div className="group relative inline-block cursor-pointer w-50">
                    <p className='text-2xl'>Account Score: {accountScore}</p>
                    <progress max="100" value={accountScore} className='flex w-full rounded-full'>{accountScore}</progress>
                    <div className="invisible absolute shadow-xs bg-slate-700 rounded-xl group-hover:visible group-hover:delay-500 p-3">
                      <div>
                        <b>Account Scoring</b>
                        <p>Your Account Score is the average score accross all of your games</p>
                      </div>
                    </div>
                  </div>

                  {/* If user is offline, busy, away, snoozed */}
                  {userSummary.personastate == 0 || userSummary.personastate == 2 || userSummary.personastate == 3 || userSummary.personastate == 4 ? (
                    <p className="bg-red-500 w-min p-1 rounded-xl">Offline</p>
                  ) : (
                    <p className="bg-green-700 w-min p-1 rounded-xl">Online</p>
                  )}
                  <p>Account Created On: {new Date(userSummary.timecreated * 1000).toLocaleDateString("en-US")}</p>
                  <p>{userGameData.length} Games</p>
                  <p>Estimated Account Cost: ${accountCost.toLocaleString("en-US")}</p>
                  <p>Note: This estimate does not factor in discounts or microstransactions and some prices may not have been available</p>
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-row justify-between py-5">
            <p className="text-2xl">Go give yo games some love</p>
            <button className='p-2 outline-1 outline-black rounded-xl bg-sky-950 text-gray-200 cursor-pointer' onClick={FetchAllData}>Refresh Account Data</button>
          </div>

          <div className='flex flex-col gap-y-10'>
            {/* Recently Played Games */}
            <CategoryTable
              games={userGameData.filter(x => x.played_within_two_weeks)}
              header="Recently Played"
              description="Played within the last two weeks"
              subtext=""
            />

            {/* Games that haven't been played */}
            <CategoryTable
              games={userGameData.filter(a => a.playtime_forever === 0)}
              header="Not Played:("
              description="Games with 0 hours played"
              subtext="Why haven't you played this yet? install them at least!"
            />

            {/* Games with less than 10 minutes of playtime */}
            <CategoryTable
              games={userGameData.filter((a) => a.playtime_forever > 0 && a.playtime_forever < 10)}
              header="Bearly Touched"
              description="Less than 10 minutes of time played"
              subtext="At least give them a chance!"
            />

            {/* Games that are almost at 100% */}
            <CategoryTable
              games={userGameData.filter((a) => a.percent_of_achievements >= 75 && a.percent_of_achievements < 100)}
              header="Almost Complete!"
              description="Games with at least a 75% achievements and 80% score"
              subtext=""
            />

            {/* 100% Score Games */}
            <CategoryTable
              games={userGameData.filter((a) => a.score == 100)}
              header="High Score!"
              description="Games that score at least a 100%"
              subtext="Level Up! (or something)"
            />

            {/* All Games */}
            <CategoryTable
              games={userGameData}
              header="All your games!"
              description=""
              subtext=""
            />
          </div>
        </div>
      )}
    </main>
  )
}