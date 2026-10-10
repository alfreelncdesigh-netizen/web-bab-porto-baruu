import React from 'react';

export const AffinityLogo = ({ className = "h-4 w-auto" }: { className?: string }) => {
  return (
    <svg viewBox="0 0 120 30" className={className} fill="currentColor" xmlns="http://www.w3.org/2000/svg">
      <text 
        x="0" 
        y="24" 
        fontFamily="ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif" 
        fontWeight="900" 
        fontSize="30" 
        letterSpacing="-1.5"
      >
        affinity
      </text>
    </svg>
  );
};
