import { colors } from '@toss/tds-colors';
import { ProgressBar } from '@toss/tds-react-native';

export interface ProgressbarProps {
  score: number;
  size?: 'light' | 'normal' | 'bold';
}

export const Progressbar = ({ score, size = 'bold' }: ProgressbarProps) => {
  const handleColor = (score: number) => {
    if (score >= 80) return colors.green500;
    if (score >= 60) return colors.blue500;
    if (score >= 40) return colors.orange500;
    return colors.red500;
  };

  return <ProgressBar withAnimation={true} progress={score} size={size} color={handleColor(score)} />;
};
