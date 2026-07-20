import React from 'react';
import { motion } from 'framer-motion';
import type { HTMLMotionProps } from 'framer-motion';

interface GelButtonProps extends Omit<HTMLMotionProps<'button'>, 'color'> {
  color?: 'pink' | 'green' | 'orange' | 'purple' | 'red';
}

export const GelButton: React.FC<GelButtonProps> = ({
  color = 'pink',
  onClick,
  children,
  className = '',
  ...props
}) => {
  const getGelClass = () => {
    switch (color) {
      case 'green': return 'btn-gel-green';
      case 'orange': return 'btn-gel-orange';
      case 'purple': return 'btn-gel-purple';
      case 'red': return 'btn-gel-red';
      default: return 'btn-gel-pink';
    }
  };

  return (
    <motion.button
      whileHover={{ scale: 1.04 }}
      whileTap={{ scale: 0.94 }}
      transition={{ type: 'spring', stiffness: 450, damping: 15 }}
      className={`btn-gel ${getGelClass()} ${className}`}
      onClick={onClick}
      {...props}
    >
      {children}
    </motion.button>
  );
};
