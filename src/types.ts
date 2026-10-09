export interface Certificate {
  id: string;
  title: string;
  issuer: string;
  year: string;
  description: string;
  seal: string;
  verifyUrl?: string;
  image?: string;
}

export interface Quest {
  id: string;
  name: string;
  tagline: string;
  status: "COMPLETED" | "IN PROGRESS";
  difficulty: "APPRENTICE" | "JOURNEYMAN" | "EXPERT" | "MASTER";
  objective: string;
  description: string;
  technologies: string[];
  achievements: string[];
  lessons: string[];
  image?: string;
  demoUrl?: string;
  repoUrl?: string;
}

export interface JourneyChapter {
  id: string;
  chapter: string;
  title: string;
  institution: string;
  period: string;
  description: string;
  highlights: string[];
  runeSymbol: string;
}

export interface Message {
  id: string;
  name: string;
  email: string;
  message: string;
  createdAt: string;
  status: "pending" | "published";
}

export interface DayStat {
  visits: number;
  unique: number;
  pageViews: number;
}

export interface Stats {
  totalVisits: number;
  uniqueVisitors: number;
  totalPageViews: number;
  days: Record<string, DayStat>;
  pageViewsByPath: Record<string, number>;
  referrers: Record<string, number>;
  browsers: Record<string, number>;
  devices: Record<string, number>;
}

export interface SkillBar {
  name: string;
  level: number;
  color?: string;
}

export interface SkillGroup {
  tier: "EXPERT" | "ADEPT" | "APPRENTICE";
  title: string;
  skills: string[];
}

export interface EducationEntry {
  kind: "current" | "previous";
  title: string;
  line: string;
}

export interface Interest {
  glyph: string;
  name: string;
  description: string;
}

export interface AboutContent {
  heroTagline: string;
  bio: string;
  interests: Interest[];
  skillBars: SkillBar[];
  skillGroups: SkillGroup[];
  education: EducationEntry[];
}

export interface ArtForm {
  id: string;
  name: string;
  description: string;
  icon: string;
  runeWord: string;
}

export interface ArtProject {
  id: string;
  artId: string;
  title: string;
  description: string;
  year: string;
  image?: string;
  url?: string;
  focalX?: number;
  focalY?: number;
}
