"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import { isLocalUploadPath } from "@/lib/image-url";
import { motion, AnimatePresence } from "framer-motion";
import { FiChevronLeft, FiChevronRight } from "react-icons/fi";

interface SlideData {
  id: string;
  image: string;
}

const localSlides: SlideData[] = [
  { id: "local-1", image: "/img/banner-1.png" },
  { id: "local-2", image: "/img/banner-2.png" },
];

const slideVariants = {
  enter: (direction: number) => ({
    x: direction > 0 ? 300 : -300,
    opacity: 0,
  }),
  center: {
    x: 0,
    opacity: 1,
  },
  exit: (direction: number) => ({
    x: direction > 0 ? -300 : 300,
    opacity: 0,
  }),
};

interface BannerFromDB {
  id: string;
  image: string;
  title?: string | null;
  subtitle?: string | null;
  buttonText?: string | null;
  buttonLink?: string | null;
}

export default function HeroSlider({ banners }: { banners?: BannerFromDB[] }) {
  const slides: SlideData[] =
    banners && banners.length > 0
      ? banners.map((b) => ({ id: b.id, image: b.image }))
      : localSlides;

  const [current, setCurrent] = useState(0);
  const [direction, setDirection] = useState(1);
  const [isPaused, setIsPaused] = useState(false);

  const goTo = useCallback(
    (index: number) => {
      setDirection(index > current ? 1 : -1);
      setCurrent(index);
    },
    [current]
  );

  const next = useCallback(() => {
    setDirection(1);
    setCurrent((prev) => (prev + 1) % slides.length);
  }, [slides.length]);

  const prev = useCallback(() => {
    setDirection(-1);
    setCurrent((prev) => (prev - 1 + slides.length) % slides.length);
  }, [slides.length]);

  useEffect(() => {
    if (isPaused || slides.length <= 1) return;
    const timer = setInterval(next, 5000);
    return () => clearInterval(timer);
  }, [isPaused, next, slides.length]);

  const slide = slides[current];

  return (
    <section
      className="relative overflow-hidden mx-4 sm:mx-6 lg:mx-8 mt-4 rounded-2xl"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      <div className="relative w-full mx-auto max-w-[1050px] aspect-[1050/450]">
        <AnimatePresence initial={false} custom={direction} mode="wait">
          <motion.div
            key={slide.id}
            custom={direction}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.5, ease: "easeInOut" }}
            className="absolute inset-0"
          >
            <Image
              src={slide.image}
              alt="Karamba"
              fill
              unoptimized={isLocalUploadPath(slide.image)}
              className="object-cover rounded-2xl"
              priority={current === 0}
              sizes="100vw"
            />
          </motion.div>
        </AnimatePresence>
      </div>

      {slides.length > 1 && (
        <>
          <button
            onClick={prev}
            aria-label="Anterior"
            className="absolute left-4 sm:left-6 top-1/2 -translate-y-1/2 z-20 w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-white shadow-lg border border-primary-light/50 flex items-center justify-center text-primary-dark hover:bg-primary hover:text-white hover:shadow-primary/30 transition-all duration-200"
          >
            <FiChevronLeft size={22} />
          </button>
          <button
            onClick={next}
            aria-label="Siguiente"
            className="absolute right-4 sm:right-6 top-1/2 -translate-y-1/2 z-20 w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-white shadow-lg border border-primary-light/50 flex items-center justify-center text-primary-dark hover:bg-primary hover:text-white hover:shadow-primary/30 transition-all duration-200"
          >
            <FiChevronRight size={22} />
          </button>
        </>
      )}

      {slides.length > 1 && (
        <div className="absolute bottom-4 sm:bottom-5 left-1/2 -translate-x-1/2 flex gap-2.5 z-20">
          {slides.map((_, i) => (
            <button
              key={i}
              onClick={() => goTo(i)}
              aria-label={`Ir al slide ${i + 1}`}
              className={`h-2.5 rounded-full transition-all duration-300 ${
                i === current
                  ? "w-9 bg-primary shadow-md"
                  : "w-2.5 bg-white/70 hover:bg-white"
              }`}
            />
          ))}
        </div>
      )}
    </section>
  );
}
