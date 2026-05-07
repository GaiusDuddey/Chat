import React from 'react';

interface BadgeProps {
  count: number;
  maxCount?: number;
}

const Badge: React.FC<BadgeProps> = ({ count, maxCount = 99 }) => {
  if (count <= 0) return null;

  const display = count > maxCount ? `${maxCount}+` : count.toString();

  return (
    <span className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 text-xs font-bold text-white bg-gradient-to-r from-primary-500 to-primary-600 rounded-full shadow-lg shadow-primary-500/30 animate-bounce-in">
      {display}
    </span>
  );
};

export default Badge;
