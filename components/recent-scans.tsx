"use client"

import { useEffect, useState } from "react"
import { Download, FileText, MoreHorizontal, Loader2, AlertCircle } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { isAuthenticated } from "@/lib/api"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { SimplifiedAuth } from "./simplified-auth"

interface ScanHistoryItem {
  id: string;
  message: string;
  prediction: string;
  confidence: number;
  timestamp: string;
}

export function RecentScans() {
  const [scans, setScans] = useState<ScanHistoryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedScan, setSelectedScan] = useState<ScanHistoryItem | null>(null)
  const [detailsOpen, setDetailsOpen] = useState(false)
  const [isAuth, setIsAuth] = useState(false)
  const [authDialogOpen, setAuthDialogOpen] = useState(false)

  const loadScanHistory = async () => {
    try {
      setLoading(true)
      setError(null)
      
      // Check if user is authenticated
      const authenticated = isAuthenticated()
      setIsAuth(authenticated)
      
      if (!authenticated) {
        setLoading(false)
        return
      }
      
      // Get user ID from localStorage
      const userId = localStorage.getItem('user_id')
      
      if (!userId) {
        setError("User ID not found")
        setLoading(false)
        return
      }
      
      // Get scan history from localStorage
      const history = JSON.parse(localStorage.getItem('scan_history') || '{}')
      
      if (history[userId]) {
        setScans(history[userId])
      } else {
        setScans([])
      }
    } catch (error) {
      console.error("Error fetching scan history:", error)
      setError("Failed to load scan history. Please try again later.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadScanHistory()
    
    // Listen for new scans
    const handleNewScan = () => {
      loadScanHistory()
    }
    
    window.addEventListener('emailAnalyzed', handleNewScan)
    
    return () => {
      window.removeEventListener('emailAnalyzed', handleNewScan)
    }
  }, [])

  const handleViewDetails = (scan: ScanHistoryItem) => {
    setSelectedScan(scan)
    setDetailsOpen(true)
  }

  const handleAuthSuccess = () => {
    setAuthDialogOpen(false)
    loadScanHistory()
  }

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString)
      return date.toLocaleString()
    } catch (e) {
      return dateString
    }
  }

  if (!isAuth) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center">
        <AlertCircle className="h-12 w-12 text-amber-500 mb-4" />
        <h3 className="text-lg font-medium mb-2">Authentication Required</h3>
        <p className="text-muted-foreground mb-4">
          Please login or register to view your scan history
        </p>
        <Dialog open={authDialogOpen} onOpenChange={setAuthDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-indigo-600 hover:bg-indigo-700">Login / Register</Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Authentication</DialogTitle>
              <DialogDescription>
                Login or create an account to access your scan history
              </DialogDescription>
            </DialogHeader>
            <SimplifiedAuth onAuthSuccess={handleAuthSuccess} />
          </DialogContent>
        </Dialog>
      </div>
    )
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
          onClick={loadScanHistory} 
          variant="outline"
          className="bg-white"
        >
          Retry
        </Button>
      </div>
    )
  }

  if (scans.length === 0) {
    return (
      <div className="text-center p-8">
        <p className="text-muted-foreground">No scan history available. Try analyzing some emails first.</p>
      </div>
    )
  }

  return (
    <>
      <div className="w-full overflow-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[100px]">ID</TableHead>
              <TableHead>Email Snippet</TableHead>
              <TableHead className="w-[100px]">Result</TableHead>
              <TableHead className="w-[100px]">Confidence</TableHead>
              <TableHead className="w-[150px]">Timestamp</TableHead>
              <TableHead className="w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {scans.map((scan) => (
              <TableRow key={scan.id} className="group">
                <TableCell className="font-medium">{scan.id.substring(0, 8)}</TableCell>
                <TableCell className="max-w-[300px] truncate">{scan.message.substring(0, 50)}...</TableCell>
                <TableCell>
                  <Badge
                    variant="outline"
                    className={
                      scan.prediction === "spam"
                        ? "bg-red-100 text-red-800 hover:bg-red-200"
                        : "bg-green-100 text-green-800 hover:bg-green-200"
                    }
                  >
                    {scan.prediction}
                  </Badge>
                </TableCell>
                <TableCell>{scan.confidence}%</TableCell>
                <TableCell className="text-sm text-muted-foreground">{formatDate(scan.timestamp)}</TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100">
                        <MoreHorizontal className="h-4 w-4" />
                        <span className="sr-only">Actions</span>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleViewDetails(scan)}>
                        <FileText className="mr-2 h-4 w-4" />
                        <span>View Details</span>
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <Download className="mr-2 h-4 w-4" />
                        <span>Download Report</span>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Scan Details Dialog */}
      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="sm:max-w-[700px]">
          <DialogHeader>
            <DialogTitle>Scan Details</DialogTitle>
            <DialogDescription>
              Detailed analysis of the scanned email
            </DialogDescription>
          </DialogHeader>
          {selectedScan && (
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-medium mb-1">Scan ID</h3>
                <p className="text-sm text-muted-foreground">{selectedScan.id}</p>
              </div>
              
              <div>
                <h3 className="text-sm font-medium mb-1">Timestamp</h3>
                <p className="text-sm text-muted-foreground">{formatDate(selectedScan.timestamp)}</p>
              </div>
              
              <div>
                <h3 className="text-sm font-medium mb-1">Email Content</h3>
                <div className="p-3 bg-muted rounded-md text-sm max-h-[200px] overflow-auto">
                  {selectedScan.message}
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h3 className="text-sm font-medium mb-1">Result</h3>
                  <Badge
                    variant="outline"
                    className={
                      selectedScan.prediction === "spam"
                        ? "bg-red-100 text-red-800"
                        : "bg-green-100 text-green-800"
                    }
                  >
                    {selectedScan.prediction}
                  </Badge>
                </div>
                
                <div>
                  <h3 className="text-sm font-medium mb-1">Confidence</h3>
                  <p className="text-sm">{selectedScan.confidence}%</p>
                </div>
              </div>
              
              <div className="flex justify-end pt-4">
                <Button variant="outline" onClick={() => setDetailsOpen(false)}>
                  Close
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}