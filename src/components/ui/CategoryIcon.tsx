import React from 'react';
import {
  Utensils,
  ShoppingCart,
  Bus,
  Car,
  Fuel,
  Home,
  Building,
  Zap,
  Droplets,
  Wifi,
  HeartPulse,
  Stethoscope,
  Gamepad2,
  Film,
  Music,
  ShoppingBag,
  GraduationCap,
  BookOpen,
  Sparkles,
  Briefcase,
  Laptop,
  Wallet,
  Landmark,
  Gift,
  TrendingUp,
  TrendingDown,
  Repeat,
  Tv,
  Coffee,
  HelpCircle,
  Coins,
  Tag,
  ShieldCheck,
  LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const ICON_MAP: Record<string, LucideIcon> = {
  Utensils,
  ShoppingCart,
  Bus,
  Car,
  Fuel,
  Home,
  Building,
  Zap,
  Droplets,
  Wifi,
  HeartPulse,
  Stethoscope,
  Gamepad2,
  Film,
  Music,
  ShoppingBag,
  GraduationCap,
  BookOpen,
  Sparkles,
  Briefcase,
  Laptop,
  Wallet,
  Landmark,
  Gift,
  TrendingUp,
  TrendingDown,
  Repeat,
  Tv,
  Coffee,
  HelpCircle,
  Coins,
  Tag,
  ShieldCheck,
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
      className={cn('inline-flex items-center justify-center rounded-xl p-2 shrink-0 transition-transform active:scale-95', className)}
      style={{
        backgroundColor: color ? `${color}18` : 'rgba(16, 185, 129, 0.12)',
        color: color || '#10b981',
      }}
      aria-hidden="true"
    >
      <IconComponent size={size} />
    </div>
  );
};
