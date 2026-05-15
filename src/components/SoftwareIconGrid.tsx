type SoftwareItem = {
  name: string;
  href: string;
  icon: string;
  shape?: "wide";
};

const software: readonly SoftwareItem[] = [
  {
    name: "Ghostty",
    href: "https://github.com/ghostty-org/ghostty",
    icon: "/software-icons/ghostty.png",
  },
  {
    name: "Zed",
    href: "https://github.com/zed-industries/zed",
    icon: "/software-icons/zed.svg",
  },
  {
    name: "fish",
    href: "https://github.com/fish-shell/fish-shell",
    icon: "/software-icons/fish.png",
  },
  {
    name: "LazyGit",
    href: "https://github.com/jesseduffield/lazygit",
    icon: "/software-icons/lazygit.svg",
    shape: "wide",
  },
  {
    name: "RipGrep",
    href: "https://github.com/BurntSushi/ripgrep",
    icon: "/software-icons/ripgrep.svg",
    shape: "wide",
  },
  {
    name: "fzf",
    href: "https://github.com/junegunn/fzf",
    icon: "/software-icons/fzf.png",
    shape: "wide",
  },
  {
    name: "fd",
    href: "https://github.com/sharkdp/fd",
    icon: "/software-icons/fd.png",
    shape: "wide",
  },
  {
    name: "jq",
    href: "https://github.com/jqlang/jq",
    icon: "/software-icons/jq.svg",
    shape: "wide",
  },
  {
    name: "Starship",
    href: "https://github.com/starship/starship",
    icon: "/software-icons/starship.svg",
  },
  {
    name: "uv",
    href: "https://docs.astral.sh/uv/",
    icon: "/software-icons/uv.svg",
  },
  {
    name: "just",
    href: "https://github.com/casey/just",
    icon: "/software-icons/just.png",
  },
  {
    name: "jj",
    href: "https://github.com/jj-vcs/jj",
    icon: "/software-icons/jj.svg",
  },
];

export function SoftwareIconGrid() {
  return (
    <ul className="software-icon-grid" aria-label="Software I like">
      {software.map((item) => {
        const imageClassName =
          item.shape === "wide"
            ? "software-icon-image software-icon-image--wide"
            : "software-icon-image";

        return (
          <li key={item.name}>
            <a
              className="software-icon-card"
              href={item.href}
              target="_blank"
              rel="noopener noreferrer"
            >
              <span className="software-icon-frame" aria-hidden="true">
                <img
                  className={imageClassName}
                  src={item.icon}
                  alt=""
                  width={item.shape === "wide" ? 84 : 48}
                  height={item.shape === "wide" ? 46 : 48}
                  decoding="async"
                />
              </span>
              <span className="software-icon-name">{item.name}</span>
            </a>
          </li>
        );
      })}
    </ul>
  );
}
