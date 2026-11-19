import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ClipboardListIcon,
  CpuIcon,
  KeyRoundIcon,
  MonitorSmartphoneIcon,
  PrinterIcon,
  WifiIcon,
} from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

const SERVICES = [
  { icon: CpuIcon, title: "Hardware", text: "Computer, monitor, keyboard or UPS problems." },
  { icon: MonitorSmartphoneIcon, title: "Software", text: "Install, update or fix programs and systems." },
  { icon: WifiIcon, title: "Network & Internet", text: "No connection, slow Wi-Fi, LAN or access point issues." },
  { icon: KeyRoundIcon, title: "Accounts", text: "Password resets, school email and portal access." },
  { icon: PrinterIcon, title: "Printers", text: "Printer setup, sharing, jams and toner." },
  { icon: ClipboardListIcon, title: "Track your request", text: "See status updates and talk with MIS staff." },
];

export default async function Home() {
  if (await getCurrentUser()) redirect("/dashboard");
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="border-b">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
          <Logo />
          <div className="flex gap-2">
            <Button variant="ghost" asChild>
              <Link href="/login">Sign in</Link>
            </Button>
            <Button asChild>
              <Link href="/register">Create account</Link>
            </Button>
          </div>
        </div>
      </header>
      <main className="flex-1">
        <section className="mx-auto max-w-6xl px-4 py-16 sm:py-24">
          <p className="text-sm font-medium text-primary">Management Information Systems Office</p>
          <h1 className="mt-3 max-w-2xl text-4xl font-semibold tracking-tight sm:text-5xl">
            Need help with a computer, network or account?
          </h1>
          <p className="mt-4 max-w-xl text-lg text-muted-foreground">
            Send a support request to the MIS office, then follow its progress until it is fixed. Students, faculty and
            staff are welcome.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button size="lg" asChild>
              <Link href="/login">Request MIS Support</Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link href="/register">I don&apos;t have an account yet</Link>
            </Button>
          </div>
        </section>
        <section className="border-t bg-muted/40">
          <div className="mx-auto grid max-w-6xl gap-4 px-4 py-12 sm:grid-cols-2 lg:grid-cols-3">
            {SERVICES.map((s) => (
              <Card key={s.title} className="shadow-none">
                <CardContent className="flex gap-4">
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <s.icon className="size-5" />
                  </span>
                  <div>
                    <p className="font-medium">{s.title}</p>
                    <p className="text-sm text-muted-foreground">{s.text}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      </main>
      <footer className="border-t py-6 text-center text-xs text-muted-foreground">
        MIServe · MIS Office support request system
      </footer>
    </div>
  );
}
