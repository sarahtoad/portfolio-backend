import { Router } from "express";
import {
  readAbout,
  readStore,
} from "../store";
import { asyncHandler } from "../http";
import type { ArtForm, ArtProject, Certificate, JourneyChapter, Message, Quest } from "../types";

export const contentRouter = Router();

contentRouter.get(
  "/about",
  asyncHandler(async (_req, res) => {
    res.json(await readAbout());
  }),
);

contentRouter.get(
  "/artprojects",
  asyncHandler(async (req, res) => {
    const artId = typeof req.query.artId === "string" ? req.query.artId : undefined;
    let projects = await readStore<ArtProject>("artprojects");
    if (artId) projects = projects.filter((p) => p.artId === artId);
    projects.sort((a, b) => (b.year ?? "").localeCompare(a.year ?? ""));
    res.json(projects);
  }),
);

contentRouter.get(
  "/certificates",
  asyncHandler(async (_req, res) => {
    res.json(await readStore<Certificate>("certificates"));
  }),
);

contentRouter.get(
  "/creative",
  asyncHandler(async (_req, res) => {
    res.json(await readStore<ArtForm>("creative"));
  }),
);

contentRouter.get(
  "/experience",
  asyncHandler(async (_req, res) => {
    res.json(await readStore<JourneyChapter>("experience"));
  }),
);

contentRouter.get(
  "/messages",
  asyncHandler(async (_req, res) => {
    const messages = await readStore<Message>("messages");
    res.json(messages.filter((m) => m.status === "published"));
  }),
);

contentRouter.get(
  "/projects",
  asyncHandler(async (_req, res) => {
    res.json(await readStore<Quest>("projects"));
  }),
);
