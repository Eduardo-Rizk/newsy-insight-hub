import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Play, FileText, ExternalLink, Sparkles } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

interface AnalysisResult {
  greeting: string;
  summary: string[];
  transcript: string;
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
    
    // Simulate API call for demo purposes
    setTimeout(() => {
      setResult({
        greeting: "Great! I've analyzed your news video and found some interesting insights. Here's what I discovered:",
        summary: [
          "Federal Police investigation reveals deep divisions within Bolsonaro's political movement",
          "New indictments expose internal conflicts and strategic disagreements among supporters",
          "Analysis suggests potential long-term impacts on Brazilian right-wing politics",
          "Expert commentary highlights the significance of recent political developments"
        ],
        transcript: `The video discusses the recent Federal Police investigation and its implications for Brazilian politics. The host analyzes how the indictments have created significant divisions within Bolsonaro's political base, with some supporters distancing themselves while others remain loyal.

The discussion covers the strategic implications of these developments, examining how the investigation findings might reshape the political landscape in Brazil. The analysis includes expert opinions on the potential long-term effects on right-wing politics in the country.

Key points covered include the legal ramifications, political strategy considerations, and the broader impact on Brazilian democracy. The host provides context for understanding these developments within the larger framework of current Brazilian political dynamics.`,
        relatedNews: [
          {
            title: "STF Decision Impacts Bolsonaro's Political Future",
            description: "Supreme Court ruling creates new challenges for former president's political activities and upcoming electoral plans.",
            link: "https://example.com/stf-bolsonaro-decision"
          },
          {
            title: "Brazilian Right-Wing Coalition Shows Signs of Division",
            description: "Internal disagreements emerge as key figures distance themselves from controversial positions and strategies.",
            link: "https://example.com/right-wing-division"
          },
          {
            title: "Federal Police Investigation Continues to Expand",
            description: "New developments in ongoing investigation reveal additional evidence and potential new targets for prosecution.",
            link: "https://example.com/federal-police-expansion"
          }
        ]
      });
      setIsLoading(false);
      toast({
        title: "Analysis Complete",
        description: "Your video has been successfully analyzed!",
      });
    }, 3000);
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

            {/* Transcript */}
            <Card className="shadow-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="w-5 h-5 text-news-primary" />
                  Complete Transcript
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="prose prose-gray max-w-none">
                  <p className="text-foreground leading-relaxed whitespace-pre-line">
                    {result.transcript}
                  </p>
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
          </div>
        )}
      </div>
    </div>
  );
};