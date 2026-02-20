// Correct rendering for local testing and vercel deployment
"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"

export default function Homepage() {
  // Page Variables
  const router = useRouter()
  const [accountDataLoading, setAccountDataLoading] = useState(true)
  const [gameDataLoading, setGameDataLoading] = useState(true)
  const [privacyError, setPrivacyError] = useState(false)
  const [playtimeHiddenError, setPlaytimeHiddenError] = useState(false)

  // Account Variables
  const [steamid, setSteamid] = useState<string | null>(null)
  const [userSummary, setUserSummary] = useState<any>(null)
  const [accountScore, setAccountScore] = useState(0)

  // Game Variables
  type Game = {
    score: number,
    name: string,
    percent_of_achievements: number,
    playtime_forever: number,
    global_median_playtime: number,
    played_within_two_weeks: boolean
  }
  const [userGameData, setUserGameData] = useState<Game[]>([])

  // Search variables for each category
  const [searchRecentlyPlayed, setSearchRecentlyPlayed] = useState('')
  const [searchContinuePlaying, setSearchContinuePlaying] = useState('')
  const [searchHighScore, setSearchHighScore] = useState('')
  const [searchAlmostComplete, setSearchAlmostComplete] = useState('')
  const [searchNotPlayed, setSearchNotPlayed] = useState('')
  const [searchAllGames, setSearchAllGames] = useState('')

  // Calculate a score of how much a user has completed their game
  function CalculateScore(userPlaytime: number, globalPlaytime: number, totalAchievements: number, unlockedAchievements: number) {
    let totalScore = 0

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
    setPlaytimeHiddenError(false)
    // Fetch owned games from steamid
    const tempOwnedGames = await fetch('/api/GetOwnedGames', {
      method: "POST",
      body: JSON.stringify({ id: steamid })
    })
    const ownedGames = await tempOwnedGames.json()
    console.log("User Owned Games: ", ownedGames)

    // Check if user games are available. Account privacy settings might be private
    if (!ownedGames.game_count) {
      console.log("Get Owned Games API: no games visible")
      setPrivacyError(true)
      setGameDataLoading(false)
      return
    }

    // Check if user has "Always keep my total playtime private even if users can see my game details" checked
    if (ownedGames.game_count > 0 && ownedGames.games.every(((game: any) => game.playtime_forever == 0))) {
      setPlaytimeHiddenError(true)
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
    const detailedGameData = await tempDetailedGameData.json()
    console.log("Steam Spy Game Data: ", detailedGameData)

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

    return { ownedGames, userAchievements, detailedGameData, recentlyPlayed, gameCovers }
  }

  // Combine various game data into a single list of objects
  async function CombineGameData(ownedGames: any,
    userAchievements: any,
    detailedGameData: any,
    recentlyPlayed: any,
    gameCovers: any) {

    const combinedData = ownedGames.games.map((currentGame: any) => {
      // Specific Game details
      const matchDetailedGameData = detailedGameData.find((item: any) => item.appid === currentGame.appid)
      const matchCover = gameCovers.find((item: any) => item.appid === currentGame.appid)

      // Achievements avariables
      const matchAchievements = userAchievements.find((item: any) => item.appid === currentGame.appid)
      const totalAchievements = matchAchievements?.total_achievements ?? 0
      const unlockedAchievementsArray = matchAchievements?.achievements ?? []
      const unlockedAchievementsCount = unlockedAchievementsArray.length

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
        global_average_playtime: matchDetailedGameData?.average_forever ?? 0,
        global_median_playtime: matchDetailedGameData?.median_forever ?? 0,
        total_achievements: totalAchievements,
        unlocked_achievements_array: unlockedAchievementsArray,
        unlocked_achievements_count: unlockedAchievementsCount,
        percent_of_achievements: totalAchievements > 0 ? Math.round((unlockedAchievementsCount / totalAchievements) * 100) : 0,
        score: score,
        played_within_two_weeks: isPlayedWithinTwoWeeks,
        game_cover: matchCover.url,
        genres: matchDetailedGameData.genre
      }
    })
    // Save game data
    setUserGameData(combinedData)
    console.log("Combined Game Data: ", combinedData)

    // Calculate account score by averaging each individual game score
    let tempAccountScore = 0
    for (const obj of combinedData) {
      tempAccountScore += obj.score
    }
    // Accounts for division by zero errors
    if (combinedData.length > 0) {
      setAccountScore(Math.round(tempAccountScore / combinedData.length))
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

  function RepeatedCategories({ game }: any) {
    return (
      <div className="flex flex-col items-center text-center w-full max-w-xs sm:max-w-sm md:max-w-md" key={game.appid}>
        <b className='text-2xl'>{game.name}</b>

        <div className="w-full aspect-3/4 overflow-hidden rounded-xl">
          {game.game_cover != "No Cover" ? (
            <img className='w-full h-full object-contain' src={game.game_cover}/>
          ) : (
            <div className='relative w-full h-full bg-linear-to-tl from-slate-800 to-slate-700'>
              <div className='absolute w-2xl h-2xl font-bold inset-[-50] rotate-345 bg-repeat-x text-slate-600 cursor-default'>
                {Array(90).fill(game.name + " ")}
              </div>
            </div>
          )}
        </div>

        <div className="group relative inline-block cursor-pointer w-full">
          <p>Total Score: {game.score}</p>
          <progress max="100" value={game.score} className='flex w-full'>{game.score}</progress>
          <div className="invisible absolute shadow-xs bg-slate-700 rounded-xl group-hover:visible group-hover:delay-500 p-3">
            <div>
              <b>Scoring</b>
              <p>+50% if playtime more than global average</p>
              <br />
              <p>+50% if all achievements are unlocked</p>
            </div>
          </div>
        </div>


        {game.playtime_forever / 60 < 1 ? (
          <p>Total Playtime: {game.playtime_forever} minutes</p>
        ) : (
          <p>Total Playtime: {Math.floor(game.playtime_forever / 60)} hours and {game.playtime_forever % 60} minutes</p>
        )}
        {game.global_median_playtime / 60 < 1 ? (
          <p>Global Playtime: {game.global_median_playtime % 60} minutes </p>
        ) : (
          <p>Global Playtime: {Math.floor(game.global_median_playtime / 60)} hours and {game.global_median_playtime % 60} minutes</p>
        )}
        <br />
        {game.total_achievements ? (
          <div>
            <p>{game.percent_of_achievements}% Achievements Unlocked</p>
          </div>
        ) : (
          <p>No Unlockable Achievements</p>
        )}
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
    const { ownedGames, userAchievements, detailedGameData, recentlyPlayed, gameCovers } = result
    await CombineGameData(ownedGames, userAchievements, detailedGameData, recentlyPlayed, gameCovers)
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
          { playtimeHiddenError && (
            <div className="bg-red-600 p-3 w-full space-y-5 rounded-xl">
              <p>Warning: Your account settings may have "Always keep my total playtime private even if users can see my game details." checked which stops us from setting any of your playtime for your games</p>
              <p>We advise you double check that box is not checked</p>
            </div>
          )}
          <div className='flex flex-row justify-between align-top'>
            {/* Account Information */}
            <div className='flex flex-col p-3'>
              <p className="text-4xl text-center mb-2">{userSummary.personaname}</p>

              <div className='flex flex-row space-x-10'>
                <img src={userSummary.avatarfull}></img>
                <div className="flex flex-col">
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
                    <p>Offline</p>
                  ) : (
                    <p>Online</p>
                  )}
                  <p>Last Time Online: {new Date(userSummary.lastlogoff * 1000).toLocaleDateString("en-US")}</p>
                </div>
              </div>

            </div>
            <div className='flex flex-col p-3 w-150 text-right'>
              <b className="text-3xl">Scoring</b>
              <ul className='space-y-5'>
                <li>Game scores are based on playtime and achievements</li>
                <li>One half of a games score is earned if your playtime is more than the global average playtime</li>
                <li>The other half of a games score is earned by completing all achievements</li>
                <li>Your account score is the average game score across all of your games</li>
              </ul>
            </div>
          </div>

          <div className="flex flex-row justify-between py-5">
            <p className="text-2xl">Go give yo games some love</p>
            <button className='p-2 outline-1 outline-black rounded-xl bg-sky-950 text-gray-200 cursor-pointer' onClick={FetchAllData}>Refresh Account Data</button>
          </div>

          <div className='flex flex-col gap-y-10'>
            {/* Recently Played Games */}
            <div className='flex flex-col p-3 bg-radial-[at_50%_50%] from-gray-800 to-gray-900 rounded-xl'>
              <div className="flex flex-row justify-between">
                <div className='flex flex-col mb-2 gap-2'>
                  <b className='text-3xl'>Recently Played</b>
                  <p className="text-2xl">Played within the last two weeks</p>
                  <p className='text-2xl mb-2'>{userGameData.filter((a) => a.played_within_two_weeks == true).length} Games</p>
                </div>
                <input type="text" className='w-60 p-3 h-10 outline-1 outline-black rounded-xl bg-sky-950' placeholder="Search for your games" onChange={e => setSearchRecentlyPlayed(e.target.value)} value={searchRecentlyPlayed} />
              </div>
              <div className="grid sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 max-h-150 overflow-y-auto space-y-8 gap-5 p-3">
                {userGameData.filter((a) => a.played_within_two_weeks == true).length ? (
                  userGameData.filter(a => a.name.toLowerCase().includes(searchRecentlyPlayed.toLowerCase())).filter((a) => a.played_within_two_weeks == true).sort((a, b) => b.playtime_forever - a.playtime_forever).map((game: any) => (
                    <RepeatedCategories game={game} key={game.id} />
                  ))
                ) : (
                  <p>No games to display</p>
                )}
              </div>
            </div>

            {/* Games that haven't been played */}
            <div className='flex flex-col p-3 bg-radial-[at_50%_50%] from-gray-800 to-gray-900 rounded-xl'>
              <div className="flex flex-row justify-between">
                <div className='flex flex-col mb-2 gap-2'>
                  <b className='text-3xl'>not played:(</b>
                  <p className="text-2xl">Why haven't you played this yet? install them at least!</p>
                  <p className="text-2xl mb-2">{userGameData.filter(a => a.playtime_forever === 0).length} Games</p>
                </div>
                <input type="text" className='w-60 p-3 h-10 outline-1 outline-black rounded-xl bg-sky-950' placeholder="Search for your games" onChange={e => setSearchNotPlayed(e.target.value)} value={searchNotPlayed} />
              </div>
              <div className="grid sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 max-h-150 overflow-y-auto space-y-8 gap-5">
                {userGameData.filter(a => a.playtime_forever === 0).length > 0 ? (
                  userGameData.filter(a => a.name.toLowerCase().includes(searchNotPlayed.toLowerCase())).sort((a, b) => b.global_median_playtime - a.global_median_playtime).filter(a => a.playtime_forever === 0).map((game: any) => (
                    <RepeatedCategories game={game} key={game.id} />
                  ))
                ) : (
                  <p>No games to display</p>
                )}
              </div>
            </div>

            {/* Games with less than 10 minutes of playtime */}
            <div className='flex flex-col p-3 bg-radial-[at_50%_50%] from-gray-800 to-gray-900 rounded-xl'>
              <div className="flex flex-row justify-between">
                <div className='flex flex-col mb-2 gap-2'>
                  <b className='text-3xl'>Bearly Touched</b>
                  <p className="text-2xl">Less than 10 minutes of playtime</p>
                  <p>See if these games qualify to get refunded!</p>
                  <p className='text-2xl mb-2'>{userGameData.filter((a) => a.playtime_forever > 0 && a.playtime_forever < 10).length} Games</p>
                </div>
                <input type="text" className='w-60 p-3 h-10 outline-1 outline-black rounded-xl bg-sky-950' placeholder="Search for your games" onChange={e => setSearchContinuePlaying(e.target.value)} value={searchContinuePlaying} />
              </div>
              <div className="grid sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 max-h-150 overflow-y-auto space-y-8 gap-5 p-3">
                {userGameData.filter((a) => a.playtime_forever > 0 && a.playtime_forever < 10).length ? (
                  userGameData.filter(a => a.name.toLowerCase().includes(searchContinuePlaying.toLowerCase()))
                    .filter((a) => a.playtime_forever > 0 && a.playtime_forever < 10)
                    .sort((a, b) => b.global_median_playtime - a.global_median_playtime).map((game: any) => (
                      <RepeatedCategories game={game} key={game.id} />
                    ))
                ) : (
                  <p>No games to display</p>
                )}
              </div>
            </div>

            {/* Games that are almost at 100% */}
            <div className='flex flex-col p-3 bg-radial-[at_50%_50%] from-gray-800 to-gray-900 rounded-xl'>
              <div className="flex flex-row justify-between">
                <div className='flex flex-col mb-2 gap-2'>
                  <b className='text-3xl'>Almost Complete!</b>
                  <p className="text-2xl">Games with at least a 75% achievements and 80% score</p>
                  <p className='text-2xl mb-2'>{userGameData.filter((a) => a.percent_of_achievements >= 75 && a.percent_of_achievements < 100).length} Games</p>
                </div>
                <input type="text" className='w-60 p-3 h-10 outline-1 outline-black rounded-xl bg-sky-950' placeholder="Search for your games" onChange={e => setSearchAlmostComplete(e.target.value)} value={searchAlmostComplete} />
              </div>
              <div className="grid sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 max-h-150 overflow-y-auto space-y-8 gap-5">
                {userGameData.filter((a) => a.percent_of_achievements >= 75 && a.percent_of_achievements < 100).length ? (
                  userGameData.filter(a => a.name.toLowerCase().includes(searchAlmostComplete.toLowerCase())).filter((a) => a.percent_of_achievements >= 75 && a.percent_of_achievements < 100).filter((a) => a.score >= 80 && a.score < 100).sort((a, b) => b.score - a.score).map((game: any) => (
                    <RepeatedCategories game={game} key={game.id} />
                  ))
                ) : (
                  <p>No games to display</p>
                )}
              </div>
            </div>

            {/* 100% Score Games */}
            <div className='flex flex-col p-3 bg-radial-[at_50%_50%] from-gray-800 to-gray-900 rounded-xl'>
              <div className="flex flex-row justify-between">
                <div className='flex flex-col mb-2 gap-2'>
                  <b className='text-3xl'>High Score</b>
                  <p className="text-2xl">Games that score at least a 100%</p>
                  <p className='text-2xl mb-2'>{userGameData.filter((a) => a.score == 100).length} Games</p>
                </div>
                <input type="text" className='w-60 p-3 h-10 outline-1 outline-black rounded-xl bg-sky-950' placeholder="Search for your games" onChange={e => setSearchHighScore(e.target.value)} value={searchHighScore} />
              </div>
              <div className="grid sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 max-h-150 overflow-y-auto space-y-8 gap-5">
                {userGameData.filter((a) => a.score == 100).length ? (
                  userGameData.filter(a => a.name.toLowerCase().includes(searchHighScore.toLowerCase())).filter((a) => a.score == 100).sort((a, b) => b.playtime_forever - a.playtime_forever).map((game: any) => (
                    <RepeatedCategories game={game} key={game.appid} />
                  ))
                ) : (
                  <p>No games to display :(((</p>
                )}
              </div>
            </div>

            {/* All Games */}
            <div className='flex flex-col p-3 bg-radial-[at_50%_50%] from-gray-800 to-gray-900 rounded-xl'>
              <div className="flex flex-row justify-between">
                <div className='flex flex-col mb-2 gap-2'>
                  <b className='text-3xl'>All your games!</b>
                  <p className="text-2xl mb-2">{userGameData.length} Games</p>
                </div>
                <input type="text" className='w-60 p-3 h-10 outline-1 outline-black rounded-xl bg-sky-950' placeholder="Search for your games" onChange={e => setSearchAllGames(e.target.value)} value={searchAllGames} />
              </div>
              <div className="grid sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 max-h-150 overflow-y-auto space-y-8 gap-5">
                {userGameData.length ? (
                  userGameData.filter(a => a.name.toLowerCase().includes(searchAllGames.toLowerCase())).sort((a, b) => b.score - a.score).map((game: any) => (
                    <RepeatedCategories game={game} key={game.id} />
                  ))
                ) : (
                  <p>No games to display, get more games!</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}