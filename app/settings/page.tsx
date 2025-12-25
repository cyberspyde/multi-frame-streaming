'use client'

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useToast } from "@/hooks/use-toast";
import Link from "next/link";

type ScrapeMode = "ytdlp" | "legacy";

export default function SettingsPage() {
  const [mode, setMode] = useState<ScrapeMode>("ytdlp");
  const { toast } = useToast();

  useEffect(() => {
    if (typeof window === "undefined") return;
    const saved = window.localStorage.getItem("scrapeMode");
    if (saved === "legacy" || saved === "ytdlp") {
      setMode(saved);
    }
  }, []);

  const handleSave = () => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem("scrapeMode", mode);
    toast({
      title: "Settings saved",
      description: `Scraper set to ${mode}.`,
    });
  };

  return (
    <main className="max-w-3xl mx-auto px-4 py-10 flex flex-col gap-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm text-zinc-500 font-mono">HYPERSTREAM // SETTINGS</p>
          <h1 className="text-3xl font-black tracking-tight text-white">Scraper Preferences</h1>
          <p className="text-sm text-zinc-500 mt-1">Choose which engine to use when scanning pages for videos.</p>
        </div>
        <Link href="/" className="text-sm text-primary hover:underline">Back to Dashboard</Link>
      </div>

      <Card className="bg-zinc-950 border-zinc-800 text-white">
        <CardHeader>
          <CardTitle className="text-lg">Scraping engine</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <RadioGroup value={mode} onValueChange={(val) => setMode(val as ScrapeMode)} className="space-y-3">
            <div className="flex items-start gap-3">
              <RadioGroupItem id="ytdlp" value="ytdlp" />
              <div>
                <Label htmlFor="ytdlp" className="text-white">yt-dlp (default)</Label>
                <p className="text-xs text-zinc-500">Best for YouTube and many streaming sites via yt-dlp extraction.</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <RadioGroupItem id="legacy" value="legacy" />
              <div>
                <Label htmlFor="legacy" className="text-white">Legacy (HTML scan)</Label>
                <p className="text-xs text-zinc-500">Lightweight static scan of og:video, video/source, direct links.</p>
              </div>
            </div>
          </RadioGroup>

          <div className="flex gap-3 pt-2">
            <Button onClick={handleSave} className="bg-primary hover:bg-primary/90">Save</Button>
            <Button variant="outline" onClick={() => setMode("ytdlp")} className="border-primary/30 text-primary">Reset to default</Button>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
