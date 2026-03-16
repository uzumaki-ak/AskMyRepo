"use client"

import React, { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { api } from "~/trpc/react"
import { toast } from "sonner"

type Mood = "happy" | "unhappy" | "productive" | "sleeping"

const MESSAGES = {
  happy: [
    "You're a code wizard! ✨",
    "Finally, a dev who knows what they're doing.",
    "Looking sharp today! Ready for more commits?",
    "Your streak is looking legendary. Don't stop now!",
    "Is it just me, or is your code getting cleaner?",
    "That last refactor was *chef's kiss*.",
    "I'm actually proud to be your mascot right now.",
    "Keep this up and you might actually retire early.",
    "The way you handle state is... beautiful.",
    "Your production logs are so quiet. It's peaceful.",
    "A clean build is the best kind of therapy.",
    "I see potential in you. High potential.",
    "The Git gods are smiling upon you today.",
    "You haven't broken the build once. Impressive.",
    "Your IDE must be happy to see you.",
    "Documentation? AND Clean Code? Who are you?",
    "This repository is becoming a masterpiece.",
    "You're making this look easy.",
    "I'm feeling positive about our next deployment.",
    "You're the 10x developer I was promised.",
    "Let's write some more beautiful logic."
  ],
  unhappy: [
    "No commits today? Your streak is crying. 😭",
    "Are you even trying to get a job? Use the AI Editor!",
    "I've seen better code from a microwave.",
    "Job market is tough, but you're making it tougher. Push something!",
    "Staring at the screen won't fix the bugs. Start coding!",
    "Your streak is looking shorter than a JS `null` check.",
    "Even my local storage has more activity than you.",
    "Is your `Commit` button broken? Should I call a technician?",
    "Your GitHub profile is looking like a desert. 🌵",
    "I bet even a README update would feel like a marathon now.",
    "Code? Where? All I see is a blank cursor mocking us.",
    "If procrastination was a language, you'd be a Senior Architect.",
    "Your repo is so stale I think I found mold in the `/src` folder.",
    "Are we building software or a digital museum of abandoned projects?",
    "I'm bored. You're bored. Even the linter is sleeping.",
    "Waiting for your productivity is like waiting for `npm install` on slow WiFi.",
    "One line of code. Just one. I'll even settle for a comment.",
    "Your productivity is currently `undefined`.",
    "The AI Editor is literally sitting there. Use it. Please.",
    "If you don't commit soon, I'm going to start refactoring in my head.",
    "I hope you're at least learning something while you ignore me."
  ],
  productive: [
    "Now we're talking! ⚡",
    "Absolute unit of a developer. Keep it up!",
    "Your streak is on fire! 🔥",
    "Efficiency level: Over 9000!",
    "I can smell the promotion from here.",
    "You're moving faster than a Rust compiler (on a good day).",
    "Commit. Push. Repeat. You're a machine!",
    "Your velocity is through the roof. 🚀",
    "The way you close those issues... it's satisfying.",
    "Are you caffeinated or just naturally brilliant?",
    "We're going to need a bigger server for all this code.",
    "You're in the Flow State. I'm just here for the ride.",
    "The diff logs have never looked so glorious.",
    "One more commit and we might take over the internet.",
    "You're cooking. Don't let anyone touch the stove.",
    "This repo is evolving faster than a Pokemon.",
    "Every line you write makes the world a better place.",
    "I should start taking notes on your techniques.",
    "Productivity: Maxed. Ego: Justifiably rising.",
    "You're making the other developers look like they're in slow motion.",
    "Let's win this hackathon (or just this work day)!"
  ],
  sleeping: [
    "Zzz... even legends need rest. 🌙",
    "Catch you in the morning, coding hero.",
    "System resting. See you at dawn.",
    "Quiet night... the perfect time to fix those bugs later.",
    "I'm dreaming of cleaner abstractions.",
    "Sleep well... tomorrow we kill those production bugs.",
    "Mascot.exe is in power saving mode.",
    "Don't wake me unless it's a critical production outage.",
    "The best code is written with a rested mind.",
    "Snore... `select * from dreams where theme='neon'`...",
    "Dreaming of 100% test coverage.",
    "May your dreams be free of merge conflicts.",
    "Rest. The compiler isn't going anywhere.",
    "The stars are aligned for a productive tomorrow.",
    "Even my AI brain needs a reboot sometimes.",
    "Zzz... `await new Sleep(8 * 3600);`...",
    "Dark mode looks better when my eyes are closed.",
    "Silent night, holy code...",
    "I'll see you in the commit history tomorrow.",
    "Goodnight, world. Hello, dreamland server.",
    "System idle. Optimizing dream-state memory."
  ]
}

export const PetMascot = ({ projectId }: { projectId: string }) => {
  const [mood, setMood] = useState<Mood>("happy")
  const [showBubble, setShowBubble] = useState(false)
  const [message, setMessage] = useState("")
  const [mounted, setMounted] = useState(false)

  const { data: commits } = api.project.getCommits.useQuery(
    { projectId },
    { enabled: !!projectId, refetchInterval: 30000 }
  )

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!commits) return

    const checkStatus = () => {
      const hour = new Date().getHours()
      if (hour < 5 || hour > 23) {
        setMood("sleeping")
        return
      }

      const today = new Date().setHours(0, 0, 0, 0)
      const todayCommits = commits.filter((c: any) => new Date(c.createdAt).getTime() >= today).length

      if (todayCommits >= 3) setMood("productive")
      else if (todayCommits > 0) setMood("happy")
      else setMood("unhappy")
    }

    checkStatus()
  }, [commits])

  const handleInteraction = (type: "click" | "doubleClick") => {
    setShowBubble(true)
    
    if (type === "doubleClick") {
      const pokes = [
        "Stop poking me! I'm working on your career.",
        "Refactoring is hard enough without you poking me!",
        "Ouch! That's my main loop you're touching!",
        "Error 429: Too many poke requests.",
        "Double clicking me won't fix your bugs, you know.",
        "I'm a mascot, not a stress ball!",
        "Keep poking and I'll start deleting your console.logs."
      ]
      toast.info(pokes[Math.floor(Math.random() * pokes.length)])
    }

    const possibleMessages = MESSAGES[mood]
    const randomMsg = possibleMessages[Math.floor(Math.random() * possibleMessages.length)]!
    setMessage(randomMsg)
    
    setTimeout(() => {
      setShowBubble(false)
    }, 5000)
  }

  const getImagePath = () => {
    switch(mood) {
      case "happy": return "/mascot/happy.png"
      case "unhappy": return "/mascot/sad.png"
      case "productive": return "/mascot/fire.png"
      case "sleeping": return "/mascot/sleeping.png"
    }
  }

  if (!mounted) return null;

  return (
    <motion.div 
      drag
      dragConstraints={{ left: -window.innerWidth + 100, right: 0, top: -window.innerHeight + 100, bottom: 0 }}
      whileDrag={{ scale: 1.1, cursor: "grabbing" }}
      className="fixed bottom-8 right-8 z-50 flex flex-col items-center justify-center cursor-grab active:cursor-grabbing group select-none"
      onClick={() => handleInteraction("click")}
      onDoubleClick={() => handleInteraction("doubleClick")}
    >
      <AnimatePresence>
        {showBubble && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 10 }}
            className="absolute -top-16 bg-card border border-border/50 text-foreground px-4 py-2 rounded-2xl text-xs font-bold shadow-2xl z-10 w-max max-w-[200px] text-center backdrop-blur-md"
          >
            {message}
            <div className="absolute top-full left-1/2 -ml-2 border-8 border-transparent border-t-card" />
          </motion.div>
        )}
      </AnimatePresence>
      
      <motion.div
        animate={mood === "sleeping" ? {
          scale: [1, 0.95, 1],
          opacity: [0.7, 1, 0.7]
        } : mood === "productive" ? {
          scale: [1, 1.15, 1],
          rotate: [0, 5, -5, 0],
          y: [0, -12, 0]
        } : mood === "happy" ? {
          scale: [1, 1.08, 1],
          y: [0, -8, 0]
        } : { 
          y: [0, 4, 0],
          opacity: [0.8, 1, 0.8]
        }}
        transition={{ 
          repeat: Infinity, 
          duration: mood === "productive" ? 1.5 : mood === "sleeping" ? 6 : 3,
          ease: "easeInOut"
        }}
        className="relative size-24 md:size-28 rounded-full flex items-center justify-center transition-all duration-700 p-1 bg-gradient-to-tr from-primary/20 via-transparent to-primary/10 border-2 border-primary/20 shadow-[0_0_50px_-12px_rgba(0,0,0,0.5)] overflow-hidden"
      >
        <div className="absolute inset-0 bg-primary/5 blur-xl group-hover:bg-primary/20 transition-colors" />
        <img 
          src={getImagePath()} 
          alt="Mascot" 
          className="w-full h-full object-cover rounded-full relative z-10 drop-shadow-xl"
          onError={(e) => {
            // Fallback to emoji if images aren't uploaded yet
            const target = e.target as HTMLImageElement
            target.style.display = 'none'
            const parent = target.parentElement
            if (parent) {
               const fallback = document.createElement('div')
               fallback.innerText = mood === 'happy' ? '😊' : mood === 'unhappy' ? '😢' : mood === 'productive' ? '🔥' : '😴'
               fallback.className = 'text-5xl'
               parent.appendChild(fallback)
            }
          }}
        />
        
        {/* Mood indicator */}
        <div className="absolute -bottom-1 -right-1 flex gap-1 bg-background/80 backdrop-blur-sm border border-border/20 rounded-full px-2 py-0.5 shadow-sm opacity-0 group-hover:opacity-100 transition-opacity z-20">
           <div className={`size-1.5 rounded-full ${mood === 'happy' ? 'bg-green-500 animate-pulse' : 'bg-muted'}`} />
           <div className={`size-1.5 rounded-full ${mood === 'productive' ? 'bg-orange-500 animate-pulse' : 'bg-muted'}`} />
           <div className={`size-1.5 rounded-full ${mood === 'unhappy' ? 'bg-red-500 animate-pulse' : 'bg-muted'}`} />
        </div>
      </motion.div>
      
      <div className="mt-2 text-center pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity">
        <span className="text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground/50">
          Repo Whisperer
        </span>
      </div>
    </motion.div>
  )
}
