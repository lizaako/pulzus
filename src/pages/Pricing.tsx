import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Check } from 'lucide-react';
import ParticleBackground from '@/components/ParticleBackground';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

const TIERS = [
  {
    name: 'Állampolgár',
    label: 'Ingyenes',
    price: '0 euró / hó',
    features: [
      'Óránként frissülő hírfolyam',
      'Nincs szükség fiókra',
      'Live konfliktusgömb és káosz index',
      'Napi 10 cikkelemzés',
    ],
  },
  {
    name: 'Újságíró',
    label: 'Pro',
    price: '4.90 euró / hó',
    features: [
      'Korlátlan cikkelemzés',
      'Minden alap funkció',
      'PDF riport export',
      'Email értesítések, amikor megugrik a káoszpontszám',
    ],
  },
  {
    name: 'Intézmény',
    label: 'Vállalati',
    price: '19.90 euró / hó',
    features: [
      'Minden Pro funkció',
      'API hozzáférés az összes adathoz',
      'Egyedi országfigyelés Magyarországon túl',
      'Dedikált kapcsolattartó',
      'Célcsoport: civil szervezetek, egyetemek, nagykövetségek és külföldi sajtóirodák',
    ],
  },
];

export default function Pricing() {
  const [waitlistOpen, setWaitlistOpen] = useState(false);
  const [email, setEmail] = useState('');

  return (
    <div className="min-h-screen bg-background relative">
      <ParticleBackground />

      <header className="relative z-10 border-b border-[#333333] bg-[#0D0D0D] text-[#F2EDE4]">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <div>
            <p className="text-[11px] uppercase tracking-[0.24em] text-[#F2EDE4]/70">PULZUS</p>
            <h1 className="font-display text-3xl font-extrabold uppercase tracking-[0.16em] text-[#F2EDE4]">Árazás</h1>
          </div>
          <Button asChild variant="outline" className="rounded-none border-border bg-transparent text-foreground hover:bg-secondary">
            <Link to="/">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Vissza
            </Link>
          </Button>
        </div>
      </header>

      <main className="relative z-10 mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-14">
        <section className="glass-panel border border-border p-6 sm:p-8">
          <div className="max-w-3xl">
            <p className="text-[11px] uppercase tracking-[0.24em] text-muted-foreground">Előfizetések</p>
            <h2 className="mt-2 font-display text-4xl font-extrabold tracking-[-0.04em] text-foreground">
              Az igazsághoz való hozzáférés alapvető jog.
            </h2>
            <p className="mt-4 text-base text-muted-foreground">
              A Pulzus különböző csomagjai azért készültek, hogy mindenki a saját helyzetéhez illő mélységben férhessen hozzá a tisztább, ellenőrizhetőbb információkhoz.
            </p>
          </div>

          <div className="mt-8 grid gap-4 lg:grid-cols-3">
            {TIERS.map((tier, index) => (
              <section
                key={tier.name}
                className={`border p-6 ${
                  index === 1
                    ? 'border-[#C8243C] bg-[#151515] shadow-[0_0_0_1px_rgba(200,36,60,0.22)]'
                    : 'border-border bg-card'
                }`}
              >
                <p className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">{tier.label}</p>
                <h3 className="mt-3 font-display text-3xl font-extrabold text-foreground">{tier.name}</h3>
                <p className="mt-3 text-2xl font-semibold text-foreground">{tier.price}</p>

                <div className="mt-6 space-y-3">
                  {tier.features.map((feature) => (
                    <div key={feature} className="flex items-start gap-3 text-sm text-muted-foreground">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-[#C8243C]" />
                      <span>{feature}</span>
                    </div>
                  ))}
                </div>
              </section>
            ))}
          </div>

          <div className="mt-8 border border-border bg-secondary/45 p-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h3 className="font-display text-2xl font-bold text-foreground">Csatlakozz a várólistához</h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  A gomb megnyit egy email mezőt, ahol a korai hozzáféréshez lehet jelentkezni.
                </p>
              </div>
              <Button
                type="button"
                className="rounded-none bg-[#C8243C] px-6 text-[#F2EDE4] hover:bg-[#A01E30]"
                onClick={() => setWaitlistOpen((current) => !current)}
              >
                Csatlakozz a várólistához
              </Button>
            </div>

            {waitlistOpen && (
              <div className="mt-4 max-w-xl">
                <Input
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="email@pelda.hu"
                  className="rounded-none border-border bg-background"
                />
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
