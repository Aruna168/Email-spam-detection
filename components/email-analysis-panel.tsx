"use client"

import type React from "react"
import { useState } from "react"
import { AlertCircle, ChevronDown, FileUp, Globe, Loader2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { toast } from "sonner"
import { isAuthenticated } from "@/lib/api"
import { SimplifiedAuth } from "./simplified-auth"

// More comprehensive spam detection model
const spamKeywords = [
  // Common spam words with weights
  { word: 'free', weight: 0.7 },
  { word: 'winner', weight: 0.8 },
  { word: 'congratulations', weight: 0.6 },
  { word: 'prize', weight: 0.7 },
  { word: 'money', weight: 0.5 },
  { word: 'offer', weight: 0.5 },
  { word: 'limited', weight: 0.5 },
  { word: 'urgent', weight: 0.6 },
  { word: 'viagra', weight: 0.9 },
  { word: 'click', weight: 0.5 },
  { word: 'cash', weight: 0.6 },
  { word: 'guarantee', weight: 0.5 },
  { word: 'credit', weight: 0.4 },
  { word: 'investment', weight: 0.4 },
  { word: 'million', weight: 0.7 },
  { word: 'discount', weight: 0.5 },
  { word: 'save', weight: 0.4 },
  { word: 'buy', weight: 0.3 },
  { word: 'subscribe', weight: 0.3 },
  { word: 'casino', weight: 0.8 },
  { word: 'lottery', weight: 0.8 },
  { word: 'bonus', weight: 0.6 },
  { word: 'promotion', weight: 0.5 },
  { word: 'pills', weight: 0.8 },
  { word: 'medication', weight: 0.7 },
  { word: 'pharmacy', weight: 0.7 },
  { word: 'debt', weight: 0.6 },
  { word: 'loan', weight: 0.5 },
  { word: 'bitcoin', weight: 0.6 },
  { word: 'crypto', weight: 0.6 }
];

// Phrases that strongly indicate spam
const spamPhrases = [
  "act now",
  "limited time",
  "don't miss",
  "click here",
  "risk free",
  "satisfaction guaranteed",
  "no obligation",
  "no risk",
  "100% free",
  "best price",
  "cash bonus",
  "double your",
  "earn extra",
  "extra cash",
  "free access",
  "free consultation",
  "free gift",
  "free info",
  "free offer",
  "free trial",
  "great offer",
  "increase sales",
  "lose weight",
  "no credit check",
  "no fees",
  "no hidden costs",
  "order now",
  "special promotion",
  "while supplies last",
  "winner"
];

// Words that indicate legitimate email
const hamKeywords = [
  { word: 'meeting', weight: 0.6 },
  { word: 'report', weight: 0.5 },
  { word: 'project', weight: 0.5 },
  { word: 'schedule', weight: 0.6 },
  { word: 'update', weight: 0.4 },
  { word: 'document', weight: 0.5 },
  { word: 'team', weight: 0.4 },
  { word: 'regards', weight: 0.5 },
  { word: 'sincerely', weight: 0.5 },
  { word: 'thanks', weight: 0.4 },
  { word: 'please', weight: 0.3 },
  { word: 'review', weight: 0.4 },
  { word: 'discuss', weight: 0.5 },
  { word: 'agenda', weight: 0.6 },
  { word: 'minutes', weight: 0.5 }
];

// Function to analyze email content
function analyzeEmail(content: string) {
  const lowercaseContent = content.toLowerCase();
  let spamScore = 0;
  let hamScore = 0;
  let totalWeight = 0;
  
  // Check for spam keywords
  const matchedSpamWords = [];
  for (const keyword of spamKeywords) {
    const regex = new RegExp(`\\b${keyword.word}\\b`, 'gi');
    const matches = lowercaseContent.match(regex);
    if (matches) {
      const count = matches.length;
      spamScore += keyword.weight * count;
      totalWeight += keyword.weight * count;
      matchedSpamWords.push({ word: keyword.word, influence: keyword.weight * count });
    }
  }
  
  // Check for spam phrases
  for (const phrase of spamPhrases) {
    if (lowercaseContent.includes(phrase)) {
      spamScore += 0.8;
      totalWeight += 0.8;
      matchedSpamWords.push({ word: phrase, influence: 0.8 });
    }
  }
  
  // Check for ham keywords
  const matchedHamWords = [];
  for (const keyword of hamKeywords) {
    const regex = new RegExp(`\\b${keyword.word}\\b`, 'gi');
    const matches = lowercaseContent.match(regex);
    if (matches) {
      const count = matches.length;
      hamScore += keyword.weight * count;
      totalWeight += keyword.weight * count;
      matchedHamWords.push({ word: keyword.word, influence: -keyword.weight * count });
    }
  }
  
  // Additional heuristics
  
  // Check for excessive capitalization
  const capitalizedChars = content.replace(/[^A-Z]/g, '').length;
  const totalChars = content.replace(/\s/g, '').length;
  if (totalChars > 0 && capitalizedChars / totalChars > 0.3) {
    spamScore += 0.7;
    totalWeight += 0.7;
    matchedSpamWords.push({ word: "EXCESSIVE CAPS", influence: 0.7 });
  }
  
  // Check for excessive punctuation
  const exclamationCount = (content.match(/!/g) || []).length;
  if (exclamationCount > 3) {
    spamScore += 0.5;
    totalWeight += 0.5;
    matchedSpamWords.push({ word: "!!!", influence: 0.5 });
  }
  
  // Check for URLs
  const urlCount = (content.match(/https?:\/\/|www\./g) || []).length;
  if (urlCount > 0) {
    spamScore += 0.4 * urlCount;
    totalWeight += 0.4 * urlCount;
    matchedSpamWords.push({ word: "URLs", influence: 0.4 * urlCount });
  }
  
  // Calculate final score
  let finalScore = 0.5; // Default neutral score
  if (totalWeight > 0) {
    finalScore = spamScore / totalWeight;
  }
  
  // Combine matched words for word influence
  const wordInfluence = [...matchedSpamWords, ...matchedHamWords].sort((a, b) => 
    Math.abs(b.influence) - Math.abs(a.influence)
  );
  
  // Determine if it's spam based on the score
  const isSpam = finalScore > 0.5;
  const confidence = Math.abs(finalScore - 0.5) * 2; // Convert to 0-1 range
  
  return {
    prediction: isSpam ? "spam" : "ham",
    confidence: Math.min(0.98, 0.5 + confidence), // Cap at 98%
    wordInfluence: wordInfluence
  };
}

export function EmailAnalysisPanel() {
  const [emailContent, setEmailContent] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [selectedModel, setSelectedModel] = useState("Enhanced Naive Bayes")
  const [translateToEnglish, setTranslateToEnglish] = useState(false)
  const [detectedLanguage, setDetectedLanguage] = useState<string | null>(null)
  const [authDialogOpen, setAuthDialogOpen] = useState(false)

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = (event) => {
        if (event.target?.result) {
          setEmailContent(event.target.result as string)
          // Simulate language detection
          setTimeout(() => {
            setDetectedLanguage("English")
          }, 500)
        }
      }
      reader.readAsText(file)
    }
  }

  const handleSubmit = async () => {
    if (!emailContent.trim()) return

    // Check if user is authenticated
    if (!isAuthenticated()) {
      setAuthDialogOpen(true)
      return
    }

    setIsLoading(true)
    try {
      // Simulate processing time
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Analyze the email content
      const analysis = analyzeEmail(emailContent);
      
      // Format the result for the frontend
      const result = {
        prediction: analysis.prediction,
        confidence: analysis.confidence,
        probabilities: [
          { label: 'spam', value: analysis.prediction === 'spam' ? analysis.confidence : 1 - analysis.confidence },
          { label: 'ham', value: analysis.prediction === 'ham' ? analysis.confidence : 1 - analysis.confidence }
        ]
      }
      
      // Dispatch an event that the results panel can listen for
      const event = new CustomEvent("emailAnalyzed", { 
        detail: { result, model: selectedModel } 
      })
      window.dispatchEvent(event)
      
      // Save to history in localStorage
      const userId = localStorage.getItem('user_id');
      if (userId) {
        const history = JSON.parse(localStorage.getItem('scan_history') || '{}');
        if (!history[userId]) {
          history[userId] = [];
        }
        
        // Add scan to history
        const scanId = `scan-${Date.now()}`;
        history[userId].unshift({
          id: scanId,
          message: emailContent,
          prediction: result.prediction,
          confidence: Math.round(result.confidence * 100),
          timestamp: new Date().toISOString(),
          wordInfluence: analysis.wordInfluence
        });
        
        // Keep only the last 50 entries
        if (history[userId].length > 50) {
          history[userId] = history[userId].slice(0, 50);
        }
        
        localStorage.setItem('scan_history', JSON.stringify(history));
      }
      
      // Show success toast
      toast.success("Email analyzed successfully", {
        description: `Prediction: ${result.prediction} (${Math.round(result.confidence * 100)}% confidence)`
      })
    } catch (error) {
      console.error("Error analyzing email:", error)
      
      // Dispatch error event
      const event = new CustomEvent("apiError", { 
        detail: { message: "Failed to analyze email. Please try again later." } 
      })
      window.dispatchEvent(event)
      
      // Show error toast
      toast.error("Failed to analyze email", {
        description: "An error occurred while analyzing the email."
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setEmailContent(e.target.value)
    if (e.target.value.trim()) {
      // Simulate language detection when text changes
      setTimeout(() => {
        setDetectedLanguage("English")
      }, 500)
    } else {
      setDetectedLanguage(null)
    }
  }

  const handleAuthSuccess = () => {
    setAuthDialogOpen(false)
    // Try to submit again after successful authentication
    handleSubmit()
  }

  return (
    <>
      <Card className="h-full">
        <CardHeader>
          <CardTitle>Email Analysis</CardTitle>
          <CardDescription>Paste an email or upload a file to analyze for spam content.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email-content">Email Content</Label>
            <Textarea
              id="email-content"
              placeholder="Paste your email content here..."
              className="min-h-[200px] resize-none"
              value={emailContent}
              onChange={handleTextChange}
            />
          </div>

          <div className="flex flex-wrap gap-4 items-center justify-between">
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => document.getElementById("file-upload")?.click()}>
                <FileUp className="mr-2 h-4 w-4" />
                Upload File
              </Button>
              <input id="file-upload" type="file" accept=".txt,.eml" className="hidden" onChange={handleFileUpload} />
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <AlertCircle className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Supported file formats: .txt, .eml</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  Model: {selectedModel}
                  <ChevronDown className="ml-2 h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={() => setSelectedModel("Enhanced Naive Bayes")}>
                  Enhanced Naive Bayes
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setSelectedModel("Advanced Heuristic Model")}>
                  Advanced Heuristic Model
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {detectedLanguage && (
            <div className="flex items-center justify-between border rounded-md p-3 bg-muted/50">
              <div className="flex items-center gap-2">
                <Globe className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">
                  Detected Language: <strong>{detectedLanguage}</strong>
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Label htmlFor="translate" className="text-sm cursor-pointer">
                  Translate to English
                </Label>
                <Switch
                  id="translate"
                  checked={translateToEnglish}
                  onCheckedChange={setTranslateToEnglish}
                  disabled={detectedLanguage === "English"}
                />
              </div>
            </div>
          )}
        </CardContent>
        <CardFooter>
          <Button
            className="w-full bg-indigo-600 hover:bg-indigo-700"
            onClick={handleSubmit}
            disabled={!emailContent.trim() || isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Analyzing...
              </>
            ) : (
              "Check Spam"
            )}
          </Button>
        </CardFooter>
      </Card>

      {/* Authentication Dialog */}
      <Dialog open={authDialogOpen} onOpenChange={setAuthDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Authentication Required</DialogTitle>
            <DialogDescription>
              Please login or register to analyze emails
            </DialogDescription>
          </DialogHeader>
          <SimplifiedAuth onAuthSuccess={handleAuthSuccess} />
        </DialogContent>
      </Dialog>
    </>
  )
}