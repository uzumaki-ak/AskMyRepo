"use client";

import Link from "next/link";
import { Button } from "~/components/ui/button";
import { 
  Bot, 
  Code2, 
  Cpu, 
  Github, 
  Info, 
  Lock, 
  Zap, 
  CheckCircle2, 
  MessageSquare, 
  ChevronRight,
  Menu,
  X,
  Plus
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";
import { SignInButton, SignOutButton, SignedIn, SignedOut } from "@clerk/nextjs";
import { ModeToggle } from "~/components/mode-toggle";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "~/components/ui/accordion";

export default function Home() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const features = [
    {
      icon: <Bot className="size-6" />,
      title: "AI Repo Agent",
      description: "Describe changes in plain English and let our AI agent write and commit the code for you.",
      color: "blue"
    },
    {
      icon: <Code2 className="size-6" />,
      title: "Visual DNA",
      description: "Explore your codebase through dynamic, interactive dependency graphs and architecture maps.",
      color: "purple"
    },
    {
      icon: <Zap className="size-6" />,
      title: "Streak Saver",
      description: "Maintain your GitHub contribution streak from your phone with quick, intelligent cloud edits.",
      color: "orange"
    },
    {
      icon: <Cpu className="size-6" />,
      title: "Health Audits",
      description: "Automated analysis of code complexity, documentation coverage, and technical debt.",
      color: "green"
    },
    {
      icon: <MessageSquare className="size-6" />,
      title: "Interview Prep",
      description: "AI-generated quizzes based on your actual codebase to help you master your own projects.",
      color: "pink"
    },
    {
      icon: <Lock className="size-6" />,
      title: "Secure Vault",
      description: "Military-grade AES-256 encryption for all your API keys and GitHub tokens.",
      color: "indigo"
    }
  ];

  const faqs = [
    {
      q: "How does the AI Agent work?",
      a: "Our agent uses advanced RAG (Retrieval-Augmented Generation) to analyze your indexed codebase. When you request a change, it identifies relevant files, proposes a diff, and uses your GitHub token to commit precisely what's needed."
    },
    {
      q: "Is my code secure?",
      a: "Absolutely. We don't store your source code permanently. We only index it for the RAG service, and all sensitive data like tokens are encrypted with AES-256-GCM before hitting our database."
    },
    {
      q: "Do I need a GitHub token?",
      a: "For read-only features like the Visualizer, we use a default setup. For write features like Streak Saver, you can provide a GitHub Personal Access Token which we store securely."
    },
    {
      q: "Can I use it on mobile?",
      a: "Yes! Ask Your Repo is fully responsive. You can review code, answer interview prep questions, and even commit changes directly from your phone's browser."
    }
  ];

  return (
    <div className="min-h-screen bg-background font-sans selection:bg-primary/20">
      {/* Navbar */}
      <nav 
        className={`fixed top-0 w-full z-50 transition-all duration-300 ${
          scrolled ? "bg-background/80 backdrop-blur-md border-b py-3" : "bg-transparent py-5"
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between">
          <div className="flex items-center gap-2">
             <div className="size-10 rounded-xl bg-primary flex items-center justify-center shadow-lg shadow-primary/20">
                <img src="/gitgodlogo.jpg" alt="Logo" className="size-8 rounded-lg" />
             </div>
             <span className="text-xl font-display font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/70">
                Ask Your Repo
             </span>
          </div>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-8">
            <Link href="#features" className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors">Features</Link>
            <Link href="#about" className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors">About</Link>
            <Link href="#faq" className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors">FAQ</Link>
            <div className="h-4 w-px bg-border mx-2"></div>
            <ModeToggle />
            <SignedOut>
              <SignInButton mode="modal">
                <Button variant="ghost" size="sm" className="font-semibold">Sign In</Button>
              </SignInButton>
              <SignInButton mode="modal">
                <Button size="sm" className="font-semibold px-6 shadow-lg shadow-primary/20">Get Started</Button>
              </SignInButton>
            </SignedOut>
            <SignedIn>
              <Link href="/dashboard">
                <Button size="sm" className="font-semibold px-6">Dashboard</Button>
              </Link>
              <SignOutButton>
                <Button variant="ghost" size="sm">Sign Out</Button>
              </SignOutButton>
            </SignedIn>
          </div>

          {/* Mobile Menu Toggle */}
          <div className="md:hidden flex items-center gap-4">
            <ModeToggle />
            <Button variant="ghost" size="icon" onClick={() => setIsMenuOpen(!isMenuOpen)}>
              {isMenuOpen ? <X /> : <Menu />}
            </Button>
          </div>
        </div>

        {/* Mobile Nav */}
        <AnimatePresence>
          {isMenuOpen && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="md:hidden absolute top-full left-0 w-full bg-background border-b p-4 space-y-4 shadow-xl"
            >
              <Link href="#features" onClick={() => setIsMenuOpen(false)} className="block p-2 font-medium">Features</Link>
              <Link href="#about" onClick={() => setIsMenuOpen(false)} className="block p-2 font-medium">About</Link>
              <Link href="#faq" onClick={() => setIsMenuOpen(false)} className="block p-2 font-medium">FAQ</Link>
              <div className="pt-4 border-t flex flex-col gap-3">
                <SignedOut>
                  <SignInButton mode="modal">
                    <Button className="w-full">Get Started</Button>
                  </SignInButton>
                </SignedOut>
                <SignedIn>
                  <Link href="/dashboard" className="w-full">
                    <Button className="w-full">Dashboard</Button>
                  </Link>
                </SignedIn>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 md:pt-48 md:pb-32 overflow-hidden">
        {/* Background Gradients */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-full -z-10 opacity-30 pointer-events-none">
          <div className="absolute top-0 right-0 size-[500px] bg-primary/20 blur-[120px] rounded-full"></div>
          <div className="absolute bottom-0 left-0 size-[500px] bg-blue-500/10 blur-[120px] rounded-full"></div>
        </div>

        <div className="max-w-7xl mx-auto px-4 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <Badge variant="outline" className="mb-6 py-1 px-4 border-primary/30 bg-primary/5 text-primary rounded-full animate-pulse">
              v1.0 is now live 🚀
            </Badge>
            <h1 className="text-5xl md:text-7xl lg:text-8xl font-display font-extrabold tracking-tight mb-8 leading-[1.1]">
              Your Repository. <br />
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-500 via-primary to-purple-500">
                Evolved with AI.
              </span>
            </h1>
            <p className="text-xl md:text-2xl text-muted-foreground max-w-3xl mx-auto mb-12 leading-relaxed">
              Understand, visualize, and maintain your code like never before. The all-in-one suite for modern developers who treat their repos as living entities.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <SignedOut>
                <SignInButton mode="modal">
                  <Button size="lg" className="h-14 px-10 text-lg font-bold shadow-2xl shadow-primary/30 hover:scale-105 transition-transform">
                    Start Your Repo Journey
                    <ChevronRight className="ml-2 size-5" />
                  </Button>
                </SignInButton>
              </SignedOut>
              <SignedIn>
                <Link href="/dashboard">
                  <Button size="lg" className="h-14 px-10 text-lg font-bold">
                    Go to Dashboard
                    <ChevronRight className="ml-2 size-5" />
                  </Button>
                </Link>
              </SignedIn>
              <Link href="#features">
                <Button size="lg" variant="outline" className="h-14 px-10 text-lg bg-background/50 backdrop-blur-sm border-white/10">
                  See Features
                </Button>
              </Link>
            </div>
          </motion.div>

          {/* Interactive Preview Mockup */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.8 }}
            className="mt-20 relative px-4"
          >
            <div className="max-w-5xl mx-auto rounded-2xl border bg-card/60 backdrop-blur-xl shadow-2xl overflow-hidden group">
              <div className="h-10 border-b bg-muted/20 flex items-center px-4 gap-2">
                <div className="size-3 rounded-full bg-red-400/50"></div>
                <div className="size-3 rounded-full bg-orange-400/50"></div>
                <div className="size-3 rounded-full bg-green-400/50"></div>
                <div className="ml-4 h-5 px-3 rounded bg-muted/30 text-[10px] flex items-center text-muted-foreground">askyourrepo.com/dashboard/agent</div>
              </div>
              <div className="p-4 md:p-8 aspect-video bg-[#0d1117] relative group-hover:bg-[#161b22] transition-colors">
                 {/* Decorative AI UI elements */}
                 <div className="absolute top-10 left-10 p-4 border border-blue-500/30 rounded-lg bg-blue-500/5 max-w-[200px] hidden md:block">
                    <div className="size-2 rounded-full bg-blue-500 mb-2"></div>
                    <div className="h-2 w-full bg-white/10 rounded mb-1"></div>
                    <div className="h-2 w-2/3 bg-white/10 rounded"></div>
                 </div>
                 <div className="flex flex-col items-center justify-center h-full gap-6">
                    <div className="size-20 rounded-full bg-primary/10 flex items-center justify-center border border-primary/30 shadow-[0_0_50px_-12px_rgba(59,130,246,0.5)]">
                       <Bot className="size-10 text-primary" />
                    </div>
                    <div className="space-y-2 text-center">
                       <p className="text-zinc-400 font-mono text-xs">Analyzing c:\Users\asnoi\Downloads\gitgod\src\lib\github.ts...</p>
                       <p className="text-white font-medium text-lg">"Adding encryption layer to token storage..."</p>
                    </div>
                    <div className="flex gap-3">
                       <div className="h-8 w-24 rounded bg-green-600/20 border border-green-600/50 text-green-400 text-[10px] flex items-center justify-center font-bold">COMMIT</div>
                       <div className="h-8 w-24 rounded bg-blue-600/20 border border-blue-600/50 text-blue-400 text-[10px] flex items-center justify-center font-bold">REVIEW</div>
                    </div>
                 </div>
              </div>
            </div>
            {/* Glossy overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent pointer-events-none"></div>
          </motion.div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-24 bg-muted/20">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-display font-bold mb-4">Powerful Agentic Suite</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">Everything you need to master your repository workflow in one unified platform.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feat, i) => (
              <motion.div
                key={i}
                whileHover={{ y: -5 }}
                className="p-8 rounded-2xl border bg-card hover:border-primary/50 transition-all shadow-sm hover:shadow-xl group"
              >
                <div className={`size-12 rounded-xl bg-${feat.color}-500/10 flex items-center justify-center mb-6 text-${feat.color}-500 group-hover:scale-110 transition-transform`}>
                  {feat.icon}
                </div>
                <h3 className="text-xl font-bold mb-3">{feat.title}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  {feat.description}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* About Us Section */}
      <section id="about" className="py-24 border-y">
        <div className="max-w-7xl mx-auto px-4 grid grid-cols-1 lg:grid-cols-2 items-center gap-16">
          <div className="space-y-6">
            <div className="size-12 rounded-full bg-primary/10 flex items-center justify-center">
              <Info className="size-6 text-primary" />
            </div>
            <h2 className="text-4xl md:text-5xl font-display font-bold">Born from the need of <span className="text-primary tracking-tighter italic">"Clean streaks"</span>.</h2>
            <p className="text-lg text-muted-foreground leading-relaxed">
              We started as a simple tool to help maintain GitHub streaks during busy days. Today, **Ask Your Repo** is a full-blown repository intelligence engine. 
            </p>
            <p className="text-lg text-muted-foreground leading-relaxed">
              Our mission is to bridge the gap between human intent and codebase complexity. Whether you're a solo developer or part of a large team, we provide the visibility and agency you need to stay productive.
            </p>
            <div className="flex items-center gap-6 pt-4">
              <div>
                <p className="text-3xl font-bold">10k+</p>
                <p className="text-sm text-muted-foreground">Commits Helped</p>
              </div>
              <div className="h-10 w-px bg-border"></div>
              <div>
                <p className="text-3xl font-bold">500+</p>
                <p className="text-sm text-muted-foreground">Repos Indexed</p>
              </div>
            </div>
          </div>
          <div className="relative">
             <div className="aspect-square bg-[#0d1117] rounded-3xl overflow-hidden flex flex-col border border-white/10 shadow-2xl">
                <div className="h-10 border-b border-white/5 bg-white/5 flex items-center px-4 gap-2">
                   <div className="size-2 rounded-full bg-red-500/50"></div>
                   <div className="size-2 rounded-full bg-orange-500/50"></div>
                   <div className="size-2 rounded-full bg-green-500/50"></div>
                </div>
                <div className="p-8 flex-1 flex items-center justify-center">
                   <pre className="font-mono text-sm md:text-base leading-relaxed text-left w-full">
                      <code className="grid gap-1">
                        <span className="text-purple-400">const</span> <span className="text-blue-400">repoWhisperer</span> = <span className="text-purple-400">new</span> <span className="text-yellow-400">Agent</span>({`{`}
                        <div className="pl-4 font-normal">
                          <span className="text-zinc-400">mood:</span> <span className="text-green-400">'fire'</span>,
                          <br />
                          <span className="text-zinc-400">protection:</span> <span className="text-green-400">'AES-256'</span>,
                          <br />
                          <span className="text-zinc-400">streak:</span> <span className="text-green-400">'legendary'</span>
                        </div>
                        {`});`}
                        <br />
                        <span className="text-purple-400">while</span> (<span className="text-blue-400">codebaseExists</span>) {`{`}
                        <div className="pl-4">
                          <span className="text-yellow-400">analyze</span>();
                          <br />
                          <span className="text-yellow-400">visualize</span>();
                          <br />
                          <span className="text-yellow-400">optimize</span>();
                        </div>
                        {`}`}
                      </code>
                   </pre>
                </div>
             </div>
             {/* Floaties */}
             <div className="absolute -top-6 -right-6 size-24 bg-background border-2 border-primary/20 rounded-2xl shadow-2xl flex items-center justify-center animate-bounce z-10">
                <CheckCircle2 className="size-12 text-green-500" />
             </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section id="faq" className="py-24 bg-muted/10">
        <div className="max-w-3xl mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-display font-bold mb-4">Common Questions</h2>
            <p className="text-muted-foreground">Everything you need to know about Ask Your Repo.</p>
          </div>
          
          <Accordion type="single" collapsible className="w-full space-y-4">
            {faqs.map((faq, i) => (
              <AccordionItem key={i} value={`item-${i}`} className="border rounded-xl px-6 bg-card">
                <AccordionTrigger className="text-left font-bold text-lg hover:no-underline">{faq.q}</AccordionTrigger>
                <AccordionContent className="text-muted-foreground text-base leading-relaxed pb-6">
                  {faq.a}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </section>

      {/* Call to Action */}
      <section className="py-24 relative overflow-hidden">
        <div className="max-w-5xl mx-auto px-4 text-center relative z-10">
          <div className="p-12 md:p-20 rounded-[3rem] bg-primary text-primary-foreground shadow-2xl shadow-primary/40 relative overflow-hidden">
             {/* Decorative pattern */}
             <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '40px 40px' }}></div>
             
             <h2 className="text-4xl md:text-6xl font-display font-bold mb-6">Ready to upgrade your repo?</h2>
             <p className="text-xl text-primary-foreground/80 mb-10 max-w-2xl mx-auto">
                Join hundreds of developers who are already using AI to master their code.
             </p>
             <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <SignedOut>
                  <SignInButton mode="modal">
                    <Button size="lg" variant="secondary" className="h-14 px-12 text-lg font-bold bg-white text-primary hover:bg-white/90">
                       Get Started Now
                    </Button>
                  </SignInButton>
                </SignedOut>
                <SignedIn>
                  <Link href="/dashboard">
                    <Button size="lg" variant="secondary" className="h-14 px-12 text-lg font-bold">
                       Go To Dashboard
                    </Button>
                  </Link>
                </SignedIn>
             </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 border-t mt-20">
        <div className="max-w-7xl mx-auto px-4 flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="flex items-center gap-2">
             <div className="size-8 rounded-lg bg-primary flex items-center justify-center">
                <img src="/gitgodlogo.jpg" alt="Logo" className="size-6 rounded" />
             </div>
             <span className="text-lg font-display font-bold tracking-tight">Ask Your Repo</span>
          </div>
          
          <div className="flex items-center gap-8">
            <Link href="#" className="text-sm text-muted-foreground hover:text-primary transition-colors">Twitter</Link>
            <Link href="#" className="text-sm text-muted-foreground hover:text-primary transition-colors">GitHub</Link>
            <Link href="#" className="text-sm text-muted-foreground hover:text-primary transition-colors">Privacy Policy</Link>
          </div>
          
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} Ask Your Repo. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}

function Badge({ children, className, variant = "default" }: { children: React.ReactNode, className?: string, variant?: "default" | "outline" }) {
  const variants = {
    default: "bg-primary text-primary-foreground",
    outline: "border border-primary/20 text-primary-foreground"
  };
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 ${variants[variant]} ${className}`}>
      {children}
    </span>
  );
}
