import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default function HomePage() {
  return (
    <div className="space-y-8 px-4 sm:px-6">
      <div className="text-center">
        <h1 className="text-3xl sm:text-4xl font-bold text-black mb-2">Cricket Scorer</h1>
        <p className="text-sm sm:text-base text-gray-600 mb-6">Score matches and track your cricket stats</p>
        <Link href="/matches/create">
          <Button size="lg" className="text-base sm:text-lg px-6 sm:px-8 py-4 sm:py-6 w-full sm:w-auto">
            Start New Match
          </Button>
        </Link>
      </div>

      <div className="grid gap-4 sm:gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>My Matches</CardTitle>
            <CardDescription>View your match history and ongoing games</CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/matches">
              <Button variant="outline" className="w-full">View All Matches</Button>
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Live Scores</CardTitle>
            <CardDescription>Watch live cricket matches in progress</CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/live">
              <Button variant="outline" className="w-full">View Live Matches</Button>
            </Link>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>My Live Matches</CardTitle>
          <CardDescription>Matches you are currently playing in</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-500">No live matches at the moment</p>
        </CardContent>
      </Card>
    </div>
  )
}
