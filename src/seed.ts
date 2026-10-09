import type {
  AboutContent,
  ArtForm,
  Certificate,
  JourneyChapter,
  Quest,
} from "./types";

export const seedCertificates: Certificate[] = [
  {
    id: "licence-cert",
    title: "Licence in Computer Science",
    issuer: "University of Algiers",
    year: "2024",
    description: "Bachelor's degree in Computer Science with focus on software development and algorithms.",
    seal: "ᚨ",
    verifyUrl: "",
    image: "",
  },
  {
    id: "master-cert",
    title: "Master's in Software Engineering",
    issuer: "University of Algiers",
    year: "2026",
    description: "Master's degree in Software Engineering covering advanced topics in system design and architecture.",
    seal: "ᛃ",
    verifyUrl: "",
    image: "",
  },
];

export const seedQuests: Quest[] = [
  {
    id: "cinehub-01",
    name: "CineHub",
    tagline: "A cinematic discovery platform",
    status: "COMPLETED",
    difficulty: "JOURNEYMAN",
    objective: "Build a movie discovery app with rich metadata and streaming info",
    description:
      "CineHub is a full-stack movie discovery platform that aggregates data from TMDB API, providing users with trending movies, detailed information, and streaming availability. Built with a focus on performance and visual appeal.",
    technologies: ["Next.js", "TypeScript", "TMDB API", "Tailwind CSS", "Framer Motion"],
    achievements: ["Real-time search", "Responsive design", "Streaming availability"],
    lessons: ["API integration patterns", "Performance optimization", "State management"],
    image: "",
    demoUrl: "",
    repoUrl: "",
  },
  {
    id: "rasm-01",
    name: "RASM",
    tagline: "A creative portfolio showcase",
    status: "COMPLETED",
    difficulty: "MASTER",
    objective: "Create an immersive portfolio experience with RPG-inspired design",
    description:
      "RASM is a personal portfolio website designed as an immersive RPG experience. It features a Nordic fantasy theme with animated opening scenes, sound effects, and a unique navigation system inspired by classic RPG menus.",
    technologies: ["Next.js", "React", "TypeScript", "Tailwind CSS", "Framer Motion", "GSAP", "Web Audio API"],
    achievements: ["Custom audio engine", "GSAP animations", "RPG-style navigation", "Admin panel"],
    lessons: ["Creative coding", "Audio synthesis", "Performance with animations", "File-based CMS"],
    image: "",
    demoUrl: "",
    repoUrl: "",
  },
];

export const seedJourneyChapters: JourneyChapter[] = [
  {
    id: "licence",
    chapter: "CHAPTER I",
    title: "Licence in Computer Science",
    institution: "University of Algiers",
    period: "2021–2024",
    description:
      "Foundation in computer science covering algorithms, data structures, databases, and software engineering fundamentals.",
    highlights: ["Data Structures & Algorithms", "Database Systems", "Software Engineering", "Web Development"],
    runeSymbol: "ᚨ",
  },
  {
    id: "master",
    chapter: "CHAPTER II",
    title: "Master's in Software Engineering",
    institution: "University of Algiers",
    period: "2024–2026",
    description:
      "Advanced studies in software architecture, distributed systems, and modern development practices.",
    highlights: ["Software Architecture", "Distributed Systems", "Cloud Computing", "DevOps"],
    runeSymbol: "ᛃ",
  },
  {
    id: "aiesec",
    chapter: "CHAPTER III",
    title: "AIESEC Experience",
    institution: "AIESEC Algeria",
    period: "2022–2023",
    description:
      "Leadership development and international exposure through the world's largest youth-run organization.",
    highlights: ["Team Leadership", "Project Management", "Cross-cultural Communication", "Event Planning"],
    runeSymbol: "ᚺ",
  },
  {
    id: "open-source",
    chapter: "CHAPTER IV",
    title: "Open Source Club",
    institution: "University Club",
    period: "2023–2024",
    description:
      "Contributing to and organizing around open-source software development within the university community.",
    highlights: ["Git & GitHub", "Community Building", "Code Reviews", "Technical Workshops"],
    runeSymbol: "ᛚ",
  },
  {
    id: "algerie-telecom",
    chapter: "CHAPTER V",
    title: "Internship at Algérie Télécom",
    institution: "Algérie Télécom",
    period: "2025",
    description:
      "Professional internship at one of Algeria's leading telecommunications companies, working on real-world systems.",
    highlights: ["Enterprise Systems", "Network Infrastructure", "Team Collaboration", "Agile Methodology"],
    runeSymbol: "ᛗ",
  },
];

export const seedArtForms: ArtForm[] = [
  {
    id: "photography",
    name: "Photography",
    description:
      "Capturing light and moments — finding the extraordinary in the ordinary through composition and shadow.",
    icon: "camera",
    runeWord: "SETH",
  },
  {
    id: "violin",
    name: "Violin",
    description:
      "The voice of strings — translating emotion into melody, bridging the ancient and the modern through music.",
    icon: "music",
    runeWord: "ALDUIN",
  },
  {
    id: "blender-3d",
    name: "Blender / 3D",
    description:
      "Sculpting digital worlds — breathing life into wireframes and textures, building realms from imagination.",
    icon: "box",
    runeWord: "KAHVIIT",
  },
  {
    id: "graphic-design",
    name: "Graphic Design",
    description: "The art of visual communication — where typography, color, and form converge to tell stories.",
    icon: "pen-tool",
    runeWord: "DREM",
  },
  {
    id: "cinema",
    name: "Cinema",
    description: "Stories within stories — understanding the language of film, frame by frame, scene by scene.",
    icon: "film",
    runeWord: "JOOR",
  },
  {
    id: "visual-storytelling",
    name: "Visual Storytelling",
    description: "Weaving narratives through images — every pixel carries meaning, every composition tells a tale.",
    icon: "sparkles",
    runeWord: "WULD",
  },
];

export const seedAbout: AboutContent = {
  heroTagline: "Builder of digital realms, weaver of code and creativity",
  bio: "I'm Sarah Khodja, a software engineer and creative soul from Algeria. I craft digital experiences that bridge logic and art — from building full-stack applications to sculpting 3D worlds, composing music with violin, and capturing moments through my lens. My journey through computer science has been one of constant discovery, blending technical precision with creative expression.",
  interests: [
    { glyph: "💻", name: "Web Development", description: "Building full-stack applications with modern frameworks" },
    { glyph: "🎨", name: "Blender & 3D", description: "Creating digital worlds and visual art in 3D space" },
    { glyph: "📷", name: "Photography", description: "Capturing moments and compositions through the lens" },
    { glyph: "🎵", name: "Violin", description: "Playing classical and contemporary pieces on the violin" },
    { glyph: "🎬", name: "Cinema", description: "Exploring the art of visual storytelling through film" },
    { glyph: "📖", name: "Visual Storytelling", description: "Weaving narratives through images and design" },
    { glyph: "🎮", name: "Gaming", description: "Exploring virtual worlds and game design philosophy" },
    { glyph: "✍️", name: "Writing", description: "Crafting stories and technical articles" },
    { glyph: "🌍", name: "Open Source", description: "Contributing to and advocating for open-source software" },
    { glyph: "🧠", name: "AI & ML", description: "Exploring the frontiers of artificial intelligence" },
  ],
  skillBars: [
    { name: "TypeScript / JavaScript", level: 85, color: "#3178c6" },
    { name: "React / Next.js", level: 80, color: "#61dafb" },
    { name: "Python", level: 75, color: "#3776ab" },
    { name: "Node.js", level: 70, color: "#339933" },
    { name: "CSS / Tailwind", level: 80, color: "#06b6d4" },
    { name: "Git & GitHub", level: 75, color: "#f05032" },
  ],
  skillGroups: [
    {
      tier: "EXPERT",
      title: "Frontend Mastery",
      skills: ["React", "Next.js", "TypeScript", "Tailwind CSS", "Framer Motion", "HTML/CSS"],
    },
    {
      tier: "ADEPT",
      title: "Backend & Tools",
      skills: ["Node.js", "Express", "PostgreSQL", "MongoDB", "REST APIs", "GraphQL"],
    },
    {
      tier: "APPRENTICE",
      title: "Emerging Skills",
      skills: ["Docker", "AWS", "Three.js", "Blender", "Figma", "Linux"],
    },
  ],
  education: [
    { kind: "current", title: "Master's in Software Engineering", line: "University of Algiers — 2024–2026" },
    { kind: "previous", title: "Licence in Computer Science", line: "University of Algiers — 2021–2024" },
  ],
};
