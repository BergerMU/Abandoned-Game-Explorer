"use client"

import { useSearchParams } from 'next/navigation'
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"

export default function Homepage() {
  // Page Variables
  const router = useRouter()
  const [accountDataLoading, setAccountDataLoading] = useState(true)
  const [gameDataLoading, setGameDataLoading] = useState(true)

  // Account Variables
  const searchParams = useSearchParams()
  let [steamid, setSteamid] = useState(searchParams.get('steamid'))
  let [userSummary, setUserSummary] = useState<any>(null)
  let [accountScore, setAccountScore] = useState(0)

  // Game Variables
  type Game = {
    score: number,
    name: string,
    percent_of_achievements: number,
    playtime_forever: number,
    global_median_playtime: number,
    played_within_two_weeks: boolean
  }
  let [userGameData, setUserGameData] = useState<Game[]>([])

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
    // Fetch owned games from steamid
    const tempOwnedGames = await fetch('/api/GetOwnedGames', {
      method: "POST",
      body: JSON.stringify({ id: steamid })
    })
    const ownedGames = await tempOwnedGames.json()
    console.log("User Owned Games: ", ownedGames)

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
      <div className="flex max-w-fit h-min flex-col justify-center items-center text-center" key={game.appid}>
        <b className='text-2xl'>{game.name}</b>
        {game.game_cover != "No Cover" ? (
          <img className='flex h-75 w-auto object-contain rounded-2xl' src={game.game_cover} />
        ) : (
          <div className='relative flex h-75 w-55 overflow-hidden bg-linear-to-tl from-slate-800 to-slate-700 rounded-2xl'>
            <div className='absolute font-bold inset-[-50%] h-70 w-95 rotate-345 bg-repeat-x text-slate-600 cursor-default'>
              {Array(90).fill(game.name + " ")}
            </div>
          </div>
        )}
        <p>Total Score: {game.score}</p>

        <div className="group relative inline-block cursor-pointer w-full">
          <progress max="100" value={game.score} className='flex w-full'>{game.score}</progress>
          <div className="invisible absolute shadow-xs bg-slate-700 rounded-2xl group-hover:visible group-hover:delay-500 p-2">
            <div>
              <b>Scoring</b>
              <p>+50 Percent if playtime more than global average</p>
              <br />
              <p>+50 Percent if all achievements are unlocked</p>
            </div>
          </div>
        </div>


        {game.playtime_forever / 60 < 1 ? (
          <p>Playtime: {game.playtime_forever} minutes</p>
        ) : (
          <p>Playtime: {Math.floor(game.playtime_forever / 60)} hours and {game.playtime_forever % 60} minutes</p>
        )}
        {game.global_median_playtime / 60 < 1 ? (
          <p>Global Playtime: {game.global_median_playtime % 60} minutes </p>
        ) : (
          <p>Global Playtime: {Math.floor(game.global_median_playtime / 60)} hours and {game.global_median_playtime % 60} minutes</p>
        )}
        <b>Achievements</b>
        {game.total_achievements ? (
          <div>
            {game.unlocked_achievements_array == 0 ? (
              <div>
                <p>0% Unlocked</p>
              </div>
            ) : (
              <div>
                <div></div>
                <p>{game.percent_of_achievements}% Unlocked</p>
              </div>
            )}
            <p>Total Achievements: {game.total_achievements}</p>
            <p>Unlocked Achievements: {game.unlocked_achievements_count}</p>
          </div>
        ) : (
          <p>No Unlockable Achievements</p>
        )}
        <br/>
        <b>Genres</b>
        {game.genres ?? (
          <div>{game.genres}</div>
        )}
        <br />
      </div>
    )
  }

  // Run various functions at the start of the page loading
  useEffect(() => {
    if (!steamid) {
      router.push("/")
      return
    }

    const FetchAllData = async () => {
      setAccountDataLoading(true)
      await GetUserDetails(steamid)
      setAccountDataLoading(false)

      setGameDataLoading(true)
      const { ownedGames, userAchievements, detailedGameData, recentlyPlayed, gameCovers } = await FetchSteamGames(steamid)
      await CombineGameData(ownedGames, userAchievements, detailedGameData, recentlyPlayed, gameCovers)
      setGameDataLoading(false)
    }

    FetchAllData()
  }, [])

  return (
    <main className="flex min-h-screen w-full flex-col items-center py-32 px-16 sm:items-start">
      {accountDataLoading ? (
        <div className='flex flex-row space-x-6'>
          <p className='text-2xl'>Loading User Information</p>
          <div className="h-6 w-6 animate-spin rounded-full border-b-2 border-current" />
        </div>
      ) : gameDataLoading ? (
        <div className='flex flex-row space-x-6'>
          <p className='text-2xl'>Loading Game Data</p>
          <div className="h-6 w-6 animate-spin rounded-full border-b-2 border-current" />
        </div>
      ) : (
        <div>
          <div>
            <b className="text-3xl">{userSummary.personaname}</b>
            <img src={userSummary.avatarfull}></img>
            <p className='text-2xl'>Account Score: {accountScore}</p>

            <div className="group relative inline-block cursor-pointer w-45">
              <progress max="100" value={accountScore} className='flex w-full'>{accountScore}</progress>
              <div className="invisible absolute shadow-xs bg-slate-700 rounded-2xl group-hover:visible group-hover:delay-500 p-2">
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

          <div className='flex flex-col gap-10'>
            {/* Recently Played Games */}
            <div className='flex flex-col p-3 bg-radial-[at_50%_50%] from-gray-800 to-gray-900 rounded-2xl'>
              <div className="flex flex-row justify-between">
                <div className='flex flex-col mb-2 gap-2'>
                  <b className='text-3xl'>Recently Played</b>
                  <p className="text-2xl">Played within the last two weeks</p>
                  <div className='text-2xl mb-2'>{userGameData.filter((a) => a.played_within_two_weeks == true).length} Games</div>
                </div>
                <input type="text" className='w-60 p-3 h-10 outline-1 outline-black rounded-2xl bg-sky-950' placeholder="Search for your games" onChange={e => setSearchRecentlyPlayed(e.target.value)} />
              </div>
              <div className="grid grid-cols-5 max-h-150 overflow-y-auto space-y-8 gap-5 p-3">
                {userGameData.filter((a) => a.played_within_two_weeks == true).length ? (
                  userGameData.filter(a => a.name.toLowerCase().includes(searchRecentlyPlayed.toLowerCase())).filter((a) => a.played_within_two_weeks == true).sort((a, b) => b.playtime_forever - a.playtime_forever).map((game: any) => (
                    <RepeatedCategories game={game} key={game.id} />
                  ))
                ) : (
                  <div>No games to display</div>
                )}
              </div>
            </div>

            {/* Continue playing */}
            <div className='flex flex-col p-3 bg-radial-[at_50%_50%] from-gray-800 to-gray-900 rounded-2xl'>
              <div className="flex flex-row justify-between">
                <div className='flex flex-col mb-2 gap-2'>
                  <b className='text-3xl'>Continue Playing</b>
                  <div className='text-2xl mb-2'>{userGameData.filter((a) => a.playtime_forever > (a.global_median_playtime * 0.15) && a.playtime_forever < (a.global_median_playtime * 0.60)).length} Games</div>
                </div>
                <input type="text" className='w-60 p-3 h-10 outline-1 outline-black rounded-2xl bg-sky-950' placeholder="Search for your games" onChange={e => setSearchContinuePlaying(e.target.value)} />
              </div>
              <div className="grid grid-cols-5 max-h-150 overflow-y-auto space-y-8 gap-5 p-3">
                {userGameData.filter((a) => a.playtime_forever > 0 && a.playtime_forever < (a.global_median_playtime * 0.30)).length ? (
                  userGameData.filter((a) => a.playtime_forever > (a.global_median_playtime * 0.15) && a.playtime_forever < (a.global_median_playtime * 0.60)).filter((a) => a.playtime_forever > 0 && a.playtime_forever < (a.global_median_playtime * 0.30)).sort((a, b) => b.global_median_playtime - a.global_median_playtime).map((game: any) => (
                    <RepeatedCategories game={game} key={game.id} />
                  ))
                ) : (
                  <div>No games to display</div>
                )}
              </div>
            </div>

            {/* 100% Score Games */}
            <div className='flex flex-col p-3 bg-radial-[at_50%_50%] from-gray-800 to-gray-900 rounded-2xl'>
              <div className="flex flex-row justify-between">
                <div className='flex flex-col mb-2 gap-2'>
                  <b className='text-3xl'>High Score</b>
                  <p className="text-2xl">Games that score at least a 100%</p>
                  <div className='text-2xl mb-2'>{userGameData.filter((a) => a.score == 100).length} Games</div>
                </div>
                <input type="text" className='w-60 p-3 h-10 outline-1 outline-black rounded-2xl bg-sky-950' placeholder="Search for your games" onChange={e => setSearchHighScore(e.target.value)} />
              </div>
              <div className="grid grid-cols-5 max-h-150 overflow-y-auto space-y-8 gap-5">
                {userGameData.filter((a) => a.score == 100).length ? (
                  userGameData.filter(a => a.name.toLowerCase().includes(searchHighScore.toLowerCase())).filter((a) => a.score == 100).sort((a, b) => b.playtime_forever - a.playtime_forever).map((game: any) => (
                    <RepeatedCategories game={game} key={game.appid} />
                  ))
                ) : (
                  <div>No games to display</div>
                )}
              </div>
            </div>

            {/* Games that are almost at 100% */}
            <div className='flex flex-col p-3 bg-radial-[at_50%_50%] from-gray-800 to-gray-900 rounded-2xl'>
              <div className="flex flex-row justify-between">
                <div className='flex flex-col mb-2 gap-2'>
                  <b className='text-3xl'>Almost Complete!</b>
                  <p className="text-2xl">Games with at least a 75% achievements and 80% score</p>
                  <div className='text-2xl mb-2'>{userGameData.filter((a) => a.percent_of_achievements >= 75 && a.percent_of_achievements < 100).length} Games</div>
                </div>
                <input type="text" className='w-60 p-3 h-10 outline-1 outline-black rounded-2xl bg-sky-950' placeholder="Search for your games" onChange={e => setSearchAlmostComplete(e.target.value)} />
              </div>
              <div className="grid grid-cols-5 max-h-150 overflow-y-auto space-y-8 gap-5">
                {userGameData.filter((a) => a.percent_of_achievements >= 75 && a.percent_of_achievements < 100).length ? (
                  userGameData.filter(a => a.name.toLowerCase().includes(searchAlmostComplete.toLowerCase())).filter((a) => a.percent_of_achievements >= 75 && a.percent_of_achievements < 100).filter((a) => a.score >= 80 && a.score < 100).sort((a, b) => b.score - a.score).map((game: any) => (
                    <RepeatedCategories game={game} key={game.id} />
                  ))
                ) : (
                  <div>No games to display :(</div>
                )}
              </div>
            </div>

            {/* Games that haven't been played */}
            <div className='flex flex-col p-3 bg-radial-[at_50%_50%] from-gray-800 to-gray-900 rounded-2xl'>
              <div className="flex flex-row justify-between">
                <div className='flex flex-col mb-2 gap-2'>
                  <b className='text-3xl'>not played:(</b>
                  <p className="text-2xl">Why haven't you played this yet? install them at least!</p>
                  <div className="text-2xl mb-2">{userGameData.filter(a => a.playtime_forever === 0).length} Games</div>
                </div>
                <input type="text" className='w-60 p-3 h-10 outline-1 outline-black rounded-2xl bg-sky-950' placeholder="Search for your games" onChange={e => setSearchNotPlayed(e.target.value)} />
              </div>
              <div className="grid grid-cols-5 max-h-150 overflow-y-auto space-y-8 gap-5">
                {userGameData.filter(a => a.playtime_forever === 0).length > 0 ? (
                  userGameData.filter(a => a.name.toLowerCase().includes(searchNotPlayed.toLowerCase())).sort((a, b) => b.global_median_playtime - a.global_median_playtime).filter(a => a.playtime_forever === 0).map((game: any) => (
                    <RepeatedCategories game={game} key={game.id} />
                  ))
                ) : (
                  <div>No games to display</div>
                )}
              </div>
            </div>

            {/* All Games */}
            <div className='flex flex-col p-3 bg-radial-[at_50%_50%] from-gray-800 to-gray-900 rounded-2xl'>
              <div className="flex flex-row justify-between">
                <div className='flex flex-col mb-2 gap-2'>
                  <b className='text-3xl'>All your games!</b>
                  <div className="text-2xl mb-2">{userGameData.length} Games</div>
                </div>
                <input type="text" className='w-60 p-3 h-10 outline-1 outline-black rounded-2xl bg-sky-950' placeholder="Search for your games" onChange={e => setSearchAllGames(e.target.value)} />
              </div>
              <div className="grid grid-cols-5 max-h-150 overflow-y-auto space-y-8 gap-5">
                {userGameData.length ? (
                  userGameData.filter(a => a.name.toLowerCase().includes(searchAllGames.toLowerCase())).sort((a, b) => b.score - a.score).map((game: any) => (
                    <RepeatedCategories game={game} key={game.id} />
                  ))
                ) : (
                  <div>No games to display</div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}