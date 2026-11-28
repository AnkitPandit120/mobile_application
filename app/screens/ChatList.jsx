import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import ChatItem from "../components/ChatItem";
import initialChats from "../data/chats.json";
import { chatServerUrl } from "../chatServer";
import { useEffect, useState } from "react";

const ChatList = ({ navigation }) => {
  const [chats, setChats] = useState(initialChats);
  const [loadState, setLoadState] = useState(chatServerUrl ? "loading" : "ready");

  useEffect(() => {
    if (!chatServerUrl) return;

    const controller = new AbortController();
    fetch(`${chatServerUrl}/chats`, { signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw new Error("Unable to load chats");
        return response.json();
      })
      .then((result) => {
        if (!controller.signal.aborted) {
          setChats(result.map((chat) => ({ ...chat, messages: chat.messages ?? [] })));
          setLoadState("ready");
        }
      })
      .catch(() => {
        if (!controller.signal.aborted) setLoadState("offline");
      });
    return () => controller.abort();
  }, []);

  const openChat = (chat) => {
    setChats((current) =>
      current.map((item) => (item.id === chat.id ? { ...item, unreadCount: 0 } : item)),
    );
    if (chatServerUrl) {
      fetch(`${chatServerUrl}/chats/${chat.id}/read`, { method: "POST" }).catch(() => {});
    }
    navigation.navigate("Single Chat", { chat });
  };

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>Chats</Text>
      {loadState !== "ready" && (
        <Text accessibilityLiveRegion="polite" style={styles.status}>
          {loadState === "loading" ? "Loading conversations…" : "Server unavailable. Showing sample chats."}
        </Text>
      )}
      <FlatList
        windowSize={4}
        data={chats}
        renderItem={({ item }) => {
          return (
            <Pressable onPress={() => openChat(item)}>
              <ChatItem chat={item} />
            </Pressable>
          );
        }}
        keyExtractor={(item) => String(item.id)}
      />
    </View>

    //   {/* {chats.map((el) => {
    //     console.log("Rendering...");
    //     return <Text>{el.name}</Text>;
    //   })} */}
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  status: { paddingHorizontal: 20, paddingBottom: 12, color: "#46535f" },
  heading: {
    fontSize: 28,
    fontWeight: "bold",
    padding: 20,
    color: "#111827",
  },
});

export default ChatList;
