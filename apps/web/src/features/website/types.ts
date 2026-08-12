export type SectionType = "hero" | "about" | "speakers" | "agenda" | "sponsors" | "venue" | "faq" | "cta";

export type Section = {
  type: SectionType;
  visible: boolean;
  content: Record<string, unknown>;
};

export type WebsiteTheme = {
  primary_color: string;
  font: string;
};

export type WebsiteConfig = {
  enabled: boolean;
  sections: Section[];
  theme: WebsiteTheme;
  custom_css: string;
};
