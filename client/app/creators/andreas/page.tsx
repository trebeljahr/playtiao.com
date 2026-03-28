"use client";

import { CreatorPage } from "@/views/CreatorPage";

export default function Page() {
  return (
    <CreatorPage
      name="Andreas Edmeier"
      username="Andreas Edmeier"
      image="/creators/andreas.jpeg"
      role="Game Designer & Creator of Tiao"
      bio={<>Andreas is a game developer from Germany and the brilliant mind behind Tiao. With a passion for board games and game design, he created the original concept that became this digital adaptation. When he&apos;s not crafting elegant game mechanics, Andreas works as a C++ application programmer at Ubisoft, where he&apos;s contributed to titles like <a href="https://www.ubisoft.com/en-us/game/assassins-creed/nexus-vr" target="_blank" rel="noopener noreferrer" className="font-medium text-[#5d4732] underline decoration-[#d4c4a8] underline-offset-2 hover:text-[#3a2818]">Assassin&apos;s Creed Nexus</a> and <a href="https://www.ubisoft.com/en-us/game/avatar/frontiers-of-pandora" target="_blank" rel="noopener noreferrer" className="font-medium text-[#5d4732] underline decoration-[#d4c4a8] underline-offset-2 hover:text-[#3a2818]">Avatar: Frontiers of Pandora</a>. He&apos;s also an astronomy and space flight nerd who plays drums and guitar.</>}
      links={[
        { label: "Website", href: "https://www.assertores.me/" },
        { label: "LinkedIn", href: "https://www.linkedin.com/in/andreas-edmeier/" },
        { label: "GitHub", href: "https://github.com/Assertores" },
      ]}
    />
  );
}
