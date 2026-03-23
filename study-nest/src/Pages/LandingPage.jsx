import React from "react";
import LandingNavbar from "../Components/Landing/LandingNavbar";
import Hero from "../Components/Landing/Hero";
import Why from "../Components/Landing/Why";
import VideoSection from "../Components/Landing/VideoSection";
import Inside from "../Components/Landing/Inside";
import Process from "../Components/Landing/Process";
import Performance from "../Components/Landing/Performance";
import Team from "../Components/Landing/Team";
import Gallery from "../Components/Landing/Gallery";
import CareersCTA from "../Components/Landing/CareersCTA";
import LandingFooter from "../Components/Landing/LandingFooter";

export default function LandingPage() {
  return (
    <main className="bg-white text-zinc-900 selection:bg-zinc-900 selection:text-white">
      <LandingNavbar />
      <Hero />
      <Why />
      <VideoSection youtubeUrl="https://youtu.be/c_i8x8M0Gzg" />
      <Inside />
      <Process />
      <Performance />
      <Team />
      <Gallery />
      <CareersCTA />
      <LandingFooter />
    </main>
  );
}