import { useEffect, useRef, useState } from "react";
import {
  AppState,
  View,
  Text,
  FlatList,
  StyleSheet,
  TextInput,
  Button,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useHeaderHeight } from "@react-navigation/elements";

import { chatServerUrl } from "../chatServer";

export default function IndividualChat({ route }) {
  const chat = route.params.chat;
  const headerHeight = useHeaderHeight();
  const [messages, setMessages] = useState(chat.messages ?? []);
  const [text, setText] = useState("");
  const [historyState, setHistoryState] = useState(chatServerUrl ? "loading" : "ready");

  useEffect(() => {
    if (!chatServerUrl) return;

    const controller = new AbortController();
    fetch(`${chatServerUrl}/chats/${chat.id}`, { signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw new Error("Unable to load messages");
        return response.json();
      })
      .then((result) => {
        if (!controller.signal.aborted) {
          setHistoryState("ready");
          setMessages((current) => {
            const known = new Set(result.messages.map((message) => message.id));
            return [...result.messages, ...current.filter((message) => !known.has(message.id))];
          });
        }
      })
      .catch(() => {
        if (!controller.signal.aborted) setHistoryState("failed");
      });
    return () => controller.abort();
  }, [chat.id]);

  const socketRef = useRef(null);
  const typingTimer = useRef(null);
  const lastTypingSent = useRef(0);
  const [typing, setTyping] = useState(false);
  const [connection, setConnection] = useState("connecting");

  useEffect(() => {
    if (!chatServerUrl) return;

    let retryTimer;
    let retryDelay = 1000;

    function releaseSocket() {
      const socket = socketRef.current;
      if (!socket) return;
      socketRef.current = null;
      socket.onopen = socket.onclose = socket.onerror = socket.onmessage = null;
      socket.close();
    }

    function connect() {
      if (AppState.currentState === "background" || AppState.currentState === "inactive") return;
      setConnection("connecting");
      const socket = new WebSocket(chatServerUrl.replace(/^http/, "ws") + "/ws");
      socketRef.current = socket;
      socket.onopen = () => {
        retryDelay = 1000;
        setConnection("connected");
      };
      const retry = () => {
        releaseSocket();
        clearTimeout(typingTimer.current);
        setTyping(false);
        setConnection("disconnected");
        retryTimer = setTimeout(connect, retryDelay);
        retryDelay = Math.min(retryDelay * 2, 15000);
      };
      socket.onclose = retry;
      socket.onerror = retry;
      socket.onmessage = ({ data }) => {
        let event;
        try {
          event = JSON.parse(data);
        } catch {
          return;
        }
        if (String(event.chatId) !== String(chat.id)) return;
        if (event.type === "typing" && event.from !== "me") {
          setTyping(true);
          clearTimeout(typingTimer.current);
          typingTimer.current = setTimeout(() => setTyping(false), 2500);
          return;
        }
        if (event.type !== "message") return;
        if (event.message.sender !== "me") setTyping(false);
        setMessages((current) =>
          current.some((message) => message.id === event.message.id)
            ? current
            : [...current, event.message],
        );
      };
    }

    connect();
    const subscription = AppState.addEventListener("change", (state) => {
      clearTimeout(retryTimer);
      if (state === "active") {
        if (!socketRef.current) connect();
        return;
      }
      releaseSocket();
      clearTimeout(typingTimer.current);
      setTyping(false);
      setConnection("disconnected");
    });

    return () => {
      subscription.remove();
      clearTimeout(retryTimer);
      clearTimeout(typingTimer.current);
      releaseSocket();
    };
  }, [chat.id]);

  const updateDraft = (value) => {
    setText(value);
    const socket = socketRef.current;
    const now = Date.now();
    if (!value.trim() || socket?.readyState !== WebSocket.OPEN || now - lastTypingSent.current < 1500) return;

    lastTypingSent.current = now;
    socket.send(JSON.stringify({ type: "typing", chatId: chat.id }));
  };

  const sendMessage = () => {
    const trimmed = text.trim();
    if (!trimmed) return;

    if (chatServerUrl) {
      const socket = socketRef.current;
      if (socket?.readyState !== WebSocket.OPEN) return;
      socket.send(JSON.stringify({ type: "send", chatId: chat.id, text: trimmed }));
      setText("");
      return;
    }

    const newMessage = {
      id: Date.now(),
      sender: "me",
      text: trimmed,
      time: new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
    };

    setMessages((prev) => [...prev, newMessage]);
    setText("");
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={headerHeight}
    >
      <View style={styles.header}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{chat.avatar}</Text>
        </View>
        <Text style={styles.title}>{chat.name}</Text>
      </View>

      {chatServerUrl && connection !== "connected" && (
        <Text accessibilityLiveRegion="polite" style={styles.status}>
          {connection === "connecting" ? "Connecting to chat server…" : "Chat server disconnected"}
        </Text>
      )}
      {historyState !== "ready" && (
        <Text accessibilityLiveRegion="polite" style={styles.status}>
          {historyState === "loading" ? "Loading messages…" : "Could not load message history"}
        </Text>
      )}
      <FlatList
        data={messages}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => {
          const isMe = item.sender === "me";
          return (
            <View style={[styles.bubble, isMe ? styles.mine : styles.theirs]}>
              <Text style={[styles.text, isMe && styles.mineText]}>
                {item.text}
              </Text>
              <Text style={[styles.time, isMe && styles.mineText]}>
                {item.time}
              </Text>
            </View>
          );
        }}
      />

      {typing && <Text style={styles.list}>{chat.name} is typing…</Text>}
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          placeholder="Type a message"
          value={text}
          onChangeText={updateDraft}
          onSubmitEditing={sendMessage}
          returnKeyType="send"
        />
        <Button title="Send" onPress={sendMessage} disabled={!text.trim() || Boolean(chatServerUrl && connection !== "connected")} />
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    padding: 20,
    backgroundColor: "#fff",
    gap: 10,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 15,
  },
  container: {
    flex: 1,
    backgroundColor: "#f6f8f9",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#e3e8eb",
    backgroundColor: "#ffffff",
  },
  back: {
    fontSize: 17,
    color: "#1f7aec",
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#1f7aec",
    justifyContent: "center",
    alignItems: "center",
  },
  avatarText: {
    color: "#ffffff",
    fontWeight: "700",
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
  },
  status: { padding: 12, color: "#46535f" },
  list: {
    padding: 12,
  },
  bubble: {
    maxWidth: "75%",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    marginVertical: 4,
  },
  theirs: {
    alignSelf: "flex-start",
    backgroundColor: "#e7ecef",
  },
  mine: {
    alignSelf: "flex-end",
    backgroundColor: "#1f7aec",
  },
  text: {
    fontSize: 16,
    color: "#13212b",
  },
  mineText: {
    color: "#ffffff",
  },
  time: {
    fontSize: 11,
    color: "#6d7d87",
    marginTop: 2,
    alignSelf: "flex-end",
  },
});
