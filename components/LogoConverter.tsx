'use client';

import { DotLottieReact } from '@lottiefiles/dotlottie-react';
import { useRef, useState } from 'react';

export default function LogoConverter() {
  const lottieRef = useRef<any>(null);
  const [isExporting, setIsExporting] = useState(false);

  const exportToSVG = async () => {
    setIsExporting(true);
    try {
      // Get the current animation frame
      if (lottieRef.current) {
        const svgElement = lottieRef.current.querySelector('svg');
        if (svgElement) {
          // Create a download link
          const svgData = new XMLSerializer().serializeToString(svgElement);
          const blob = new Blob([svgData], { type: 'image/svg+xml' });
          const url = URL.createObjectURL(blob);
          
          const link = document.createElement('a');
          link.href = url;
          link.download = 'logo.svg';
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          URL.revokeObjectURL(url);
        }
      }
    } catch (error) {
      console.error('Export failed:', error);
      alert('Export failed. Please try a different approach.');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="flex flex-col items-center gap-4 p-8">
      <h2 className="text-2xl font-bold">Logo Converter</h2>
      
      <div className="border rounded-lg p-4 bg-white">
        <DotLottieReact
          ref={lottieRef}
          src="/Creative Idea.lottie"
          loop
          autoplay
          style={{ width: '200px', height: '200px' }}
        />
      </div>

      <button
        onClick={exportToSVG}
        disabled={isExporting}
        className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-400"
      >
        {isExporting ? 'Exporting...' : 'Export as SVG'}
      </button>

      <div className="text-sm text-gray-600 max-w-md text-center">
        <p className="font-semibold mb-2">Alternative methods:</p>
        <ol className="list-decimal list-inside text-left space-y-1">
          <li>Use <a href="https://dotlottie.io/convert" target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">dotlottie.io/convert</a> to convert to JSON</li>
          <li>Then use <a href="https://lottiefiles.github.io/lottie-to-svg/" target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">lottie-to-svg</a> to convert to SVG</li>
          <li>Or use the <a href="https://editor.lottiefiles.com/" target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">LottieFiles editor</a> for manual export</li>
        </ol>
      </div>
    </div>
  );
}