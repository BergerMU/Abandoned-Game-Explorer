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
    router.push(`AccountDetails/?steamid=${steamid}`)
  }

  return (
    <div className="flex flex-row min-h-screen justify-center items-center">
      <form onSubmit={HandleSubmit} className='flex flex-row space-x-3'>
        <p>Please Enter Your Steam Username (Capitalization does matter)</p>
        <input placeholder="Enter your Steam Account Name" onChange={e => setSteamUserName(e.target.value)} className="w-3xl p-3 h-3xl outline-1 outline-black rounded-2xl bg-sky-950" value={steamUsername}></input>
        <button type='submit' className="bg-sky-800 p-3 rounded-3xl cursor-pointer">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-6">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 12 3.269 3.125A59.769 59.769 0 0 1 21.485 12 59.768 59.768 0 0 1 3.27 20.875L5.999 12Zm0 0h7.5" />
          </svg>
        </button>
      </form>
    </div>
  )
}