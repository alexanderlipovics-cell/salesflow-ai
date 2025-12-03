// components/MessageBubble.tsx

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Message } from '../types/messaging';

interface Props {
  message: Message;
  onLongPress?: () => void;
}

export const MessageBubble: React.FC<Props> = ({ message, onLongPress }) => {
  const isOutbound = message.direction === 'outbound';

  const getStatusIcon = (): string => {
    switch (message.status) {
      case 'sending':
        return '⏳';
      case 'sent':
        return '✓';
      case 'delivered':
        return '✓✓';
      case 'read':
        return '✓✓';
      case 'failed':
        return '❌';
      default:
        return '';
    }
  };

  return (
    <TouchableOpacity
      style={[
        styles.container,
        isOutbound ? styles.outbound : styles.inbound,
      ]}
      onLongPress={onLongPress}
      activeOpacity={0.7}
    >
      <Text
        style={[
          styles.content,
          isOutbound ? styles.contentOutbound : styles.contentInbound,
        ]}
      >
        {message.content}
      </Text>

      <View style={styles.footer}>
        <Text style={styles.time}>
          {new Date(message.created_at).toLocaleTimeString('de-DE', {
            hour: '2-digit',
            minute: '2-digit',
          })}
        </Text>

        {isOutbound && <Text style={styles.status}> {getStatusIcon()}</Text>}
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    maxWidth: '80%',
    marginBottom: 12,
    padding: 12,
    borderRadius: 16,
  },
  outbound: {
    alignSelf: 'flex-end',
    backgroundColor: '#FF5722',
    borderBottomRightRadius: 4,
  },
  inbound: {
    alignSelf: 'flex-start',
    backgroundColor: '#fff',
    borderBottomLeftRadius: 4,
  },
  content: {
    fontSize: 16,
    lineHeight: 22,
  },
  contentOutbound: {
    color: '#fff',
  },
  contentInbound: {
    color: '#1A1A1A',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 4,
  },
  time: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.7)',
  },
  status: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.7)',
  },
});


