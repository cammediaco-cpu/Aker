
import React from 'react';

export const FilmIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg 
        xmlns="http://www.w3.org/2000/svg" 
        width="24" 
        height="24" 
        viewBox="0 0 24 24" 
        fill="none" 
        stroke="currentColor" 
        strokeWidth="2" 
        strokeLinecap="round" 
        strokeLinejoin="round" 
        {...props}
    >
        <rect width="18" height="18" x="3" y="3" rx="2" ry="2"/>
        <line x1="7" x2="7" y1="3" y2="21"/>
        <line x1="17" x2="17" y1="3" y2="21"/>
        <line x1="3" x2="21" y1="12" y2="12"/>
        <line x1="3" x2="7" y1="7" y2="7"/>
        <line x1="3" x2="7" y1="17" y2="17"/>
        <line x1="17" x2="21" y1="17" y2="17"/>
        <line x1="17" x2="21" y1="7" y2="7"/>
    </svg>
);
