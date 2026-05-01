import { useEffect, useRef } from "react";

type Effect = {
  x: number;
  y: number;
  size: number;
  color: string;
  life: number;
  type: "circle" | "square" | "burst" | "image";
  img?: HTMLCanvasElement;
};

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const effectsRef = useRef<Effect[]>([]);
  const imagesRef = useRef<HTMLCanvasElement[]>([]);

  const noteMap: Record<string, string> = {
    a: "c",
    s: "d", // fallback (you don’t have d.mp3, we’ll skip it)
    d: "e",
    f: "f",
    g: "g",
    h: "a", // fallback
    j: "b",
  };
  
  // Only include the files you actually have
  const noteSounds: Record<string, HTMLAudioElement> = {
    c: new Audio("/sounds/c.mp3"),
    e: new Audio("/sounds/e.mp3"),
    f: new Audio("/sounds/f.mp3"),
    g: new Audio("/sounds/g.mp3"),
    b: new Audio("/sounds/b.mp3"),
    a: new Audio("/sounds/a.mp3"),
    d: new Audio("/sounds/d.mp3"),
  };
  
  const playNote = (note: string) => {
    const sound = noteSounds[note];
    if (!sound) return;
  
    const clone = sound.cloneNode() as HTMLAudioElement;
  
    // small variation so it doesn’t sound robotic
    clone.playbackRate = 0.9 + Math.random() * 0.2;
    clone.volume = 0.5;
  
    clone.play().catch(() => {});
  };

  const createOptimizedImage = (src: string): HTMLCanvasElement => {
    const img = new Image();
    const offscreen = document.createElement("canvas");
    const ctx = offscreen.getContext("2d")!;
  
    const size = 100;
  
    offscreen.width = size;
    offscreen.height = size;
  
    img.onload = () => {
      ctx.clearRect(0, 0, size, size);
      ctx.drawImage(img, 0, 0, size, size);
    };
  
    img.src = src;
  
    return offscreen;
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    const imageModules = import.meta.glob(
      "/src/assets/images/*.{png,jpg,jpeg}",
      { eager: true }
    ) as Record<string, { default: string }>;
    
    const imagePaths = Object.values(imageModules).map(
      (mod) => mod.default
    );
    
    imagesRef.current = imagePaths.map((src) =>
      createOptimizedImage(src)
    );

    resize();
    window.addEventListener("resize", resize);

    const randomColor = () =>
      `hsl(${Math.random() * 360}, 100%, 60%)`;

    const addEffect = (x: number, y: number, key?: string) => {
      console.log("Adding effect at", x, y, "with key:", key);
      let type: Effect["type"] = "circle";
    
      if (key) {
        if (/[0-9]/.test(key)) type = "square";
        else if (key === " ") type = "burst";
      }
    
      // 🔥 10% chance to spawn an image instead
      if (Math.random() < 0.1 && imagesRef.current.length > 0) {
        console.log("Spawning image effect");
        const img =
          imagesRef.current[
            Math.floor(Math.random() * imagesRef.current.length)
          ];
    
        effectsRef.current.push({
          x,
          y,
          size: 80,
          color: "",
          life: 1,
          type: "image",
          img,
        });
    
        return;
      }
    
      effectsRef.current.push({
        x,
        y,
        size: Math.random() * 40 + 20,
        color: randomColor(),
        life: 1,
        type,
      });
    };

    const drawEffect = (e: Effect) => {
      ctx.globalAlpha = e.life;
      ctx.fillStyle = e.color;

      if (e.type === "circle") {
        ctx.beginPath();
        ctx.arc(e.x, e.y, e.size, 0, Math.PI * 2);
        ctx.fill();
      }

      if (e.type === "square") {
        ctx.fillRect(e.x - e.size / 2, e.y - e.size / 2, e.size, e.size);
      }

      if (e.type === "image" && e.img) {
        ctx.globalAlpha = e.life;
      
        ctx.drawImage(
          e.img,
          e.x - e.size / 2,
          e.y - e.size / 2,
          e.size,
          e.size
        );
      
        ctx.globalAlpha = 1;
      }

      if (e.type === "burst") {
        for (let i = 0; i < 6; i++) {
          const angle = (Math.PI * 2 * i) / 6;
          const dx = Math.cos(angle) * e.size;
          const dy = Math.sin(angle) * e.size;

          ctx.beginPath();
          ctx.arc(e.x + dx, e.y + dy, e.size / 3, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      ctx.globalAlpha = 1;
    };

    const animate = () => {
      ctx.fillStyle = "rgba(0,0,0,0.2)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      effectsRef.current = effectsRef.current.filter((e) => {
        if (e.type === "image") {
          e.life -= 0.005; // no scaling
        } else {
          e.size += 1.5;
          e.life -= 0.01;
        }
      
        drawEffect(e);
        return e.life > 0;
      });

      requestAnimationFrame(animate);
    };

    animate();

    const handleKey = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
    
      const note = noteMap[key];
    
      if (note && noteSounds[note]) {
        playNote(note);
      }
    
      addEffect(
        Math.random() * canvas.width,
        Math.random() * canvas.height,
        key
      );
    };

    const handleClick = (e: MouseEvent) => {
      addEffect(e.clientX, e.clientY);
    };

    window.addEventListener("keydown", handleKey);
    window.addEventListener("click", handleClick);

    return () => {
      window.removeEventListener("resize", resize);
      window.removeEventListener("keydown", handleKey);
      window.removeEventListener("click", handleClick);
    };
  }, []);

  const goFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    }
  };

  return (
    <div
      onClick={goFullscreen}
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100vw",
        height: "100vh",
        background: "black",
      }}
    >
      <canvas ref={canvasRef} />
    </div>
  );
}