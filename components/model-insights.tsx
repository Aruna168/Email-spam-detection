"use client"

import { useEffect, useState } from "react"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts"
import { Loader2, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { isAuthenticated } from "@/lib/api"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { SimplifiedAuth } from "./simplified-auth"

// Default model insights data
const defaultSpamWords = [
  { word: "free", weight: 70 },
  { word: "winner", weight: 80 },
  { word: "prize", weight: 70 },
  { word: "money", weight: 50 },
  { word: "offer", weight: 50 },
  { word: "urgent", weight: 60 },
  { word: "viagra", weight: 90 },
  { word: "click", weight: 50 },
  { word: "cash", weight: 60 },
  { word: "guarantee", weight: 50 }
];

const defaultHamWords = [
  { word: "meeting", weight: 60 },
  { word: "report", weight: 50 },
  { word: "project", weight: 50 },
  { word: "schedule", weight: 60 },
  { word: "update", weight: 40 },
  { word: "document", weight: 50 },
  { word: "team", weight: 40 },
  { word: "regards", weight: 50 },
  { word: "sincerely", weight: 50 },
  { word: "thanks", weight: 40 }
];

export function ModelInsights() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [retrying, setRetrying] = useState(false)
  const [isAuth, setIsAuth] = useState(false)
  const [authDialogOpen, setAuthDialogOpen] = useState(false)
  const [viewMode, setViewMode] = useState<'general' | 'specific'>('general')
  const [latestScan, setLatestScan] = useState<any>(null)

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true)
        setError(null)
        
        // Check if user is authenticated
        const authenticated = isAuthenticated()
        setIsAuth(authenticated)
        
        if (authenticated) {
          // Get user ID from localStorage
          const userId = localStorage.getItem('user_id')
          
          if (userId) {
            // Get scan history from localStorage
            const history = JSON.parse(localStorage.getItem('scan_history') || '{}')
            
            if (history[userId] && history[userId].length > 0) {
              // Get the most recent scan
              setLatestScan(history[userId][0])
            }
          }
        }
        
        // Simulate API delay
        await new Promise(resolve => setTimeout(resolve, 500))
      } catch (error) {
        console.error("Error loading model insights:", error)
        setError("Failed to load model insights. Please try again later.")
      } finally {
        setLoading(false)
        setRetrying(false)
      }
    }
    
    loadData()
    
    // Listen for new scans
    const handleNewScan = () => {
      loadData()
    }
    
    window.addEventListener('emailAnalyzed', handleNewScan)
    
    return () => {
      window.removeEventListener('emailAnalyzed', handleNewScan)
    }
  }, [])

  // Prepare data for charts
  const prepareChartData = (words: any[], limit: number = 10) => {
    return words
      .slice(0, limit)
      .map(item => ({
        word: item.word,
        weight: typeof item.weight === 'number' ? item.weight : parseFloat((item.weight * 100).toFixed(2))
      }))
      .sort((a, b) => a.weight - b.weight)
  }

  const prepareScanInsightData = (words: any[] = [], limit: number = 10) => {
    if (!words || words.length === 0) return []
    
    return words
      .slice(0, limit)
      .map(item => ({
        word: item.word,
        influence: typeof item.influence === 'number' ? 
          item.influence : 
          parseFloat((item.influence * 100).toFixed(2))
      }))
      .sort((a, b) => Math.abs(b.influence) - Math.abs(a.influence))
  }

  const handleRetry = () => {
    setRetrying(true)
    // Reload data
    const loadData = async () => {
      try {
        setLoading(true)
        setError(null)
        
        // Check if user is authenticated
        const authenticated = isAuthenticated()
        setIsAuth(authenticated)
        
        if (authenticated) {
          // Get user ID from localStorage
          const userId = localStorage.getItem('user_id')
          
          if (userId) {
            // Get scan history from localStorage
            const history = JSON.parse(localStorage.getItem('scan_history') || '{}')
            
            if (history[userId] && history[userId].length > 0) {
              // Get the most recent scan
              setLatestScan(history[userId][0])
            }
          }
        }
        
        // Simulate API delay
        await new Promise(resolve => setTimeout(resolve, 500))
      } catch (error) {
        console.error("Error loading model insights:", error)
        setError("Failed to load model insights. Please try again later.")
      } finally {
        setLoading(false)
        setRetrying(false)
      }
    }
    
    loadData()
  }

  const handleAuthSuccess = () => {
    setAuthDialogOpen(false)
    handleRetry()
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center p-6 border rounded-md bg-red-50 text-red-800">
        <AlertCircle className="h-8 w-8 mb-2" />
        <p className="text-center mb-4">{error}</p>
        <Button 
          onClick={handleRetry} 
          disabled={retrying}
          variant="outline"
          className="bg-white"
        >
          {retrying ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Retrying...
            </>
          ) : (
            'Retry'
          )}
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as 'general' | 'specific')} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="general">General Model Insights</TabsTrigger>
          <TabsTrigger value="specific" disabled={!isAuth || !latestScan}>
            Your Latest Scan Insights
            {!isAuth && <span className="ml-2 text-xs">(Login Required)</span>}
            {isAuth && !latestScan && <span className="ml-2 text-xs">(No Scans)</span>}
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="general" className="mt-4">
          <div className="space-y-8">
            <div>
              <h3 className="text-lg font-medium mb-4">Top Spam Indicators</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={prepareChartData(defaultSpamWords)}
                    layout="vertical"
                    margin={{ top: 5, right: 30, left: 80, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" domain={[0, 100]} />
                    <YAxis type="category" dataKey="word" />
                    <Tooltip formatter={(value) => [`${value}%`, "Weight"]} />
                    <Legend />
                    <Bar dataKey="weight" name="Influence %" fill="#ef4444" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-medium mb-4">Top Ham (Non-Spam) Indicators</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={prepareChartData(defaultHamWords)}
                    layout="vertical"
                    margin={{ top: 5, right: 30, left: 80, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" domain={[0, 100]} />
                    <YAxis type="category" dataKey="word" />
                    <Tooltip formatter={(value) => [`${value}%`, "Weight"]} />
                    <Legend />
                    <Bar dataKey="weight" name="Influence %" fill="#22c55e" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="text-sm text-muted-foreground">
              <p>
                These charts show the words that most strongly influence the model's classification decision.
                Higher percentages indicate stronger influence on the spam/ham classification.
              </p>
            </div>
          </div>
        </TabsContent>
        
        <TabsContent value="specific" className="mt-4">
          {!isAuth ? (
            <div className="flex flex-col items-center justify-center p-8 text-center">
              <AlertCircle className="h-12 w-12 text-amber-500 mb-4" />
              <h3 className="text-lg font-medium mb-2">Authentication Required</h3>
              <p className="text-muted-foreground mb-4">
                Please login or register to view specific insights for your scans
              </p>
              <Dialog open={authDialogOpen} onOpenChange={setAuthDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="bg-indigo-600 hover:bg-indigo-700">Login / Register</Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle>Authentication</DialogTitle>
                    <DialogDescription>
                      Login or create an account to access scan insights
                    </DialogDescription>
                  </DialogHeader>
                  <SimplifiedAuth onAuthSuccess={handleAuthSuccess} />
                </DialogContent>
              </Dialog>
            </div>
          ) : latestScan ? (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium mb-2">Latest Scan Analysis</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Showing insights for your most recent scan: {latestScan.prediction === "spam" ? "Spam Detected" : "Ham (Not Spam)"}
                </p>
                
                <div className="p-3 bg-muted rounded-md text-sm mb-6">
                  <strong>Email snippet:</strong> {latestScan.message.substring(0, 100)}...
                </div>
                
                {latestScan.wordInfluence && latestScan.wordInfluence.length > 0 ? (
                  <>
                    <h4 className="text-md font-medium mb-3">Word Influence Analysis</h4>
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={prepareScanInsightData(latestScan.wordInfluence)}
                          layout="vertical"
                          margin={{ top: 5, right: 30, left: 80, bottom: 5 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis 
                            type="number" 
                            domain={[-100, 100]}
                            tickFormatter={(value) => `${Math.abs(value)}%`}
                          />
                          <YAxis type="category" dataKey="word" />
                          <Tooltip 
                            formatter={(value) => {
                              const absValue = Math.abs(Number(value))
                              return [`${absValue}%`, Number(value) >= 0 ? "Spam Indicator" : "Ham Indicator"]
                            }} 
                          />
                          <Legend />
                          <Bar 
                            dataKey="influence" 
                            name="Word Influence" 
                            fill={(data) => data.influence >= 0 ? "#ef4444" : "#22c55e"}
                          />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </>
                ) : (
                  <div className="text-center p-4 border rounded-md">
                    <p>No detailed word influence data available for this scan.</p>
                  </div>
                )}
              </div>
              
              <div className="text-sm text-muted-foreground">
                <p>
                  This chart shows how specific words in your email influenced the classification decision.
                  Positive values (red) indicate words that suggest spam, while negative values (green) suggest legitimate email.
                </p>
              </div>
            </div>
          ) : (
            <div className="text-center p-8">
              <p className="text-muted-foreground">No scan insights available. Try analyzing some emails first.</p>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}