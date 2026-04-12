"use client"

import { useEffect, useMemo, useState, useRef, memo } from "react"
import { useRouter } from "next/navigation"
import type { Application } from '@splinetool/runtime'
import Spline from '@splinetool/react-spline'
import Video from 'next-video'
import video_walkthrough from "../../videos/abandoned_games_walkthrough.mp4"

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

  const [allGameData, setAllGameData] = useState<Game[]>([])
  const recentlyPlayedGameData = allGameData.filter(game => game.played_within_two_weeks)
  const notPlayedGameData = allGameData.filter(game => game.playtime_forever === 0)
  const barelyTouchedGameData = allGameData.filter(game => game.playtime_forever > 0 && game.playtime_forever <= 30)
  const almostCompleteGameData = allGameData.filter(game => game.score >= 80 && game.score < 100)
  const highScoreGameData = allGameData.filter(game => game.score == 100)

  // Category Table Variables
  const [selectedCategory, setSelectedCategory] = useState(0)
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
      games: recentlyPlayedGameData,
      description: "Played within the last two weeks",
      subtext: "",
    }, {
      games: notPlayedGameData,
      header: "Not Played :(",
      description: "Zero time played",
      subtext: "Why haven't you played this yet? install them at least!",
    }, {
      games: barelyTouchedGameData,
      header: "Barely Touched",
      description: "Time played is less than 30 minutes",
      subtext: "Pick them up again!",
    }, {
      games: almostCompleteGameData,
      header: "Almost Complete!",
      description: "At least a 80% score",
      subtext: "",
    }, {
      games: highScoreGameData,
      header: "High Score!",
      description: "100% Score!",
      subtext: "Level Up 😎",
    }, {
      games: allGameData,
      header: "All games",
      description: "",
      subtext: "",
    }
  ]

  // BMO Variables
  const splineScene = useRef<any>(null)
  const bmoParent = useRef<any>(null)
  const bmoFace = useRef<any>(null)
  const canInteract = useRef(true)
  let [emotion, setEmotion] = useState("")
  let [bmoMessage, setBmoMessage] = useState("Ask me a question")
  let bmoLoadingMessage = ["loading...", "BMO is running the calculations...", "Computing...", "BMO is thinking... really hard!"]
  let bmoFaceIDs = {
    dead: "2ed29224-a9eb-4940-964a-2a2f9f60493e",
    sad_1: "67e91e88-ce6c-4649-933f-946bbd98291c",
    sad_2: "dd05b505-4d37-45e0-94a0-e5f0b7ad3b34",
    sad_3: "394fd309-8225-42aa-889a-95247c8a27b9",
    sad_4: "f399ad6c-a7ca-4e95-b171-d8cd33ecc0e2",
    sad_5: "10a76597-6d84-45cb-948f-58e07e589454",
    mild: "8ff2987c-5b27-4410-9310-ec89579befec",
    upset_1: "86889eed-6296-442e-928e-591cbbebf297",
    upset_2: "2b51585c-1cbe-4e0e-95a8-185bcc59a978",
    suspicious_1: "6d078ace-c328-46a5-ba94-faf592d2e0a1",
    suspicious_2: "a83cc717-0a00-47cc-b55c-4b92fc052dc7",
    tired: "db908d00-5319-4628-a063-c2f927dd1a2d",
    blush_1: "bcced30c-eeab-4aaf-866e-b83feb63ae99",
    blush_2: "38533fbf-2fca-4b73-9548-bd9e3861648c",
    tongue_out: "1de9ed4a-f265-46d6-b1d9-7fc4fc809568",
    happy_1: "5db03b81-3033-44ac-8f19-afeab808a512",
    happy_2: "896de8f9-dc00-47ba-b582-f63ccf51798a",
    happy_3: "74eb4c67-7c5e-4dd5-aaf7-0f44b0b58f26",
    happy_4: "e14a495d-9f06-4383-906e-241ea3e9748c",
    happy_5: "4cf4e6ad-e7e3-4f7e-a4c2-30c3ce87d762",
    heart_eyes: "ef65323b-fcca-4e94-93ba-dfe2b4a212ac",
    star_eyes_1: "ec904fe9-1f25-4792-897a-720e5a216226",
    star_eyes_2: "521893b8-3ffb-4535-92af-14cecd87e7ef",
    dizzy: "33a101a3-bd46-4433-9e0f-546095c92062",
    flushed: "9e1bde7a-2e3b-40bd-9cc0-0f72226fc643",
  }

  // Account Variables
  const [steamid, setSteamid] = useState<string | null>(null)
  const [userSummary, setUserSummary] = useState<any>(null)
  const [accountScore, setAccountScore] = useState(0)
  const [accountCost, setAccountCost] = useState(0)
  const [errorHeader, setErrorHeader] = useState(false)
  const [pibbleMode, setPibbleMode] = useState(false)
  const [totalErroredGames, setTotalErroredGames] = useState(0)

  // Returns random object in array
  function GetRandom(items: any[]) {
    return items[Math.floor(Math.random() * items.length)]
  }

  // Returns appropriate color for progress bars
  function GetProgressColor(score: number) {
    if (score < 10) return "#FF0000FF"
    if (score < 20) return "#F03C03FF"
    if (score < 30) return "#E94A04FF"
    if (score < 40) return "#E15505FF"
    if (score < 50) return "#CF6708FF"
    if (score < 60) return "#BC760BFF"
    if (score < 70) return "#A5830DFF"
    if (score < 80) return "#98890EFF"
    if (score < 90) return "#898E0FFF"
    if (score < 100) return "#639911FF"
    else return "#00C217FF"
  }

  // Calculate a score of how much a user has completed their game
  function CalculateGameScore(userPlaytime: number, globalPlaytime: number, totalAchievements: number, unlockedAchievements: number) {
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
    setLoadingMessage("Getting Games")
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
    setLoadingMessage("Getting Game Specific Details (genres, price, global average playtime, etc)")
    const tempDetailedGameData = await fetch('/api/GetSteamSpyData', {
      method: "POST",
      body: JSON.stringify({ gameData: ownedGames })
    })
    type SteamSpyResponse = Record<string, Record<string, any>>
    const steamSpyData = await tempDetailedGameData.json() as SteamSpyResponse
    console.log("Steam Spy Game Data: ", steamSpyData)

    if (Object.values(steamSpyData).some(obj => !Object.keys(obj).length)) {
      setErrorHeader(true)
    }

    // Fetch owned game covers
    setLoadingMessage("Getting Game Covers")
    const tempGameCovers = await fetch('/api/GetSteamCovers', {
      method: "POST",
      body: JSON.stringify({ gameData: ownedGames })
    })
    const gameCovers = await tempGameCovers.json()
    console.log("Game Covers: ", gameCovers)

    // Fetch owned games from userID
    setLoadingMessage("Getting User Achievements")
    const tempUserAchievements = await fetch('/api/GetPlayerAchievements', {
      method: "POST",
      body: JSON.stringify({ id: steamid, gameData: ownedGames })
    })

    const userAchievements = await tempUserAchievements.json()
    console.log("User Achievements: ", userAchievements)

    // Fetch recently played
    setLoadingMessage("Getting Recently Played Games")
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
      const score = CalculateGameScore(
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
    setAllGameData(combinedData)
    console.log("Combined Game Data: ", combinedData)

    let tempAccountScore = 0
    let totalValidGames = 0
    let erroredGames = 0

    for (const obj of combinedData) {
      // Account Score = Average Game Score
      if (obj.global_median_playtime != -1) {
        tempAccountScore += obj.score
        totalValidGames += 1
      }

      // Count errored games
      if (obj.score == -1) {
        erroredGames += 1
      }
    }

    setTotalErroredGames(erroredGames)

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

  // Selects appropriate face ids and emotions depending on account score
  function GetBmoState() {
    if (accountScore == 0) {
      // Face Object IDs and Emotion Responses
      let possibleEmotions = ["Battery Low... Shutdown"]
      setEmotion(GetRandom(possibleEmotions))
      return bmoFaceIDs.dead

    } else if (accountScore > 0 && accountScore < 20) {
      // Face Object IDs and Emotion Responses
      let objectFaceIDs = [bmoFaceIDs.sad_2, bmoFaceIDs.sad_3, bmoFaceIDs.sad_4, bmoFaceIDs.sad_5]
      let possibleEmotions = ["I think I am dying. But that's okay, BMO always bounces back!", "BMO is not feeling well..."]

      setEmotion(GetRandom(possibleEmotions))
      return GetRandom(objectFaceIDs)

    } else if (accountScore >= 20 && accountScore < 40) {
      // Face Object IDs and Emotion Responses
      let objectFaceIDs = [bmoFaceIDs.upset_1, bmoFaceIDs.upset_2, bmoFaceIDs.suspicious_1]
      let possibleEmotions = ["I am not talking to you right now...", "What the flip!", "This is bad biscuts", "Ice King would treat me better than this >:("]

      setEmotion(GetRandom(possibleEmotions))
      return GetRandom(objectFaceIDs)

    } else if (accountScore >= 40 && accountScore < 60) {
      // Face Object IDs and Emotion Responses
      let objectFaceIDs = [bmoFaceIDs.mild, bmoFaceIDs.sad_1, bmoFaceIDs.tired]
      let possibleEmotions = ["What the Stuff!", "Oh my glob", "Adventure Time!"]

      setEmotion(GetRandom(possibleEmotions))
      return GetRandom(objectFaceIDs)

    } else if (accountScore >= 60 && accountScore < 80) {
      // Face Object IDs and Emotion Responses
      let objectFaceIDs = [bmoFaceIDs.blush_1, bmoFaceIDs.tongue_out, bmoFaceIDs.happy_1, bmoFaceIDs.suspicious_2]
      let possibleEmotions = ["This does compute!", "This is all Bloobalooby"]

      setEmotion(GetRandom(possibleEmotions))
      return GetRandom(objectFaceIDs)

    } else if (accountScore >= 80 && accountScore < 100) {
      // Face Object IDs and Emotion Responses
      let objectFaceIDs = [bmoFaceIDs.blush_2, bmoFaceIDs.happy_2, bmoFaceIDs.happy_4]
      let possibleEmotions = ["Who wants to play video games?"]

      setEmotion(GetRandom(possibleEmotions))
      return GetRandom(objectFaceIDs)

    } else {
      // Face Object IDs and Emotion Responses
      let objectFaceIDs = [bmoFaceIDs.heart_eyes, bmoFaceIDs.star_eyes_1, bmoFaceIDs.star_eyes_2]
      let possibleEmotions = ["This is Mathematical", "Algebraic", "Check Please!"]

      setEmotion(GetRandom(possibleEmotions))
      return GetRandom(objectFaceIDs)
    }
  }

  // Reset current face and show new one
  function SetBmoFace(newFace: string) {
    if (!splineScene.current) return

    if (bmoFace.current) {
      bmoFace.current.position.z -= 600
    }

    bmoFace.current = splineScene.current.findObjectById(newFace)

    if (!bmoFace.current) return
    bmoFace.current.position.z += 600
  }

  // Set global spline scene, bmo object, and face object
  function LoadBmo(spline: Application) {
    splineScene.current = spline
    bmoParent.current = spline.findObjectByName("BMO_Parent")
    SetBmoFace(GetBmoState())
  }

  // Randomly change bmo face and advice
  function ClickBmo(e: any) {
    if (e.target.name === "BMO_Parent" && canInteract.current) {
      SetBmoFace(GetBmoState())
    }
  }

  // Place BMO back to origin
  function ResetBmo() {
    bmoParent.current.position.x = 0
    bmoParent.current.position.y = 50
    bmoParent.current.position.z = 0
  }

  // Ask BMO for a random unplayed game
  function GetRandomGame() {
    if (canInteract.current) {
      canInteract.current = false
      SetBmoFace(bmoFaceIDs.happy_3)
      setBmoMessage(GetRandom(bmoLoadingMessage))
      setTimeout(() => {
        let message = ""
        let randomGame = GetRandom(allGameData)
        let randomTime = GetRandom(["", " for 15 minutes", " for 30 minutes"])

        message += `You should play ${randomGame.name}${randomTime}.`

        // Unplayed
        if (randomGame.playtime_forever == 0) {
          message += " Maybe you'll discover something new with this one!"
        } else {
          // Recently Played
          if (randomGame.played_within_two_weeks) {
            message += " Keep your playing streak alive!"
          }

          // 100% Score
          if (randomGame.score == 100) {
            message += " See if you can get even more value out of it"
          }

          // Game almost complete
          else if (randomGame.score >= 80) {
            // Collected almost all achievements
            if (randomGame.percent_of_achievements >= 80 && randomGame.percent_of_achievements < 100) {
              message += " Try to get those last few achievements."

              // Game playtime almost more than global average
            } else if (randomGame.playtime_forever > (randomGame.global_median_playtime / .8) && randomGame.playtime_forever < randomGame.global_median_playtime) {
              message += " You're close to playing more than the average player."
            }
          }
        }

        // Change BMO's face and message
        SetBmoFace(GetRandom([bmoFaceIDs.blush_1, bmoFaceIDs.blush_2, bmoFaceIDs.tongue_out, bmoFaceIDs.happy_2, bmoFaceIDs.happy_4, bmoFaceIDs.happy_5, bmoFaceIDs.heart_eyes]))
        setBmoMessage(message)
        canInteract.current = true
      }, 1000)
    }
  }

  // Ask BMO for a random challenge
  function GetRandomChallenge() {
    if (canInteract.current) {
      canInteract.current = false
      SetBmoFace(bmoFaceIDs.happy_3)
      setBmoMessage(GetRandom(bmoLoadingMessage))

      setTimeout(() => {
        setBmoMessage(GetRandom(bmoLoadingMessage))
        setTimeout(() => {
          let challenges = ["Play 3 different games today", "Unlock 1 achievement in any game", "Play a game outside of your usual genre", "Play a challenging game", "Play a game a friend (or someone online) has recomended", "Get a game from your wishlist", "Play a game from the Free To Play category on Steam", "Play an old favorite"]

          // challenge user to up their account score to the next multiple of 5 interval
          if (accountScore != 100) {
            challenges.push(`I challenge you to get your account score up to ${Math.floor(accountScore / 5) * 5 + 5}!`)
          }

          // Up a specific game score
          if (allGameData.filter(game => game.score < 100).length > 0) {
            let randomGame = GetRandom(allGameData.filter(game => game.score < 100))
            challenges.push(`Try to get the score for ${randomGame.name} up to ${Math.floor(randomGame.score / 5) * 5 + 5}`)
          }

          // play a game from the not played category
          if (notPlayedGameData.length > 0) {
            challenges.push(`Play something you've never played beore`)
          }

          // play a game from the barely touched category
          if (barelyTouchedGameData.length > 0) {
            challenges.push(`Play a game from you've barely touched`)
          }

          // play a game that is almost complete
          if (almostCompleteGameData.length > 0) {
            // let randomGame = GetRandom(almostCompleteGameData)
            challenges.push(`Finish a game from the Almost Complete category`)
          }

          // Change BMO's face and message
          SetBmoFace(GetRandom([bmoFaceIDs.blush_1, bmoFaceIDs.blush_2, bmoFaceIDs.tongue_out, bmoFaceIDs.happy_2, bmoFaceIDs.happy_4, bmoFaceIDs.happy_5, bmoFaceIDs.heart_eyes]))
          setBmoMessage(GetRandom(challenges))
          canInteract.current = true
        }, 1000)
      }, 800)
    }
  }

  // Ask BMO for the meaning of life
  function AskMeaningOfLife() {
    if (canInteract) {
      canInteract.current = false

      // Change BMO's face and message
      SetBmoFace(bmoFaceIDs.happy_3)
      setBmoMessage("Computing... Computing... Computing...")

      setTimeout(() => {
        // Change BMO's face and message
        SetBmoFace(bmoFaceIDs.dizzy)
        setBmoMessage("Dividing by zero...")

        setTimeout(() => {
          // Change BMO's face and message
          SetBmoFace(bmoFaceIDs.flushed)
          setBmoMessage("Error! Error!")

          setTimeout(() => {
            // Change BMO's face and message
            SetBmoFace(bmoFaceIDs.dead)
            setBmoMessage("Can't compute... Power down")
            canInteract.current = true
          }, 2500)
        }, 2500)
      }, 2500)
    }
  }

  type SortConfig<T> = {
    key: keyof T
    direction: 'ascending' | 'descending'
  } | null

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

  // Layout for each category
  const CategoryTable = memo(({ header, subtext, description, games }: Category) => {
    const { items, requestSort, sortConfig } = UseSortableData(games, {
      key: "global_median_playtime",
      direction: "descending"
    })

    // Search variables for each category
    const [searchGames, setSearchGames] = useState('')

    return (
      <div className='flex flex-col w-full p-3 bg-radial-[at_50%_50%] from-gray-800 to-gray-900 rounded-xl'>
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
                    <p>Time Played ▼</p>
                  ) : (
                    <p>Time Played ▲</p>
                  ) : (
                    <p>Time Played</p>
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
              <p className='text-2xl'>{items.filter(game => game.name.toLowerCase().includes(searchGames.toLowerCase())).length} Games</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-6 h-150 overflow-y-auto gap-y-14 gap-x-5 p-3">
          {items.length > 0 ? items.filter(game => game.name.toLowerCase().includes(searchGames.toLowerCase())).map((game) => (
            <div className="flex flex-col h-full" key={game.appid}>

              {/* Title */}
              {game.score != -1 ? (
                <b className="min-h-13 line-clamp-2">{game.name}</b>
              ) : (
                <b className="bg-red-500 rounded-xl p-0.5 min-h-13 line-clamp-2">{game.name}</b>
              )}

              {/* Covers*/}
              {game.game_cover != "No Cover" ? (
                <div className="flex relative aspect-2/3 md:m-4 overflow-hidden  justify-center rounded-xl hover:shadow-[0_0_20px_rgba(114,193,255,0.7)] transition duration-200 hover:scale-110">
                  <img className="absolute inset-0 blur-sm bg-repeat h-full bg-center rounded-xl" src={game.game_cover} />
                  <img className="relative object-contain rounded-xl align-middle" src={game.game_cover} />
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
                  <div className="w-full bg-gray-700 rounded-full h-4 overflow-hidden">
                    <div className="h-full rounded-full transition-all duration-300" style={{width: `${game.score}%`, backgroundColor: GetProgressColor(game.score)}}/>
                  </div>
                  <div className="invisible absolute shadow-xs bg-slate-700 rounded-xl group-hover:visible group-hover:delay-500 p-1.5">
                    <div>
                      <b>Scoring</b>
                      <p>Get a 100% score by playing more than an average player and getting all achievements</p>
                    </div>
                  </div>
                </div>

                {/* Time Played */}
                {game.playtime_forever / 60 < 1 ? (
                  <div>
                    <b>Time Played</b>
                    <p>{game.playtime_forever} minutes</p>
                  </div>
                ) : (
                  <div>
                    <b>Time Played</b>
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
  })

  // Run all apis for user info and game data
  const FetchAllData = async () => {
    if (!steamid) {
      return
    }

    setLoadingMessage("Getting User Details")
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
      if (obj.initialprice != null) {
        tempGameSum += Number(obj.initialprice)
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
    <main className="flex flex-col p-2 md:p-8">
      {loadingMessage ? (
        // Loading user account info
        <div className='flex flex-col space-y-3 items-center'>
          <p className='text-2xl'>{loadingMessage}</p>
          <div className="h-6 w-6 animate-spin rounded-full border-b-2 border-current" />
        </div>

      ) : privacyError ? (
        // Error getting access to user account
        <div className="flex flex-col w-full items-center">
          <div className="bg-radial-[at_50%_50%] from-gray-800 to-gray-900 p-3 w-full space-y-3 rounded-xl">
            {/* Error Instructions */}
            <p className="text-2xl">Your account data was unable to be viewed</p>
            <p>View your Steam profile and click the "Edit Profile" button. Click the "Privacy Settings tab"</p>
            <p>• Make sure "My basic details" is "Public"</p>
            <p>• Make sure "My profile" is "Public"</p>
            <p>• Make sure "Game details" is "Public"</p>
            <p>• Make sure "Always keep my total playtime private even if users can see my game details" is unchecked</p>
          </div>

          {/* Walkthrough Video */}
          <p className='text-2xl'>Watch a Walkthrough</p>
          <Video src={video_walkthrough} style={{ maxWidth: "38rem" }} minResolution="720p" poster="assets/Abandoned Games Walkthrough Thumbnail.png" />
        </div>
      ) : userSummary ? (
        <div className="space-y-3 w-full flex flex-col justify-center items-center">
          {errorHeader && (
            // Error header from Steam Spy API
            <p className="bg-red-600 p-3 w-fit rounded-xl">
              {totalErroredGames} game's specific details couldn't be gotten. Game details, account score, and estimated account cost may be missing/inaccurate.</p>
          )}

          {/* User Info and BMO */}
          <div className='flex flex-col w-full md:flex-row gap-4 p-3 justify-between'>
            {/* Account description */}
            <div className="flex flex-col md:flex-row w-full gap-5">
              {/* Username and profile picture */}
              <div className="flex flex-col w-64">
                <p className="text-2xl md:text-4xl mb-2 wrap-anywhere">{userSummary.personaname}</p>
                {pibbleMode ? (
                  <img className="rounded-xl w-full h-auto hover:shadow-[0_0_20px_rgba(114,193,255,0.7)] transition duration-200 hover:scale-110" src={"/assets/pibble.png"} />
                ) : (
                  <img className="rounded-xl w-full h-auto hover:shadow-[0_0_20px_rgba(114,193,255,0.7)] transition duration-200 hover:scale-110" src={userSummary.avatarfull} />
                )}
              </div>

              {/* Account score, User online, creation date, total games, average cost */}
              <div className="flex flex-col space-y-2 w-full md:w-3/5">
                <div className="group relative inline-block cursor-pointer w-full md:w-50">
                  <p className='text-2xl'>Account Score: {accountScore}</p>
                  <div className="w-full bg-gray-700 rounded-full h-4 overflow-hidden">
                    <div className="h-full rounded-full transition-all duration-300" style={{width: `${accountScore}%`, backgroundColor: GetProgressColor(accountScore)}}/>
                  </div>
                  <div className="invisible absolute shadow-xs bg-slate-700 rounded-xl group-hover:visible group-hover:delay-500 p-3">
                    <div>
                      <b>Account Scoring</b>
                      <p>Your Account Score is the average score accross all of your games</p>
                    </div>
                  </div>
                </div>


                {userSummary.personastate == 0 || userSummary.personastate == 2 || userSummary.personastate == 3 || userSummary.personastate == 4 ? (
                  <p className="bg-red-500 w-min p-1 rounded-xl">Offline</p>
                ) : (
                  <p className="bg-green-700 w-min p-1 rounded-xl">Online</p>
                )}
                <p>Account Created On: {new Date(userSummary.timecreated * 1000).toLocaleDateString("en-US")}</p>
                <p>Total Games: {allGameData.length}</p>
                <div>
                  <p>Estimated Account Cost: ${accountCost.toLocaleString("en-US")}</p>
                  <p>Average Cost Per Game: ${(accountCost / allGameData.length).toFixed(2)}</p>
                </div>
                <p>Note: This estimate does not factor in discounts or microstransactions</p>
              </div>
            </div>

            {/* BMO */}
            <div className="rounded-xl w-full h-96 md:w-3xl md:h-96 flex flex-col items-center">
              <div className="bg-zinc-800 rounded-xl p-2 space-y-2 w-full z-10">
                <div className="flex flex-row justify-between">
                  {emotion}
                  <button onClick={ResetBmo} className="text-sm w-fit h-fit p-1 rounded-xl bg-sky-950 cursor-pointer">Reset Position</button>
                </div>
                <div>{bmoMessage}</div>

                {/* Interaction Buttons (displays if there is more than 1 game in library) */}
                <div className="flex flex-col w-full">
                  <b>Ask BMO</b>
                  {allGameData.length > 1 && (
                    <div className="flex w-full justify-between gap-1">
                      {/* Ask BMO for random game */}
                      <button onClick={GetRandomGame} className="text-sm w-fit h-fit p-1 rounded-xl bg-sky-950 cursor-pointer">Get a random game</button>
                      <button onClick={GetRandomChallenge} className="text-sm w-fit h-fit p-1 rounded-xl bg-sky-950 cursor-pointer">Ask for a challenge</button>
                      <button onClick={AskMeaningOfLife} className="text-sm w-fit h-fit p-1 rounded-xl bg-sky-950 cursor-pointer">Ask for the meaning of life</button>
                    </div>
                  )}
                </div>
              </div>
              <div className="w-min text-zinc-800 text-6xl relative -top-3 -mb-15 cursor-default pointer-none z-0">▼</div>
              <Spline className="w-full flex-2" scene="https://draft.spline.design/sSS1g2EHLdCqONDV/scene.splinecode" onLoad={LoadBmo} onSplineMouseDown={ClickBmo} />
            </div>
          </div>

          <div className="flex flex-row w-full justify-between">
            <b>Get a 100% score by playing more than an average player and getting all achievements</b>
            <button className='p-2 rounded-xl bg-sky-950 text-gray-200 cursor-pointer hover:shadow-[0_0_20px_rgba(114,193,255,0.7)] transition duration-200 hover:scale-110' onClick={FetchAllData}>Refresh Account Data</button>
          </div>

          {/* Category Headers */}
          <div className="grid w-full grid-cols-2 md:grid-cols-6 justify-items-center gap-y-2">
            {categories.map((category, index) => (
              <button key={category.header} onClick={() => setSelectedCategory(index)} className="bg-sky-950 p-2 rounded-xl w-28 cursor-pointer hover:shadow-[0_0_20px_rgba(114,193,255,0.7)] transition duration-200 hover:scale-110">{category.header}</button>
            ))}
          </div>

          {/* Category data */}
          <CategoryTable {...categories[selectedCategory]} />
        </div>
      ) : null}
    </main>
  )
}