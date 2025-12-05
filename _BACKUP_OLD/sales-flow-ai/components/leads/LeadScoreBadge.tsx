import { View, Text } from 'react-native';
import { Thermometer } from 'lucide-react-native';

type ScoreSize = 'sm' | 'md' | 'lg';

type LeadScoreBadgeProps = {
  score: number;
  size?: ScoreSize;
  showIcon?: boolean;
  showLabel?: boolean;
};

type TemperatureConfig = {
  label: string;
  bgColor: string;
  textColor: string;
  iconColor: string;
  borderColor: string;
};

function getTemperature(score: number): TemperatureConfig {
  if (score >= 70) {
    return {
      label: 'Hot',
      bgColor: 'bg-red-500/20',
      textColor: 'text-red-400',
      iconColor: '#ef4444',
      borderColor: 'border-red-500/30',
    };
  }
  if (score >= 40) {
    return {
      label: 'Warm',
      bgColor: 'bg-amber-500/20',
      textColor: 'text-amber-400',
      iconColor: '#f59e0b',
      borderColor: 'border-amber-500/30',
    };
  }
  return {
    label: 'Cold',
    bgColor: 'bg-blue-500/20',
    textColor: 'text-blue-400',
    iconColor: '#3b82f6',
    borderColor: 'border-blue-500/30',
  };
}

const sizeConfig = {
  sm: {
    container: 'px-2 py-1 rounded-lg',
    text: 'text-xs font-semibold',
    icon: 12,
    gap: 'gap-1',
  },
  md: {
    container: 'px-3 py-1.5 rounded-xl',
    text: 'text-sm font-bold',
    icon: 14,
    gap: 'gap-1.5',
  },
  lg: {
    container: 'px-4 py-2 rounded-2xl',
    text: 'text-base font-bold',
    icon: 18,
    gap: 'gap-2',
  },
};

export function LeadScoreBadge({
  score,
  size = 'md',
  showIcon = true,
  showLabel = false,
}: LeadScoreBadgeProps) {
  const temp = getTemperature(score);
  const sizeStyles = sizeConfig[size];

  // Clamp score between 0-100
  const clampedScore = Math.max(0, Math.min(100, Math.round(score)));

  return (
    <View
      className={`flex-row items-center ${sizeStyles.container} ${sizeStyles.gap} ${temp.bgColor} border ${temp.borderColor}`}
    >
      {showIcon && (
        <Thermometer size={sizeStyles.icon} color={temp.iconColor} />
      )}
      <Text className={`${sizeStyles.text} ${temp.textColor}`}>
        {clampedScore}
      </Text>
      {showLabel && (
        <Text className={`${sizeStyles.text} ${temp.textColor} opacity-70`}>
          {temp.label}
        </Text>
      )}
    </View>
  );
}

// Utility-Funktion für externe Verwendung
export function getLeadTemperature(score: number): 'hot' | 'warm' | 'cold' {
  if (score >= 70) return 'hot';
  if (score >= 40) return 'warm';
  return 'cold';
}

// Emoji-Variante für Listen
export function LeadScoreEmoji({ score }: { score: number }) {
  if (score >= 70) return <Text>🔥</Text>;
  if (score >= 40) return <Text>🌡️</Text>;
  return <Text>❄️</Text>;
}

