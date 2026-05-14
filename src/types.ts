export type ProjectLink = {
  label: string;
  url: string;
};

export type Project = {
  id: string;
  title: string;
  period: string;
  desc: string;
  body: string;
  image: string;
  tags: string[];
  links: ProjectLink[];
  position: number;
};

export type Profile = {
  name: string;
  role: string;
  bio: string;
  email: string;
  github: string;
  location: string;
};

export type ProjectInput = Omit<Project, "id" | "position">;
