import React from 'react';
import {
  Utensils,
  ShoppingCart,
  Bus,
  Home,
  Zap,
  Wifi,
  HeartPulse,
  Gamepad2,
  ShoppingBag,
  GraduationCap,
  Sparkles,
  Briefcase,
  Laptop,
  Wallet,
  Gift,
  TrendingUp,
  HelpCircle,
  Coins,
  Tag,
  LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const ICON_MAP: Record<string, LucideIcon> = {
  Utensils,
  ShoppingCart,
  Bus,
  Home,
  Zap,
  Wifi,
  HeartPulse,
  Gamepad2,
  ShoppingBag,
  GraduationCap,
  Sparkles,
  Briefcase,
  Laptop,
  Wallet,
  Gift,
  TrendingUp,
  HelpCircle,
  Coins,
};

interface CategoryIconProps {
  iconName: string;
  color?: string;
  className?: string;
  size?: number;
}

export const CategoryIcon: React.FC<CategoryIconProps> = ({
  iconName,
  color,
  className,
  size = 18,
}) => {
  const IconComponent = ICON_MAP[iconName] || Tag;

  return (
    <div
      className={cn('inline-flex items-center justify-center rounded-xl p-2 shrink-0', className)}
      style={{
        backgroundColor: color ? `${color}18` : 'rgba(16, 185, 129, 0.1)',
        color: color || '#10b981',
      }}
    >
      <IconComponent size={size} />
    </div>
  );
};
