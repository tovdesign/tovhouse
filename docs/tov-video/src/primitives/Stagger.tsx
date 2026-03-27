import React from "react";
import { FadeIn } from "./FadeIn";

interface StaggerProps {
  children: React.ReactNode;
  interval?: number;
}

export const Stagger: React.FC<StaggerProps> = ({ children, interval = 6 }) => {
  const items = React.Children.toArray(children);
  return (
    <>
      {items.map((child, i) => (
        <FadeIn key={i} delay={i * interval}>
          {child}
        </FadeIn>
      ))}
    </>
  );
};
