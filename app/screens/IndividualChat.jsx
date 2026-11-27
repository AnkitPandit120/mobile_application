import { useState } from "react";
import {
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

export default function IndividualChat({ route }) {
  const chat = route.params.chat;
  const headerHeight = useHeaderHeight();
  const [messages, setMessages] = useState(chat.messages);
  const [text, setText] = useState("");

  const sendMessage = async () => {
    const trimmed = text.trim();
    if (!trimmed) return;

    const newMessage = {
      id: Date.now(),
      sender: "me",
      text: trimmed,
      time: new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
    };

    // Show the message right away, then send it to the backend
    setMessages((prev) => [...prev, newMessage]);
    setText("");

    // TODO: replace with your backend call, e.g.
    // await fetch("https://your-backend.com/messages", {
    //   method: "POST",
    //   headers: { "Content-Type": "application/json" },
    //   body: JSON.stringify({ chatId: chat.id, ...newMessage }),
    // });
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

      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          placeholder="Type a message"
          value={text}
          onChangeText={setText}
          onSubmitEditing={sendMessage}
          returnKeyType="send"
        />
        <Button title="Send" onPress={sendMessage} disabled={!text.trim()} />
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
