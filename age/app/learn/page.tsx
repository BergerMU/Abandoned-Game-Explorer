export default function Homepage() {
  return (
    <div className="flex flex-col items-center p-8 sm:items-start gap-5">
      <div>
        <div className='text-3xl'>How does scoring work?</div>
        <ul className='space-y-5 list-disc list-inside'>
          <li>Game scores are based on playtime and achievements</li>
          <li>One half of a games score is earned if your playtime is more than the global average playtime</li>
          <li>The other half of a games score is earned by completing all achievements</li>
          <li>Your account score is the average game score across all of your games</li>
        </ul>
      </div>

      <div className="space-y-3">
        <div className='text-3xl'>Learn how to refund a game (it's super easy!)</div>
        <p>Steam offers a way to refund games which is super easy! Steam's refunds apply to almost every purchase as long as you bought it within the last 2 weeks and you have less than 2 hours on it</p>
        <ul className='space-y-5 list-decimal list-inside'>
          <li>In the Steam app click the "Help" button in the top left corner and select "Steam Support" or go to <a className="text-blue-300" href="https://help.steampowered.com/" target="_blank">this link</a></li>
          <li>Scroll to the bottom of the page and type in the game you want to refund</li>
          <li>Among the list of options presented click either "It's not what I expected", "I purchased this by accident", or "Gameplay or technical issue"</li>
          <li>If prompted select refund method then select a refund reason and finally hit submit</li>
        </ul>
      </div>
    </div>
  )
}