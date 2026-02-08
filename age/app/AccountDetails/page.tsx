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
  // let [userSummary, setUserSummary] = useState<any>(null)
  let [userSummary, setUserSummary] = useState<any>(null)
  let [accountScore, setAccountScore] = useState(0)

  // Game Variables
  type Game = {score: number,
    percent_of_achievements: number,
    playtime_forever: number,
    global_median_playtime: number,
    played_within_two_weeks: boolean}
  let [userGameData, setUserGameData] = useState<Game[]>([])
  let [recentlyPlayedGames, setRecentlyPlayedGames] = useState(Object)

  
  // Calculate a score of how much a user has completed their game
  function CalculateScore(userPlaytime: number, globalPlaytime: number, totalAchievements: number, unlockedAchievements: number, recentlyPlayed: boolean) {
    let totalScore = 0

    // Game has achievements
    if (totalAchievements !== 0) {
      totalScore += (unlockedAchievements/totalAchievements)*.45

      if (userPlaytime < globalPlaytime) {
        totalScore += (userPlaytime/globalPlaytime)*.45

      } else {
        totalScore += 0.475
      }

      // Game doesn't have achievements
    } else {
      if (userPlaytime < globalPlaytime && userPlaytime > 0) {
        totalScore += (userPlaytime/globalPlaytime)*.45
      } else if (userPlaytime >= globalPlaytime) {
        totalScore += .475
      }
    }

    if (recentlyPlayed) {
      totalScore += .05
    }

    return(Math.round(totalScore*100))
  }

  // Gets owned games, covers, achievements, game details, recently played
  async function FetchSteamGames(steamid: string) {
    // Fetch owned games from steamid
    const tempOwnedGames = await fetch('/api/GetOwnedGames', {
      method: "POST",
      body: JSON.stringify({id:steamid})
    })
    const ownedGames = await tempOwnedGames.json()
    console.log("User Owned Games: ", ownedGames)

    // Fetch owned game covers
    // const tempGameCovers = await fetch('/api/GetSteamCovers', {
    //   method: "POST",
    //   body: JSON.stringify({gameData: ownedGames})
    // })
    // const gameCovers = await tempGameCovers.json()
    // console.log("Game Covers: ", gameCovers)

    // Fetch owned games from userID
    const tempUserAchievements = await fetch('/api/GetPlayerAchievements', {
      method: "POST",
      body: JSON.stringify({id: steamid, gameData: ownedGames})
    })
    const userAchievements = await tempUserAchievements.json()
    console.log("User Achievements: ", userAchievements)

    // Fetch in depth data from steam spy
    const tempDetailedGameData = await fetch('/api/GetSteamSpyData', {
      method: "POST",
      body: JSON.stringify({gameData: ownedGames})
    })
    const detailedGameData = await tempDetailedGameData.json()
    console.log("Steam Spy Game Data: ", detailedGameData)

    // Fetch recently played
    const tempRecentlyPlayed = await fetch('/api/GetRecentlyPlayed', {
      method: "POST",
      body: JSON.stringify({id: steamid})
    })

    // Save the returned data
    const recentlyPlayed = await tempRecentlyPlayed.json()
    setRecentlyPlayedGames(recentlyPlayed)
    console.log("Recently Played: ", recentlyPlayed)

    return {ownedGames, userAchievements, detailedGameData, recentlyPlayed}
  }

  // Combine various game data into a single list of objects
  async function CombineGameData(ownedGames: any, userAchievements: any, detailedGameData: any, recentlyPlayed: any) {
    const combinedGameData = ownedGames.games.map((currentGame: any) => {
      // Game data details
      const matchDetailedGameData = detailedGameData.find((item:any) => item.appid === currentGame.appid)

      // Achievements avariables
      const matchAchievements = userAchievements.find((item: any) => item.appid === currentGame.appid)
      const totalAchievements = matchAchievements?.total_achievements ?? 0
      const unlockedAchievementsArray = matchAchievements?.achievements ?? []
      const unlockedAchievementsCount = unlockedAchievementsArray.length

      // Determine if game has been played within two weeks
      let isPlayedWithinTwoWeeks: boolean
      if (recentlyPlayed.games.find((item:any) => item.appid === currentGame.appid)) {
        isPlayedWithinTwoWeeks = true
      } else {
        isPlayedWithinTwoWeeks = false
      }

      // Calculate Game Score
      const score = CalculateScore(
        currentGame.playtime_forever ?? -1,
        matchDetailedGameData.median_forever ?? -1,
        totalAchievements ?? 0,
        unlockedAchievementsCount ?? 0,
        isPlayedWithinTwoWeeks
      )


      return {
        ...currentGame,
        global_average_playtime: matchDetailedGameData.average_forever ?? -1,
        global_median_playtime: matchDetailedGameData.median_forever ?? -1,
        total_achievements: totalAchievements,
        unlocked_achievements_array: unlockedAchievementsArray,
        unlocked_achievements_count: unlockedAchievementsCount,
        percent_of_achievements: totalAchievements > 0 ? Math.round((unlockedAchievementsCount / totalAchievements)*100) : 0,
        score: score,
        played_within_two_weeks: isPlayedWithinTwoWeeks
      }
    })
    // Save game data
    setUserGameData(combinedGameData)
    console.log("Combined Game Data: ", combinedGameData)

    // Calculate account score by averaging each individual game score
    let tempAccountScore = 0
    for (const obj of combinedGameData) {
      tempAccountScore += obj.score
    }
    // Accounts for division by zero errors
    if (combinedGameData.length > 0) {
      setAccountScore(Math.round(tempAccountScore/combinedGameData.length))
    } else {
      setAccountScore(0)
    }
  }

  async function GetUserDetails(steamid:string) {
    // Fetch user summary from steamid
    const tempUserSummary = await fetch('./api/GetPlayerSummary', {
      method: "POST",
      body: JSON.stringify({id:steamid})
    })
    const summary = await tempUserSummary.json()
    setUserSummary(summary.players[0])
    console.log("User Summary: ", summary.players[0])
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
      const { ownedGames, userAchievements, detailedGameData, recentlyPlayed } = await FetchSteamGames(steamid)
      await CombineGameData(ownedGames, userAchievements, detailedGameData, recentlyPlayed)
      setGameDataLoading(false)
    }

    FetchAllData()
  }, [])

  function RepeatedCategories({game}: any) {
    return (
      <div className="max-w-fit" key={game.appid}>
        <img src={`https://media.steampowered.com/steamcommunity/public/images/apps/${game.appid}/${game.img_icon_url}.jpg`}/>
        <p>{game.name}</p>
        <p>Score: {game.score}</p>

        <progress max="100" value={game.score}>{game.score}</progress>

        <br/>
        {game.playtime_forever/60 < 1 ? (
          <p>Playtime: {game.playtime_forever} minutes</p>
        ) : (
          <p>Playtime: {Math.floor(game.playtime_forever/60)} hours and {game.playtime_forever%60} minutes</p>
        )}
        {game.global_median_playtime/60 < 1 ? (
          <p>Global Playtime: {game.global_median_playtime%60} minutes </p>
        ) : (
          <p>Global Playtime: {Math.floor(game.global_median_playtime/60)} hours and {game.global_median_playtime%60} minutes</p>
        )}
        <br/>
        <b>Achievements</b>
        {game.total_achievements ? (
          <div>
            {game.unlocked_achievements_array == 0 ? (
              <div>
                <p>0% Complete</p>
                <progress max="100" value={game.percent_of_achievements}>{game.percent_of_achievements}</progress>
              </div>
            ) : (
              <div>
                <p>{game.percent_of_achievements}% Complete</p>
                <progress max="100" value={game.percent_of_achievements}>{game.percent_of_achievements}</progress>
              </div>
            )}
            <p>Total Achievements: {game.total_achievements ?? "N/A"}</p>
            <p>Unlocked Achievements: {game.unlocked_achievements_count ?? "N/A"}</p>
          </div>
        ) : (
          <p>No Unlockable Achievements</p>
        )}
        <br/>
      </div>
    )
  }

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
            <img src={userSummary.avatarfull}></img>
            <b>{userSummary.personaname}</b>
            <p>Account Score: {accountScore}</p>
            <progress max="100" value={accountScore}>{accountScore}</progress>
            
            <p>Steam ID: {steamid}</p>
            <p>User State: {userSummary.personastate}</p>
            <p>Last Time Online: {new Date(userSummary.lastlogoff * 1000).toLocaleDateString("en-US")}</p>
            <p>Total Games: {userGameData.length}</p>
          </div>

          <div className='flex flex-col gap-5'>
            {/* Recently Played Games */}
            {recentlyPlayedGames.total_count !== 0 && (
              <div className='bg-blue-950 rounded-2xl'>
                <div className="flex flex-row justify-between p-3 bg-fuchsia-950 rounded-2xl">
                  <p className='text-3xl'>Recently Played</p>
                  <p className="text-2xl">Played within the last two weeks</p>
                </div>
              <div className="grid grid-cols-4 max-h-80 overflow-y-scroll space-y-8 m-2">
                {userGameData.filter((a) => a.played_within_two_weeks == true).sort((a,b) => b.playtime_forever - a.playtime_forever).map((game:any) => (
                  <RepeatedCategories game={game} key={game.id}/>
                ))}
              </div>
            </div>
            )}

            {/* 100% Score Games */}
            <div className='bg-blue-950 rounded-2xl'>
              <div className="flex flex-row justify-between p-3 bg-fuchsia-950 rounded-2xl">
                <p className='text-3xl'>High Score</p>
                <p className="text-2xl">Games that score a 100%</p>
              </div>
              <div className="grid grid-cols-4 max-h-80 overflow-y-scroll space-y-8 m-2">
                {userGameData.filter((a) => a.score >= 90).sort((a,b) => b.playtime_forever - a.playtime_forever).map((game:any) => (
                  <RepeatedCategories game={game} key={game.id}/>
                ))}
              </div>
            </div>

            {/* Games with least achievements */}
            <div className='bg-blue-950 rounded-2xl'>
              <div className="flex flex-row justify-between p-3 bg-fuchsia-950 rounded-2xl">
                <p className='text-3xl'>Almost Complete!</p>
                <p className="text-2xl">Games with at least a 75% achievements and 80% score</p>
              </div>
              <div className="grid grid-cols-4 max-h-70 overflow-y-scroll space-y-8 m-2">
                {userGameData.filter((a) => a.percent_of_achievements >= 75 && a.percent_of_achievements < 100).filter((a) => a.score >= 80 && a.score < 100).sort((a,b) => b.score - a.score).map((game:any) => (
                  <RepeatedCategories game={game} key={game.id}/>
                ))}
              </div>
            </div>

            {/* Games that haven't been played */}
            <div className='bg-blue-950 rounded-2xl'>
              <div className="flex flex-row justify-between p-3 bg-fuchsia-950 rounded-2xl">
                <p className='text-3xl'>not played:(</p>
                <p className="text-2xl">Why haven't you played this yet? install them at least!</p>
              </div>
              <div className="grid grid-cols-4 max-h-70 overflow-y-scroll space-y-8 m-2">
                {userGameData.sort((a,b) => b.global_median_playtime - a.global_median_playtime).filter(a => a.playtime_forever === 0).map((game: any) => (
                  <RepeatedCategories game={game} key={game.id}/>
                ))}
              </div>
            </div>

            {/* All Games */}
            <div className='bg-blue-950 rounded-2xl'>
              <div className="flex flex-row justify-between p-3 bg-fuchsia-950 rounded-2xl">
                <p className='text-3xl'>All your games!</p>
                <p className="text-2xl">Hey</p>
              </div>
              <div className="grid grid-cols-4 max-h-70 overflow-y-scroll space-y-8 m-2">
                {userGameData.map((game: any) => (
                  <RepeatedCategories game={game} key={game.id}/>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}