import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import ChatItem from "../components/ChatItem";
import initialChats from "../data/chats.json";
import { chatServerUrl } from "../chatServer";
import { useEffect, useState } from "react";

const ChatList = ({ navigation }) => {
  const [chats, setChats] = useState(initialChats);
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
        }
      })
      .catch(() => {});
    return () => controller.abort();
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>Chats</Text>
      <FlatList
        windowSize={4}
        data={chats}
        renderItem={({ item }) => {
          return (
            <Pressable onPress={() => navigation.navigate("Single Chat", {chat: item})}>
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
  heading: {
    fontSize: 28,
    fontWeight: "bold",
    padding: 20,
    color: "#111827",
  },
});

export default ChatList;
