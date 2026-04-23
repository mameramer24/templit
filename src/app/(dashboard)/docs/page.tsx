import { Key, Code, Terminal, Zap, FileJson, Globe } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function DocsPage() {
  return (
    <div className="min-h-screen bg-[#0f0f1a] text-white">
      {/* Nav */}
      <nav className="border-b border-white/10 bg-[#0f0f1a]/80 backdrop-blur-md sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 h-14 flex items-center gap-4">
          <Link href="/templates" className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
              <Code className="h-4 w-4 text-white" />
            </div>
            <span className="font-bold text-white">templit</span>
          </Link>
          
          <div className="flex items-center gap-6 ml-8">
            <Link href="/templates" className="text-sm font-medium text-white/50 hover:text-white transition-colors">
              Templates
            </Link>
            <Link href="/api-keys" className="text-sm font-medium text-white/50 hover:text-white transition-colors">
              API Keys
            </Link>
            <Link href="/docs" className="text-sm font-medium text-white transition-colors">
              Docs
            </Link>
          </div>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto px-6 py-16">
        <header className="mb-16">
           <Badge variant="outline" className="mb-4 bg-indigo-500/10 text-indigo-400 border-indigo-500/20 px-3 py-1">
             API Reference v1.0
           </Badge>
           <h1 className="text-5xl font-black tracking-tighter mb-6">Headless Rendering API</h1>
           <p className="text-xl text-white/40 leading-relaxed">
             Trigger image and video renders programmatically from your own applications, scripts, or workflows.
           </p>
        </header>

        <section className="space-y-12">
          {/* Authentication */}
          <div>
            <h2 className="text-2xl font-bold mb-4 flex items-center gap-3">
              <Key className="h-6 w-6 text-indigo-400" />
              Authentication
            </h2>
            <p className="text-white/60 mb-6 leading-relaxed">
              Authenticate your requests by including your API key in the <code className="bg-white/5 px-1.5 py-0.5 rounded text-indigo-300">X-API-Key</code> request header.
            </p>
            <div className="bg-black/30 border border-white/5 rounded-2xl p-6 font-mono text-sm overflow-hidden">
               <div className="flex items-center gap-2 text-white/20 mb-4 border-b border-white/5 pb-2">
                  <Terminal className="h-4 w-4" />
                  <span>cURL Example</span>
               </div>
               <pre className="text-indigo-300 overflow-x-auto">
{`curl -X GET "https://templit-azure.vercel.app/api/v1/templates" \\
     -H "X-API-Key: YOUR_API_KEY"`}
               </pre>
            </div>
          </div>

          {/* Endpoints */}
          <div>
            <h2 className="text-2xl font-bold mb-8 flex items-center gap-3">
              <Zap className="h-6 w-6 text-indigo-400" />
              Endpoints
            </h2>
            
            <div className="space-y-10">
              {/* List Templates */}
              <div className="group">
                <div className="flex items-center gap-4 mb-4">
                  <span className="bg-emerald-500/20 text-emerald-400 text-[10px] font-bold px-2 py-1 rounded uppercase tracking-wider">GET</span>
                  <h3 className="text-xl font-bold">/api/v1/templates</h3>
                </div>
                <p className="text-white/40 mb-4">Fetch a list of all your available templates and their IDs.</p>
                <div className="bg-black/30 border border-white/5 rounded-2xl p-6 font-mono text-sm leading-relaxed">
                   <p className="text-white/20 mb-2">// Response</p>
                   <pre className="text-emerald-400/80">
{`{
  "templates": [
    {
      "id": "tpl_123...",
      "name": "Promo Banner",
      "type": "image",
      "status": "published"
    }
  ]
}`}
                   </pre>
                </div>
              </div>

              <div className="group">
                <div className="flex items-center gap-4 mb-4">
                  <span className="bg-indigo-500/20 text-indigo-400 text-[10px] font-bold px-2 py-1 rounded uppercase tracking-wider">POST</span>
                  <h3 className="text-xl font-bold">/trigger</h3>
                </div>
                <p className="text-white/40 mb-4">Trigger a background rendering job with dynamic data overrides.</p>
                <div className="bg-black/30 border border-white/5 rounded-2xl p-6 font-mono text-sm leading-relaxed">
                    <p className="text-white/20 mb-2">// POST https://templit-azure.vercel.app/trigger</p>
                    <pre className="text-indigo-400/80">
{`{
  "templateId": "your-template-id",
  "variables": {
    "name": "أحمد علي",
    "name2": "مرحباً بك!"
  },
  "format": "png"
}`}
                    </pre>
                </div>
                <div className="mt-4 bg-black/30 border border-white/5 rounded-2xl p-6 font-mono text-sm leading-relaxed">
                    <p className="text-white/20 mb-2">// Response</p>
                    <pre className="text-emerald-400/80">
{`{
  "message": "POST Success - If you see this, connectivity is OK",
  "method": "POST",
  "time": "2026-04-23T..."
}`}
                    </pre>
                </div>
              </div>
            </div>
          </div>

          {/* Integration Guide */}
          <div className="bg-gradient-to-br from-indigo-600/10 to-transparent border border-indigo-500/20 rounded-3xl p-8 mt-12">
             <h2 className="text-2xl font-bold mb-4 flex items-center gap-3">
                <Globe className="h-6 w-6 text-indigo-400" />
                Browser SDK Integration
             </h2>
             <p className="text-white/60 mb-6 leading-relaxed">
                For pixel-perfect rendering, use our client-side SDK. It utilizes FFmpeg.wasm directly in your user&apos;s browser to bypass server timeouts and GPU limitations.
             </p>
             <code className="bg-black/50 px-4 py-3 rounded-xl block text-sm border border-white/5 font-mono text-indigo-300">
                npm install @templit/render-engine
             </code>
             <div className="mt-6 flex justify-end">
                <Button variant="ghost" className="text-indigo-400 hover:text-indigo-300">
                   View SDK Docs &rarr;
                </Button>
             </div>
          </div>
        </section>
      </main>

      {/* Decorative footer */}
      <footer className="border-t border-white/5 py-12 px-6">
         <div className="max-w-4xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6 opacity-30 text-xs tracking-widest uppercase">
            <span>© {new Date().getFullYear()} Templit API</span>
            <div className="flex gap-8">
               <a href="#" className="hover:text-white transition-colors">Privacy</a>
               <a href="#" className="hover:text-white transition-colors">Security</a>
               <a href="#" className="hover:text-white transition-colors">Status</a>
            </div>
         </div>
      </footer>
    </div>
  );
}

function Badge({ children, variant, className }: any) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
       variant === 'outline' ? 'border border-indigo-500/20 text-indigo-400' : 'bg-white/10 text-white'
    } ${className}`}>
      {children}
    </span>
  );
}

function AlertCircle({ className }: any) {
  return <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>;
}
