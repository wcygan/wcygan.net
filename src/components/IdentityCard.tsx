import { Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import type { RefObject } from "react";
import { socials } from "~/lib/socials";

type AnimatedModelId = "github" | "linkedin" | "projects";
type ModelId = AnimatedModelId | "resume" | "email";

type IdentityModel = {
  ariaLabel: string;
  href: string;
  id: ModelId;
  label: string;
  poster: string;
  rel?: string;
  target?: "_blank";
  videoWebm?: string;
};

const RESUME_HREF = "/will_cygan_resume.pdf";

const IDENTITY_MODELS: readonly IdentityModel[] = [
  {
    ariaLabel: "Open résumé",
    href: RESUME_HREF,
    id: "resume",
    label: "Resume",
    poster: "/identity-card/resume-still.webp",
    rel: "noopener noreferrer",
    target: "_blank",
  },
  {
    ariaLabel: "Compose email to Will Cygan",
    href: "mailto:wcygan.io@gmail.com",
    id: "email",
    label: "Email",
    poster: "/identity-card/email-still.webp",
  },
  {
    ariaLabel: "Open GitHub profile",
    href: socials.github,
    id: "github",
    label: "GitHub",
    poster: "/identity-card/github-still.png",
    rel: "noopener noreferrer me",
    target: "_blank",
    videoWebm: "/identity-card/github-spin.webm",
  },
  {
    ariaLabel: "Open LinkedIn profile",
    href: socials.linkedin,
    id: "linkedin",
    label: "LinkedIn",
    poster: "/identity-card/linkedin-still.png",
    rel: "noopener noreferrer me",
    target: "_blank",
    videoWebm: "/identity-card/linkedin-spin.webm",
  },
  {
    ariaLabel: "Open Nu Sync projects",
    href: "https://nu-sync.net/",
    id: "projects",
    label: "Projects",
    poster: "/identity-card/die-still.png",
    rel: "noopener noreferrer",
    target: "_blank",
    videoWebm: "/identity-card/die-spin.webm",
  },
];

const ANIMATED_MODEL_IDS = new Set<AnimatedModelId>([
  "github",
  "linkedin",
  "projects",
]);

const MODEL_MOTIONS: Readonly<
  Record<AnimatedModelId, { playbackRate: number; startPhase: number }>
> = {
  github: { playbackRate: 0.82, startPhase: 0 },
  linkedin: { playbackRate: 1, startPhase: 0 },
  projects: { playbackRate: 1.04, startPhase: 0 },
};

type IdentityCardProps = {
  variant: "full" | "compact";
};

function useSceneActivity(hostRef: RefObject<HTMLElement | null>) {
  const [isActive, setIsActive] = useState(false);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    let isIntersecting = false;

    const updateActivity = () => {
      setIsActive(
        isIntersecting &&
          document.visibilityState === "visible" &&
          !motionQuery.matches,
      );
    };

    const observer = new IntersectionObserver(
      ([entry]) => {
        isIntersecting = entry?.isIntersecting ?? false;
        updateActivity();
      },
      { threshold: 0.05 },
    );

    observer.observe(host);
    document.addEventListener("visibilitychange", updateActivity);
    motionQuery.addEventListener("change", updateActivity);

    return () => {
      observer.disconnect();
      document.removeEventListener("visibilitychange", updateActivity);
      motionQuery.removeEventListener("change", updateActivity);
    };
  }, [hostRef]);

  return isActive;
}

function AsciiWordmark() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const context = canvas.getContext("2d");
    const host = canvas.parentElement;
    if (!context || !host) return;

    type Particle = {
      offset: number;
      size: number;
      targetX: number;
      targetY: number;
      velocityX: number;
      velocityY: number;
      x: number;
      y: number;
    };

    const drawing = context;
    const element = canvas;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const glyphs = ".:-=+*#%VAULT";
    const wordmark = "Will Cygan";
    let animationFrame = 0;
    let isVisible = true;
    let lastTime = window.performance.now();
    let particles: Particle[] = [];
    let pointer = { active: false, x: 0, y: 0 };
    let time = 0;

    const createParticles = (
      width: number,
      height: number,
      scatterFromCanvas: boolean,
    ) => {
      const sample = document.createElement("canvas");
      const sampleContext = sample.getContext("2d", {
        willReadFrequently: true,
      });
      if (!sampleContext) return [];

      const sampleWidth = Math.max(280, Math.round(width * 0.9));
      const sampleHeight = Math.max(110, Math.round(height * 0.38));
      sample.width = sampleWidth;
      sample.height = sampleHeight;

      let fontSize = sampleHeight * 0.65;
      const characterSpacing = () => fontSize * 0.14;
      const measureWordmark = () =>
        Array.from(wordmark).reduce(
          (width, character) =>
            width + sampleContext.measureText(character).width,
          characterSpacing() * (wordmark.length - 1),
        );

      sampleContext.font = `650 ${fontSize}px ui-sans-serif, system-ui, sans-serif`;
      fontSize *= Math.min(1, (sampleWidth * 0.82) / measureWordmark());
      sampleContext.font = `650 ${fontSize}px ui-sans-serif, system-ui, sans-serif`;
      sampleContext.fillStyle = "#fff";
      sampleContext.textAlign = "left";
      sampleContext.textBaseline = "middle";

      let characterX = (sampleWidth - measureWordmark()) / 2;
      for (const character of wordmark) {
        sampleContext.fillText(character, characterX, sampleHeight / 2);
        characterX +=
          sampleContext.measureText(character).width + characterSpacing();
      }

      const pixels = sampleContext.getImageData(
        0,
        0,
        sampleWidth,
        sampleHeight,
      ).data;
      const isNarrowCanvas = width < 480;
      const stride = isNarrowCanvas
        ? 1
        : Math.max(2, Math.round(sampleWidth / 360));
      const points: Array<readonly [number, number]> = [];

      for (let y = 0; y < sampleHeight; y += stride) {
        for (let x = 0; x < sampleWidth; x += stride) {
          if (pixels[(y * sampleWidth + x) * 4 + 3] > 120) {
            points.push([x, y]);
          }
        }
      }

      const particleCount = Math.min(
        points.length,
        isNarrowCanvas ? 720 : 1560,
      );
      return Array.from({ length: particleCount }, (_, index) => {
        const point = points[
          Math.floor((index * points.length) / particleCount)
        ] ?? [sampleWidth / 2, sampleHeight / 2];
        const targetX = (width - sampleWidth) / 2 + point[0];
        const targetY = (height - sampleHeight) / 2 + point[1];
        return {
          offset: Math.random() * Math.PI * 2,
          size: 0.62 + Math.random() * 0.55,
          targetX,
          targetY,
          velocityX: 0,
          velocityY: 0,
          x: scatterFromCanvas ? Math.random() * width : targetX,
          y: scatterFromCanvas ? Math.random() * height : targetY,
        };
      });
    };

    const draw = (delta: number, staticFrame = false) => {
      const { width, height } = element.getBoundingClientRect();
      if (!width || !height) return;

      const deltaSeconds = Math.min(delta / 1000, 0.032);
      const damping = Math.exp(-11 * deltaSeconds);
      drawing.clearRect(0, 0, width, height);
      drawing.textAlign = "center";
      drawing.textBaseline = "middle";
      drawing.font = `${Math.max(
        3.5,
        Math.min(4, width / 200),
      )}px ui-monospace, SFMono-Regular, Menlo, monospace`;

      for (const particle of particles) {
        const flowX =
          (Math.sin(time * 0.66 + particle.targetY * 0.026 + particle.offset) +
            Math.sin(time * 0.24 + particle.targetX * 0.012) * 0.48) *
          (0.28 + particle.size * 0.18);
        const flowY =
          (Math.cos(time * 0.58 + particle.targetX * 0.023 + particle.offset) +
            Math.sin(time * 0.2 + particle.targetY * 0.014) * 0.42) *
          (0.28 + particle.size * 0.18);
        const targetX = particle.targetX + (staticFrame ? 0 : flowX);
        const targetY = particle.targetY + (staticFrame ? 0 : flowY);

        if (staticFrame) {
          particle.x = targetX;
          particle.y = targetY;
          particle.velocityX = 0;
          particle.velocityY = 0;
        } else {
          particle.velocityX += (targetX - particle.x) * 48 * deltaSeconds;
          particle.velocityY += (targetY - particle.y) * 48 * deltaSeconds;

          if (pointer.active) {
            let deltaX = particle.x - pointer.x;
            let deltaY = particle.y - pointer.y;
            let distance = Math.hypot(deltaX, deltaY);
            if (distance < 96) {
              if (distance < 0.1) {
                deltaX = Math.cos(particle.offset) * 0.1;
                deltaY = Math.sin(particle.offset) * 0.1;
                distance = 0.1;
              }
              const falloff = 1 - distance / 96;
              const impulse = 1800 * falloff * falloff * deltaSeconds;
              particle.velocityX += (deltaX / distance) * impulse;
              particle.velocityY += (deltaY / distance) * impulse;
            }
          }

          particle.velocityX *= damping;
          particle.velocityY *= damping;
          particle.x += particle.velocityX * deltaSeconds;
          particle.y += particle.velocityY * deltaSeconds;
        }

        const displacement = Math.hypot(
          targetX - particle.x,
          targetY - particle.y,
        );
        const glyphIndex = Math.min(
          glyphs.length - 1,
          5 +
            Math.floor(
              ((Math.sin(particle.offset * 7.1) + 1) / 2) * 7 +
                displacement * 0.45,
            ),
        );
        drawing.fillStyle = `rgb(20 20 18 / ${Math.min(
          1,
          0.84 + particle.size * 0.12 + displacement * 0.02,
        )})`;
        drawing.fillText(glyphs[glyphIndex], particle.x, particle.y);
      }
    };

    const resize = () => {
      const { width, height } = host.getBoundingClientRect();
      const pixelRatio = Math.min((window.devicePixelRatio || 1) * 1.5, 3);
      const backingWidth = Math.max(1, Math.round(width * pixelRatio));
      const backingHeight = Math.max(1, Math.round(height * pixelRatio));

      if (
        particles.length > 0 &&
        element.width === backingWidth &&
        element.height === backingHeight
      )
        return;

      const shouldScatter = particles.length === 0;
      element.width = backingWidth;
      element.height = backingHeight;
      element.style.width = `${width}px`;
      element.style.height = `${height}px`;
      drawing.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
      particles = createParticles(width, height, shouldScatter);
      draw(0, reducedMotion.matches);
    };

    const animate = (now: number) => {
      const delta = Math.min(32, now - lastTime);
      lastTime = now;
      if (isVisible && !reducedMotion.matches) {
        time += delta / 1000;
        draw(delta);
      }
      animationFrame = window.requestAnimationFrame(animate);
    };

    const updatePointer = (event: PointerEvent) => {
      const bounds = element.getBoundingClientRect();
      pointer = {
        active: true,
        x: event.clientX - bounds.left,
        y: event.clientY - bounds.top,
      };
    };
    const clearPointer = () => {
      pointer.active = false;
    };
    const updateMotionPreference = () => {
      if (reducedMotion.matches) draw(0, true);
    };
    const intersectionObserver = new IntersectionObserver(
      ([entry]) => {
        isVisible = entry?.isIntersecting ?? false;
      },
      { threshold: 0.05 },
    );
    const resizeObserver = new ResizeObserver(resize);

    intersectionObserver.observe(host);
    resizeObserver.observe(host);
    element.addEventListener("pointermove", updatePointer);
    element.addEventListener("pointerleave", clearPointer);
    reducedMotion.addEventListener("change", updateMotionPreference);
    resize();
    animationFrame = window.requestAnimationFrame(animate);

    return () => {
      window.cancelAnimationFrame(animationFrame);
      intersectionObserver.disconnect();
      resizeObserver.disconnect();
      element.removeEventListener("pointermove", updatePointer);
      element.removeEventListener("pointerleave", clearPointer);
      reducedMotion.removeEventListener("change", updateMotionPreference);
    };
  }, []);

  return (
    <canvas
      aria-hidden="true"
      className="identity-card__canvas"
      ref={canvasRef}
    />
  );
}

function IdentityLinks({ variant }: Pick<IdentityCardProps, "variant">) {
  const hostRef = useRef<HTMLElement>(null);
  const videoRefs = useRef<Partial<Record<AnimatedModelId, HTMLVideoElement>>>(
    {},
  );
  const initializedModels = useRef(new Set<AnimatedModelId>());
  const [playingModels, setPlayingModels] = useState<
    ReadonlySet<AnimatedModelId>
  >(new Set());
  const isSceneActive = useSceneActivity(hostRef);
  const models =
    variant === "full"
      ? IDENTITY_MODELS.filter((model) =>
          ANIMATED_MODEL_IDS.has(model.id as AnimatedModelId),
        )
      : IDENTITY_MODELS;

  const configureModel = (id: AnimatedModelId, video: HTMLVideoElement) => {
    const motion = MODEL_MOTIONS[id];
    video.playbackRate = motion.playbackRate;

    if (initializedModels.current.has(id)) return;

    const duration = video.duration;
    if (!Number.isFinite(duration) || duration <= 0) return;

    video.currentTime = duration * motion.startPhase;
    initializedModels.current.add(id);
  };

  useEffect(() => {
    const videos = Object.entries(videoRefs.current) as Array<
      [AnimatedModelId, HTMLVideoElement | undefined]
    >;

    if (!isSceneActive) {
      videos.forEach(([, video]) => video?.pause());
      setPlayingModels(new Set());
      return;
    }

    videos.forEach(([id, video]) => {
      if (!video) return;

      configureModel(id, video);
      void video.play().catch(() => undefined);
    });
  }, [isSceneActive]);

  return (
    <nav
      aria-label="Profile links"
      className={`identity-card__links identity-card__links--${variant}`}
      ref={hostRef}
    >
      {models.map((model) => {
        const hasVideo = ANIMATED_MODEL_IDS.has(model.id as AnimatedModelId);
        const isPlaying =
          hasVideo && playingModels.has(model.id as AnimatedModelId);

        return (
          <a
            aria-label={model.ariaLabel}
            className={`identity-card__model identity-card__model--${model.id}`}
            href={model.href}
            key={model.id}
            rel={model.rel}
            target={model.target}
          >
            {variant === "full" ? (
              <>
                <span
                  aria-hidden="true"
                  className="identity-card__model-media"
                  data-playing={isPlaying}
                >
                  <span className="identity-card__model-motion">
                    <img
                      alt=""
                      className="identity-card__model-poster"
                      draggable="false"
                      height="560"
                      src={model.poster}
                      width="560"
                    />
                    {hasVideo ? (
                      <video
                        className="identity-card__model-video"
                        data-playing={isPlaying}
                        loop
                        muted
                        onLoadedMetadata={(event) =>
                          configureModel(
                            model.id as AnimatedModelId,
                            event.currentTarget,
                          )
                        }
                        onCanPlay={(event) => {
                          if (isSceneActive) {
                            configureModel(
                              model.id as AnimatedModelId,
                              event.currentTarget,
                            );
                            void event.currentTarget
                              .play()
                              .catch(() => undefined);
                          }
                        }}
                        onPause={() =>
                          setPlayingModels((models) => {
                            const next = new Set(models);
                            next.delete(model.id as AnimatedModelId);
                            return next;
                          })
                        }
                        onPlaying={() =>
                          setPlayingModels((models) =>
                            models.has(model.id as AnimatedModelId)
                              ? models
                              : new Set(models).add(
                                  model.id as AnimatedModelId,
                                ),
                          )
                        }
                        playsInline
                        poster={model.poster}
                        preload="metadata"
                        ref={(video) => {
                          const id = model.id as AnimatedModelId;
                          if (video) videoRefs.current[id] = video;
                          else delete videoRefs.current[id];
                        }}
                      >
                        <source src={model.videoWebm} type="video/webm" />
                      </video>
                    ) : null}
                  </span>
                </span>
                <span aria-hidden="true" className="identity-card__model-label">
                  {model.label}
                </span>
              </>
            ) : (
              model.label
            )}
          </a>
        );
      })}
    </nav>
  );
}

export function IdentityCard({ variant }: IdentityCardProps) {
  if (variant === "compact") {
    return (
      <header className="identity-card identity-card--compact h-card">
        <p className="identity-card__compact-name p-name">
          <Link className="u-url" to="/">
            Will Cygan
          </Link>
        </p>
        <p className="identity-card__compact-role p-note">
          <a
            className="identity-card__role-link"
            href={RESUME_HREF}
            rel="noopener noreferrer"
            target="_blank"
          >
            Software Engineer
          </a>
        </p>
        <IdentityLinks variant="compact" />
      </header>
    );
  }

  return (
    <header className="identity-card identity-card--full h-card">
      <div className="identity-card__wordmark">
        <AsciiWordmark />
      </div>
      <h1 className="identity-card__name">
        <span className="identity-card__identity p-name">
          <span>Will</span>
          <span aria-hidden="true" className="identity-card__phonetic">
            /wɪl/
          </span>
          <span>Cygan</span>
          <span aria-hidden="true" className="identity-card__phonetic">
            /tsɪˈɡɑːn/
          </span>
        </span>
        <span aria-hidden="true" className="identity-card__divider">
          •
        </span>
        <span className="identity-card__role p-note">
          <a
            className="identity-card__role-link"
            href={RESUME_HREF}
            rel="noopener noreferrer"
            target="_blank"
          >
            Software Engineer
          </a>
        </span>
      </h1>
      <IdentityLinks variant="full" />
    </header>
  );
}
