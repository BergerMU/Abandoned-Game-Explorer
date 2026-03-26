export default function Homepage() {
	return (
		<div className="flex flex-col w-full md:w-3/4 items-center p-8 sm:items-start gap-5">
			<div>
				<div className='text-3xl'>What is this website?</div>
				<p>Abandoned Game Explorer i the capstone project of Jacob Berger who goes to Maryville University. The goal of the Abandoned Game Explorer is to assist users in getting more value out of their Steam library. Whether a user has a large or small library this website can still help them get more value!</p>
			</div>

			<div>
				<div className='text-3xl'>Contact us</div>
				<p>You can visit my personal website at <a className="text-blue-300" href="https://jbergerdev.com" target="_blank">jbergerdev.com</a> or contact me through email at jacobberger1234@gmail.com</p>
			</div>
		</div>
	)
}