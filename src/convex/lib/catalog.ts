/**
 * Shared product catalogue. Kept next to the backend so both the Convex
 * functions and the React client read exactly the same vocabulary.
 */
export const CATEGORY_KEYS = [
  "fitness",
  "sports",
  "entertainment",
  "exploration",
  "learning",
  "creativity",
  "nature",
  "social",
  "contribution",
] as const;

export type CategoryKey = (typeof CATEGORY_KEYS)[number];

export type Category = {
  key: CategoryKey;
  label: string;
  tagline: string;
  emoji: string;
  activities: string[];
};

export const CATEGORIES: Category[] = [
  {
    key: "fitness",
    label: "Fitness",
    tagline: "Move together, not alone",
    emoji: "🏃",
    activities: ["Morning run", "Gym session", "Swimming", "Walk & talk", "Cycling", "Yoga"],
  },
  {
    key: "sports",
    label: "Sports",
    tagline: "Find your doubles partner",
    emoji: "🏸",
    activities: ["Badminton", "Football", "Cricket", "Basketball", "Table tennis", "Volleyball"],
  },
  {
    key: "entertainment",
    label: "Entertainment",
    tagline: "Someone to sit next to",
    emoji: "🎬",
    activities: ["Movie night", "Concert", "Comedy show", "Board games", "Gaming", "Cultural event"],
  },
  {
    key: "exploration",
    label: "Exploration",
    tagline: "Learn your own city",
    emoji: "🗺️",
    activities: ["Café outing", "Food walk", "City walk", "Bookstore crawl", "Museum visit", "Photo walk"],
  },
  {
    key: "learning",
    label: "Learning",
    tagline: "Study buddies, not study apps",
    emoji: "📚",
    activities: ["Study session", "Programming", "Mathematics", "Language practice", "Science discussion", "Build a project"],
  },
  {
    key: "creativity",
    label: "Creativity",
    tagline: "Make things beside people",
    emoji: "🎨",
    activities: ["Painting", "Music jam", "Photography", "Pottery", "Cooking", "Writing group"],
  },
  {
    key: "nature",
    label: "Nature",
    tagline: "Trails are better shared",
    emoji: "🌿",
    activities: ["Trekking", "Hiking", "Camping", "Birdwatching", "Outdoor picnic"],
  },
  {
    key: "social",
    label: "Social",
    tagline: "Low-pressure hanging out",
    emoji: "☕",
    activities: ["Coffee", "Dinner", "Picnic", "Small group hangout", "House party"],
  },
  {
    key: "contribution",
    label: "Contribution",
    tagline: "Do something useful together",
    emoji: "🤝",
    activities: ["Volunteering", "Clean-up drive", "Community kitchen", "Teach a skill", "Social initiative"],
  },
];

export const CATEGORY_MAP: Record<string, Category> = Object.fromEntries(
  CATEGORIES.map((category) => [category.key, category]),
);

export function categoryLabel(key: string): string {
  return CATEGORY_MAP[key]?.label ?? key;
}

export function categoryEmoji(key: string): string {
  return CATEGORY_MAP[key]?.emoji ?? "✦";
}

export const GROUP_SIZES = [
  { key: "one", label: "One-to-one", hint: "Quiet, focused, easy to talk" },
  { key: "small", label: "Small group (3–6)", hint: "The usual sweet spot" },
  { key: "large", label: "Bigger group (7+)", hint: "Less pressure to talk" },
] as const;

export type GroupSize = (typeof GROUP_SIZES)[number]["key"];

export const BUDGETS = [
  { key: "free", label: "Free only", hint: "Parks, walks, study sessions" },
  { key: "low", label: "Under ₹500", hint: "Coffee, a film, a shared cab" },
  { key: "flexible", label: "Flexible", hint: "Happy to spend a little more" },
] as const;

export type Budget = (typeof BUDGETS)[number]["key"];

export const COMFORT_LEVELS = [
  { key: "quiet", label: "Quiet & small", hint: "Predictable, low noise, no crowd" },
  { key: "balanced", label: "Balanced", hint: "A mix of calm and lively" },
  { key: "lively", label: "Lively", hint: "Bigger, busier, more energy" },
] as const;

export type Comfort = (typeof COMFORT_LEVELS)[number]["key"];

export const AVAILABILITY = [
  { key: "weekday-mornings", label: "Weekday mornings" },
  { key: "weekday-evenings", label: "Weekday evenings" },
  { key: "weekend-mornings", label: "Weekend mornings" },
  { key: "weekend-afternoons", label: "Weekend afternoons" },
  { key: "weekend-evenings", label: "Weekend evenings" },
] as const;

export type Availability = (typeof AVAILABILITY)[number]["key"];

export const LANGUAGES = [
  "English",
  "हिन्दी",
  "தமிழ்",
  "తెలుగు",
  "ಕನ್ನಡ",
  "മലയാളം",
  "मराठी",
  "বাংলা",
  "ગુજરાતી",
  "ਪੰਜਾਬੀ",
];

/** Cities are a starting point, not a restriction — the field is free text. */
export const CITY_SUGGESTIONS = [
  "Bengaluru",
  "Mumbai",
  "Delhi",
  "Pune",
  "Hyderabad",
  "Chennai",
  "Kolkata",
  "Ahmedabad",
  "Jaipur",
  "Kochi",
];

export const REPORT_REASONS = [
  "Harassment or unwanted contact",
  "Safety concern at a meetup",
  "Spam or advertising",
  "Impersonation",
  "Inappropriate content",
  "Something else",
] as const;

export const RECONNECT_LABELS: Record<string, string> = {
  yes: "Yes, I'd like to reconnect",
  maybe: "Maybe another time",
  no: "No, thank you",
};
