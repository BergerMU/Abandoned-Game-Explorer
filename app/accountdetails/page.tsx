"use client"

import { useEffect, useMemo, useState, useRef } from "react"
import { useRouter } from "next/navigation"
import type { Application } from '@splinetool/runtime'
import Spline from '@splinetool/react-spline'

export default function Homepage() {
  // Page Variables
  const router = useRouter()
  const [loadingMessage, setLoadingMessage] = useState("")
  const [privacyError, setPrivacyError] = useState(false)

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

  // Category Table Variables
  const [selectedCategory, setSelectedCategory] = useState(0)
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

  // List of the game categories
  const categories = [
    {
      header: "Recently Played",
      games: userGameData.filter(x => x.played_within_two_weeks),
      description: "Played within the last two weeks",
      subtext: "",
    }, {
      games: userGameData.filter(a => a.playtime_forever === 0),
      header: "Not Played :(",
      description: "Zero hours played",
      subtext: "Why haven't you played this yet? install them at least!",
    }, {
      games: userGameData.filter((a) => a.playtime_forever > 0 && a.playtime_forever < 10),
      header: "Barely Touched",
      description: "Less than 10 minutes of time played",
      subtext: "At least give them a chance!",
    }, {
      games: userGameData.filter((a) => a.score >= 80 && a.score < 100),
      header: "Almost Complete!",
      description: "At least a 80% score",
      subtext: "",
    }, {
      games: userGameData.filter(a => a.score == 100),
      header: "High Score!",
      description: "100% Score!",
      subtext: "Level Up 😎",
    }, {
      games: userGameData,
      header: "All games",
      description: "",
      subtext: "",
    }
  ]

  // BMO Variables
  const splineScene = useRef<any>(null)
  const bmoParent = useRef<any>(null)
  const bmoFace = useRef<any>(null)
  let [emotion, setEmotion] = useState("")
  let [advice, setAdvice] = useState("...")

  // Account Variables
  const [steamid, setSteamid] = useState<string | null>(null)
  const [userSummary, setUserSummary] = useState<any>(null)
  const [accountScore, setAccountScore] = useState(0)
  const [accountCost, setAccountCost] = useState(0)
  const [errorHeader, setErrorHeader] = useState("")
  const [pibbleMode, setPibbleMode] = useState(false)

  function GetRandomInt(max: number) {
    return Math.floor(Math.random() * max)
  }

  function Delay(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

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
    setLoadingMessage("Getting User Games API")
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
      setLoadingMessage("")
      return
    }
    // Unable to fetch account/games in the first place
    if (ownedGames.error) {
      router.push("/")
    }

    // Fetch in depth data from steam spy
    setLoadingMessage("Getting Game Specific Details API (genres, price, global average playtime, etc)")
    const tempDetailedGameData = await fetch('/api/GetSteamSpyData', {
      method: "POST",
      body: JSON.stringify({ gameData: ownedGames })
    })
    type SteamSpyResponse = Record<string, Record<string, any>>
    const steamSpyData = await tempDetailedGameData.json() as SteamSpyResponse
    console.log("Steam Spy Game Data: ", steamSpyData)

    if (Object.values(steamSpyData).some(obj => !Object.keys(obj).length)) {
      setErrorHeader("Some game details were unable to be fetched. Game details, account score, and estimated account cost may be missing/inaccurate.")
    }

    // Fetch owned game covers
    setLoadingMessage("Getting Game Covers API")
    const tempGameCovers = await fetch('/api/GetSteamCovers', {
      method: "POST",
      body: JSON.stringify({ gameData: ownedGames })
    })
    const gameCovers = await tempGameCovers.json()
    console.log("Game Covers: ", gameCovers)

    // Fetch owned games from userID
    setLoadingMessage("Getting User Achievements API")
    const tempUserAchievements = await fetch('/api/GetPlayerAchievements', {
      method: "POST",
      body: JSON.stringify({ id: steamid, gameData: ownedGames })
    })

    const userAchievements = await tempUserAchievements.json()
    console.log("User Achievements: ", userAchievements)

    // Fetch recently played
    setLoadingMessage("Getting Recently Played API")
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
      // setAccountScore(0)
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

  // Selects appropriate face ids and emotions depending on account score
  function GetBMOState() {
    if (accountScore == 0) {
      // Face Object IDs and Emotion Responses
      let possibleEmotions = ["Battery Low... Shutdown"]
      setEmotion(possibleEmotions[GetRandomInt(possibleEmotions.length)])
      return "2ed29224-a9eb-4940-964a-2a2f9f60493e"

    } else if (accountScore > 0 && accountScore < 20) {
      // Face Object IDs and Emotion Responses
      let objectFaceIDs = ["dd05b505-4d37-45e0-94a0-e5f0b7ad3b34", "394fd309-8225-42aa-889a-95247c8a27b9", "f399ad6c-a7ca-4e95-b171-d8cd33ecc0e2", "10a76597-6d84-45cb-948f-58e07e589454"]
      let possibleEmotions = ["I think I am dying. But that's okay, BMO always bounces back!", "BMO is not feeling well..."]

      setEmotion(possibleEmotions[GetRandomInt(possibleEmotions.length)])
      return objectFaceIDs[GetRandomInt(objectFaceIDs.length)]

    } else if (accountScore >= 20 && accountScore < 40) {
      // Face Object IDs and Emotion Responses
      let objectFaceIDs = ["8ff2987c-5b27-4410-9310-ec89579befec", "2b51585c-1cbe-4e0e-95a8-185bcc59a978", "86889eed-6296-442e-928e-591cbbebf297", "6d078ace-c328-46a5-ba94-faf592d2e0a1"]
      let possibleEmotions = ["BMO is not talking to you right now...", "What the flip!", "This is bad biscuts", "Ice King would treat me better than this >:("]

      setEmotion(possibleEmotions[GetRandomInt(possibleEmotions.length)])
      return objectFaceIDs[GetRandomInt(objectFaceIDs.length)]

    } else if (accountScore >= 40 && accountScore < 60) {
      // Face Object IDs and Emotion Responses
      let objectFaceIDs = ["67e91e88-ce6c-4649-933f-946bbd98291c", "db908d00-5319-4628-a063-c2f927dd1a2d"]
      let possibleEmotions = ["What the Stuff!", "Oh my glob", "Adventure Time!"]

      setEmotion(possibleEmotions[GetRandomInt(possibleEmotions.length)])
      return objectFaceIDs[GetRandomInt(objectFaceIDs.length)]

    } else if (accountScore >= 60 && accountScore < 80) {
      // Face Object IDs and Emotion Responses
      let objectFaceIDs = ["bcced30c-eeab-4aaf-866e-b83feb63ae99", "1de9ed4a-f265-46d6-b1d9-7fc4fc809568", "5db03b81-3033-44ac-8f19-afeab808a512", "a83cc717-0a00-47cc-b55c-4b92fc052dc7"]
      let possibleEmotions = ["This does compute!", "This is all Bloobalooby"]

      setEmotion(possibleEmotions[GetRandomInt(possibleEmotions.length)])
      return objectFaceIDs[GetRandomInt(objectFaceIDs.length)]

    } else if (accountScore >= 80 && accountScore < 100) {
      // Face Object IDs and Emotion Responses
      let objectFaceIDs = ["38533fbf-2fca-4b73-9548-bd9e3861648c", "896de8f9-dc00-47ba-b582-f63ccf51798a", "e14a495d-9f06-4383-906e-241ea3e9748c", "f7987e29-296a-493f-a8f4-d341fb66db83"]
      let possibleEmotions = ["Who wants to play video games?"]

      setEmotion(possibleEmotions[GetRandomInt(possibleEmotions.length)])
      return objectFaceIDs[GetRandomInt(objectFaceIDs.length)]

    } else {
      // Face Object IDs and Emotion Responses
      let objectFaceIDs = ["ef65323b-fcca-4e94-93ba-dfe2b4a212ac", "ec904fe9-1f25-4792-897a-720e5a216226", "521893b8-3ffb-4535-92af-14cecd87e7ef"]
      let possibleEmotions = ["BMO is Mathematical", "Algebraic", "Check Please!"]

      setEmotion(possibleEmotions[GetRandomInt(possibleEmotions.length)])
      return objectFaceIDs[GetRandomInt(objectFaceIDs.length)]
    }
  }

  function LoadBMO(spline: Application) {
    // Set global spline scene, bmo object, and face object
    splineScene.current = spline
    bmoParent.current = spline.findObjectByName("BMO_Parent")
    bmoFace.current = spline.findObjectById(GetBMOState())

    if (bmoFace.current) {
      bmoFace.current.position.z += 600
    }
  }

  function ClickBMO(e: any) {
    if (e.target.name === "BMO_Parent") {
      // Reset current face and pick new random face
      bmoFace.current.position.z -= 600
      bmoFace.current = splineScene.current.findObjectById(GetBMOState())

      if (!bmoFace.current) return
      bmoFace.current.position.z += 600

      let possibleAdvice = ["Check game guides to get the most out of your games", "Try sorting your games in each category", "I'll get happier the higher your account score is!"]
      setAdvice(possibleAdvice[GetRandomInt(possibleAdvice.length)])
    }
  }

  // Place BMO back to origin
  function ResetBMO() {
    bmoParent.current.position.x = 0
    bmoParent.current.position.y = 50
    bmoParent.current.position.z = 0
  }

  // Ask BMO for a random game
  function GetRandomGame() {
    setAdvice("Computing...")

    setTimeout(() => {
      setAdvice("BMO is thinking... really hard")
      setTimeout(() => {
        let randomGame = userGameData[GetRandomInt(userGameData.length)].name
        setAdvice(`BMO thinks you should play ${randomGame} for at least 15 minutes!`)
      }, 1500)
    }, 1000)
  }

  // Takes in array of user games and sorts them based on categories
  function UseSortableData<T extends Record<string, any>>(
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
    const { items, requestSort, sortConfig } = UseSortableData(games, {
      key: "global_median_playtime",
      direction: "descending"
    })

    // Search variables for each category
    const [searchGames, setSearchGames] = useState('')

    return (
      <div className='flex flex-col p-3 bg-radial-[at_50%_50%] from-gray-800 to-gray-900 rounded-xl'>
        <div className="flex flex-col md:flex-row justify-between items-start gap-3">
          <div className='flex flex-col gap-2 max-w-120 min-w-min'>
            <b className='text-3xl'>{header}</b>
            <p className="text-2xl">{description}</p>
            <p>{subtext}</p>
          </div>

          <div className="flex flex-col md:flex-row gap-3">
            <div className="flex flex-col space-y-2">
              <b>Categories</b>
              <div className="space-x-2 space-y-2">
                <button type="button"
                  onClick={() => requestSort('score')}
                  className="cursor-pointer bg-slate-700 p-1 rounded-xl">
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
                  className="cursor-pointer bg-slate-700 p-1 rounded-xl">
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
                  className="cursor-pointer bg-slate-700 p-1 rounded-xl">
                  {sortConfig?.key === 'global_median_playtime' ? sortConfig?.direction === "descending" ? (
                    <p>Global Avg. Playtime ▼</p>
                  ) : (
                    <p>Global Avg. Playtime ▲</p>
                  ) : (
                    <p>Global Avg. Playtime</p>
                  )}
                </button>

                <button type="button"
                  onClick={() => requestSort('percent_of_achievements')}
                  className="cursor-pointer bg-slate-700 p-1 rounded-xl">
                  {sortConfig?.key === 'percent_of_achievements' ? sortConfig?.direction === "descending" ? (
                    <p>Achievements Unlocked ▼</p>
                  ) : (
                    <p>Achievements Unlocked ▲</p>
                  ) : (
                    <p>Achievements Unlocked</p>
                  )}
                </button>
              </div>
            </div>

            <div className="flex flex-col sm:text-left md:text-right">
              <input type="text" className='w-60 p-3 h-10 outline-1 outline-black rounded-xl bg-sky-950' placeholder="Search for your games" onChange={e => setSearchGames(e.target.value)} value={searchGames} />
              <p className='text-2xl'>{items.filter(g => g.name.toLowerCase().includes(searchGames.toLowerCase())).length} Games</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-6 h-150 overflow-y-auto gap-y-14 gap-x-5 p-3">
          {items.length > 0 ? items.filter(g => g.name.toLowerCase().includes(searchGames.toLowerCase())).map((game) => (
            <div className="flex flex-col h-full" key={game.appid}>

              {/* Title */}
              <b className="min-h-13 line-clamp-2">{game.name}</b>

              {/* Covers*/}
              {game.game_cover != "No Cover" ? (
                <div className="flex relative aspect-2/3 md:m-4 overflow-hidden  justify-center rounded-xl hover:shadow-[0_0_20px_rgba(114,193,255,0.7)] transition duration-200 hover:scale-110">
                  <img className="absolute inset-0 blur-sm bg-repeat h-full bg-center z-10 rounded-xl" src={game.game_cover} />
                  <img className="relative z-10 object-contain rounded-xl align-middle" src={game.game_cover} />
                </div>
              ) : (
                <div className='relative aspect-2/3 md:m-4 bg-linear-to-tl from-slate-800 to-slate-700 rounded-xl overflow-hidden shadow-lg hover:shadow-[0_0_20px_rgba(114,193,255,0.7)] transition duration-200 hover:scale-105'>
                  <div className='absolute font-bold inset-[-100] rotate-345 bg-repeat-x text-slate-600 cursor-default'>
                    {Array(200).fill(game.name + " ")}
                  </div>
                </div>
              )}

              {/* Buttons */}
              <div className="flex flex-row justify-between text-center gap-2 m-0.5">
                <a className="p-1.5 bg-slate-700 text-sm rounded-xl cursor-pointer hover:shadow-[0_0_20px_rgba(114,193,255,0.7)] transition duration-200 hover:scale-110" target="blank_" href={`https://store.steampowered.com/app/${game.appid}/`}>Visit Store</a>
                <a className="p-1.5 bg-slate-700 text-sm rounded-xl cursor-pointer hover:shadow-[0_0_20px_rgba(114,193,255,0.7)] transition duration-200 hover:scale-110" target="blank_" href={`https://steamcommunity.com/app/${game.appid}/guides`}>Visit Guides</a>
              </div>

              {/* Game Stats */}
              <div className="space-y-1">
                {/* Total Score/Progress Bar */}
                <div className="group relative inline-block cursor-pointer w-full space-y-1">
                  {game.score != -1 ? (
                    <p className="p-0.5">Total Score: {game.score}</p>
                  ) : (
                    <p className="bg-red-500 rounded-xl p-0.5">Total Score: Unavailable</p>
                  )}
                  <progress max="100" value={game.score} className='flex w-full'>{game.score}</progress>
                  <div className="invisible absolute shadow-xs bg-slate-700 rounded-xl group-hover:visible group-hover:delay-500 p-1.5">
                    <div>
                      <b>Scoring</b>
                      <p>Get a 100% score by playing more than an average player and getting all achievements</p>
                    </div>
                  </div>
                </div>

                {/* Hours Played */}
                {game.playtime_forever / 60 < 1 ? (
                  <div>
                    <b>Hours Played</b>
                    <p>{game.playtime_forever} minutes</p>
                  </div>
                ) : (
                  <div>
                    <b>Hours Played</b>
                    <p>{Math.floor(game.playtime_forever / 60)} hours and {game.playtime_forever % 60} minutes</p>
                  </div>
                )}

                {/* Global Median Playtime */}
                {game.global_median_playtime != -1 ? (game.global_median_playtime / 60 < 1 ? (
                  <div>
                    <b>Global Avg Playtime</b>
                    <p>{game.global_median_playtime % 60} minutes </p>
                  </div>
                ) : (
                  <div>
                    <b>Global Avg Playtime</b>
                    <p>{Math.floor(game.global_median_playtime / 60)} hours and {game.global_median_playtime % 60} minutes</p>
                  </div>
                )) : (
                  <div>
                    <b>Global Avg Playtime</b>
                    <p>Unavailable</p>
                  </div>
                )}

                {/* Achievements */}
                {game.total_achievements ? (
                  <div>
                    <b>Achievements</b>
                    <p>{game.percent_of_achievements}% Unlocked</p>
                  </div>
                ) : (
                  <div>
                    <b>Achievements</b>
                    <p>Game has no achievements</p>
                  </div>
                )}
              </div>
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

    setLoadingMessage("Getting User Data")
    await GetUserDetails(steamid)

    // Get steam games and check if null
    const result = await FetchSteamGames(steamid)
    if (!result) {
      return
    }

    // Concat data
    setLoadingMessage("Interpreting Data")
    const { ownedGames, userAchievements, steamSpyData, recentlyPlayed, gameCovers } = result
    await CombineGameData(ownedGames, userAchievements, steamSpyData, recentlyPlayed, gameCovers)

    let tempGameSum = 0

    for (const obj of Object.values(steamSpyData)) {
      if (obj.price != null) {
        tempGameSum += Number(obj.price)
      }
    }
    setAccountCost(tempGameSum / 100)

    setLoadingMessage("")
  }

  // Get steamid from url
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    setSteamid(params.get("steamid"))

    if (params.get("pibble")) {
      setPibbleMode(true)
    }
  }, [])

  // Fetch user data on page load
  useEffect(() => {
    FetchAllData()
  }, [steamid])

  return (
    <main className="flex flex-col p-2 md:p-8 items-center">
      {/* Loading user account info */}
      {loadingMessage ? (
        <div className='flex flex-col space-y-3 items-center'>
          <p className='text-2xl'>{loadingMessage}</p>
          <div className="h-6 w-6 animate-spin rounded-full border-b-2 border-current" />
        </div>
        // Loading Game info
      ) : privacyError ? (
        <div className="bg-radial-[at_50%_50%] from-gray-800 to-gray-900 p-3 w-full space-y-5 rounded-xl">
          <p className="text-2xl">Your account data was unable to be viewed</p>
          <p>From your Steam Profile click the Edit Profile link. Click the "Privacy Settings tab"</p>
          <p>• Make sure "My basic details" is "Public"</p>
          <p>• Make sure "My profile" is "Public"</p>
          <p>• Make sure "Game details" is "Public"</p>
          <p>• Make sure "Always keep my total playtime private even if users can see my game details" is unchecked</p>
        </div>
      ) : userSummary ? (
        <div className="space-y-3 w-full">
          {/* Header User Section */}
          {errorHeader && (
            <div className="bg-red-600 p-3 w-fit rounded-xl">
              <p>{errorHeader}</p>
            </div>
          )}
          <div>
            {/* User Header */}
            <div className='flex flex-col md:flex-row gap-4 p-3 justify-between'>
              {/* Username and profile picture */}
              <div className="flex flex-col">
                <p className="text-4xl mb-2">{userSummary.personaname}</p>
                {pibbleMode ? (
                  <img className="rounded-xl m-2 w-44 h-auto hover:shadow-[0_0_20px_rgba(114,193,255,0.7)] transition duration-200 hover:scale-110" src={"/assets/pibble.png"} />
                ) : (
                  <img className="rounded-xl m-2 w-44 h-auto hover:shadow-[0_0_20px_rgba(114,193,255,0.7)] transition duration-200 hover:scale-110" src={userSummary.avatarfull} />
                )}
              </div>

              {/* Account description */}
              <div className="flex flex-col space-y-2 w-full md:w-3/5">
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
                <p>Total Games: {userGameData.length}</p>
                <div>
                  <p>Estimated Account Cost: ${accountCost.toLocaleString("en-US")}</p>
                  <p>Average Cost Per Game: ${(accountCost / userGameData.length).toFixed(2)}</p>
                </div>
                <p>Note: This estimate does not factor in discounts or microstransactions</p>
              </div>

              {/* BMO */}
              <div className="rounded-xl w-full h-96 md:w-3xl md:h-96 flex flex-col items-center">
                <div className="bg-zinc-800 rounded-xl p-2 space-y-2 w-full">
                  <div>{emotion}</div>
                  <div>
                    {accountScore != 100 ? (
                      <p>Get your account score up to {Math.floor(accountScore / 5) * 5 + 5}!</p>
                    ) : (
                      <p className="text-sm">Congrats on your 100% BMO is very proud!</p>
                    )}
                  </div>
                  <div>{advice}</div>
                  <div className="flex flex-row justify-between">
                    <button onClick={GetRandomGame} className="text-sm w-fit p-1 rounded-xl bg-sky-950 cursor-pointer">Ask BMO for a random game</button>
                    <button onClick={ResetBMO} className="text-sm w-fit p-1 rounded-xl bg-sky-950 cursor-pointer">Reset Position</button>
                  </div>
                </div>
                <div className="w-min text-zinc-800 text-6xl relative -top-3 -mb-15 cursor-default">▼</div>
                <Spline className="w-full flex-1" scene="https://draft.spline.design/tG6gZQCWPWFBMyyy/scene.splinecode" onLoad={LoadBMO} onSplineMouseDown={ClickBMO} />
              </div>
            </div>
          </div>

          <div className="flex flex-row justify-between">
            <b>Get a 100% score by playing more than an average player and getting all achievements</b>
            <button className='p-2 rounded-xl bg-sky-950 text-gray-200 cursor-pointer hover:shadow-[0_0_20px_rgba(114,193,255,0.7)] transition duration-200 hover:scale-110' onClick={FetchAllData}>Refresh Account Data</button>
          </div>

          {/* Category Headers */}
          <div className="grid grid-cols-2 md:grid-cols-6 justify-items-center gap-y-2">
            {categories.map((category, index) => (
              <button key={category.header} onClick={() => setSelectedCategory(index)} className="bg-sky-950 p-2 rounded-xl w-28 cursor-pointer hover:shadow-[0_0_20px_rgba(114,193,255,0.7)] transition duration-200 hover:scale-110">{category.header}</button>
            ))}
          </div>

          {/* Category data */}
          <div>
            <CategoryTable {...categories[selectedCategory]} />
          </div>
        </div>
      ) : null}
    </main>
  )
}