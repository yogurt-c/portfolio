"use client";

import { useState } from "react";
import type { Project } from "@/types";
import ProjectCard from "./ProjectCard";
import ProjectModal from "./ProjectModal";

export default function ProjectGrid({ projects }: { projects: Project[] }) {
  const [open, setOpen] = useState<Project | null>(null);

  return (
    <>
      <main className="grid">
        {projects.map((p, i) => (
          <ProjectCard key={p.id} project={p} index={i} onOpen={setOpen} />
        ))}
      </main>
      {open && <ProjectModal project={open} onClose={() => setOpen(null)} />}
    </>
  );
}
