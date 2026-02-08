"use client"

import { useState } from "react"
import { FormEvent } from 'react'
import { useRouter } from "next/navigation"

export default function HomePage() {
  const router = useRouter()
  let [steamUsername, setSteamUserName] = useState("")

  // Get userid and redirect to account details page
  async function HandleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    // Fetch user ID from steamUsername
    const tempUserID = await fetch('/api/GetUserID', {
      method: "POST",
      body: JSON.stringify({username:steamUsername})
    })
    const steamid = await tempUserID.json()
    router.push(`accountdetails/?steamid=${steamid}`)
  }

  return (
    <div className="flex min-h-screen font-sans">
      <main className="flex min-h-screen w-full flex-col items-center py-32 px-16 sm:items-start">
        <form onSubmit={HandleSubmit}>
          <p>Please Enter Your Steam Username (Capitalization does matter)</p>
          <input placeholder="Enter your Steam Account Name" onChange={e => setSteamUserName(e.target.value)} value={steamUsername} className="w-full bg-transparent placeholder:text-slate-400 text-slate-200 text-sm border border-slate-200 rounded-md px-3 py-2 transition duration-300 ease focus:outline-none focus:border-slate-400 hover:border-slate-300 shadow-sm focus:shadow"></input>
          <button type='submit'>Search Account</button>
        </form>
        <br/>
      </main>
    </div>
  )
}