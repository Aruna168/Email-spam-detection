"use client"

import { useEffect, useState } from "react"
import { AlertCircle, CheckCircle2, Clock, Loader2 } from "lucide-react"

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"

interface AnalysisResult {
  prediction: string
  confidence: number
  probabilities: Array<{ label: string; value: number }>
}

export function ResultsPanel() {
  const [result, setResult] = useState<AnalysisResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [model, setModel] = useState<string>("Multinomial Naive Bayes")
  const [apiStatus, setApiStatus] = useState<'checking' | 'online' | 'offline'>('checking')

  useEffect(() => {
    // Listen for the custom event from the EmailAnalysisPanel
    const handleEmailAnalyzed = (event: CustomEvent<{ result: AnalysisResult; model: string }>) => {
      setResult(event.detail.result)
      setModel(event.detail.model)
      setError(null)
      // If we successfully got a result, the API must be online
      setApiStatus('online')
    }

    // Listen for API errors
    const handleApiError = (event: CustomEvent<{ message: string }>) => {
      setError(event.detail.message)
      setResult(null)
      // If we got an API error, the API might be offline
      setApiStatus('offline')
    }

    // Add event listeners
    window.addEventListener("emailAnalyzed", handleEmailAnalyzed as EventListener)
    window.addEventListener("apiError", handleApiError as EventListener)

    // Check API health on component mount, but don't block rendering
    const checkApiHealth = async () => {
      try {
        // Dynamically import to avoid SSR issues
        const apiModule = await import("@/lib/api")
        const isHealthy = await apiModule.checkApiHealth()
        setApiStatus(isHealthy ? 'online' : 'offline')
        
        if (!isHealthy) {
          setError("API service is currently unavailable. Please make sure the Flask server is running.")
        }
      } catch (err) {
        console.error("API health check error:", err)
        setApiStatus('offline')
        setError("Could not connect to API service. Please make sure the Flask server is running.")
      }
    }
    
    // Use a timeout to delay the health check slightly
    const timer = setTimeout(() => {
      checkApiHealth()
    }, 1000)

    // Clean up event listeners and timer
    return () => {
      window.removeEventListener("emailAnalyzed", handleEmailAnalyzed as EventListener)
      window.removeEventListener("apiError", handleApiError as EventListener)
      clearTimeout(timer)
    }
  }, [])

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>Analysis Results</CardTitle>
        <CardDescription>
          Spam detection results will appear here after analysis.
          {apiStatus === 'checking' && " Checking API status..."}
          {apiStatus === 'offline' && " API is currently offline."}
          {apiStatus === 'online' && " API is online and ready."}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col items-center justify-center h-[300px]">
        {loading ? (
          <div className="flex flex-col items-center justify-center space-y-4">
            <Loader2 className="h-12 w-12 animate-spin text-indigo-600" />
            <p className="text-lg font-medium">Analyzing email content...</p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center space-y-4 text-center">
            <AlertCircle className="h-12 w-12 text-red-500" />
            <div>
              <p className="text-lg font-medium">Error</p>
              <p className="text-muted-foreground">{error}</p>
              {apiStatus === 'offline' && (
                <div className="mt-4 text-sm">
                  <p>To start the Flask server, run:</p>
                  <pre className="bg-gray-100 p-2 rounded mt-2">npm run backend</pre>
                  <p className="mt-2">Or directly with Python:</p>
                  <pre className="bg-gray-100 p-2 rounded mt-2">python app.py</pre>
                </div>
              )}
            </div>
          </div>
        ) : !result ? (
          <div className="flex flex-col items-center justify-center space-y-4 text-center">
            <Clock className="h-12 w-12 text-muted-foreground" />
            <div>
              <p className="text-lg font-medium">No Analysis Yet</p>
              <p className="text-muted-foreground">Submit an email to see results</p>
            </div>
          </div>
        ) : (
          <div className="w-full space-y-6">
            <div className="flex flex-col items-center space-y-2">
              {result.prediction === "spam" ? (
                <AlertCircle className="h-12 w-12 text-red-500" />
              ) : (
                <CheckCircle2 className="h-12 w-12 text-green-500" />
              )}
              <h3 className="text-2xl font-bold">
                {result.prediction === "spam" ? "Spam Detected" : "Ham (Not Spam)"}
              </h3>
              <p className="text-muted-foreground">
                Model: {model}
              </p>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm font-medium">Confidence</span>
                <span className="text-sm font-medium">{Math.round(result.confidence * 100)}%</span>
              </div>
              <Progress
                value={result.confidence * 100}
                className={result.prediction === "spam" ? "bg-red-100" : "bg-green-100"}
              />
            </div>

            <div className="space-y-2">
              <h4 className="text-sm font-medium">Probability Distribution</h4>
              <div className="space-y-1">
                {result.probabilities?.map((prob) => (
                  <div key={prob.label} className="flex justify-between">
                    <span className="text-sm">{prob.label}</span>
                    <span className="text-sm font-medium">{Math.round(prob.value * 100)}%</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </CardContent>
      <CardFooter className="text-xs text-muted-foreground">
        Results are based on machine learning models and may not be 100% accurate.
      </CardFooter>
    </Card>
  )
}