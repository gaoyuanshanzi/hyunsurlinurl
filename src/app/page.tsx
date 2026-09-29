"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  ArrowLeft,
  ArrowRight,
  RotateCw,
  Home,
  Globe,
  Lock,
  Search,
  Maximize2,
  Minimize2,
  ExternalLink,
  ShieldCheck,
  Layers,
  ChevronRight
} from "lucide-react";

export default function HomeBrowser() {
  const [inputUrl, setInputUrl] = useState("https://www.dropbox.com");
  const [currentUrl, setCurrentUrl] = useState("https://www.dropbox.com");
  const [pageTitle, setPageTitle] = useState("Dropbox");
  const [isLoading, setIsLoading] = useState(false);
  const [isProxyMode, setIsProxyMode] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [historyStack, setHistoryStack] = useState<string[]>(["https://www.dropbox.com"]);
  const [historyIndex, setHistoryIndex] = useState(0);
  const [windowPreset, setWindowPreset] = useState<"standard" | "compact" | "wide">("standard");

  const iframeRef = useRef<HTMLIFrameElement>(null);
  const loadingTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Normalize URL helper
  const normalizeUrl = (raw: string) => {
    let clean = raw.trim();
    if (!clean) return "https://www.dropbox.com";
    if (!/^https?:\/\//i.test(clean)) {
      clean = `https://${clean}`;
    }
    return clean;
  };

  // Compute actual iframe src
  const getIframeSrc = (url: string, useProxy: boolean) => {
    if (!url) return "about:blank";
    if (useProxy) {
      return `/api/proxy?url=${encodeURIComponent(url)}`;
    }
    return url;
  };

  const startLoadingState = () => {
    setIsLoading(true);
    if (loadingTimerRef.current) clearTimeout(loadingTimerRef.current);
    // Fallback: stop loading bar after 8 seconds in case external site assets take time
    loadingTimerRef.current = setTimeout(() => {
      setIsLoading(false);
    }, 8000);
  };

  const stopLoadingState = () => {
    setIsLoading(false);
    if (loadingTimerRef.current) {
      clearTimeout(loadingTimerRef.current);
      loadingTimerRef.current = null;
    }
  };

  // Handle URL navigation submit
  const handleNavigate = (target?: string) => {
    const nextUrl = normalizeUrl(target || inputUrl);
    setInputUrl(nextUrl);
    setCurrentUrl(nextUrl);
    startLoadingState();

    // Update history
    setHistoryStack((prev) => {
      const upToCurrent = prev.slice(0, historyIndex + 1);
      return [...upToCurrent, nextUrl];
    });
    setHistoryIndex((prev) => prev + 1);
  };

  // History Back
  const handleBack = () => {
    if (historyIndex > 0) {
      const prevUrl = historyStack[historyIndex - 1];
      setHistoryIndex(historyIndex - 1);
      setInputUrl(prevUrl);
      setCurrentUrl(prevUrl);
      startLoadingState();
    }
  };

  // History Forward
  const handleForward = () => {
    if (historyIndex < historyStack.length - 1) {
      const nextUrl = historyStack[historyIndex + 1];
      setHistoryIndex(historyIndex + 1);
      setInputUrl(nextUrl);
      setCurrentUrl(nextUrl);
      startLoadingState();
    }
  };

  // Reload current page
  const handleReload = () => {
    startLoadingState();
    if (iframeRef.current) {
      iframeRef.current.src = getIframeSrc(currentUrl, isProxyMode);
    }
  };

  // Home navigation
  const handleHome = () => {
    handleNavigate("https://www.dropbox.com");
  };

  // Listen for messages from inside the proxy iframe (URL change sync)
  useEffect(() => {
    const handleMessage = (e: MessageEvent) => {
      if (e.data && e.data.type === "HYUNS_URL_CHANGE") {
        const newUrl = e.data.url;
        if (newUrl && !newUrl.startsWith("data:") && !newUrl.startsWith("about:")) {
          setInputUrl(newUrl);
          setCurrentUrl(newUrl);
          if (e.data.title) {
            setPageTitle(e.data.title);
          }
          stopLoadingState();
        }
      }
    };

    window.addEventListener("message", handleMessage);
    return () => {
      window.removeEventListener("message", handleMessage);
      if (loadingTimerRef.current) clearTimeout(loadingTimerRef.current);
    };
  }, []);

  // Quick preset bookmarks
  const presets = [
    { label: "Dropbox", url: "https://www.dropbox.com", icon: "📦" },
    { label: "Google", url: "https://www.google.com", icon: "🔍" },
    { label: "Wikipedia", url: "https://www.wikipedia.org", icon: "📚" },
    { label: "GitHub", url: "https://github.com", icon: "🐙" },
    { label: "HackerNews", url: "https://news.ycombinator.com", icon: "⚡" },
  ];

  return (
    <main className="min-h-screen w-full bg-slate-50 flex flex-col text-slate-800 antialiased select-none">
      {/* Top Banner / Outer Brand Bar */}
      <header className="w-full bg-white border-b border-slate-200 px-6 py-3.5 flex flex-wrap items-center justify-between gap-4 shadow-sm z-30">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-sky-500 to-indigo-600 flex items-center justify-center text-white font-bold shadow-md shadow-sky-500/20">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-900 tracking-tight text-lg">
                hyunsurlinurl<span className="text-sky-600">.vercel.app</span>
              </span>
              <span className="bg-sky-50 text-sky-700 text-xs font-semibold px-2 py-0.5 rounded-full border border-sky-200">
                White Mode
              </span>
            </div>
            <p className="text-xs text-slate-500">
              새 창 열림 없는 독립 임베디드 웹 브라우저 (URL-in-URL Service)
            </p>
          </div>
        </div>

        {/* Quick Presets */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-slate-400 mr-1 hidden sm:inline">빠른 이동:</span>
          {presets.map((item) => (
            <button
              key={item.label}
              onClick={() => handleNavigate(item.url)}
              className={`text-xs px-2.5 py-1.5 rounded-lg border font-medium transition-all flex items-center gap-1.5 ${
                currentUrl.includes(item.label.toLowerCase())
                  ? "bg-slate-900 text-white border-slate-900 shadow-sm"
                  : "bg-white hover:bg-slate-100 text-slate-700 border-slate-200"
              }`}
            >
              <span>{item.icon}</span>
              <span>{item.label}</span>
            </button>
          ))}
        </div>

        {/* Controls */}
        <div className="flex items-center gap-3">
          <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-xs">
            <button
              onClick={() => {
                setIsProxyMode(true);
                startLoadingState();
              }}
              className={`px-2.5 py-1 rounded-md font-medium transition-colors flex items-center gap-1 ${
                isProxyMode
                  ? "bg-white text-sky-700 font-semibold shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
              title="X-Frame-Options 제거 및 팝업/새 창 방지 가로채기 엔진 활성화"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-sky-600" />
              스마트 프록시
            </button>
            <button
              onClick={() => {
                setIsProxyMode(false);
                startLoadingState();
              }}
              className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                !isProxyMode
                  ? "bg-white text-slate-900 font-semibold shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
              title="프록시 없이 원본 URL을 iframe에 직접 로드"
            >
              직접 연결
            </button>
          </div>

          <button
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors border border-slate-200"
            title={isFullscreen ? "기본 화면으로 축소" : "작은 화면 최대화"}
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </header>

      {/* Outer Workspace Canvas (Containing the "조금 작은 화면") */}
      <div
        className={`flex-1 flex items-center justify-center transition-all duration-300 ${
          isFullscreen ? "p-0" : "p-4 sm:p-6 md:p-8"
        }`}
      >
        {/* Inner Mini-Browser Window ("조금 작은 화면") */}
        <div
          className={`w-full bg-white flex flex-col transition-all duration-300 border border-slate-300/80 shadow-2xl overflow-hidden ${
            isFullscreen
              ? "h-[calc(100vh-62px)] rounded-none border-0"
              : windowPreset === "compact"
              ? "max-w-4xl h-[75vh] rounded-2xl"
              : windowPreset === "wide"
              ? "max-w-7xl h-[88vh] rounded-2xl"
              : "max-w-6xl h-[84vh] rounded-2xl"
          }`}
        >
          {/* Mini-Browser Chrome / Titlebar */}
          <div className="bg-slate-100/90 backdrop-blur border-b border-slate-200 px-4 py-2.5 flex items-center justify-between gap-3">
            {/* Window Controls (Traffic Lights) */}
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-red-400/90 inline-block hover:opacity-80 transition cursor-pointer" />
              <span className="w-3 h-3 rounded-full bg-amber-400/90 inline-block hover:opacity-80 transition cursor-pointer" />
              <span className="w-3 h-3 rounded-full bg-emerald-400/90 inline-block hover:opacity-80 transition cursor-pointer" />

              {/* Navigation Arrows */}
              <div className="flex items-center gap-1 ml-3 border-l border-slate-200 pl-3">
                <button
                  onClick={handleBack}
                  disabled={historyIndex <= 0}
                  className="p-1 rounded-md text-slate-600 hover:text-slate-900 hover:bg-slate-200/70 disabled:opacity-30 disabled:pointer-events-none transition"
                  title="뒤로 가기"
                >
                  <ArrowLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={handleForward}
                  disabled={historyIndex >= historyStack.length - 1}
                  className="p-1 rounded-md text-slate-600 hover:text-slate-900 hover:bg-slate-200/70 disabled:opacity-30 disabled:pointer-events-none transition"
                  title="앞으로 가기"
                >
                  <ArrowRight className="w-4 h-4" />
                </button>
                <button
                  onClick={handleReload}
                  className={`p-1 rounded-md text-slate-600 hover:text-slate-900 hover:bg-slate-200/70 transition ${
                    isLoading ? "animate-spin text-sky-600" : ""
                  }`}
                  title="새로고침"
                >
                  <RotateCw className="w-4 h-4" />
                </button>
                <button
                  onClick={handleHome}
                  className="p-1 rounded-md text-slate-600 hover:text-slate-900 hover:bg-slate-200/70 transition"
                  title="홈 (Dropbox)"
                >
                  <Home className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Smart Address Bar */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleNavigate();
              }}
              className="flex-1 max-w-2xl flex items-center bg-white rounded-lg border border-slate-300 focus-within:border-sky-500 focus-within:ring-2 focus-within:ring-sky-100 shadow-inner px-3 py-1 transition-all"
            >
              <Lock className="w-3.5 h-3.5 text-emerald-600 mr-2 flex-shrink-0" />
              <input
                type="text"
                value={inputUrl}
                onChange={(e) => setInputUrl(e.target.value)}
                placeholder="원하는 웹사이트 주소를 입력하세요 (예: dropbox.com)"
                className="w-full text-xs sm:text-sm text-slate-800 focus:outline-none placeholder:text-slate-400 font-mono tracking-tight"
              />
              <button
                type="submit"
                className="ml-2 bg-sky-600 hover:bg-sky-700 text-white text-xs px-3 py-1 rounded-md font-medium transition flex items-center gap-1 shadow-sm flex-shrink-0"
              >
                <span>이동</span>
                <ChevronRight className="w-3 h-3" />
              </button>
            </form>

            {/* Window Presets / Actions */}
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-slate-400 font-mono hidden md:inline px-2 py-0.5 bg-slate-200/60 rounded">
                내부 뷰포트
              </span>
              <div className="hidden lg:flex items-center gap-1 bg-slate-200/70 p-0.5 rounded-lg text-[11px]">
                <button
                  onClick={() => setWindowPreset("compact")}
                  className={`px-2 py-0.5 rounded ${
                    windowPreset === "compact" ? "bg-white font-medium shadow-xs" : "text-slate-600"
                  }`}
                >
                  컴팩트
                </button>
                <button
                  onClick={() => setWindowPreset("standard")}
                  className={`px-2 py-0.5 rounded ${
                    windowPreset === "standard" ? "bg-white font-medium shadow-xs" : "text-slate-600"
                  }`}
                >
                  기본
                </button>
                <button
                  onClick={() => setWindowPreset("wide")}
                  className={`px-2 py-0.5 rounded ${
                    windowPreset === "wide" ? "bg-white font-medium shadow-xs" : "text-slate-600"
                  }`}
                >
                  와이드
                </button>
              </div>
            </div>
          </div>

          {/* Embedded Iframe Viewport */}
          <div className="flex-1 w-full h-full relative bg-white overflow-hidden">
            {isLoading && (
              <div className="absolute top-0 left-0 right-0 h-1 bg-slate-100 overflow-hidden z-20">
                <div className="h-full bg-sky-500 animate-pulse w-full"></div>
              </div>
            )}

            <iframe
              ref={iframeRef}
              key={`${currentUrl}-${isProxyMode}`}
              src={getIframeSrc(currentUrl, isProxyMode)}
              onLoad={stopLoadingState}
              onError={stopLoadingState}
              className="w-full h-full border-0 bg-white"
              title="Embedded Nested Web Browser"
              sandbox="allow-forms allow-modals allow-pointer-lock allow-same-origin allow-scripts allow-downloads"
            />
          </div>

          {/* Mini-Browser Bottom Info Bar */}
          <div className="bg-slate-50 border-t border-slate-200 px-4 py-1.5 flex items-center justify-between text-xs text-slate-500">
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1 text-slate-600">
                <Globe className="w-3.5 h-3.5 text-sky-500" />
                <span className="truncate max-w-xs font-mono">{currentUrl}</span>
              </span>
              <span className="text-slate-300">|</span>
              <span className="text-emerald-700 font-medium flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping inline-block" />
                새 창 팝업 방지 활성화 (동일 프레임 내 유지)
              </span>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-slate-400">hyunsurlinurl v1.0</span>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
