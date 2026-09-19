import { redirect } from "next/navigation";
import { resolveWorkspace } from "@/lib/data/workspace";

export default async function HomePage() {
  const resolution = await resolveWorkspace();

  if (resolution.kind === "internal") redirect("/dashboard");
  if (resolution.kind === "portal") redirect("/portal");
  if (resolution.kind === "both") redirect("/select-workspace");
  redirect("/onboarding");
}
