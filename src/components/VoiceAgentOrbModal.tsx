/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Voice Agent Orb Modal - Real-Time Speech-to-Speech Serverless Integration
 * Features central interactive glowing orb, audio visualizer, extended thinking, and speech synthesis.
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  Brain,
   Volume2,
  VolumeX,
  X,
   Zap,
  ChevronDown,
  ChevronUp,
  Loader2,
  Copy,
  Check,
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { supabase } from '../lib/supabase';
import { RobotHeadAvatar } from './RobotHeadAvatar';

export interface ChatMessage {
  id: string;
  sender: 'user' | 'gemini';
  text: string;
  thought?: string;
  timestamp: string;
  modelBadge?: string;
}

interface VoiceAgentOrbModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStatusChange?: (state: 'sleeping' | 'idle' | 'listening' | 'thinking' | 'speaking' | 'working' | 'happy' | 'error') => void;
  onGuidingChange?: (guiding: boolean) => void;
}

export const VoiceAgentOrbModal: React.FC<VoiceAgentOrbModalProps> = ({ isOpen, onClose, onStatusChange, onGuidingChange }) => {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';

  const [inputQuery, setInputQuery] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);

  const [isListening, setIsListening] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [audioFeedbackEnabled, setAudioFeedbackEnabled] = useState(true);
  const [expandedThoughts, setExpandedThoughts] = useState<Record<string, boolean>>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<'idle' | 'listening' | 'thinking' | 'speaking' | 'working' | 'happy' | 'error'>('idle');
  const [isVoiceMode, setIsVoiceMode] = useState(false);
  const [isFormGuiding, setIsFormGuiding] = useState(false);
  const [isTouringControls, setIsTouringControls] = useState(f...[truncated]