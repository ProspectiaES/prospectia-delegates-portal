import { redirect } from "next/navigation";

// Middleware handles the auth redirect; this is a fallback.
export default function RootPage() {
  redirect("/dashboard");
}
