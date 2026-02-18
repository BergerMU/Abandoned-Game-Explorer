"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { escape } from "node:querystring"

export default function HomePage() {
  const router = useRouter()
  const [userInput, setUserInput] = useState("")
  const [searchError, setSearchError] = useState("")
  const [loading, setLoading] = useState(false)

  // Get userid and redirect to account details page
  async function HandleSubmit(event: { preventDefault: () => void }) {
    event.preventDefault()
    let parsedUserInput = ""
    setLoading(true)
    setSearchError("")

    // Parse steam accounts with ID in their url for their username or steamid
    if (userInput.includes("steamcommunity.com/id/")) {
      // Parse user input to get username and remove / and spaces
      const index = userInput.indexOf("steamcommunity.com/id/") + 21
      parsedUserInput = userInput.substring(index).replace(/[/ ]/g, "")
      console.log(".com/idsteam id/username from url:", parsedUserInput)

      // Parse steam accounts with Profiles in their url for their username or steamid
    } else if (userInput.includes("steamcommunity.com/profiles/")) {
      // Parse user input to get steamid
      const index = userInput.indexOf("steamcommunity.com/profiles/") + 28
      parsedUserInput = userInput.substring(index)
      console.log(".com/profiles/ steamid/username from url:", parsedUserInput)

      // Take user input directly for username or steamid
    } else {
      parsedUserInput = userInput
      console.log("raw user input:", userInput)
    }

    // Test if input is a valid username
    const tempUserID = await fetch('/api/GetUserID', {
      method: "POST",
      body: JSON.stringify({ username: parsedUserInput })
    })

    // input is NOT a valid username
    if (tempUserID.status == 500) {
      // Test if url had a valid steamid
      const tempUserSummary = await fetch('./api/GetPlayerSummary', {
        method: "POST",
        body: JSON.stringify({ id: parsedUserInput })
      })

      // input is NOT a valid steamid
      const userSummary = await tempUserSummary.json()
      if (userSummary.players.length == 0) {
        setSearchError("Can't find user account, make sure you copied the url directly from the steam profile page")
        console.error("Couldn't find user account")
        setLoading(false)

        // input IS a valid steamid
      } else {
        // Route to account details page
        setLoading(false)
        console.log(tempUserSummary)
        router.push(`accountdetails/?steamid=${parsedUserInput}`)
      }

      // input IS a valid username
    } else {
      // Route to account details page
      setLoading(false)
      const userID = await tempUserID.json()
      router.push(`accountdetails/?steamid=${userID}`)
    }
  }

  return (
    <div className="flex flex-col min-h-screen justify-center items-center space-y-5">
      <p className="text-5xl">Explore your steam library!</p>
      <p>How to do it in 3 easy steps!</p>
      <p>1. Go to your steam profile and copy the URL</p>
      <p>2. Paste your account url in the search bar</p>
      <p>3. Hit enter</p>
      {/* Search Form */}
      <div className="flex flex-row">
        <form onSubmit={HandleSubmit} className='flex flex-row space-x-3'>
          <p>Please Enter Your Steam Username (Capitalization does matter)</p>
          <input placeholder="Enter your steam account URL or steamid" onChange={e => setUserInput(e.target.value)} className="w-3xl p-3 h-3xl outline-1 outline-black rounded-2xl bg-sky-950" value={userInput}></input>
          <button type='submit' className="bg-sky-800 p-3 rounded-3xl cursor-pointer">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-6">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 12 3.269 3.125A59.769 59.769 0 0 1 21.485 12 59.768 59.768 0 0 1 3.27 20.875L5.999 12Zm0 0h7.5" />
            </svg>
          </button>
        </form>
      </div>

      {/* Error Messages */}
      {loading ? (
        <div className='flex flex-row space-x-6'>
          <p className='text-2xl'>Loading Account Info</p>
          <div className="h-6 w-6 animate-spin rounded-full border-b-2 border-current" />
        </div>
      ) : (
        <div className='text-2xl'>
          {searchError}
        </div>
      )}
    </div>
  )
}