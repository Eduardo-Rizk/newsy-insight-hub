import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Play, FileText, ExternalLink, Sparkles } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

interface AnalysisResult {
  greeting: string;
  summary: string[];
  summaryText?: string;
  transcript?: string;
  relatedNews: {
    title: string;
    description: string;
    link: string;
  }[];
}

export const NewsAnalyzer = () => {
  const [url, setUrl] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const { toast } = useToast();

  const isValidYouTubeUrl = (url: string) => {
    const youtubeRegex = /^(https?:\/\/)?(www\.)?(youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/v\/)/;
    return youtubeRegex.test(url);
  };

  const handleAnalyze = async () => {
    if (!url.trim()) {
      toast({
        title: "URL Required",
        description: "Please enter a YouTube video URL",
        variant: "destructive",
      });
      return;
    }

    if (!isValidYouTubeUrl(url)) {
      toast({
        title: "Invalid URL",
        description: "Please enter a valid YouTube URL",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const base = (import.meta as any).env?.VITE_API_BASE 
        || (typeof window !== 'undefined' && window.location?.port === '5173' ? 'http://localhost:3001' : '');
      const resp = await fetch(`${base}/api/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      });
      // Handle possible empty body (e.g., 404 with no JSON)
      let data: any = null;
      const ct = resp.headers.get('content-type') || '';
      if (ct.includes('application/json')) {
        data = await resp.json();
      } else {
        const text = await resp.text();
        try { data = JSON.parse(text); } catch { data = { error: text || null }; }
      }
      if (!resp.ok) throw new Error(data?.error || `Request failed: ${resp.status}`);
      const payload: AnalysisResult = {
        greeting: data.greeting,
        summary: data.summary,
        summaryText: data.summaryText || data.summary_text || '',
        transcript: data.transcript,
        relatedNews: data.relatedNews || [],
      };
      setResult(payload);
      toast({ title: 'Analysis Complete', description: 'Your video has been successfully analyzed!' });
    } catch (e: any) {
      toast({ title: 'Analysis Failed', description: e?.message || 'Unexpected error', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-secondary/20">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 bg-gradient-hero text-primary-foreground px-4 py-2 rounded-full mb-4">
            <Sparkles className="w-4 h-4" />
            <span className="text-sm font-medium">AI-Powered News Analysis</span>
          </div>
          <h1 className="text-4xl font-bold text-foreground mb-4">
            News Video Analyzer
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Transform YouTube news videos into comprehensive insights. Get transcripts, summaries, and related articles in seconds.
          </p>
        </div>

        {/* Input Form */}
        <Card className="mb-8 shadow-elegant border-0 bg-gradient-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Play className="w-5 h-5 text-news-primary" />
              Analyze News Video
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4">
              <Input
                type="url"
                placeholder="Paste your YouTube video URL here..."
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                className="flex-1 h-12 text-base border-2 focus:border-news-primary transition-all"
                disabled={isLoading}
              />
              <Button
                onClick={handleAnalyze}
                disabled={isLoading}
                className="px-8 h-12 bg-gradient-hero hover:opacity-90 transition-all shadow-button"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Analyzing...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 mr-2" />
                    Analyze
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Loading State */}
        {isLoading && (
          <Card className="mb-8 shadow-card">
            <CardContent className="py-12">
              <div className="text-center">
                <Loader2 className="w-12 h-12 mx-auto mb-4 animate-spin text-news-primary" />
                <h3 className="text-xl font-semibold mb-2">Processing Your Video</h3>
                <p className="text-muted-foreground">
                  This may take a few moments while we transcribe and analyze the content...
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Results */}
        {result && !isLoading && (
          <div className="space-y-6">
            {/* Greeting */}
            <Card className="shadow-card border-0 bg-gradient-card">
              <CardContent className="py-6">
                <p className="text-lg text-foreground leading-relaxed">
                  {result.greeting}
                </p>
              </CardContent>
            </Card>

            {/* Summary */}
            <Card className="shadow-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="w-5 h-5 text-news-primary" />
                  Summary of Topics Mentioned
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3">
                  {result.summary.map((point, index) => (
                    <li key={index} className="flex items-start gap-3">
                      <Badge variant="secondary" className="mt-1 min-w-fit">
                        {index + 1}
                      </Badge>
                      <span className="text-foreground leading-relaxed">{point}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            {/* Analytical Summary */}
            <Card className="shadow-card border-0 bg-gradient-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="w-5 h-5 text-news-primary" />
                  Analytical Summary
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="prose prose-gray max-w-none text-base md:text-lg text-foreground leading-relaxed space-y-4">
                  {(result.summaryText || (result.summary?.length ? result.summary.join(" ") : ""))
                    .split(/\n\n+/)
                    .filter(Boolean)
                    .slice(0, 10)
                    .map((p, i) => (
                      <p key={i}>{p.trim()}</p>
                    ))}
                </div>
              </CardContent>
            </Card>

            {/* Related News */}
            <Card className="shadow-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ExternalLink className="w-5 h-5 text-news-primary" />
                  Related News Articles
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4">
                  {result.relatedNews.map((article, index) => (
                    <div
                      key={index}
                      className="p-4 border border-border rounded-lg hover:shadow-card transition-all cursor-pointer group"
                      onClick={() => window.open(article.link, '_blank')}
                    >
                      <h4 className="font-semibold text-foreground mb-2 group-hover:text-news-primary transition-colors">
                        {article.title}
                      </h4>
                      <p className="text-muted-foreground text-sm mb-3 leading-relaxed">
                        {article.description}
                      </p>
                      <div className="flex items-center gap-2 text-news-primary text-sm">
                        <ExternalLink className="w-3 h-3" />
                        <span>Read full article</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Full Transcript (collapsible) */}
            <Card className="shadow-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="w-5 h-5 text-news-primary" />
                  Transcrição Completa
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Accordion type="single" collapsible className="w-full">
                  <AccordionItem value="transcript">
                    <AccordionTrigger className="px-4 rounded-md bg-secondary/30 hover:bg-secondary/50">
                      {result.transcript ? 'Clique para abrir a transcrição' : 'Transcrição indisponível'}
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="prose prose-gray max-w-none">
                        <p className="text-foreground leading-relaxed whitespace-pre-line">
                          {result.transcript || ''}
                        </p>
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
};
