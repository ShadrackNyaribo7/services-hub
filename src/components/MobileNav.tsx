"use client";
import { useState } from "react";
import Link from "next/link";
import { MOBILE_NAV_ITEMS } from "@/lib/navigation";

export default function MobileNav() {
  const [isOpen, setIsOpen] = useState(false);
  
  return (
    <>
      <button 
        onClick={() => setIsOpen(!isOpen)} 
        className="min-h-[44px] min-w-[44px] p-4 text-emerald-400 md:hidden"
        aria-label="Toggle menu"
        aria-controls="mobile-navigation-menu"
        aria-expanded={isOpen}
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          {isOpen ? (
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          ) : (
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          )}
        </svg>
      </button>
      {isOpen && (
        <nav
          id="mobile-navigation-menu"
          className="basis-full overflow-hidden rounded-md border border-gray-700 bg-gray-950 text-slate-200 shadow-lg md:hidden"
          aria-label="Mobile navigation"
        >
          {MOBILE_NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="block px-6 py-4 text-slate-200 hover:bg-gray-800 hover:text-emerald-400 transition"
              onClick={() => setIsOpen(false)}
            >
              {item.label}
            </Link>
          ))}
        </nav>
      )}
    </>
  );
}
