"use client";

import { CreatorPage } from "@/views/CreatorPage";

export default function Page() {
  return (
    <CreatorPage
      name="Rico Trebeljahr"
      username="ricotrebeljahr"
      image="/creators/rico.jpeg"
      role="Developer of playtiao.com"
      bio={<>Rico is a full-stack software engineer based in Berlin who built this digital version of Tiao. He&apos;s passionate about crafting polished web experiences with a love for real-time multiplayer systems. Outside of coding, Rico writes a blog and newsletter called <a href="https://newsletter.trebeljahr.com" target="_blank" rel="noopener noreferrer" className="font-medium text-[#5d4732] underline decoration-[#d4c4a8] underline-offset-2 hover:text-[#3a2818]">Live and Learn</a>, creates mathematical art like <a href="https://fractal-garden.trebeljahr.com" target="_blank" rel="noopener noreferrer" className="font-medium text-[#5d4732] underline decoration-[#d4c4a8] underline-offset-2 hover:text-[#3a2818]">Fractal Garden</a>, and is always exploring new ideas at the intersection of technology and creativity.</>}
      links={[
        { label: "Website", href: "https://ricos.site" },
        { label: "LinkedIn", href: "https://www.linkedin.com/in/trebeljahr/" },
        { label: "GitHub", href: "https://github.com/trebeljahr" },
      ]}
    />
  );
}
