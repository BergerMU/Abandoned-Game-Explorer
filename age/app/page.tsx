"use client"

import { useEffect, useState } from "react";
import { FormEvent } from 'react'

function HomePage() {
  // Define Variables
  let [steamUsername, setSteamUserName] = useState("");
  let [steamUserID, setSteamUserID] = useState(null);
  let [userGameData, setUserGameData] = useState(Object);
  let [userSummary, setUserSummary] = useState(Object);
  let [lastLogOn, setLastLogOn] = useState("");

  // Get Steam ID and then owned games
  async function getOwnedGames(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    // Fetch user ID from steamUsername
    const tempUserID = await fetch('/api/GetUserID', {
      method: "POST",
      body: JSON.stringify({username:steamUsername})
    });

    // Save the returned data
    const userID = await tempUserID.json();
    setSteamUserID(userID);

    // Fetch user summary from steamid
    const tempUserSummary = await fetch('/api/GetPlayerSummary', {
      method: "POST",
      body: JSON.stringify({id:userID})
    });

    // Save the returned data
    const summary = await tempUserSummary.json();
    setUserSummary(summary.players[0]);
    console.log("User Summary: ", summary.players[0]);

    // Get last time user was on steam
    const date = new Date(summary.players[0].lastlogoff * 1000).toLocaleDateString("en-US");
    setLastLogOn(date);

    // Fetch owned games from userID
    const tempOwnedGames = await fetch('/api/GetOwnedGames', {
      method: "POST",
      body: JSON.stringify({id:userID})
    });

    // Save the returned data
    const games = await tempOwnedGames.json();
    setUserGameData(games);
    console.log("User Game Data: ", games);
  }

  return (
    <div className="flex min-h-screen bg-zinc-50 font-sans dark:bg-gray-800">
      <main className="flex min-h-screen w-full flex-col items-center py-32 px-16 sm:items-start">
        <form onSubmit={getOwnedGames}>
          <p>Please Enter Your Steam Username (Capitalization does matter)</p>
          <input placeholder="Enter your Steam Account Name" onChange={e => setSteamUserName(e.target.value)} value={steamUsername} className="w-full bg-transparent placeholder:text-slate-400 text-slate-200 text-sm border border-slate-200 rounded-md px-3 py-2 transition duration-300 ease focus:outline-none focus:border-slate-400 hover:border-slate-300 shadow-sm focus:shadow"></input>
          <button type='submit'>Search Account</button>
        </form>
        <img src={userSummary.avatarfull}></img>
        <p className="flex flex-col text-align-center">Username: {userSummary.personaname}</p>
        <p className="flex flex-col text-align-center">Steam ID: {steamUserID}</p>
        <p className="flex flex-col text-align-center">User State: {userSummary.personastate}</p>
        <p className="flex flex-col text-align-center">Last Time Online: {lastLogOn}</p>
        <p className="flex flex-col text-align-center">Game Count: {userGameData.game_count}</p>
        <br/>
        <p>Games:</p>
        <div className="grid grid-cols-4 gap-4">
          {/* AI helped point out I needed question marks here to make this work */}
          {userGameData?.games?.map((game: any) => (
            <div key={game.appid}>
              <img src={`https://media.steampowered.com/steamcommunity/public/images/apps/${game.appid}/${game.img_icon_url}.jpg`}/>
              <p>{game.name}</p>
              <p>Total Playtime: {game.playtime_forever} Minutes</p>
              <br/>
            </div>
          ))}
        </div> 
      </main>
    </div>
  );
}

export default HomePage;