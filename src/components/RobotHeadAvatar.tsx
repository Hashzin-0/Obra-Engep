import React from 'react';
import { RobotHead } from 'robot-heads';
import type { RobotHeadState } from 'robot-heads';

export type RobotAgentState = RobotHeadState;

interface RobotHeadAvatarProps {
  state?: RobotAgentState;
  size?: number;
  className?: string;
  label?: string;
}

export const RobotHeadAvatar: React.FC<RobotHeadAvatarProps> = ({
  state = 'sleeping',
  size = 44,
  className,
  label,
}) => (
  <RobotHead
    shape="rectangle"
    state={state}
    size={size}
    color="#8da6b7"
    trimColor="#d3dfdf"
    screenColor="#dceee9"
    speed={1}
    interactive={false}
    antenna
    floorShadow={false}
    className={className}
    aria-label={label ?? `Assistente OBra ENGEP: ${state}`}
  />
);
