import { NotebookFrame } from "@/components/notebook/notebook-shell";
import { getCurrentProfile } from "@/lib/auth";

/**
 * Every signed-in screen sits in the notebook, which stays put between them.
 * Signed out (the landing on "/") or before onboarding, the screen brings its
 * own paper sheet, or redirects.
 */
export default async function NotebookLayout({ children }: LayoutProps<"/[locale]">) {
  const profile = await getCurrentProfile();
  if (!profile?.username) return children;
  return <NotebookFrame>{children}</NotebookFrame>;
}
