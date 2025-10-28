'use client';

import { useState } from 'react';
import { Download, Share2, FileText, Loader2, RefreshCw, BotMessageSquare, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { generatePdfAction } from './actions';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

export default function Home() {
  const [isLoading, setIsLoading] = useState(false);
  const [pdfData, setPdfData] = useState<{ file: string; fileName: string } | null>(null);
  const [isViewerOpen, setIsViewerOpen] = useState(false);

  const handleGenerate = async () => {
    setIsLoading(true);
    setPdfData(null);
    try {
      const result = await generatePdfAction();
      setPdfData(result);
    } catch (error) {
      console.error(error);
      // Optionally, show a toast notification for the error
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = () => {
    setPdfData(null);
  };

  const whatsappShareUrl = `https://wa.me/?text=${encodeURIComponent(
    "I just created a PDF with WhatsPDF!"
  )}`;

  return (
    <main className="flex min-h-screen w-full items-center justify-center bg-background p-4 sm:p-6">
      <Card className="w-full max-w-md shadow-xl rounded-2xl overflow-hidden border-2 border-primary/10">
        <CardHeader className="bg-card/80">
          <div className="flex items-center gap-4">
              <div className="p-3 bg-primary/10 rounded-xl">
                  <BotMessageSquare className="h-8 w-8 text-primary" />
              </div>
              <div>
                  <CardTitle className="font-headline text-3xl tracking-tight">WhatsPDF</CardTitle>
                  <CardDescription className="mt-1">Generate a PDF and share it with the world.</CardDescription>
              </div>
          </div>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center space-y-6 p-8 min-h-[220px]">
          {!pdfData && !isLoading && (
            <Button size="lg" onClick={handleGenerate} className="rounded-full shadow-lg hover:shadow-primary/30 transition-shadow">
              <FileText className="mr-2 h-5 w-5" />
              Generate PDF
            </Button>
          )}
          {isLoading && (
            <div className="flex flex-col items-center gap-4 text-center">
              <Loader2 className="h-12 w-12 animate-spin text-primary" />
              <p className="text-muted-foreground font-medium">Generating your PDF...</p>
              <p className="text-sm text-muted-foreground/80">This should only take a moment.</p>
            </div>
          )}
          {pdfData && !isLoading && (
            <div className="flex flex-col items-center gap-4 text-center">
              <div className="p-4 bg-green-500/10 rounded-full">
                <FileText className="h-12 w-12 text-green-500" />
              </div>
              <div >
                <p className="font-semibold text-lg text-foreground">Your PDF is ready!</p>
                <p className="text-sm text-muted-foreground font-code">{pdfData.fileName}</p>
              </div>
            </div>
          )}
        </CardContent>
        {pdfData && !isLoading && (
          <CardFooter className="flex-col sm:flex-row gap-3 p-4 bg-muted/50 border-t">
            <Dialog open={isViewerOpen} onOpenChange={setIsViewerOpen}>
              <DialogTrigger asChild>
                <Button variant="secondary" className="w-full rounded-lg">
                  <Eye className="mr-2 h-4 w-4" /> View
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-4xl h-[90vh] p-0">
                <DialogHeader className="p-4 border-b">
                  <DialogTitle>{pdfData.fileName}</DialogTitle>
                </DialogHeader>
                <div className="h-full">
                  <iframe
                    src={`data:application/pdf;base64,${pdfData.file}`}
                    className="w-full h-full"
                    title={pdfData.fileName}
                  />
                </div>
              </DialogContent>
            </Dialog>
            <Button asChild className="w-full rounded-lg">
              <a href={`data:application/pdf;base64,${pdfData.file}`} download={pdfData.fileName}>
                <Download className="mr-2 h-4 w-4" /> Download
              </a>
            </Button>
            <Button asChild variant="outline" className="w-full rounded-lg">
              <a href={whatsappShareUrl} target="_blank" rel="noopener noreferrer">
                <Share2 className="mr-2 h-4 w-4" /> Share
              </a>
            </Button>
            <Button variant="ghost" size="icon" onClick={handleReset} className="rounded-lg">
              <RefreshCw className="h-5 w-5" />
              <span className="sr-only">Generate New</span>
            </Button>
          </CardFooter>
        )}
      </Card>
    </main>
  );
}
