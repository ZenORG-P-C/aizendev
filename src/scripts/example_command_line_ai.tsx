import dotenv from 'dotenv';
dotenv.config({ path: './.env.local' });

import React, { useState, useEffect } from 'react';
import { render, Box, Text, useApp } from 'ink';
import TextInput from 'ink-text-input';
import { query, initializeTables, getSessions, createSession } from './lib/db.ts';
import axios from 'axios';
import SelectInput from 'ink-select-input';
import { Message, Session, MenuItem, AIResponse } from './types.ts';

// Configuration
const N8N_WEBHOOK_URL = 'https://zenitogr.app.n8n.cloud/webhook';
const WEBHOOK_PATH = '/8945ea14-4704-4ebb-9d10-509c9efdf2be';

const SessionSelect = ({ onSelect }: { onSelect: (sessionId: number | null) => void }) => {
  const [items, setItems] = useState<MenuItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    initializeAndLoadSessions();
  }, []);

  const initializeAndLoadSessions = async () => {
    try {
      await initializeTables();
      await loadSessions();
    } catch (error) {
      console.error('Error initializing:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatSessionLabel = (session: Session) => {
    const date = new Date(session.last_message_at || session.created_at);
    const timeAgo = Math.floor((Date.now() - date.getTime()) / 1000 / 60); // minutes
    const timeDisplay = timeAgo < 60 
      ? `${timeAgo}m ago`
      : timeAgo < 1440 
        ? `${Math.floor(timeAgo / 60)}h ago`
        : `${Math.floor(timeAgo / 1440)}d ago`;

    return `📝 ${session.name} (${session.message_count || 0} msgs) - ${timeDisplay}`;
  };

  const loadSessions = async () => {
    const sessions = await getSessions();
    const menuItems: MenuItem[] = [
      { label: '➕ Start New Chat', value: 'new' },
      ...sessions.map((session: Session) => ({
        label: formatSessionLabel(session),
        value: session.id
      }))
    ];
    setItems(menuItems);
  };

  const handleSelect = async (item: MenuItem) => {
    if (item.value === 'new') {
      const newSession = await createSession();
      onSelect(newSession.id);
    } else {
      onSelect(item.value as number);
    }
  };

  return (
    <Box flexDirection="column" padding={1}>
      <Text bold>Select a chat session:</Text>
      {isLoading ? (
        <Text>Initializing database...</Text>
      ) : (
        <SelectInput items={items} onSelect={handleSelect} />
      )}
    </Box>
  );
};

const Chat = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [thinking, setThinking] = useState<string | null>(null);
  const [input, setInput] = useState('');
  const [sessionId, setSessionId] = useState<number | null>(null);
  const { exit } = useApp();

  useEffect(() => {
    if (sessionId) {
      fetchMessagesList();
    }
  }, [sessionId]);

  const fetchMessagesList = async () => {
    if (!sessionId) return;
    
    try {
      const messages = await query(
        'SELECT * FROM chats WHERE session_id = $1 ORDER BY created_at ASC',
        [sessionId]
      );
      setMessages(messages.map((msg: Record<string, any>): Message => ({
        id: msg.id,
        created_at: msg.created_at,
        messages: msg.messages,
        role: (msg.role as 'user' | 'assistant') || 'user',
        thinking: false,
        session_id: msg.session_id
      })));
    } catch (error) {
      console.error('Error fetching messages:', error);
    }
  };

  const saveMessage = async (content: string, role: 'user' | 'assistant' = 'user') => {
    if (!sessionId) return null;
    
    const queryString = 'INSERT INTO chats (session_id, messages, role) VALUES ($1, $2, $3) RETURNING *';
    const values = [sessionId, content, role];

    try {
      const res = await query(queryString, values);
      return res[0];
    } catch (error) {
      console.error('Error saving message:', error);
      return null;
    }
  };

  const handleSubmit = async (value: string) => {
    if (value.trim().toLowerCase() === '/quit') {
      exit();
      return;
    }

    await saveMessage(value, 'user');
    setInput('');
    setThinking('AI is thinking...');
    
    await fetchMessagesList();

    try {
      const response = await axios.post(`${N8N_WEBHOOK_URL}${WEBHOOK_PATH}`, {
        message: value,
        chatHistory: messages.map(msg => ({
          role: msg.role || 'user',
          content: msg.messages
        }))
      });

      if (response.data) {
        // Parse the AI response
        const aiResponse: AIResponse = Array.isArray(response.data) ? response.data[0] : response.data;
        
        // Set thinking to show the thought process
        if (aiResponse.think) {
          setThinking(aiResponse.think);
        }

        // Save and show the actual response if there's output
        if (aiResponse.output) {
          await saveMessage(aiResponse.output, 'assistant');
          await fetchMessagesList();
        }
      }
    } catch (error) {
      console.error('Error:', error);
      setThinking('Error occurred while processing');
    }
  };

  if (!sessionId) {
    return <SessionSelect onSelect={setSessionId} />;
  }

  return (
    <Box flexDirection="row" padding={1}>
      {/* Left column - Main chat */}
      <Box flexDirection="column" width="70%">
        <Text>Messages:</Text>
        <Box flexDirection="column" marginY={1}>
          {messages?.map((msg) => (
            <Text key={msg.id} color={msg.role === 'assistant' ? 'green' : 'white'}>
              [{msg.role === 'assistant' ? '🤖' : '👤'}] {msg.messages}
            </Text>
          ))}
        </Box>
        <Box marginTop={1}>
          <Text>You: </Text>
          <TextInput value={input} onChange={setInput} onSubmit={handleSubmit} />
        </Box>
      </Box>

      {/* Right column - Thinking status */}
      <Box flexDirection="column" width="30%" marginLeft={2}>
        <Text>AI Thoughts:</Text>
        <Box marginY={1}>
          {thinking && (
            <Text color="yellow" wrap="wrap">
              {thinking}
            </Text>
          )}
        </Box>
      </Box>
    </Box>
  );
};

render(<Chat />); 