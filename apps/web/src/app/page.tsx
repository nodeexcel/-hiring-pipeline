import { redirect } from "next/navigation";

/** There is no public landing page: this is an internal tool, so the root goes to sign in. */
export default function Home() {
  redirect("/login");
}
