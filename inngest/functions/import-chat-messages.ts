import { inngest } from "@/server/jobs/client";

export const importChatMessagesFunction = inngest.createFunction(
  { id: "import-chat-messages" },
  { event: "linkedin/chat.import_messages" },
  async ({ event }) => {
    return {
      status: "accepted",
      chatId: event.data.chatId
    };
  }
);
