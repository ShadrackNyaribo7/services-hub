"use client";
import { useState } from "react";
import Link from "next/link";

export default function MobileNav() {
  const [isOpen, setIsOpen] = useState(false);
  
  return (
    <nav className="md:hidden">
      <button 
        onClick={() => setIsOpen(!isOpen)} 
        className="min-h-[44px] min-w-[44px] p-4 text-emerald-400"
        aria-label="Toggle menu"
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
        <div className="absolute top-16 left-0 right-0 bg-gray-900 shadow-lg border-t border-gray-700">
          <Link 
            href="/services" 
            className="block px-6 py-4 text-slate-200 hover:bg-gray-800 hover:text-emerald-400 transition"
            onClick={() => setIsOpen(false)}
          >
            Find Services
          </Link>
          <Link 
            href="/providers/apply" 
            className="block px-6 py-4 text-slate-200 hover:bg-gray-800 hover:text-emerald-400 transition"
            onClick={() => setIsOpen(false)}
          >
            Become a Provider
          </Link>
          <Link 
            href="/signin" 
            className="block px-6 py-4 text-slate-200 hover:bg-gray-800 hover:text-emerald-400 transition"
            onClick={() => setIsOpen(false)}
          >
            Sign In
          </Link>
        </div>
      )}
    </nav>
  );
}