export type SkillItem = {
  name: string;
  level: number; // 1-5
  description: string;
  years: number;
};

export type SkillCategory = {
  title: string;
  skills: SkillItem[];
};
