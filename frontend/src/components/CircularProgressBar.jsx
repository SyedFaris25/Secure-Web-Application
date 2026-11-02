/**
 * =============================================================================
 * CircularProgressBar Component
 * =============================================================================
 * Animated SVG-based circular gauge for displaying security scores.
 * =============================================================================
 */

import React, { useState, useEffect } from 'react';

const CircularProgressBar = ({ score = 0, size = 160, strokeWidth = 10 }) => {
  const [animatedScore, setAnimatedScore] = useState(0);

  // Animate score from 0 to target
  useEffect(() => {
    let frame;
    let current = 0;
    const step = () => {
      current += 1;
      if (current > score) {
        setAnimatedScore(score);
        return;
      }
      setAnimatedScore(current);
      frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [score]);

  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (animatedScore / 100) * circumference;

  const getColor = (s) => {
    if (s >= 90) return '#10b981'; // green
    if (s >= 70) return '#4facfe'; // blue
    if (s >= 50) return '#f59e0b'; // amber
    return '#ef4444'; // red
  };

  const getLabel = (s) => {
    if (s >= 90) return 'SECURE';
    if (s >= 70) return 'MODERATE';
    if (s >= 50) return 'AT RISK';
    return 'VULNERABLE';
  };

  const color = getColor(animatedScore);

  return (
    <div className="d-flex flex-column align-items-center">
      <svg width={size} height={size} className="d-block">
        {/* Background Circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="rgba(255,255,255,0.05)"
          strokeWidth={strokeWidth}
        />
        {/* Progress Arc */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          style={{
            transition: 'stroke-dashoffset 0.5s ease',
            filter: `drop-shadow(0 0 6px ${color}50)`,
          }}
        />
        {/* Center Text */}
        <text
          x="50%"
          y="45%"
          textAnchor="middle"
          dominantBaseline="central"
          fill={color}
          style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, fontSize: `${size * 0.22}px` }}
        >
          {animatedScore}%
        </text>
        <text
          x="50%"
          y="62%"
          textAnchor="middle"
          dominantBaseline="central"
          fill="#9ca3af"
          style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 500, fontSize: `${size * 0.065}px`, textTransform: 'uppercase', letterSpacing: '1px' }}
        >
          {getLabel(animatedScore)}
        </text>
      </svg>
    </div>
  );
};

export default CircularProgressBar;
