"use client"

import { useSearchParams } from 'next/navigation'
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"

export default function Temp() {
  const router = useRouter()

  const searchParams = useSearchParams()
  // Gets steamid and routes back to homepage if empty
  let [steamid, setSteamid] = useState(searchParams.get('steamid'))

  // let [userSummary, setUserSummary] = useState<any>(null)
  let [userSummary, setUserSummary] = useState<any>(null)
  let [userGameData, setUserGameData] = useState([])
  let [accountScore, setAccountScore] = useState(0)
  
  // Calculate a score of how much a user has completed their game
  function CalculateScore(userPlaytime: number, globalPlaytime: number, totalAchievements: number, unlockedAchievements: number) {
    let totalScore = 0

    // Game has achievements
    if (totalAchievements != 0) {
      totalScore += (unlockedAchievements/totalAchievements)/2

      if (userPlaytime < globalPlaytime) {
        totalScore += (userPlaytime/globalPlaytime)/2

      } else {
        totalScore += 0.5
      }

      // Game doesn't have achievements
    } else {
      if (userPlaytime < globalPlaytime && userPlaytime > 0) {
        totalScore += (userPlaytime/globalPlaytime)
      } else if (userPlaytime >= globalPlaytime) {
        totalScore += 1
      }
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
    console.log("Recently Played: ", recentlyPlayed)

    return {ownedGames, userAchievements, detailedGameData, recentlyPlayed}
  }

  // Combine various game data into a single list of objects
  async function CombineGameData(ownedGames: any, userAchievements: any, detailedGameData: any, recentlyPlayed: any) {
    const combinedGameData = ownedGames.games.map((currentGame: any) => {
      const matchAchievements = userAchievements.find((item: any) => item.appid === currentGame.appid)
      const matchDetailedGameData = detailedGameData.find((item:any) => item.appid === currentGame.appid)
      const score = CalculateScore(
        currentGame.playtime_forever ?? -1,
        matchDetailedGameData.median_forever ?? -1,
        matchAchievements.total_achievements ?? 0,
        matchAchievements.achievements?.length ?? 0)

      return {
        ...currentGame,
        global_average_playtime: matchDetailedGameData.average_forever ?? -1,
        global_median_playtime: matchDetailedGameData.median_forever ?? -1,
        total_achievements: matchAchievements.total_achievements ?? 0,
        achievements: matchAchievements.achievements ?? 0,
        score: score
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
      await GetUserDetails(steamid)
      const { ownedGames, userAchievements, detailedGameData, recentlyPlayed } = await FetchSteamGames(steamid)
      await CombineGameData(ownedGames, userAchievements, detailedGameData, recentlyPlayed)
    }

    FetchAllData()
  }, [])

  return (
    <main className="flex min-h-screen w-full flex-col items-center py-32 px-16 sm:items-start">
      {userSummary ? (
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
      ) : (
        <p>User information loading...</p>
      )}
      
      <br/>

      <b>Games:</b>
      <br/>
      <div className="grid grid-cols-4 gap-4">
        {userGameData.map((game: any) => (
          <div key={game.appid}>
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
              game.achievements ? (
                <div>
                  <p>{Math.round((game.achievements.length / game.total_achievements)*100)}% Complete</p>
                  <p>Total Achievements: {game.total_achievements ?? "N/A"}</p>
                  <p>Unlocked Achievements: {game.achievements ? game.achievements.length : "N/A"}</p>
                </div>
              ) : (
                <div>
                  <p>0% Unlocked</p>
                  <p>Total Achievements: {game.total_achievements ?? "N/A"}</p>
                  <p>Unlocked Achievements: 0</p>
                </div>
              )
            ) : (
              <p>No Unlockable Achievements</p>
            )}
            <br/>
          </div>
        ))}
      </div>
    </main>
  )
}