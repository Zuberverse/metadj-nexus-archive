export type CollectionNarrative = {
  heading: string
  subtitle?: string
  paragraphs: string[]
}

export const COLLECTION_NARRATIVES: Record<string, CollectionNarrative> = {
  featured: {
    heading: "Featured — My Essentials",
    subtitle: "Hand-picked tracks resonating right now",
    paragraphs: [
      "I handpicked these tracks because they represent where MetaDJ is right now—pieces that spark my imagination, build the vision, and push me toward the reality I want to experience next. Each lives inside a collection with its own theme and narrative, and every full chapter sits one tab away whenever you want the complete story.",
    ],
  },
  "majestic-ascent": {
    heading: "Majestic Ascent",
    subtitle: "A portal into the Metaverse",
    paragraphs: [
      "My first collection—and the most complete chapter so far. Majestic Ascent represents a finished arc: the year-plus build that kicked off in early 2024 when generative music became accessible. It became a transformational experience: proving I could be a Digital Jockey pioneering AI-driven production, working with entirely original material, and telling stories that match how I see the Metaverse and everything within it. Back then I was exploring a wide range of tools because the tech stack was still forming, so every track doubled as research and release.",
      `I wanted this collection to tell the story of my ascension—a young kid navigating adversity, escaping into imagination, growing into MetaDJ and building the Metaverse I see in my head. It was also my first chance to prototype "music for the mind," composing states for focus, reflection, and momentum with my own builds. It's an adventure scored by my obsession with orchestral elegance and movement, the intensity of techno, and a hint of 8-bit nostalgia. Most days ended with curation: digging through massive generation batches, wrestling with a vast canvas, and forcing myself to pick the right assortment to match the narrative. I'll never forget the moments of awe when the pieces snapped together and I thought, "yes, that's it." I couldn't believe it was possible, and it pushed me to think even bigger—if this works, what could we build next? This collection marks the foundation—a complete moment in time that established the blueprint for everything that followed.`,
    ],
  },
  "bridging-reality": {
    heading: "Bridging Reality",
    subtitle: "Bridging physical and digital worlds",
    paragraphs: [
      "My second collection. Bridging Reality explores what happens when the physical world and the Metaverse exist as a shared space, just rendered differently. I started these sessions asking: how do I make music that works at a festival and a virtual space simultaneously? The answer was treating AI as the bridge itself.",
      "Vocals became essential here—not for decoration, but as direct communication. Every hook and verse spells out the vision: where we're going, why it matters, how we bring others with us. The production leans into kinetic grooves and high-energy builds designed to move bodies and ideas at the same time. I wanted these tracks to work everywhere: console, browser, live set, dancefloor.",
      "This collection is for co-designers of the future—people who understand that AI amplifies reach when you use it with intention. It's the sound of building worlds in real time and inviting others to step through the portal with you.",
    ],
  },
  "metaverse-revelation": {
    heading: "Metaverse Revelation",
    subtitle: "Pure energy for transformation in motion",
    paragraphs: [
      "My third collection. Metaverse Revelation is pure dancefloor energy—invigorating EDM designed to move crowds whether they're at a festival or a virtual space. Every track documents a revelation: the exact moment AI made it possible to see MetaDJ as a constantly evolving system instead of a side project. I was building the soundtrack for the MetaDJ Nexus I'd been imagining my entire life.",
      "Sharp tempos, molten leads, and fearless drops define the collection. I leaned into aggressive synth work, glitch flourishes, and pressure-building vox chops to mirror the feeling of walking into a portal and seeing your future self running the show. It's movement, sweat, catharsis, and a reminder that the Metaverse isn't distant—it's already pulsing underneath everything we're building.",
    ],
  },
  transformer: {
    heading: "Transformer",
    subtitle: "Instant state changes",
    paragraphs: [
      "Transformer is a tight-run experiment: melodic progressive techno colliding with hypnotic trance so the set never loses its edge. These records grew out of exploring how subtle parameter shifts and micro-variations can flip a mood instantly.",
      "Every track feels like a new form coming online—sharp bass designs, aerated arps, and rhythmic shifts that keep you on the front foot. Transformer is for late-night focus sprints, road missions, and instant state changes when you need the next version of yourself to walk in already ready.",
    ],
  },
}
