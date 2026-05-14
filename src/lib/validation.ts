import { z } from "zod";

export const linkSchema = z.object({
  label: z.string().min(1).max(60),
  url: z.string().min(1).max(500),
});

export const projectInputSchema = z.object({
  title: z.string().min(1).max(200),
  period: z.string().max(60).default(""),
  desc: z.string().max(400).default(""),
  body: z.string().max(50_000).default(""),
  image: z
    .union([z.string().url().max(1000), z.literal("")])
    .default(""),
  tags: z.array(z.string().min(1).max(40)).max(40).default([]),
  links: z.array(linkSchema).max(20).default([]),
});

export const profileInputSchema = z.object({
  name: z.string().min(1).max(120),
  role: z.string().max(200).default(""),
  bio: z.string().max(2000).default(""),
  email: z.string().max(200).default(""),
  github: z.string().max(200).default(""),
  location: z.string().max(120).default(""),
});

export const reorderSchema = z.object({
  order: z.array(z.string().min(1)).min(1),
});

export const loginSchema = z.object({
  password: z.string().min(1).max(200),
});

export const mcpTokenCreateSchema = z.object({
  label: z.string().min(1).max(60),
});
